export const INFIRE_START=Date.parse('2026-10-31T08:30:00Z');
export const INFIRE_END=Date.parse('2026-10-31T18:00:00Z');
export function infireState(now=Date.now()){
 if(now>=INFIRE_END)return {phase:'finished',days:0,hours:0,minutes:0,seconds:0};
 if(now>=INFIRE_START)return {phase:'ongoing',days:0,hours:0,minutes:0,seconds:0};
 const total=Math.max(0,Math.floor((INFIRE_START-now)/1000));
 return {phase:'upcoming',days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60};
}
