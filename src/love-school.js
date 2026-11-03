/**
 * Love School — école bonus interne à Soldiers Academy.
 * Ces six cours optionnels ne modifient ni les 24 cours / 192 h du tronc commun,
 * ni les examens, ni les attestations de l'Academy.
 * Ressources complémentaires éditées par les enseignants et coachs désignés.
 */
export const LOVE_SCHOOL = Object.freeze({
  title: "Love School",
  subtitle: "Grandir dans l’amour, la maturité affective et les relations selon le Christ",
  nature: "bonus",
  programme: "Soldiers Academy",
  certification: false,
  courses: [
    {
      id: "LS-01", title: "L’amour selon le cœur du Christ",
      theme: "Fondements spirituels et dignité",
      scriptures: ["1 Corinthiens 13.4-7", "Jean 13.34-35", "1 Jean 4.7-12"],
      objectives: ["Distinguer amour, attirance, admiration et dépendance affective.", "Reconnaître la dignité de chaque personne.", "Appliquer le respect et la vérité dans ses relations."],
      lessons: [
        {title:"Aimer sans posséder", body:"L’amour chrétien recherche le bien de l’autre et respecte sa liberté. L’affection ne donne aucun droit de surveiller, contrôler, isoler ou humilier quelqu’un. Le service mutuel doit rester volontaire et réciproque.", reflection:"Quels comportements montrent un amour patient et respectueux ?"},
        {title:"Vérité, grâce et responsabilité", body:"La grâce ne dispense ni de la vérité ni des limites. Une relation saine peut accueillir les désaccords et les excuses, sans imposer le silence à la personne blessée. La confiance se construit avec des actes constants.", reflection:"Comment exprimer un désaccord sans blesser la dignité d’autrui ?"}
      ],
      practice:"Écrivez votre définition d’une relation fondée sur la bienveillance, le respect et la vérité. Choisissez deux comportements concrets à pratiquer cette semaine."
    },
    {
      id: "LS-02", title: "Célibat, identité et maturité affective",
      theme: "Connaissance de soi et équilibre",
      scriptures: ["1 Corinthiens 7.7-9", "Psaume 139.13-18", "Philippiens 4.11-13"],
      objectives: ["Comprendre que la valeur personnelle ne dépend pas du statut matrimonial.", "Identifier ses attentes et vulnérabilités.", "Développer des amitiés et habitudes équilibrées."],
      lessons: [
        {title:"Une identité qui ne dépend pas d’un couple", body:"Le célibat n’est ni un échec ni une malédiction. Il peut être vécu comme une saison féconde d’apprentissage, de service, d’amitié et de croissance. Le mariage n’est pas une condition de dignité ou de maturité.", reflection:"Quelles qualités personnelles souhaitez-vous cultiver indépendamment de toute relation ?"},
        {title:"Cultiver une maturité intérieure", body:"Apprendre à reconnaître ses émotions, communiquer ses besoins et demander du soutien permet de vivre des liens plus libres. Les conseils spirituels peuvent accompagner ce chemin, sans remplacer un accompagnement professionnel lorsqu’il est nécessaire.", reflection:"Quelles attentes souhaitez-vous clarifier avant d’envisager un engagement ?"}
      ],
      practice:"Dressez une liste de vos valeurs, de vos priorités et de trois relations de soutien saines. Rédigez une démarche concrète pour votre croissance personnelle."
    },
    {
      id: "LS-03", title: "Discernement et choix d’une relation",
      theme: "Valeurs, compatibilité et décision",
      scriptures: ["Proverbes 4.23", "Jacques 1.5", "Amos 3.3"],
      objectives: ["Évaluer une relation sur des actes plutôt que des promesses.", "Prendre des décisions sans pression extérieure.", "Repérer les signes d’une relation déséquilibrée."],
      lessons: [
        {title:"Des valeurs partagées, des décisions libres", body:"Discutez des convictions, du caractère, de la communication, des projets, de la famille et des responsabilités matérielles. Une compatibilité spirituelle ne supprime pas le besoin de confiance, d’écoute et de respect.", reflection:"Quelles questions importantes devriez-vous poser avec transparence ?"},
        {title:"Reconnaître les signaux d’alerte", body:"Mensonges répétés, menaces, contrôle des contacts, manipulation religieuse, jalousie coercitive et pression à l’engagement sont des signaux à prendre au sérieux. Nul ne doit être contraint d’accepter une relation au nom d’une prophétie ou d’une autorité spirituelle.", reflection:"Vers qui demander conseil dans un cadre confidentiel et sûr ?"}
      ],
      practice:"Créez une grille personnelle de discernement : valeurs essentielles, éléments à discuter, limites non négociables et personnes de confiance."
    },
    {
      id: "LS-04", title: "Communication, pardon et gestion des conflits",
      theme: "Écoute, paroles et réparation",
      scriptures: ["Jacques 1.19", "Éphésiens 4.25-32", "Proverbes 15.1"],
      objectives: ["Pratiquer l’écoute active.", "Exprimer besoins et désaccords sans agressivité.", "Distinguer pardon, réconciliation et obligation de rester."],
      lessons: [
        {title:"Parler et écouter avec justesse", body:"Décrivez les faits, exprimez vos ressentis à la première personne, écoutez sans interrompre et reformulez avant de répondre. Le but d’un conflit constructif n’est pas de gagner mais de comprendre et de chercher des solutions.", reflection:"Quelle formulation remplacerait une accusation dans une conversation difficile ?"},
        {title:"Pardonner sans normaliser la violence", body:"Le pardon est un chemin personnel qui ne signifie pas excuser des violences, retrouver immédiatement la confiance ou maintenir une relation dangereuse. La sécurité et les limites doivent primer; une aide appropriée peut être indispensable.", reflection:"Quelles différences voyez-vous entre pardonner, faire confiance et se réconcilier ?"}
      ],
      practice:"Rédigez un dialogue fictif où deux personnes discutent d’un désaccord en utilisant écoute active, clarification et limites respectueuses."
    },
    {
      id: "LS-05", title: "Limites, respect et consentement",
      theme: "Sécurité et liberté personnelle",
      scriptures: ["1 Corinthiens 6.19-20", "Philippiens 2.3-4", "Galates 5.13"],
      objectives: ["Expliquer les limites personnelles et le consentement libre.", "Respecter un refus sans insister.", "Identifier les voies d’aide en cas de pression ou de violence."],
      lessons: [
        {title:"Respecter la liberté et les limites", body:"Une relation saine respecte les limites émotionnelles, physiques, numériques et spirituelles de chacun. Le consentement doit être volontaire, clair et révocable; le silence ou la peur ne valent pas accord. Aucune position de responsabilité ne justifie une pression.", reflection:"Comment accueillir un non sans le contester ou le culpabiliser ?"},
        {title:"Protéger la confidentialité et la sécurité", body:"Ne partagez pas les confidences, photos ou messages privés sans accord. En situation de menace ou de violence, cherchez d’abord la sécurité et l’appui de personnes ou services compétents. Aucun entretien pastoral ne doit forcer des révélations intimes.", reflection:"Quel recours sûr et confidentiel existe dans votre environnement ?"}
      ],
      practice:"Définissez vos propres limites relationnelles et préparez trois phrases pour les exprimer avec fermeté et respect. Ne remettez aucune information personnelle sensible."
    },
    {
      id: "LS-06", title: "Engagement, mariage et construction du foyer",
      theme: "Alliance, service mutuel et projets",
      scriptures: ["Éphésiens 5.21", "Colossiens 3.12-15", "Luc 14.28"],
      objectives: ["Comprendre le sens d’un engagement mûrement choisi.", "Préparer un dialogue sur les responsabilités familiales.", "Élaborer des projets communs réalistes."],
      lessons: [
        {title:"Bâtir sur la confiance et la réciprocité", body:"Un engagement durable demande fidélité, écoute, responsabilité partagée et liberté de consentement. Les convictions spirituelles nourrissent le service mutuel; elles ne légitiment ni domination ni mauvais traitements.", reflection:"Comment favoriser le respect mutuel dans les décisions importantes ?"},
        {title:"Préparer les réalités quotidiennes", body:"Discutez des finances, des habitudes de vie, des enfants, des familles, du travail, des conflits, de la santé et des attentes réciproques. Les questions importantes se traitent dans le dialogue et peuvent bénéficier d’un accompagnement approprié.", reflection:"Quels sujets pratiques un couple devrait-il aborder avant de s’engager ?"}
      ],
      practice:"Construisez une feuille de route fictive comportant cinq sujets de dialogue, des objectifs partagés et une méthode de décision concertée."
    }
  ]
});
export const LOVE_SCHOOL_IDS = Object.freeze(LOVE_SCHOOL.courses.map(c=>c.id));
