// Actualitza calendaris i actes de FECAPA i RFEP, amb HoqueiHub com a font alternativa per als partits.
// L'executa la tasca programada de GitHub (.github/workflows/pages.yml). També es pot executar a mà:
//   npm install --no-save linkedom@0.18.12 && node scripts/update-teams.mjs
// Si un equip falla (FECAPA no respon, canvia el format...), aquell equip conserva l'última còpia bona.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {updateTeam,groupLabel,calendarRequest,FECAPA} from '../public/ui/fecapa.js';
import {fetchHubCalendar,mergeHubCalendar} from './hoqueihub.mjs';

export function sourceHeaders(file){
  const origin=file.startsWith('../rfep/')?'https://www.hockeypatines.fep.es':'https://www.hoqueipatins.fecapa.cat';
  return {Origin:origin,Referer:origin+'/'};
}

const ui=new URL('../public/ui/',import.meta.url);
const readJSON=async url=>{try{return JSON.parse(await readFile(url,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};

export async function updateAll(fetchDoc,{now=Date.now(),log=console.log,provider,fetchHub}={}){
  const config=await readJSON(new URL('teams.json',ui));
  const hubSeasonSuffix='-temporada-'+config.season.replace('/','-');
  const calendars=new Map(), hubCalendars=new Map();
  let changedFiles=0,errors=0,checked=0,configChanged=false;
  for(const team of config.teams.filter(t=>!provider||(t.provider||'fecapa')===provider)){
    try{
      const teamFetch=team.provider==='rfep'?(file,params)=>fetchDoc('../rfep/'+file.replace(/^fecapa_/,'rfep_'),{...params,site_lang:'es',lang:'es'}):fetchDoc;
      const key=(team.provider||'fecapa')+':'+team.idc;
      const file=new URL(team.file,ui),before=await readJSON(file);
      const logTeam=m=>log(`${team.id}: ${m}`);
      let result, usingHub=false;
      try{
        if(!calendars.has(key))calendars.set(key,teamFetch(...calendarRequest(team.idc)));
        const calendar=await calendars.get(key),group=team.provider==='rfep'?team.group:groupLabel(calendar,team.phase);
        result=await updateTeam({...team,group,season:config.season},before,teamFetch,{calendar,now,log:logTeam});
        if(team.group!==group){team.group=group;configChanged=true;}
      }catch(error){
        if(!fetchHub||!team.hubGroup?.endsWith(hubSeasonSuffix))throw error;
        logTeam(`Calendari federatiu no disponible (${error.message}). Consultant HoqueiHub.`);
        if(!hubCalendars.has(team.hubGroup))hubCalendars.set(team.hubGroup,fetchHub(team.hubGroup));
        result=mergeHubCalendar(before,await hubCalendars.get(team.hubGroup),{now,aliases:team.hubAliases,log:logTeam});
        usingHub=true;
      }
      const {data,changed,failed,read}=result;
      if(changed){await mkdir(new URL('.',file),{recursive:true});await writeFile(file,JSON.stringify(data,null,1)+'\n');changedFiles++;}
      checked++;
      const details=usingHub?'HoqueiHub':`${read} actes llegides${failed?` · ${failed} no disponibles`:''}`;
      logTeam(`${data.matches.filter(m=>m.score).length}/${data.matches.length} jugats · ${details}${changed?' · actualitzat':''}`);
    }catch(e){errors++;log(`${team.id}: ERROR ${e.message} (es conserven les dades anteriors)`);}
  }
  if(configChanged)await writeFile(new URL('teams.json',ui),JSON.stringify(config,null,1)+'\n');
  return {changedFiles,errors,checked,configChanged};
}

async function main(){
  const {DOMParser}=await import('linkedom');
  const fetchDoc=async(file,params)=>{
    for(let attempt=1;;attempt++){
      try{
        const res=await fetch(new URL(file,FECAPA),{method:'POST',headers:sourceHeaders(file),body:new URLSearchParams(params),signal:AbortSignal.timeout(30000)});
        if(!res.ok){
          const error=new Error('HTTP '+res.status);
          error.status=res.status;
          throw error;
        }
        const html=await res.text();if(html.length<30)throw Error('resposta buida');
        return new DOMParser().parseFromString(html,'text/html');
      }catch(e){if(e.status===403||attempt>=3)throw e;await new Promise(r=>setTimeout(r,3000*attempt));}
    }
  };
  const {changedFiles,errors,checked}=await updateAll(fetchDoc,{
    provider:process.env.UPDATE_SOURCE==='rfep'?'rfep':undefined,
    fetchHub:path=>fetchHubCalendar(path,DOMParser)
  });
  console.log(`${checked} equips consultats · ${changedFiles} equips actualitzats · ${errors} amb errors.`);
  // Si no ha respost cap equip, el pas ha de quedar en vermell a GitHub (abans semblava correcte).
  if(errors&&!checked)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
