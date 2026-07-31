/**
 * FitTrack IA — proxy OpenAI (Cloudflare Worker)
 *
 * Rôle : la clé OpenAI ne quitte jamais ce worker. L'app envoie un jeton
 * applicatif (APP_TOKEN) ; le worker le vérifie puis relaie la requête à
 * OpenAI avec la vraie clé (OPENAI_API_KEY), stockées toutes deux en
 * secrets Cloudflare — jamais dans le code ni dans l'app store.
 *
 * Garde-fous :
 *  - seul POST /v1/chat/completions est relayé
 *  - modèle imposé (allowlist), max_tokens plafonné, streaming refusé
 *  - taille de corps plafonnée (2 Mo — les photos 768px font ~200 Ko)
 *  - rate limit best-effort par IP (mémoire de l'isolat) ; pour du dur,
 *    ajouter une règle WAF "Rate limiting" sur la route (voir README)
 */

const ALLOWED_MODELS = new Set(['gpt-4o']);
const MAX_TOKENS_CAP = 4000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const RL_WINDOW_MS = 60_000; // 60 requêtes / minute / IP, par isolat
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

export default {
  async fetch(request, env) {
    if (!env.OPENAI_API_KEY || !env.APP_TOKEN) {
      return err(500, 'Worker mal configuré : secrets manquants.');
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
      return err(404, 'Route non prise en charge.');
    }

    // Authentification applicative (comparaison en temps constant)
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const expected = env.APP_TOKEN;
    let mismatch = token.length !== expected.length ? 1 : 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= (token.charCodeAt(i % Math.max(token.length, 1)) ?? 0) ^ expected.charCodeAt(i);
    }
    if (mismatch) return err(401, 'Jeton invalide.');

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

    if (!ALLOWED_MODELS.has(body.model)) return err(400, 'Modèle non autorisé.');
    if (body.stream) return err(400, 'Streaming non pris en charge.');
    body.max_tokens = Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP);
    // Neutralise tout paramètre coûteux inattendu
    delete body.n;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    // Relaye statut + corps tels quels (le client gère 429/5xx via AIError)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  },
};
