// Actualitza les dades de tots els equips del SHUM (public/ui/teams.json) amb el calendari i les actes de FECAPA.
// L'executa la tasca programada de GitHub (.github/workflows/pages.yml). També es pot executar a mà:
//   npm install --no-save linkedom@0.18.12 && node scripts/update-teams.mjs
// Si un equip falla (FECAPA no respon, canvia el format...), aquell equip conserva l'última còpia bona.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {updateTeam,groupLabel,calendarRequest,FECAPA} from '../public/ui/fecapa.js';

const ui=new URL('../public/ui/',import.meta.url);
const readJSON=async url=>{try{return JSON.parse(await readFile(url,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};

export async function updateAll(fetchDoc,{now=Date.now(),log=console.log}={}){
  const config=await readJSON(new URL('teams.json',ui));
  const calendars=new Map();let changedFiles=0,errors=0,configChanged=false;
  for(const team of config.teams){
    try{
      const teamFetch=team.provider==='rfep'?(file,params)=>fetchDoc('../rfep/'+file.replace(/^fecapa_/,'rfep_'),{...params,site_lang:'es',lang:'es'}):fetchDoc;
      if(!calendars.has(team.idc))calendars.set(team.idc,await teamFetch(...calendarRequest(team.idc)));
      const calendar=calendars.get(team.idc),group=team.provider==='rfep'?team.group:groupLabel(calendar,team.phase);
      if(team.group!==group){team.group=group;configChanged=true;}
      const file=new URL(team.file,ui),before=await readJSON(file);
      const {data,changed,failed,read}=await updateTeam({...team,season:config.season},before,teamFetch,{calendar,now,log:m=>log(`${team.id}: ${m}`)});
      if(changed){await mkdir(new URL('.',file),{recursive:true});await writeFile(file,JSON.stringify(data,null,1)+'\n');changedFiles++;}
      log(`${team.id}: ${data.matches.filter(m=>m.score).length}/${data.matches.length} jugats · ${read} actes llegides${failed?` · ${failed} no disponibles`:''}${changed?' · actualitzat':''}`);
    }catch(e){errors++;log(`${team.id}: ERROR ${e.message} (es conserven les dades anteriors)`);}
  }
  if(configChanged)await writeFile(new URL('teams.json',ui),JSON.stringify(config,null,1)+'\n');
  return {changedFiles,errors,configChanged};
}

async function main(){
  const {DOMParser}=await import('linkedom');
  const fetchDoc=async(file,params)=>{
    for(let attempt=1;;attempt++){
      try{
        const res=await fetch(FECAPA+file,{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(30000)});
        if(!res.ok)throw Error('HTTP '+res.status);
        const html=await res.text();if(html.length<30)throw Error('resposta buida');
        return new DOMParser().parseFromString(html,'text/html');
      }catch(e){if(attempt>=3)throw e;await new Promise(r=>setTimeout(r,3000*attempt));}
    }
  };
  const {changedFiles,errors}=await updateAll(fetchDoc);
  console.log(`${changedFiles} equips actualitzats${errors?` · ${errors} amb errors`:''}.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
