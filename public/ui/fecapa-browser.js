// Consultes a FECAPA des del navegador, amb rànquings de tota la categoria desats una hora.
import {FECAPA,updateTeam,updateCompetition} from './fecapa.js';
export async function fetchDoc(file,params){
  const res=await fetch(FECAPA+file,{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('FECAPA no respon.');
  const html=await res.text();if(html.length<30)throw Error('FECAPA ha retornat una resposta buida.');
  return new DOMParser().parseFromString(html,'text/html');
}
export const refreshTeam=(team,data)=>updateTeam(team,data,team.provider==='rfep'?async(file,params)=>{const res=await fetch('https://www.server2.sidgad.es/rfep/'+file.replace(/^fecapa_/,'rfep_'),{method:'POST',body:new URLSearchParams({...params,site_lang:'es',lang:'es'}),signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('RFEP no respon.');const html=await res.text();if(html.length<30)throw Error('RFEP ha retornat una resposta buida.');return new DOMParser().parseFromString(html,'text/html');}:fetchDoc);
const compKey=team=>'shum-comp:'+team.id;
export function readCompetitionCache(team){
  try{const c=JSON.parse(localStorage.getItem(compKey(team)));if(c?.version!==3||c.team!==team.id||!Array.isArray(c.matches)||c.matches.length>4000)return null;return c;}catch{return null;}
}
export async function fetchCompetition(team,previous,onProgress){
  const result=await updateCompetition(team,previous,fetchDoc,onProgress);
  try{localStorage.setItem(compKey(team),JSON.stringify(result));}catch{}
  return result;
}
