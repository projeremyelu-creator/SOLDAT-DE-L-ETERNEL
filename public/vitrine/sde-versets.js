/* Méditation biblique en fondu doux, contrôlable et compteur de visites vérifiées. */
(() => {
  "use strict";
  const VERSETS = [
    ["Et l’esprit entra en eux, et ils reprirent vie, et ils se tinrent sur leurs pieds : c’était une armée nombreuse, très nombreuse.", "Ézéchiel 37.10"],
    ["Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent !", "Ézéchiel 37.9"],
    ["Je mettrai mon esprit en vous, et vous vivrez.", "Ézéchiel 37.14"],
    ["Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.", "Jean 3.16"],
    ["L’Éternel est mon berger : je ne manquerai de rien.", "Psaume 23.1"],
    ["Je puis tout par celui qui me fortifie.", "Philippiens 4.13"],
    ["Mais ceux qui se confient en l’Éternel renouvellent leur force. Ils prennent le vol comme les aigles ; ils courent, et ne se lassent point, ils marchent, et ne se fatiguent point.", "Ésaïe 40.31"],
    ["Fortifie-toi et prends courage ? Ne t’effraie point et ne t’épouvante point, car l’Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.", "Josué 1.9"],
    ["Souffre avec moi, comme un bon soldat de Jésus-Christ.", "2 Timothée 2.3"],
    ["Au reste, fortifiez-vous dans le Seigneur, et par sa force toute-puissante.", "Éphésiens 6.10"],
    ["Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu.", "Romains 8.28"],
    ["Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.", "Matthieu 6.33"],
    ["Confie-toi en l’Éternel de tout ton cœur, et ne t’appuie pas sur ta sagesse.", "Proverbes 3.5"],
    ["Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.", "Psaume 46.2"],
    ["Car je connais les projets que j’ai formés sur vous, dit l’Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l’espérance.", "Jérémie 29.11"],
    ["Mais vous recevrez une puissance, le Saint-Esprit survenant sur vous, et vous serez mes témoins… jusqu’aux extrémités de la terre.", "Actes 1.8"],
    ["Ce n’est ni par la puissance ni par la force, mais c’est par mon esprit, dit l’Éternel des armées.", "Zacharie 4.6"],
    ["Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l’intelligence.", "Romains 12.2"],
    ["J’ai été crucifié avec Christ ; et si je vis, ce n’est plus moi qui vis, c’est Christ qui vit en moi.", "Galates 2.20"],
    ["Or la foi est une ferme assurance des choses qu’on espère, une démonstration de celles qu’on ne voit pas.", "Hébreux 11.1"],
    ["Veillez, demeurez fermes dans la foi, soyez des hommes, fortifiez-vous.", "1 Corinthiens 16.13"],
    ["Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", "Psaume 119.105"],
    ["Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu ; je te fortifie, je viens à ton secours.", "Ésaïe 41.10"],
    ["Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit.", "Matthieu 28.19"],
    ["Car je n’ai point honte de l’Évangile : c’est une puissance de Dieu pour le salut de quiconque croit.", "Romains 1.16"],
    ["Si mon peuple sur qui est invoqué mon nom s’humilie, prie, et cherche ma face… je guérirai son pays.", "2 Chroniques 7.14"],
    ["Persévérez dans la prière, veillez-y avec actions de grâces.", "Colossiens 4.2"],
    ["Car nous n’avons pas à lutter contre la chair et le sang, mais contre les dominations, contre les autorités, contre les princes de ce monde de ténèbres.", "Éphésiens 6.12"],
    ["La joie de l’Éternel sera votre force.", "Néhémie 8.10"],
    ["Les bontés de l’Éternel ne sont pas épuisées, ses compassions ne sont pas à leur terme ; elles se renouvellent chaque matin.", "Lamentations 3.22-23"],
    ["Après cela, je répandrai mon esprit sur toute chair ; vos fils et vos filles prophétiseront.", "Joël 2.28"]
  ];
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body?.dataset.motion === "paused";

  /* Verset du jour : même verset pour tous le même jour (heure d'Abidjan = UTC). */
  function versetsDuJour() {
    const j = Math.floor(Date.now() / 86400000);
    const debut = j % VERSETS.length;
    return Array.from({ length: 6 }, (_, i) => VERSETS[(debut + i) % VERSETS.length]);
  }
  /* Méditation discrète : un seul verset à la fois, sans piste défilante ni DOM dupliqué.
     Les versets courts sont montrés en entier, un nouveau toutes les 7 secondes. */
  function installerBande() {
    if (document.querySelector(".sde-versets") || /^\/(mon-espace|administration|connexion)/.test(location.pathname)) return;
    const ancre = document.querySelector(".site-header") || document.querySelector("header.entete");
    if (!ancre) return;
    const courts = VERSETS.filter(([texte]) => texte.length <= 115);
    const jour = Math.floor(Date.now() / 86400000);
    const liste = Array.from({ length: 6 }, (_, i) => courts[(jour + i) % courts.length]);
    const bande = el("section", "sde-versets sde-versets-fondu");
    bande.setAttribute("aria-label", "Méditation biblique du jour");
    const tag = el("span", "sde-versets-tag", "Verset du jour");
    const fenetre = el("div", "sde-versets-fenetre");
    const verset = el("div", "sde-verset jour");
    const phrase = el("q", "sde-verset-phrase");
    const reference = el("cite", "sde-verset-reference");
    verset.append(phrase,reference);
    fenetre.append(verset);
    let index = 0, arrete = calme(), transition = null;
    const afficher = () => {
      phrase.textContent = liste[index][0];
      reference.textContent = liste[index][1];
    };
    afficher();
    const pause = el("button", "sde-versets-pause");
    pause.type = "button";
    const icone = document.createElementNS("http://www.w3.org/2000/svg","svg");
    icone.setAttribute("viewBox","0 0 24 24");
    icone.setAttribute("fill","none");
    icone.setAttribute("stroke","currentColor");
    icone.setAttribute("stroke-width","1.75");
    icone.setAttribute("stroke-linecap","round");
    icone.setAttribute("aria-hidden","true");
    const dessiner = () => {
      icone.replaceChildren();
      if (arrete) {
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d","M8 5v14l11-7z");icone.append(path);
      } else {
        for (const x of [7,15]) {
          const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
          rect.setAttribute("x",String(x));rect.setAttribute("y","5");
          rect.setAttribute("width","3");rect.setAttribute("height","14");rect.setAttribute("rx","1");
          icone.append(rect);
        }
      }
      pause.setAttribute("aria-pressed",String(arrete));
      pause.setAttribute("aria-label",arrete?"Reprendre les versets":"Mettre en pause les versets");
      pause.setAttribute("title",arrete?"Reprendre les versets":"Mettre en pause les versets");
    };
    pause.append(icone);
    dessiner();
    pause.addEventListener("click",() => {
      arrete = !arrete;
      if (transition !== null) {
        clearTimeout(transition);transition=null;
        verset.classList.remove("sde-verset-sortie");
      }
      dessiner();
    });
    bande.append(tag,fenetre,pause);
    const reserve=document.querySelector(".sde-versets-slot");
    if (reserve) reserve.replaceWith(bande);
    else ancre.insertAdjacentElement("afterend",bande);
    const avancer = () => {
      if (!bande.isConnected || arrete || calme() || document.hidden || transition !== null) return;
      verset.classList.add("sde-verset-sortie");
      transition = setTimeout(() => {
        index = (index + 1) % liste.length;
        afficher();
        verset.classList.remove("sde-verset-sortie");
        transition=null;
      }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350);
    };
    const minuteur = setInterval(avancer,7000);
    // Les tests et les applications monopages peuvent retirer le bandeau :
    // éviter alors de conserver un intervalle sans élément visible.
    document.addEventListener("visibilitychange",() => {
      if (document.hidden && transition !== null) {
        clearTimeout(transition);transition=null;
        verset.classList.remove("sde-verset-sortie");
      }
      if (!bande.isConnected) clearInterval(minuteur);
    });
  }

  /* Compteur de visites en temps réel */
  function installerCompteur() {
    if (/^\/(mon-espace|administration)/.test(location.pathname)) return;
    let id = "";
    try { id = sessionStorage.getItem("sde-visite-id") || ""; } catch (_) {}
    let nouvelle = !id;
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => (b % 36).toString(36)).join(""); try { sessionStorage.setItem("sde-visite-id", id); } catch (_) {} }
    const bloc = el("div", "sde-compteur");
    bloc.setAttribute("role", "status"); bloc.setAttribute("aria-live", "off");
    bloc.innerHTML = '<span class="sde-compteur-point" aria-hidden="true"></span><span><b data-k="enLigne">—</b> en ligne maintenant</span><span><b data-k="aujourdhui">—</b> visites aujourd’hui</span><span><b data-k="total">—</b> visites au total</span>';
    // Ne jamais afficher de tirets en production : insertion seulement lorsque
    // l'API renvoie trois mesures réelles et cohérentes.
    const fmt = new Intl.NumberFormat("fr-FR");
    const afficher = (d) => {
      if (!d || !["enLigne","aujourdhui","total"].every(k => Number.isSafeInteger(d[k]) && d[k] >= 0)) return;
      if (!bloc.isConnected) {
        const pied=document.querySelector(".site-footer, footer.pied, footer");
        (pied||document.body).insertAdjacentElement(pied?"afterbegin":"beforeend",bloc);
      }
      for(const k of ["enLigne","aujourdhui","total"]){
        const valeur=bloc.querySelector('[data-k="'+k+'"]');
        if(valeur)valeur.textContent=fmt.format(d[k]);
      }
    };
    const signal = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/visites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, nouvelle }), cache: "no-store" });
        if (r.ok) { nouvelle = false; afficher(await r.json()); }
      } catch (_) { /* hors ligne : le compteur garde la dernière valeur */ }
    };
    signal();
    setInterval(signal, 45000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) signal(); });
  }
  const demarrer = () => { installerBande(); installerCompteur(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
