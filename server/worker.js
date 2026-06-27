// ─── Proxy OpenAI pour FitTrackIA (Cloudflare Worker) ─────────────────────────
//
// Rôle : l'app n'appelle PLUS OpenAI directement. Elle appelle CE serveur, qui
// est le seul à connaître la vraie clé OpenAI. La clé n'est donc jamais dans
// l'app → impossible à voler depuis le téléphone.
//
// Deux secrets sont configurés côté Cloudflare (jamais dans le code, jamais dans
// l'app) :
//   - OPENAI_API_KEY : ta vraie clé OpenAI (sk-...)
//   - APP_TOKEN      : un mot de passe que TU choisis, partagé avec l'app, pour
//                      que seul ton app puisse utiliser ce proxy.
//
// Voir server/README.md pour le déploiement pas-à-pas.

// Seul cet endpoint est relayé — le proxy n'est pas un relai ouvert vers tout OpenAI.
const ALLOWED_PATH = '/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    // Pré-vol CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (request.method !== 'POST' || url.pathname !== ALLOWED_PATH) {
      return json(404, { error: 'not_found' });
    }

    // Sécurité serveur : les secrets doivent être configurés.
    if (!env.OPENAI_API_KEY || !env.APP_TOKEN) {
      return json(500, { error: 'server_misconfigured' });
    }

    // L'app doit présenter le bon APP_TOKEN (envoyé dans l'en-tête Authorization).
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (token !== env.APP_TOKEN) {
      return json(401, { error: 'unauthorized' });
    }

    // Relai vers OpenAI avec la VRAIE clé (ajoutée seulement ici, côté serveur).
    const body = await request.text();
    let upstream;
    try {
      upstream = await fetch('https://api.openai.com' + ALLOWED_PATH, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch {
      return json(502, { error: 'upstream_unreachable' });
    }

    // Réponse renvoyée telle quelle (avec en-têtes CORS).
    const headers = new Headers(upstream.headers);
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
