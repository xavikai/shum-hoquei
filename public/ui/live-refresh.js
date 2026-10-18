// Decideix quan cal consultar FECAPA des del navegador: hi ha partits que ja s'han jugat
// però el calendari publicat encara no en té el resultat.
const madridStamp=ms=>{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};
const HOUR=36e5,DAY=24*HOUR;

// Partits sense resultat que poden haver acabat (inici fa més de `afterMinutes` min) dins dels darrers `days` dies.
export function pendingResults(data,{now=Date.now(),days=21,afterMinutes=60}={}){
  const until=madridStamp(now-afterMinutes*60000),since=madridStamp(now-days*DAY);
  return (data?.matches||[]).filter(m=>!m.score&&m.date&&(`${m.date}T${m.time||'12:00'}`)<=until&&`${m.date}T23:59`>=since);
}

// Cal refrescar si hi ha resultats pendents i no s'ha provat en els darrers `minutes` minuts.
export function shouldRefresh(team,data,{now=Date.now(),lastTry=0,minutes=10}={}){
  if(!team||team.provider==='rfep')return false;
  if(lastTry&&now-lastTry<minutes*60000)return false;
  return pendingResults(data,{now}).length>0;
}

const tryKey=id=>'shum-live-try:'+id;
export function readLastTry(id){try{return Number(localStorage.getItem(tryKey(id)))||0;}catch{return 0;}}
export function markTry(id,now=Date.now()){try{localStorage.setItem(tryKey(id),String(now));}catch{}}
