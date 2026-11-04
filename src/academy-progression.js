/* Soldiers Academy — progression par leçon.
   - L'apprenant marque lui-même chaque ressource (vidéo, leçon, document, exercice d'entraînement) comme terminée.
   - La progression est un repère d'apprentissage : elle ne modifie ni les notes, ni la présence, ni les attestations.
   - Seules les ressources déjà visibles par l'apprenant comptent (cours ouvert, niveau ouvert, bibliothèque générale).
   - Love School est volontairement exclu : aucune donnée de suivi n'y est conservée (voir love-school.js). */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";

const IDS_COURS=PROGRAMME.courses.map(c=>c.id);
const NIVEAU=Object.fromEntries(PROGRAMME.courses.map(c=>[c.id,c.level]));
export const ID_RESSOURCE=/^[a-z0-9]{8,40}$/;

export async function initProgression(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_progres (compte TEXT NOT NULL, ressource TEXT NOT NULL, fait_le INTEGER NOT NULL, PRIMARY KEY(compte,ressource))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_progres_ressource ON academy_2027_progres(ressource)").run();
}

/* Ressources visibles à plat : celles des cours ouverts puis la bibliothèque générale. */
export function ressourcesVisibles({parCours={},generales=[]}){
  return [...Object.values(parCours).flat(),...generales];
}

/* Calcule la vue de progression d'un apprenant à partir des ressources qu'il peut voir.
   `parCours` : { "SA-01": [ressource…] } dans l'ordre d'affichage (plus récentes d'abord) ; on reprend dans l'ordre chronologique. */
export async function progressionVue(env,compte,biblio){
  await initProgression(env);
  const lignes=(await env.DB.prepare("SELECT ressource FROM academy_2027_progres WHERE compte=? LIMIT 3000").bind(String(compte)).all()).results||[];
  const faites=new Set(lignes.map(l=>l.ressource));
  const parCours=biblio?.parCours||{},generales=biblio?.generales||[];
  const cours={},niveaux={1:{fait:0,total:0},2:{fait:0,total:0},3:{fait:0,total:0}};
  const chrono=l=>[...l].sort((a,b)=>(a.cree-b.cree)||String(a.id).localeCompare(String(b.id)));
  let reprendre=null;
  for(const id of IDS_COURS){
    const l=parCours[id];if(!l?.length)continue;
    const ordre=chrono(l),f=ordre.filter(r=>faites.has(r.id)).length;
    cours[id]={fait:f,total:ordre.length};
    const n=niveaux[NIVEAU[id]];if(n){n.fait+=f;n.total+=ordre.length}
    if(!reprendre){
      const suivante=ordre.find(r=>!faites.has(r.id));
      if(suivante)reprendre={id:suivante.id,portee:id,titre:suivante.titre,type:suivante.type};
    }
  }
  const gen={fait:generales.filter(r=>faites.has(r.id)).length,total:generales.length};
  const visibles=ressourcesVisibles({parCours,generales});
  const total=visibles.length,fait=visibles.filter(r=>faites.has(r.id)).length;
  return {
    faites:visibles.filter(r=>faites.has(r.id)).map(r=>r.id),
    cours,niveaux,generale:gen,
    total:{fait,total,pourcentage:total?Math.round(fait/total*100):0},
    reprendre
  };
}

/* Marque ou démarque une ressource. Vérifie qu'elle fait bien partie des ressources visibles de l'apprenant. */
export async function marquerRessource(env,compte,biblio,{ressource,fait}){
  if(typeof ressource!=="string"||!ID_RESSOURCE.test(ressource))return {erreur:"Ressource inconnue.",statut:400};
  if(typeof fait!=="boolean")return {erreur:"Indiquez si la ressource est terminée (vrai ou faux).",statut:400};
  if(!ressourcesVisibles(biblio).some(r=>r.id===ressource))return {erreur:"Cette ressource n'est pas disponible dans votre parcours.",statut:403};
  await initProgression(env);
  if(fait)await env.DB.prepare("INSERT OR IGNORE INTO academy_2027_progres(compte,ressource,fait_le) VALUES(?,?,?)").bind(String(compte),ressource,Date.now()).run();
  else await env.DB.prepare("DELETE FROM academy_2027_progres WHERE compte=? AND ressource=?").bind(String(compte),ressource).run();
  return {ok:true};
}

/* Nombre d'apprenants ayant terminé chaque ressource (sans noms) pour l'équipe pédagogique.
   `auteur` limite aux ressources d'un enseignant ; null pour la direction. */
export async function terminesParRessource(env,{auteur=null}={}){
  await initProgression(env);
  const sql="SELECT p.ressource AS id,COUNT(*) AS n FROM academy_2027_progres p JOIN academy_2027_ressources r ON r.id=p.ressource"+(auteur?" WHERE r.auteur=?":"")+" GROUP BY p.ressource LIMIT 2000";
  const r=await env.DB.prepare(sql).bind(...(auteur?[String(auteur)]:[])).all();
  return Object.fromEntries((r.results||[]).map(x=>[x.id,Number(x.n)]));
}
