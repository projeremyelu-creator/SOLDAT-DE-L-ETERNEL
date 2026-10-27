/* PWA publique SDE — installation et notifications push.
   Scope "/" sur mouvement-sde.org. */
(() => {
  const HOST = "mouvement-sde.org";
  if (location.hostname !== HOST) return;

  /* ── Enregistrement du Service Worker ── */
  if ("serviceWorker" in navigator) {
    const register = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const old of registrations) {
          if (new URL(old.scope).pathname === "/vitrine/" &&
              old.active?.scriptURL.includes("/vitrine/sw-public.js")) {
            await old.unregister();
          }
        }
        await navigator.serviceWorker.register("/sw-public.js", { scope: "/" });
      } catch (_) { /* PWA indisponible */ }
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }

  /* ── Invite d'installation PWA ── */
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
    const main = document.querySelector(".sde-initiative-lead .enveloppe, .sde-intro, #parcours-sde .sde-parcours-inner");
    if (!main || document.getElementById("sde-install-public")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "sde-install-public";
    button.className = "sde-form-submit sde-install-button";
    button.textContent = "Installer le portail SDE";
    button.addEventListener("click", async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      button.remove();
    });
    main.appendChild(button);
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    document.getElementById("sde-install-public")?.remove();
  });

  /* ── Notifications push ── */
  async function initPushNotifications() {
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) return;

    // Attendre que la page soit chargée
    const sw = await navigator.serviceWorker.ready;

    // Vérifier si l'utilisateur est connecté (cookie sde_s présent)
    if (!document.cookie.includes("sde_s=")) return;

    // Récupérer la clé publique VAPID
    let vapidKey = null;
    try {
      const res = await fetch("/api/vapid-public-key");
      const data = await res.json();
      vapidKey = data.key;
    } catch (_) { return; }
    if (!vapidKey) return;

    // Vérifier l'abonnement existant
    const existing = await sw.pushManager.getSubscription();
    if (existing) return; // Déjà abonné

    // Vérifier la permission actuelle
    if (Notification.permission === "denied") return;

    // Afficher le bandeau de demande de permission
    showNotificationBanner(sw, vapidKey);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function subscribePush(sw, vapidKey) {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Envoyer l'abonnement au serveur
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
                  auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") },
        }),
      });

      return res.ok;
    } catch (e) {
      console.warn("SDE push subscription failed:", e);
      return false;
    }
  }

  function showNotificationBanner(sw, vapidKey) {
    // Ne pas afficher si déjà vu récemment
    try {
      const dismissed = localStorage.getItem("sde_notif_dismiss");
      if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;
    } catch (_) {}

    const banner = document.createElement("div");
    banner.id = "sde-notif-banner";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      <div class="sde-notif-inner">
        <span class="sde-notif-icon" aria-hidden="true">🔔</span>
        <div class="sde-notif-text">
          <strong>Activez les notifications</strong>
          <span>Recevez les alertes SDE directement sur votre téléphone.</span>
        </div>
        <div class="sde-notif-actions">
          <button type="button" class="sde-notif-accept">Activer</button>
          <button type="button" class="sde-notif-dismiss" aria-label="Fermer">✕</button>
        </div>
      </div>`;

    const style = document.createElement("style");
    style.textContent = `
#sde-notif-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:12px 16px;background:linear-gradient(135deg,#1a2240,#2d1f3d);border-top:2px solid #c8a451;animation:sde-slide-up .4s ease-out}
.sde-notif-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:12px;color:#fff}
.sde-notif-icon{font-size:1.5rem;flex-shrink:0}
.sde-notif-text{flex:1;font-size:.88rem;line-height:1.4}
.sde-notif-text strong{display:block;font-size:.95rem;margin-bottom:2px}
.sde-notif-text span{color:#c8cfe0}
.sde-notif-actions{display:flex;gap:8px;flex-shrink:0}
.sde-notif-accept{padding:8px 18px;background:#c8a451;color:#11182a;border:0;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer}
.sde-notif-accept:hover{background:#dbb862}
.sde-notif-dismiss{padding:4px 8px;background:transparent;color:#8892a8;border:0;font-size:1.1rem;cursor:pointer}
.sde-notif-dismiss:hover{color:#fff}
@keyframes sde-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    banner.querySelector(".sde-notif-accept").addEventListener("click", async () => {
      const ok = await subscribePush(sw, vapidKey);
      if (ok) {
        banner.querySelector(".sde-notif-text").innerHTML = "<strong>Notifications activées ✓</strong><span>Vous recevrez les alertes SDE sur cet appareil.</span>";
        banner.querySelector(".sde-notif-actions").innerHTML = "";
        setTimeout(() => banner.remove(), 3000);
      } else {
        banner.querySelector(".sde-notif-text span").textContent = "La permission a été refusée. Vous pouvez l'activer dans les paramètres de votre navigateur.";
      }
    });

    banner.querySelector(".sde-notif-dismiss").addEventListener("click", () => {
      banner.remove();
      try { localStorage.setItem("sde_notif_dismiss", String(Date.now())); } catch (_) {}
    });
  }

  // Initialiser les notifications après le chargement
  if (document.readyState === "complete") setTimeout(initPushNotifications, 2000);
  else window.addEventListener("load", () => setTimeout(initPushNotifications, 2000));
})();
