// Actualitza public/ui/league.json amb el calendari, els resultats i les actes oficials de FECAPA (Infantil Or, grup 8).
// L'executa la tasca programada de GitHub (.github/workflows/pages.yml). També es pot executar a mà:
//   npm install --no-save linkedom@0.18.12 && node scripts/update-league.mjs
// Si FECAPA no respon o el format canvia, no toca el fitxer i la web continua amb l'última còpia bona.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {reconcileGoals} from '../public/ui/official-rosters.js';

export const officialNames={'SHUM FRIT RAVICH':'SHUM Frit Ravich','FENIE ENERGIA CERDANYOLA CCH B':'Cerdanyola CCH B','CH MATARÓ A':'CH Mataró A','CLUB PATÍ VOLTREGÀ C':'CP Voltregà C','VICIO PHC SANT CUGAT B':'PHC Sant Cugat B','INNOAESTHETICS HC SANT JUST A':'HC Sant Just A','CLUB PATI CUBELLES A':'CP Cubelles A'};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const cellsOf=row=>[...row.children].filter(c=>c.tagName==='TD'||c.tagName==='TH');
const lookup=name=>Object.entries(officialNames).find(([k])=>clean(name).includes(k))?.[1];

// Files del grup 8 al calendari oficial: [{round,date,time,home,away,score,officialId}]
export function parseCalendar(doc){
  const table=doc.querySelector('.content_fase_4924');
  if(!table)throw Error('No s’ha trobat el grup 8 al calendari.');
  const rows=[];
  for(const r of table.querySelectorAll('tr')){
    const c=[...r.querySelectorAll('td')].map(x=>clean(x.textContent));
    if(c.length<12||!/^\d{2}\/\d{2}\/\d{4}$/.test(c[1]))continue;
    const home=lookup(c[6]),away=lookup(c[8]),round=Number(c[4].match(/\d+/)?.[0]);
    if(!home||!away||!round)throw Error('Format de calendari desconegut: '+c.join(' | '));
    const [day,month,year]=c[1].split('/'),s=c[11].match(/^(\d+)\s*-\s*(\d+)$/);
    rows.push({round,date:`${year}-${month}-${day}`,time:c[2],home,away,score:s?[+s[1],+s[2]]:null,officialId:r.querySelector('[idp]')?.getAttribute('idp')||null});
  }
  return rows;
}

// Alineacions i gols de l'acta: {home:[...],away:[...]} o error si l'acta no té les dues plantilles.
export function parseAct(doc){
  const lists=[...doc.querySelectorAll('table')].map(t=>[...t.querySelectorAll('tr')].map(cellsOf).filter(c=>c.length===15&&/^\d{1,3}$/.test(clean(c[0].textContent))).map(c=>({
    number:+clean(c[0].textContent),
    name:clean(c[5].textContent).replace(/^(INF[A-Z]|ALE[A-Z])\s+/,'').replace(/\s+\(C\)\s*$/,'').replace(/\s+\.\s*$/,'').trim(),
    goals:Number(clean(c[6].textContent))||0,
    keeper:clean(c[1].textContent)==='P'
  }))).filter(l=>l.length);
  if(lists.length!==2)throw Error('Acta incompleta.');
  return {home:lists[0],away:lists[1]};
}

// Combina les dades oficials amb league.json sense perdre camps propis (entrenadors, vídeos...).
export async function updateLeague(league,fetchDoc,log=()=>{}){
  const rows=parseCalendar(await fetchDoc('fecapa_cal_idc_4786_1.php',{idc:'4786',site_lang:'ca',lang:'ca'}));
  if(rows.length!==league.matches.length)throw Error(`El calendari té ${rows.length} partits i se n’esperaven ${league.matches.length}.`);
  let failed=0;
  const matches=[];
  for(const row of rows){
    const old=league.matches.find(m=>m.round===row.round&&m.home===row.home&&m.away===row.away);
    if(!old)throw Error(`Partit nou al calendari, cal revisar-lo: jornada ${row.round} ${row.home} – ${row.away}.`);
    const m={...old,date:row.date,time:row.time,score:row.score,officialId:row.officialId||old.officialId||null};
    if(m.score&&m.officialId){
      try{m.rosters=reconcileGoals(parseAct(await fetchDoc(`fecapa_gr_${m.officialId}_1.php`,{idm:'1',idc:'4786',idp:m.officialId,tab:'tab_ficha_resumen'})),m.score);}
      catch(e){failed++;log(`Acta ${m.officialId} no disponible: ${e.message}`);}
    }
    matches.push(m);
  }
  const changed=JSON.stringify(matches)!==JSON.stringify(league.matches);
  return {league:changed?{...league,matches,updatedAt:new Date().toISOString()}:league,changed,failed};
}

async function main(){
  const {DOMParser}=await import('linkedom');
  const fetchDoc=async(file,params)=>{
    for(let attempt=1;;attempt++){
      try{
        const res=await fetch('https://www.server2.sidgad.es/fecapa/'+file,{method:'POST',body:new URLSearchParams(params),signal:AbortSignal.timeout(30000)});
        if(!res.ok)throw Error('HTTP '+res.status);
        const html=await res.text();if(html.length<30)throw Error('resposta buida');
        return new DOMParser().parseFromString(html,'text/html');
      }catch(e){if(attempt>=3)throw e;await new Promise(r=>setTimeout(r,3000*attempt));}
    }
  };
  const path=new URL('../public/ui/league.json',import.meta.url);
  const league=JSON.parse(await readFile(path,'utf8'));
  const {league:next,changed,failed}=await updateLeague(league,fetchDoc,console.log);
  if(changed)await writeFile(path,JSON.stringify(next,null,2)+'\n');
  const played=next.matches.filter(m=>m.score).length;
  console.log(changed?`Dades actualitzades: ${played} partits jugats.`:'Sense canvis a FECAPA.',failed?`${failed} actes no disponibles.`:'');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
