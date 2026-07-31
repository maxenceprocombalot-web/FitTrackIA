/**
 * FitTrack IA — proxy IA (Cloudflare Worker)
 *
 * Rôle : la clé du fournisseur ne quitte jamais ce worker. L'app envoie un
 * jeton applicatif (APP_TOKEN) ; le worker le vérifie puis relaie la requête
 * avec la vraie clé, stockée en secret Cloudflare.
 *
 * Fournisseur choisi par le secret présent :
 *   GEMINI_API_KEY → Google Gemini (API compatible OpenAI)
 *   OPENAI_API_KEY → OpenAI
 * Si les deux sont posés, GEMINI gagne (surcharge possible via PROVIDER).
 *
 * Le modèle est imposé côté serveur (AI_MODEL) : changer de modèle ou de
 * fournisseur ne demande PAS de reconstruire l'app, juste un redéploiement.
 *
 * Garde-fous : route unique, modèle forcé, max_tokens plafonné, streaming
 * refusé, corps ≤ 2 Mo, 60 req/min/IP (best-effort, mémoire de l'isolat).
 */

const PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
  },
};

const MAX_TOKENS_CAP = 4000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;

const rl = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || now > e.reset) {
    rl.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > RL_MAX;
}

function err(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Comparaison en temps constant — évite de fuiter le jeton par le timing. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function resolveProvider(env) {
  const forced = (env.PROVIDER ?? '').toLowerCase();
  if (forced === 'gemini' && env.GEMINI_API_KEY) return ['gemini', env.GEMINI_API_KEY];
  if (forced === 'openai' && env.OPENAI_API_KEY) return ['openai', env.OPENAI_API_KEY];
  if (env.GEMINI_API_KEY) return ['gemini', env.GEMINI_API_KEY];
  if (env.OPENAI_API_KEY) return ['openai', env.OPENAI_API_KEY];
  return [null, null];
}

export default {
  async fetch(request, env) {
    const [providerName, apiKey] = resolveProvider(env);
    if (!providerName || !env.APP_TOKEN) {
      return err(500, 'Worker mal configuré : secrets manquants.');
    }
    const provider = PROVIDERS[providerName];

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
      return err(404, 'Route non prise en charge.');
    }

    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!safeEqual(token, env.APP_TOKEN)) return err(401, 'Jeton invalide.');

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (rateLimited(ip)) return err(429, 'Trop de requêtes, réessaie dans une minute.');

    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) return err(413, 'Requête trop volumineuse.');

    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return err(400, 'JSON invalide.');
    }

    if (body.stream) return err(400, 'Streaming non pris en charge.');

    // Le modèle demandé par l'app est ignoré : c'est le serveur qui décide.
    body.model = env.AI_MODEL || provider.defaultModel;
    body.max_tokens = Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP);
    delete body.n;

    const upstream = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // Statut relayé tel quel : le client traduit 429/5xx via AIError.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  },
};
