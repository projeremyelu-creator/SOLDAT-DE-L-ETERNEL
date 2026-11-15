/* Progressive-only Citadelle behaviour: no data access or permission changes. */
(() => {
  // Même identité graphique sur chaque route sans aucune requête aux données privées.
  document.documentElement.setAttribute("data-sde-citadel-integral", "v3");
  const formatCountdown = (target) => {
    const value = new Date(target).getTime();
    if (!Number.isFinite(value)) return "Date à confirmer";
    const delta = value - Date.now();
    if (delta <= 0) return "Rendez-vous terminé — consulter l’agenda";
    const days = Math.floor(delta / 86400000);
    const hours = Math.floor((delta % 86400000) / 3600000);
    return `${days} j ${hours} h avant le rendez-vous`;
  };
  window.SdeCitadel = window.SdeCitadel || {
    init(root = document) {
      root.querySelectorAll("[data-sde-citadel-countdown]").forEach((element) => {
        const label = formatCountdown(element.dataset.sdeCitadelCountdown);
        element.textContent = label;
        element.setAttribute("aria-label", label);
      });
      const active = root.querySelector(`[data-sde-nav="${location.pathname}"]`);
      active?.setAttribute("aria-current", "page");
    },
    formatCountdown
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.SdeCitadel.init(), { once: true });
  else window.SdeCitadel.init();
})();

/* Fidélité de la maquette approuvée : remplace uniquement les éléments de
 * présentation publique. Aucun accès aux comptes, aucun chiffre simulé. */
(() => {
 const render=()=>{
  if(!document.body.classList.contains("sde-premium-home"))return;
  const hero=document.querySelector(".ap-hero"),copy=hero?.querySelector(".ap-hero-copy");
  if(!hero||!copy||document.querySelector(".sde-pixel-showcase"))return;
  document.body.classList.add("sde-pixel-citadel");
  const title=copy.querySelector("#titre-accueil");
  if(title){
   title.setAttribute("aria-label","Un peuple aligné pour l’impact du Royaume");
   title.innerHTML="UN PEUPLE ALIGNÉ<br>POUR L’IMPACT<br><span>DU ROYAUME</span>";
  }
  const tagline=copy.querySelector(".sde-citadel-tagline");
  if(tagline)tagline.innerHTML="Mouvement Prophético-Apostolique<br>Soldats de l’Éternel, S.D.E · Abidjan";
  const actions=[...copy.querySelectorAll(".sde-citadel-actions a")];
  if(actions.length===2){
    actions[0].href="/mouvement";
    const first=actions[0].querySelector("span:nth-child(2)");
    if(first)first.textContent="Découvrir le Mouvement";
    actions[1].href="/mouvement#film";
    const second=actions[1].querySelector("span:nth-child(2)");
    if(second)second.textContent="Notre vision en 73 s";
  }
  const view=document.createElement("div");view.innerHTML="\n<section class=\"sde-pixel-showcase\" aria-label=\"Vision, programmes, missions et pôles du mouvement\">\n <div class=\"sde-pixel-features\">\n  <article class=\"sde-pixel-feature\"><h2>◎ &nbsp;NOTRE VISION</h2><p>Former un peuple de disciples alignés, équipés et déployés pour impacter les nations au service du Royaume de Dieu.</p><a href=\"/mouvement\">Découvrir notre vision →</a></article>\n  <article class=\"sde-pixel-feature sde-pixel-feature-event\"><div><span class=\"sde-pixel-eyebrow\">▣ &nbsp;PROCHAIN ÉVÉNEMENT</span><h2>TPA 2026</h2><p>Traversée Prophétique Annuelle</p><p>Vendredi 18 décembre 2026 · 20h00 GMT<br>En ligne · Google Meet</p><a class=\"sde-pixel-green-cta\" href=\"/programmes#tpa-2026\">Découvrir le programme ›</a></div></article>\n  <article class=\"sde-pixel-feature\"><h2>⚑ &nbsp;NOS MISSIONS</h2><ul><li>Former et équiper des disciples.</li><li>Édifier et envoyer des ouvriers.</li><li>Impacter Abidjan, la Côte d’Ivoire et les nations.</li></ul><a href=\"/missions\">Découvrir nos missions →</a></article>\n </div>\n <h2 class=\"sde-pixel-poles-title\">NOS 5 PÔLES D’ACTION</h2>\n <nav class=\"sde-pixel-poles\" aria-label=\"Nos cinq pôles officiels\">\n  <a href=\"/pole-reveil\"><img src=\"/vitrine/illus/pole-1.webp\" width=\"44\" height=\"44\" alt=\"\"><strong>Réveil &amp;<br>Évangélisation</strong><small>REV</small></a>\n  <a href=\"/pole-social\"><img src=\"/vitrine/illus/pole-2.webp\" width=\"44\" height=\"44\" alt=\"\"><strong>Impact Social<br>&amp; Humanitaire</strong><small>ISH</small></a>\n  <a href=\"/pole-logistique\"><img src=\"/vitrine/illus/pole-3.webp\" width=\"44\" height=\"44\" alt=\"\"><strong>Logistique &amp;<br>Organisation</strong><small>LO</small></a>\n  <a href=\"/pole-medias\"><img src=\"/vitrine/illus/pole-4.webp\" width=\"44\" height=\"44\" alt=\"\"><strong>Communication<br>&amp; Médias</strong><small>CMR</small></a>\n  <a href=\"/pole-formation\"><img src=\"/vitrine/illus/pole-5.webp\" width=\"44\" height=\"44\" alt=\"\"><strong>Formation &amp;<br>Développement</strong><small>FDE</small></a>\n </nav>\n <div class=\"sde-pixel-panels\">\n  <section class=\"sde-pixel-prayer-panel\"><h2>LA PRIÈRE</h2><p>Nous croyons à la puissance d’un peuple uni dans l’intercession pour l’accomplissement du plan de Dieu.</p><a href=\"/priere\">Rejoindre la chaîne de prière ›</a></section>\n  <section class=\"sde-pixel-support-panel\"><h2>SOUTENIR LE MOUVEMENT</h2><p>Participez à l’œuvre de Dieu à Abidjan et au-delà en soutenant les actions du mouvement.</p><a href=\"/soutenir\">Soutenir maintenant ›</a></section>\n </div>\n</section>";
  hero.insertAdjacentElement("afterend",view.firstElementChild);
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});
 else render();
})();
