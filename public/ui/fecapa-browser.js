// Consultes a FECAPA des del navegador, amb rànquings de tota la categoria desats una hora.
import {FECAPA,updateTeam,updateCompetition} from './fecapa.js';
export async function fetchDoc(file,params){
  const res=await fetch(FECAPA+file,{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('FECAPA no respon.');
  const html=await res.text();if(html.length<30)throw Error('FECAPA ha retornat una resposta buida.');
  return new DOMParser().parseFromString(html,'text/html');
}
// RFEP és el mateix servidor (sidgad) amb una altra carpeta; des del navegador respon bé.
export const RFEP=FECAPA.replace(/fecapa\/$/,'rfep/');
export async function fetchRfepDoc(file,params){
  const res=await fetch(RFEP+file.replace(/^fecapa_/,'rfep_'),{method:'POST',body:new URLSearchParams({...params,site_lang:'es',lang:'es'}),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('RFEP no respon.');
  const html=await res.text();if(html.length<30)throw Error('RFEP ha retornat una resposta buida.');
  return new DOMParser().parseFromString(html,'text/html');
}
export async function refreshTeam(team,data){
  const url=new URL('./'+team.file,import.meta.url);
  url.searchParams.set('refresh',Date.now());
  try{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(response.ok){
      const published=await response.json();
      if(published.team===data.team&&published.season===data.season&&
        Array.isArray(published.matches)&&published.matches.length&&
        Date.parse(published.updatedAt)>Date.parse(data.updatedAt)){
        return {data:published,failed:0,published:true};
      }
    }
  }catch{}
  return updateTeam(team,data,team.provider==='rfep'?fetchRfepDoc:fetchDoc);
}
const compKey=team=>'shum-comp:'+team.id;
export function readCompetitionCache(team){
  try{const c=JSON.parse(localStorage.getItem(compKey(team)));if(c?.version!==3||c.team!==team.id||!Array.isArray(c.matches)||c.matches.length>4000)return null;return c;}catch{return null;}
}
export async function fetchCompetition(team,previous,onProgress){
  const result=await updateCompetition(team,previous,fetchDoc,onProgress);
  try{localStorage.setItem(compKey(team),JSON.stringify(result));}catch{}
  return result;
}
