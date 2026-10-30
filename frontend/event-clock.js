export const INFIRE_START=Date.parse('2026-10-31T08:30:00Z');
export const INFIRE_END=Date.parse('2026-10-31T18:00:00Z');
export function infireState(now=Date.now()){
 if(now>=INFIRE_END)return {phase:'finished',days:0,hours:0,minutes:0,seconds:0};
 if(now>=INFIRE_START)return {phase:'ongoing',days:0,hours:0,minutes:0,seconds:0};
 const total=Math.max(0,Math.floor((INFIRE_START-now)/1000));
 return {phase:'upcoming',days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60};
}

// Promotion du prochain événement après IN FIRE : ne présume pas de l'heure
// de fin de TPA (non communiquée). Le bandeau s'efface à la fin de la journée.
export const TPA_START=Date.parse('2026-12-18T20:00:00Z');
export const TPA_PROMOTION_END=Date.parse('2026-12-19T00:00:00Z');
export function tpaState(now=Date.now()){
 if(now<INFIRE_END||now>=TPA_PROMOTION_END)
  return {phase:'hidden',days:0,hours:0,minutes:0,seconds:0};
 if(now>=TPA_START)
  return {phase:'day-of',days:0,hours:0,minutes:0,seconds:0};
 const total=Math.max(0,Math.floor((TPA_START-now)/1000));
 return {phase:'upcoming',days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60};
}
