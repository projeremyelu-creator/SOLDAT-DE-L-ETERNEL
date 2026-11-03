/**
 * Love School — école bonus interne à Soldiers Academy.
 * Ces dix cours optionnels ne modifient ni les 24 cours / 192 h du tronc commun,
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
    ,
    {
      id:"LS-07",title:"Les langages de l’amour : comprendre et se faire comprendre",
      theme:"Affection, attention et besoins relationnels",track:"relations",
      scriptures:["1 Corinthiens 13.4-7","Romains 12.10","Philippiens 2.4","Proverbes 16.24"],
      objectives:[
        "Nommer les cinq manières courantes d’exprimer l’affection sans réduire une personne à une étiquette.",
        "Identifier ses besoins et ceux d’autrui grâce au dialogue plutôt qu’aux suppositions.",
        "Adapter ses attentions dans le respect des limites et du consentement.",
        "Reconnaître que l’amour authentique se mesure aussi par la fiabilité, la sécurité et la considération."
      ],
      lessons:[
        {title:"Les cinq langages : une grille de dialogue, pas un diagnostic",body:"Un modèle populaire décrit cinq formes d’attention : paroles valorisantes, temps de qualité, gestes de service, cadeaux symboliques et contact physique. Il aide à formuler des préférences, mais n’est ni un test clinique ni une classification définitive. Les besoins évoluent selon les personnes, les cultures, les étapes de vie et le contexte. Une attention n’a de valeur que si elle est bienvenue et donnée librement.",reflection:"Parmi ces gestes, lesquels vous touchent et lesquels pourraient être mal interprétés ?"},
        {title:"Paroles valorisantes et temps de qualité",body:"Encourager ne signifie pas flatter pour obtenir quelque chose. Une parole sincère reconnaît les efforts, les qualités et les limites de l’autre. Le temps de qualité suppose disponibilité, écoute et présence réelle : éteindre les distractions, demander comment s’est passée la journée, et respecter les silences. On peut apprécier ces attentions sans vouloir être constamment disponible.",reflection:"Comment remercier quelqu’un avec une parole précise et authentique ?"},
        {title:"Services, cadeaux et contact respectueux",body:"Un service ne doit pas devenir une dette affective; un cadeau n’achète ni le pardon ni l’intimité. Le contact physique, lorsqu’il est souhaité, dépend du consentement explicite et des limites individuelles. Certaines personnes préfèrent peu de contact; leur choix doit être respecté. L’amour se manifeste davantage dans l’attention aux besoins réels que dans des performances attendues.",reflection:"Quelle attention pourriez-vous proposer sans présumer qu’elle sera acceptée ?"},
        {title:"Transformer les différences en conversation",body:"Deux personnes peuvent donner beaucoup d’attention et se sentir pourtant incomprises. Posez des questions ouvertes : « Qu’est-ce qui t’aide à te sentir soutenu ? » ou « Cette attention te convient-elle ? ». Évitez d’imposer un langage comme une obligation. Les comportements de respect, de sincérité et de sécurité priment sur toute préférence déclarée.",reflection:"Comment demander à l’autre ce qu’il souhaite, sans lui imposer votre manière d’aimer ?"}
      ],
      practice:"Élaborez un tableau personnel de cinq gestes d’attention non coûteux. Pour chacun, notez une formulation permettant de demander l’accord de l’autre. Aucun témoignage intime n’est exigé.",
      advice:"Les langages de l’amour sont un outil de conversation, pas une preuve scientifique de compatibilité ni une excuse aux comportements irrespectueux.",
      quiz:[
        {question:"Quel usage du modèle des langages de l’amour est le plus juste ?",options:["Classer définitivement chaque personne","Ouvrir une discussion sur les préférences","Exiger des gestes d’affection en retour"],answer:1,explanation:"Il s’agit d’une grille de conversation souple, non d’un diagnostic."},
        {question:"Un geste de service peut-il créer une dette affective ?",options:["Oui, automatiquement","Non : il doit rester libre et sans contrepartie imposée","Seulement si le geste est coûteux"],answer:1,explanation:"Une attention authentique ne donne pas droit à une contrepartie."},
        {question:"Que faire si quelqu’un ne souhaite pas de contact physique ?",options:["Respecter immédiatement sa limite","Insister pour lui apprendre votre langage","Supposer que son refus est un manque d’amour"],answer:0,explanation:"Le consentement et les limites priment sur les préférences."}
      ]
    },
    {
      id:"LS-08",title:"La communication dans les relations",
      theme:"Écoute active, émotions et gestion des désaccords",track:"relations",
      scriptures:["Jacques 1.19","Éphésiens 4.29","Proverbes 18.13","Matthieu 18.15"],
      objectives:[
        "Développer une écoute active sans interruption ni jugement.",
        "Exprimer les émotions et besoins avec des messages à la première personne.",
        "Apprendre à réparer une incompréhension et poser des limites.",
        "Identifier la différence entre conflit ordinaire et violence relationnelle."
      ],
      lessons:[
        {title:"Écouter pour comprendre, pas pour gagner",body:"Accueillez ce que l’autre exprime en reformulant les faits et les ressentis avant de répondre. Une bonne écoute ne suppose pas d’être d’accord; elle indique que la parole a été prise au sérieux. Demandez : « Ai-je bien compris ce qui t’a blessé ? ». Ne transformez pas une confidence en argument à retourner contre la personne.",reflection:"Quelle question ouverte aiderait à comprendre une situation sans présumer de l’intention ?"},
        {title:"Parler avec vérité, douceur et précision",body:"Décrivez un comportement observable, votre ressenti, votre besoin et une demande concrète, sans étiqueter l’autre. Par exemple : « Quand notre rendez-vous change sans message, je me sens déstabilisé. Pouvons-nous nous prévenir plus tôt ? ». L’usage de « je » n’exclut pas la fermeté ni le droit de refuser un comportement.",reflection:"Reformulez une phrase accusatrice en demande claire et respectueuse."},
        {title:"Désaccords, pauses et réparation",body:"Dans une discussion tendue, chacun peut demander une pause avec un moment convenu pour reprendre. Reconnaître précisément son tort et proposer une réparation est plus utile que de simples excuses répétées. Le pardon ne contraint pas à reprendre une relation, particulièrement en cas de violence, d’intimidation ou d’emprise.",reflection:"Quel accord simple pourrait éviter une escalade lors d’un prochain désaccord ?"},
        {title:"Messages numériques et communication au quotidien",body:"Évitez de régler des questions sensibles sous le coup de la colère par des messages écrits ambigus. Clarifiez l’intention d’une phrase avant de conclure à une attaque, respectez les horaires et le droit à la déconnexion. Le suivi du téléphone, les mots de passe exigés et l’isolement imposé ne sont pas des preuves d’amour.",reflection:"Quels accords numériques contribueraient à protéger la confiance et l’autonomie ?"}
      ],
      practice:"Écrivez un dialogue fictif de huit répliques sur un retard ou un projet commun : écoute, message en « je », reformulation, proposition, limite et réparation. Gardez cet exercice privé.",
      advice:"Lorsque la relation implique menace, violence ou contrôle, recherchez un soutien sûr et spécialisé plutôt qu’une simple médiation de couple.",
      quiz:[
        {question:"Quel est le meilleur début pour aborder un désaccord ?",options:["« Tu fais toujours tout mal »","« Quand cela arrive, je ressens… et j’aimerais… »","« Si tu m’aimais, tu saurais »"],answer:1,explanation:"Décrire un fait, son ressenti et une demande favorise la compréhension."},
        {question:"Une pause pendant un conflit est utile si…",options:["Elle sert à punir l’autre par le silence","Elle évite toute discussion future","Elle permet de se calmer avec une reprise convenue"],answer:2,explanation:"La pause est une protection du dialogue, pas une sanction."},
        {question:"Que signifie écouter activement ?",options:["Reformuler avant de répondre","Donner immédiatement un conseil","Accepter toute demande sans réserve"],answer:0,explanation:"Comprendre et reformuler n’oblige pas à être d’accord."}
      ]
    },
    {
      id:"LS-09",title:"Positions sexuelles : confort, respect et sécurité",
      theme:"Intimité adulte, confort corporel et dialogue",track:"intimite",adultOnly:true,
      scriptures:["Genèse 2.24","1 Corinthiens 7.3-5","Éphésiens 5.21","1 Corinthiens 13.5"],
      objectives:[
        "Comprendre qu’aucune position n’est obligatoire ni universellement préférable.",
        "Identifier les critères de confort, de mobilité et de respect du corps.",
        "Parler des préférences et des limites sans gêne ni pression.",
        "Savoir interrompre une activité douloureuse et demander un avis de santé."
      ],
      lessons:[
        {title:"Une intimité consentie, jamais exigée",body:"Dans la relation entre adultes, chaque partenaire conserve le droit de vouloir, de refuser ou d’interrompre l’intimité à tout moment. Un engagement religieux ou matrimonial ne constitue pas un consentement permanent. L’écoute, la confiance et la sécurité comptent davantage qu’une attente de performance. Parler sereinement des limites précède toute exploration.",reflection:"Comment demander l’accord de l’autre et accueillir un refus sans culpabilisation ?"},
        {title:"Grandes familles de positions et confort",body:"Les positions d’intimité peuvent être envisagées de façon descriptive et non graphique : face à face, sur le côté, en position assise ou avec un partenaire au-dessus de l’autre. Leur pertinence dépend de la mobilité, de la fatigue, de la grossesse éventuelle, de douleurs préexistantes et des préférences. Il n’existe pas de classement universel. Aucune position sexuelle n’empêche à elle seule une grossesse ou une infection sexuellement transmissible.",reflection:"Pourquoi les préférences et la mobilité de deux personnes doivent-elles guider leur choix plutôt qu’une comparaison ?"},
        {title:"Adapter, ralentir et respecter le signal de douleur",body:"Une gêne persistante ou une douleur ne doit jamais être endurée pour satisfaire l’autre. Une communication simple — « Est-ce confortable ? », « Préférons-nous arrêter ? » — permet de réévaluer les besoins. Les appuis et positions inconfortables peuvent être évités; la sécurité prime sur l’effort physique. En présence de douleurs répétées, de saignements inhabituels ou de difficultés persistantes, consultez un professionnel de santé.",reflection:"Quelle phrase permettrait de demander une adaptation ou un arrêt sans craindre d’être jugé ?"},
        {title:"Intimité, prévention et situations particulières",body:"Les positions ne remplacent ni les moyens de prévention des IST ni la contraception. Il est possible de discuter avec un professionnel de santé des méthodes adaptées à la situation du couple. Pendant une grossesse, après un accouchement, en cas de handicap ou de maladie, les besoins peuvent varier; une orientation médicale individualisée aide à éviter les risques. Les contenus de cette leçon ne remplacent pas une consultation.",reflection:"Quelles questions de santé pourriez-vous poser à un professionnel plutôt que de vous fier aux idées reçues ?"}
      ],
      practice:"Sur une fiche personnelle non transmise, rédigez trois règles de confort et de consentement pour une intimité adulte respectueuse. Aucune description de vie sexuelle personnelle ni photographie n’est demandée.",
      advice:"Pour adultes uniquement, sur déclaration de majorité. Informations générales, non graphiques. En cas de douleur ou de symptômes, privilégiez un avis médical.",
      quiz:[
        {question:"Une position sexuelle garantit-elle l’absence de grossesse ou d’IST ?",options:["Oui, certaines positions le garantissent","Non, la position ne remplace pas la prévention","Oui, lorsque les partenaires sont mariés"],answer:1,explanation:"La prévention repose sur des méthodes adaptées et, selon le cas, le dépistage."},
        {question:"Si une activité est douloureuse, quelle attitude convient ?",options:["Continuer par obligation","Ignorer le ressenti","Arrêter, communiquer et consulter si la douleur persiste"],answer:2,explanation:"Aucune personne ne doit subir une activité douloureuse ou non consentie."},
        {question:"Le consentement dans un couple marié est-il permanent ?",options:["Non, il demeure libre et révocable","Oui, le mariage suffit","Oui, si le sujet n’a pas été discuté"],answer:0,explanation:"Un engagement n’annule jamais le droit de refuser."}
      ]
    },
    {
      id:"LS-10",title:"Sexualité approfondie : santé, désir et intimité responsable",
      theme:"Santé sexuelle, prévention, émotions et accompagnement",track:"intimite",adultOnly:true,
      scriptures:["1 Corinthiens 6.19-20","1 Corinthiens 7.3-5","Proverbes 4.23","Éphésiens 5.21"],
      objectives:[
        "Présenter la sexualité comme une dimension physique, psychologique, émotionnelle et relationnelle de la santé adulte.",
        "Comprendre la variabilité du désir, l’importance de l’information fiable et du consentement.",
        "Identifier les grandes mesures de prévention des IST et des grossesses non planifiées.",
        "Repérer les situations nécessitant un accompagnement médical ou psychologique."
      ],
      lessons:[
        {title:"Corps, émotions et santé sexuelle globale",body:"La santé sexuelle ne se résume pas à l’absence de maladie : elle comprend le bien-être physique, émotionnel, mental et relationnel, ainsi que l’absence de contrainte. La connaissance de l’anatomie, des changements hormonaux et de la diversité des expériences aide à prévenir les jugements et les mythes. Chacun conserve la responsabilité de ses choix et le droit à une information fiable.",reflection:"Comment distinguer un fait de santé documenté d’une opinion ou d’une pression sociale ?"},
        {title:"Désir, rythmes et dialogue dans le couple",body:"Le désir sexuel varie selon le stress, le sommeil, les traitements, la santé, les étapes de vie et la qualité de la relation. Un décalage de désir n’autorise jamais le chantage ni la pression. Les partenaires peuvent rechercher des formes d’attention, de proximité et de dialogue qui respectent les limites de chacun. Si un changement devient préoccupant ou douloureux, une consultation peut aider.",reflection:"Comment parler d’un désaccord de rythme sans accuser ni contraindre ?"},
        {title:"IST, contraception et décisions éclairées",body:"Certaines infections sexuellement transmissibles peuvent être asymptomatiques; le dépistage adapté à la situation est donc important. Les préservatifs utilisés correctement réduisent le risque de nombreuses IST et de grossesse, sans le supprimer totalement. La vaccination contre le HPV et l’hépatite B peut être pertinente selon les recommandations locales. Pour choisir une contraception et envisager une grossesse, consultez un professionnel de santé qualifié.",reflection:"Quelles questions poseriez-vous à un professionnel au sujet des méthodes de prévention et du dépistage ?"},
        {title:"Douleurs, difficultés intimes et soutien adapté",body:"Douleurs répétées, saignements inhabituels, difficultés sexuelles persistantes, détresse émotionnelle ou antécédents de violences méritent une écoute sans honte et, si nécessaire, un avis médical ou psychologique. Les causes peuvent être multiples; aucun diagnostic n’est possible à partir d’un simple cours. La prière et l’accompagnement spirituel peuvent constituer un soutien choisi librement, jamais un remplacement forcé des soins.",reflection:"Comment encourager une personne à demander de l’aide sans l’exposer à un jugement ?"},
        {title:"Respect, confidentialité et responsabilité",body:"Les confidences intimes appartiennent à la personne qui les partage. Aucun enseignant ne doit réclamer de récits sexuels, d’images intimes ou de détails médicaux pour valider cet enseignement. Le dialogue sur la vie sexuelle se construit dans la sécurité, l’empathie et le consentement. Une personne victime de violence doit pouvoir chercher protection et accompagnement sans contrainte à la réconciliation.",reflection:"Quelles garanties de discrétion et de liberté faut-il préserver dans un accompagnement ?"}
      ],
      practice:"Concevez une fiche pédagogique fictive en trois parties : communication bienveillante, prévention des IST et orientation vers un professionnel en présence de symptômes. Ne partagez aucune donnée médicale ou intime personnelle.",
      advice:"Module 18+ sur déclaration de majorité, sans évaluation intime. Les informations de santé sont générales et ne remplacent pas une consultation individuelle.",
      references:[
        {label:"OMS · Santé sexuelle",url:"https://www.who.int/en/health-topics/sexual-health"},
        {label:"CDC · Prévention des IST",url:"https://www.cdc.gov/sti/prevention/"},
        {label:"CDC · Dépistage des IST",url:"https://www.cdc.gov/sti/testing/"}
      ],
      quiz:[
        {question:"Une IST peut-elle être présente sans symptôme ?",options:["Oui, c’est possible","Non, un symptôme est toujours visible","Seulement chez les personnes âgées"],answer:0,explanation:"Le dépistage et une discussion avec un soignant restent importants selon l’exposition."},
        {question:"Le désir sexuel est-il nécessairement constant dans le temps ?",options:["Oui, chez tous les adultes","Non, il peut varier selon de nombreux facteurs","Oui, après un mariage"],answer:1,explanation:"Santé, stress, médicaments et contexte relationnel peuvent influencer le désir."},
        {question:"Une douleur intime persistante doit-elle être interprétée uniquement comme spirituelle ?",options:["Oui, sans examen","Oui, si la personne prie","Non, une évaluation médicale peut être nécessaire"],answer:2,explanation:"Une difficulté intime persistante nécessite parfois un avis clinique qualifié."}
      ]
    }

  ]
});
export const LOVE_SCHOOL_ADULT_IDS = Object.freeze(LOVE_SCHOOL.courses.filter(c=>c.adultOnly).map(c=>c.id));
export const LOVE_SCHOOL_IDS = Object.freeze(LOVE_SCHOOL.courses.map(c=>c.id));

/**
 * Recommandations de cours par étape relationnelle.
 * Filtrage purement pédagogique : pas d'enregistrement du statut matrimonial.
 * Certains cours sont partagés par plusieurs parcours ; l'accès adulte reste inchangé.
 */
export const LOVE_SCHOOL_PUBLICS = Object.freeze([
  Object.freeze({
    id:"singles",
    title:"Singles — Se préparer à aimer",
    summary:"Grandir dans son identité, discerner ses relations et développer une communication saine.",
    symbol:"♡",
    ids:Object.freeze(["LS-01","LS-02","LS-03","LS-04","LS-05","LS-07","LS-08"])
  }),
  Object.freeze({
    id:"fiances",
    title:"Fiancés — Se préparer à l’engagement",
    summary:"Se connaître, dialoguer et construire un projet de foyer fondé sur le respect et la responsabilité.",
    symbol:"◇",
    ids:Object.freeze(["LS-01","LS-03","LS-04","LS-05","LS-06","LS-07","LS-08","LS-10"])
  }),
  Object.freeze({
    id:"maries",
    title:"Mariés — Cultiver et fortifier son alliance",
    summary:"Entretenir l’amour au quotidien, communiquer et aborder l’intimité conjugale avec respect.",
    symbol:"♥",
    ids:Object.freeze(["LS-01","LS-04","LS-05","LS-06","LS-07","LS-08","LS-09","LS-10"])
  })
]);
