/* ─── WhatsApp Business Cloud API pour Cloudflare Workers ─────────────
   Envoie des messages via l'API WhatsApp Business (Meta Graph API).

   Variables d'environnement requises :
   - WHATSAPP_TOKEN      : jeton d'accès permanent (System User Token)
   - WHATSAPP_PHONE_ID   : identifiant du numéro de téléphone WhatsApp Business
   - WHATSAPP_TO         : numéro de destination par défaut (format international, ex: 2250700000000)
*/

const API_VERSION = "v21.0";

export function whatsappConfigured(env) {
  return !!(env?.WHATSAPP_TOKEN && env?.WHATSAPP_PHONE_ID && env?.WHATSAPP_TO);
}

/**
 * Envoie un message texte WhatsApp.
 * @param {object} env - variables d'environnement Cloudflare
 * @param {string} text - le contenu du message (max ~4096 caractères)
 * @param {string} [to] - numéro de destination (défaut: WHATSAPP_TO)
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function sendWhatsApp(env, text, to) {
  if (!whatsappConfigured(env)) return { ok: false, error: "WhatsApp non configuré" };
  const dest = to || env.WHATSAPP_TO;
  const url = `https://graph.facebook.com/${API_VERSION}/${env.WHATSAPP_PHONE_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: dest,
        type: "text",
        text: { preview_url: false, body: text.slice(0, 4096) },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn("WhatsApp erreur HTTP", res.status, err.slice(0, 300));
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, id: data?.messages?.[0]?.id || "" };
  } catch (e) {
    console.warn("WhatsApp envoi échoué :", e?.message || e);
    return { ok: false, error: e?.message || "Erreur réseau" };
  }
}

/**
 * Formate et envoie une notification SDE via WhatsApp.
 * @param {object} env
 * @param {string} sujet - ligne d'objet de la notification
 * @param {string} texte - corps du message
 */
export async function notifyWhatsApp(env, sujet, texte) {
  if (!whatsappConfigured(env)) return { ok: false };
  const msg = `📢 *${sujet}*\n\n${texte}\n\n🔗 https://mouvement-sde.org/administration`;
  return sendWhatsApp(env, msg);
}
