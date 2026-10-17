// Consultes a FECAPA des del navegador, amb rànquings de tota la categoria desats una hora.
import {FECAPA,updateTeam,updateCompetition} from './fecapa.js';
export async function fetchDoc(file,params){
  const res=await fetch(FECAPA+file,{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('FECAPA no respon.');
  const html=await res.text();if(html.length<30)throw Error('FECAPA ha retornat una resposta buida.');
  return new DOMParser().parseFromString(html,'text/html');
}
export const refreshTeam=async(team,data)=>{if(team.provider!=='rfep')return updateTeam(team,data,fetchDoc);const res=await fetch(new URL('./'+team.file+'?refresh='+Date.now(),import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('No s’han pogut recarregar les dades RFEP.');const latest=await res.json();if(latest.team!==data.team||!latest.matches?.length)throw Error('El calendari RFEP rebut no és vàlid.');return {data:latest,failed:0};};
const compKey=team=>'shum-comp:'+team.id;
export function readCompetitionCache(team){
  try{const c=JSON.parse(localStorage.getItem(compKey(team)));if(c?.version!==3||c.team!==team.id||!Array.isArray(c.matches)||c.matches.length>4000)return null;return c;}catch{return null;}
}
export async function fetchCompetition(team,previous,onProgress){
  const result=await updateCompetition(team,previous,fetchDoc,onProgress);
  try{localStorage.setItem(compKey(team),JSON.stringify(result));}catch{}
  return result;
}
