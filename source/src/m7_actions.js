  Object.assign(A, {
    /* Accueil · Ézéchiel 37 */
    "hero-verset": (t) => { changerVerset(Number(t.dataset.i) || 0); clearInterval(HERO.timer); HERO.timer = 0; initHero(); },
    souffle: () => souffler(),
    "aller-chambre": () => allerA("chambre"),
    "aller-ia": () => allerA("assistant"),
    "aller-sous": (t) => allerA(t.dataset.vueCible, t.dataset.sous),
  });
