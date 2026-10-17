// Lectura del calendari i les actes oficials de FECAPA per a qualsevol competició i grup.
// Funciona al navegador (DOMParser) i a la tasca de GitHub (linkedom), sense dependències pròpies.
import {reconcileGoals} from './official-rosters.js';

export const FECAPA='https://www.server2.sidgad.es/fecapa/';
export const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const cellsOf=row=>[...row.children].filter(c=>c.tagName==='TD'||c.tagName==='TH');
const SMALL=new Set(['A','B','C','D','E','F','CH','HC','CP','PHC','CCH','UE','CE','CN','HCS','CPV','CD','AE','CF','UD','SD','AD','CB','II','III']);
const ACRONYMS=new Set(['CPI','AHC','GEIEG','CE','UE','AE','CD']);
const LOWER=new Set(['DE','DEL','LA','EL','I','LES','ELS','D']);

// Nom llegible a partir del nom oficial en majúscules: «CLUB PATÍ VOLTREGÀ C» → «Club Patí Voltregà C».
export function prettyTeam(name){
  return clean(name).split(' ').map((w,i)=>{
    if(w==='SHUM'||SMALL.has(w)||/^[A-Z]{2,4}$/.test(w)&&!/[AEIOUÀÈÉÍÒÓÚ]/.test(w)||ACRONYMS.has(w))return w;
    if(i>0&&LOWER.has(w))return w.toLowerCase();
    return w.toLowerCase().replace(/(^|[-'’(])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
  }).join(' ');
}

// Nom del jugador sense el codi de categoria del davant ni les marques de capità.
export function playerName(raw){
  return clean(raw).replace(/^(?:(?:PRE|BEN|ALE|INF|JUV|JUN|PRI|SEG|TER|SEN|OKL|VET|FEM|MIN|MAS|NAC|MAST)[A-Z0-9]{0,3}|\d)\s+/,'').replace(/\s*\(C\)\s*\.?\s*$/,'').replace(/\s+\.\s*$/,'').replace(/\s*\($/,'').trim();
}

// Grups (fases) de la competició: [{phase,name}]
export function parsePhases(doc){
  return [...doc.querySelectorAll('table[class*="content_fase_"]')].map(t=>{
    const phase=(t.className.match(/content_fase_(\d+)/)||[])[1];
    return {phase,name:clean(doc.querySelector('.filter_fase_'+phase+'.div_titulo_fase_idc')?.textContent)||('Grup '+phase)};
  }).filter(p=>p.phase);
}

// Partits d'un grup del calendari oficial, amb els noms oficials dels equips.
export function parseCalendar(doc,phase){
  const table=doc.querySelector('.content_fase_'+phase);
  if(!table)throw Error(`No s’ha trobat el grup ${phase} al calendari.`);
  const rows=[];
  for(const r of table.querySelectorAll('tr')){
    const c=[...r.querySelectorAll('td')].map(x=>clean(x.textContent));
    if(c.length<12||!/^\d{2}\/\d{2}\/\d{4}$/.test(c[1]))continue;
    const round=Number(c[4].match(/\d+/)?.[0]);
    if(!round)throw Error('Format de calendari desconegut: '+c.join(' | '));
    if(!c[6]||!c[8])continue; // equip que descansa aquesta jornada
    const [day,month,year]=c[1].split('/'),s=c[11].match(/^(\d+)\s*-\s*(\d+)$/);
    rows.push({round,date:year==='0000'?'':`${year}-${month}-${day}`,time:/^\d{1,2}:\d{2}$/.test(c[2])?c[2]:'',home:c[6],away:c[8],score:s?[+s[1],+s[2]]:null,officialId:r.querySelector('[idp]')?.getAttribute('idp')||null});
  }
  return rows;
}

// Alineacions i gols de l'acta: {home:[...],away:[...]}.
export function parseAct(doc){
  const lists=[...doc.querySelectorAll('table')].map(t=>[...t.querySelectorAll('tr')].map(cellsOf).filter(c=>c.length===15&&/^\d{1,3}$/.test(clean(c[0].textContent))).map(c=>({
    number:+clean(c[0].textContent),
    name:playerName(c[5].textContent),
    goals:Number(clean(c[6].textContent))||0,
    keeper:clean(c[1].textContent)==='P',
    // Columnes de targetes de l'acta: 12 groga, 13 blava, 14 vermella. Buit vol dir cap.
    cards:{yellow:Number(clean(c[12].textContent))||0,blue:Number(clean(c[13].textContent))||0,red:Number(clean(c[14].textContent))||0}
  }))).filter(l=>l.length);
  if(lists.length!==2)throw Error('Acta incompleta.');
  return {home:lists[0],away:lists[1]};
}

// Nom curt del grup: «ALEVÍ PLATA 6» → «Grup 6».
export function groupLabel(doc,phase){return shortGroup(parsePhases(doc).find(p=>p.phase===String(phase))?.name||'');}
export function shortGroup(name){
  const grup=name.match(/grup\s*([a-z0-9]+)\s*$/i),n=name.match(/(\d+)\s*$/);
  if(grup)return 'Grup '+grup[1].toUpperCase();
  if(n)return 'Grup '+n[1];
  if(/fase de grups/i.test(name))return 'Fase de grups';
  return 'Grup únic';
}

export const calendarRequest=idc=>[`fecapa_cal_idc_${idc}_1.php`,{idc:String(idc),site_lang:'ca',lang:'ca'}];
export const actRequest=(idc,idp)=>[`fecapa_gr_${idp}_1.php`,{idm:'1',idc:String(idc),idp:String(idp),tab:'tab_ficha_resumen'}];

const DAY=86400000;
// Cal tornar a llegir l'acta? Sí si és nova, ha canviat el resultat, falten alineacions o el partit és recent.
function needsAct(old,row,now){
  if(!row.score||!row.officialId)return false;
  if(!old?.rosters?.home?.length||!old?.rosters?.away?.length)return true;
  if([...old.rosters.home,...old.rosters.away].some(p=>!p.cards))return true; // dades anteriors sense targetes
  if(String(old.score)!==String(row.score))return true;
  return !row.date||now-Date.parse(row.date+'T12:00:00Z')<4*DAY;
}

// Construeix o actualitza les dades d'un equip a partir del calendari i les actes.
// team: entrada de teams.json · data: dades anteriors (o null) · fetchDoc(file,params) → Document
export async function updateTeam(team,data,fetchDoc,{calendar,now=Date.now(),log=()=>{},onProgress}={}){
  const doc=calendar||await fetchDoc(...calendarRequest(team.idc));
  const rows=parseCalendar(doc,team.phase);
  const old=data?.matches||[];
  if(!rows.length)throw Error('El calendari del grup és buit.');
  if(old.length&&rows.length<old.length/2)throw Error(`El calendari té ${rows.length} partits i abans en tenia ${old.length}.`);
  const names={...(data?.officialNames||{})};
  for(const r of rows)for(const n of [r.home,r.away])if(!names[n])names[n]=prettyTeam(n);
  if(!rows.some(r=>r.home===team.team||r.away===team.team))throw Error(`No s’ha trobat ${team.team} al grup.`);
  const teams=[...new Set(rows.flatMap(r=>[names[r.home],names[r.away]]))];
  const prev=data?.teams?.length?data.teams.filter(t=>teams.includes(t)):[];
  const order=[...prev,...teams.filter(t=>!prev.includes(t))];
  const prefix=team.legacyIds?'':team.id+'-';
  const used=new Set(),matches=[];let failed=0,read=0;
  const pending=[];
  for(const r of rows){
    const home=names[r.home],away=names[r.away];
    const before=old.find(m=>r.officialId&&m.officialId===r.officialId)||old.find(m=>m.round===r.round&&m.home===home&&m.away===away&&!used.has(m.id));
    let id=before?.id||`${prefix}${r.round}-${order.indexOf(home)}-${order.indexOf(away)}`;
    if(used.has(id))id+=`-${r.officialId||matches.length}`;
    used.add(id);
    const m={...(before||{}),id,round:r.round,date:r.date,time:r.time,home,away,score:r.score,officialId:r.officialId||before?.officialId||null};
    if(!m.rosters)m.rosters={home:[],away:[]};
    if(needsAct(before,r,now))pending.push(m);
    matches.push(m);
  }
  let done=0;
  await Promise.all(Array.from({length:3},async()=>{while(pending.length){const m=pending.shift();try{m.rosters=reconcileGoals(parseAct(await fetchDoc(...actRequest(team.idc,m.officialId))),m.score);read++;}catch(e){failed++;log(`Acta ${m.officialId}: ${e.message}`);}done++;onProgress?.({done,total:done+pending.length});}}));
  const next={
    league:`${team.label} · ${team.group}`,
    season:data?.season||team.season||'',
    source:`https://www.hoqueipatins.fecapa.cat/league/${team.idc}`,
    updatedAt:data?.updatedAt||new Date(now).toISOString(),
    team:names[team.team],
    teams:order,
    matches,
    teamCoaches:data?.teamCoaches||{},
    ...(data?.coachSource?{coachSource:data.coachSource}:{}),
    officialNames:names
  };
  const changed=JSON.stringify({...next,updatedAt:0})!==JSON.stringify({...(data||{}),updatedAt:0});
  if(changed)next.updatedAt=new Date(now).toISOString();
  return {data:next,changed,failed,read};
}

// Tots els grups d'una competició (per als rànquings de tota la categoria). Només llegeix actes noves.
export async function updateCompetition(team,previous,fetchDoc,onProgress){
  const doc=await fetchDoc(...calendarRequest(team.idc));
  const phases=parsePhases(doc),oldById=new Map((previous?.matches||[]).map(m=>[m.id,m]));
  const matches=[];
  for(const [index,p] of phases.entries()){
    if(p.phase===String(team.phase))continue;
    let rows;try{rows=parseCalendar(doc,p.phase);}catch{continue;}
    for(const r of rows){
      const id=r.officialId?'c-'+r.officialId:`c-${p.phase}-${r.round}-${r.home}-${r.away}`,old=oldById.get(id);
      matches.push({id,group:index+1,groupName:p.name,phase:p.phase,round:r.round,date:r.date,time:r.time,home:prettyTeam(r.home),away:prettyTeam(r.away),score:r.score,officialId:r.officialId,rosters:old?.rosters&&String(old.score)===String(r.score)&&[...old.rosters.home,...old.rosters.away].every(p=>p.cards)?old.rosters:{home:[],away:[]}});
    }
  }
  const own=phases.findIndex(p=>p.phase===String(team.phase));
  const pending=matches.filter(m=>m.score&&m.officialId&&!(m.rosters.home.length&&m.rosters.away.length));
  let done=0,failed=0,cursor=0;onProgress?.({matches,done,total:pending.length,failed});
  await Promise.all(Array.from({length:3},async()=>{while(cursor<pending.length){const m=pending[cursor++];try{m.rosters=reconcileGoals(parseAct(await fetchDoc(...actRequest(team.idc,m.officialId))),m.score);}catch{failed++;}done++;onProgress?.({matches,done,total:pending.length,failed});}}));
  return {version:3,team:team.id,updatedAt:new Date().toISOString(),phases:phases.map((p,i)=>({...p,group:i+1})),ownGroup:own+1,matches,failed};
}
