const pad=n=>String(n).padStart(2,'0');
export function madridDay(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function shiftDay(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;}
export function weekRange(day=madridDay()){const d=new Date(day+'T12:00:00Z'),start=shiftDay(day,-((d.getUTCDay()+6)%7));return {start,end:shiftDay(start,6)};}
export function weeklySchedule(entries,range){
 const found=new Map(),without=[],failed=[];
 for(const {team,data} of entries){
  if(!data){failed.push(team.label);continue;}
  const own=data.team||team.team;
  const selected=data.matches.filter(m=>m.date>=range.start&&m.date<=range.end&&(m.home===own||m.away===own));
  if(!selected.length)without.push(team.label);
  for(const m of selected){
   const key=team.idc+':'+(m.officialId||[team.phase,m.date,m.home,m.away].join('|'));
   const row=found.get(key);
   if(row){if(!row.labels.includes(team.label))row.labels.push(team.label);if(!row.teamIds.includes(team.id))row.teamIds.push(team.id);continue;}
   const home=m.home===own;
   found.set(key,{...m,labels:[team.label],teamIds:[team.id],opponent:home?m.away:m.home,home,place:home?'A casa':'A fora',host:m.home,updatedAt:data.updatedAt});
  }
 }
 return {rows:[...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.labels[0].localeCompare(b.labels[0])),without,failed};
}

// Setmana que s'ensenya per defecte a la quadrícula del club.
// · Dilluns i dimarts, si a la setmana anterior hi ha partits jugats fa menys de 2 dies sense resultat, es manté aquella.
// · Si tots els partits de la setmana actual ja tenen resultat (o no n'hi ha cap), es passa a la setmana de la propera jornada.
export function defaultWeek(entries,now=new Date()){
 const today=madridDay(now),cur=weekRange(today).start;
 const rows=start=>weeklySchedule(entries,{start,end:shiftDay(start,6)}).rows;
 const prev=shiftDay(cur,-7);
 if(today<=shiftDay(cur,1)&&rows(prev).some(r=>!r.score&&r.date>=shiftDay(today,-2)))return prev;
 const now_=rows(cur);
 if(now_.some(r=>!r.score))return cur;
 for(let i=1;i<=6;i++){const s=shiftDay(cur,7*i);if(rows(s).length)return s;}
 return cur;
}
