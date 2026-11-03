/* Pare-feu de recette : les requêtes sont vérifiées AVANT de sortir du navigateur.
 * Autoriser uniquement le login et les deux API de lecture historiques.
 * Ne contient aucun secret et peut être testé sans Playwright. */
export function lectureDeRecetteAutorisee({method,pathname,body}){
  if(method==='GET'||method==='HEAD')return true;
  if(method!=='POST')return false;
  if(pathname==='/api/connexion')return true;
  if(pathname!=='/api/db'&&pathname!=='/api/sync')return false;
  let data;
  try{data=typeof body==='string'?JSON.parse(body):body}
  catch{return false}
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  if(pathname==='/api/db'){
    return ['get','query'].includes(data.op) &&
      typeof data.path==='string'&&data.path.length>0&&data.path.length<=320 &&
      !Object.hasOwn(data,'data');
  }
  if(!Array.isArray(data.subs)||data.subs.length>80)return false;
  return data.subs.every(s=>s&&typeof s==='object'&&!Array.isArray(s)&&
    typeof s.path==='string'&&s.path.length>0&&s.path.length<=320);
}
