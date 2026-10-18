import {defaultWeek,madridDay,shiftDay,weekRange,weeklySchedule} from './weekly-core.js';
import {refreshTeam} from './fecapa-browser.js';
import {readFavorites} from './favorites.js';
import {markTry,readLastTry,shouldRefresh} from './live-refresh.js';
const cacheKey=team=>team.id==='infantil-or'?'shum-league':'shum-league:'+team.id;
function cached(team,data){try{const c=JSON.parse(localStorage.getItem(cacheKey(team)));if(c?.matches?.length&&c.team===data.team&&c.updatedAt>data.updatedAt)return {...c,teamCoaches:{...data.teamCoaches,...c.teamCoaches}};}catch{}return data;}
// Equips amb partits jugats sense resultat: es consulten a FECAPA (3 alhora) i es desen com a còpia local.
async function refreshStale(entries){const now=Date.now(),soon=shiftDay(madridDay(),14),today=madridDay();
 const old=e=>e.team.provider!=='rfep'&&now-Date.parse(e.data.updatedAt||0)>6*36e5&&now-readLastTry(e.team.id)>20*60000&&e.data.matches.some(m=>m.date>=today&&m.date<=soon&&(m.home===e.data.team||m.away===e.data.team));
 const queue=entries.filter(e=>e.data&&(shouldRefresh(e.team,e.data,{lastTry:readLastTry(e.team.id)})||old(e)));let changed=false;
 await Promise.all(Array.from({length:3},async()=>{while(queue.length){const e=queue.shift();markTry(e.team.id);try{const {data}=await refreshTeam(e.team,e.data);e.data={...data,teamCoaches:{...e.data.teamCoaches,...data.teamCoaches}};try{localStorage.setItem(cacheKey(e.team),JSON.stringify(e.data));}catch{}changed=true;}catch{}}}));return changed;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=d=>new Intl.DateTimeFormat('ca-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(d+'T12:00:00Z'));
const day=d=>new Intl.DateTimeFormat('ca-ES',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(d+'T12:00:00Z'));
let start=null,moved=false,loaded;
function loadTeams(config,asset){return Promise.all(config.teams.map(async team=>{try{const r=await fetch(asset(team.file),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.matches))throw Error();return {team,data:cached(team,data)};}catch{return {team,data:null};}}));}
function wrap(ctx,text,width){const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.length?lines:[''];}
// Classes per cel·la: al mòbil cada fila es mostra com una targeta compacta sense desplaçament lateral.
// «Ressalta els meus favorits»: preferència d'aquest dispositiu.
const HL_KEY='shum-week-highlight';
const readHL=()=>{try{return localStorage.getItem(HL_KEY)!=='0';}catch{return true;}};
const saveHL=v=>{try{localStorage.setItem(HL_KEY,v?'1':'0');}catch{}};
const WEEK_CELLS=['week-day','week-time','week-where','week-match','week-score'];
// El partit es mostra tal com es juga: local – visitant. El nostre equip, en vermell; CASA/FORA ben visible.
function htmlCells(r){const ours=`<strong class="week-shum">${esc(r.labels.join(' / '))}</strong>`,rival=esc(r.opponent);
 return [esc(day(r.date)),esc(r.time?r.time+' h':'Pendent'),`<span class="week-badge ${r.home?'is-home':'is-away'}">${r.home?'CASA':'FORA'}</span>`,r.home?`${ours} – ${rival}`:`${rival} – ${ours}`,esc(r.score?r.score.join(' – '):'—')];}
function cells(row){return [day(row.date),row.time?row.time+' h':'Pendent',row.labels.join(' / '),row.opponent,row.place+' · '+row.host,row.score?row.score.join(' – '):'—'];}
async function poster(model,range,season){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),widths=[122,100,260,260,290,108];
 ctx.font='20px Arial';
 const rows=model.rows.map(r=>{const lines=cells(r).map((s,i)=>wrap(ctx,s,widths[i]-28));return {lines,height:Math.max(...lines.map(l=>l.length))*27+30};});
 const notes=[...(model.favorites?['Selecció: equips favorits.']:[]),...(!rows.length?['Cap partit programat aquesta setmana.']:[]),...(model.without.length?['Sense partit programat: '+model.without.join(' · ')]:[]),...(model.failed.length?['Dades no disponibles: '+model.failed.join(' · ')]:[]),'Horaris de Catalunya · La pista correspon a l’equip local. Consulta possibles canvis a FECAPA.'];
 const noteLines=notes.flatMap(n=>wrap(ctx,n,1070));
 canvas.width=1200;canvas.height=244+rows.reduce((n,r)=>n+r.height,0)+noteLines.length*29+130;
 ctx.fillStyle='#f5f5f2';ctx.fillRect(0,0,1200,canvas.height);ctx.fillStyle='#c6202e';ctx.fillRect(0,0,1200,176);
 ctx.fillStyle='#fff';ctx.font='bold 39px Arial';ctx.fillText('SHUM · PARTITS DE LA SETMANA',40,66);ctx.font='25px Arial';ctx.fillText(`${date(range.start)} – ${date(range.end)} · ${season}`,40,113);
 try{const logo=new Image();logo.src=new URL('./badge.png',import.meta.url).href;await logo.decode();ctx.drawImage(logo,1094,24,70,124);}catch{}
 let y=200;ctx.fillStyle='#242424';ctx.fillRect(30,y,1140,44);ctx.font='bold 16px Arial';ctx.fillStyle='#fff';let x=30;
 ['DIA','HORA','EQUIP SHUM','RIVAL','ON JUGUEM · LOCAL','RESULTAT'].forEach((h,i)=>{ctx.fillText(h,x+14,y+28);x+=widths[i];});y+=44;
 rows.forEach((r,index)=>{ctx.fillStyle=index%2?'#fff':'#eeeFEB';ctx.fillRect(30,y,1140,r.height);x=30;r.lines.forEach((lines,i)=>{ctx.font=i===2?'bold 20px Arial':'20px Arial';ctx.fillStyle=i===2?'#b51e2d':'#242424';lines.forEach((line,k)=>ctx.fillText(line,x+14,y+28+k*27));x+=widths[i];});ctx.strokeStyle='#d9d9d3';ctx.beginPath();ctx.moveTo(30,y+r.height);ctx.lineTo(1170,y+r.height);ctx.stroke();y+=r.height;});
 y+=35;ctx.fillStyle='#555';ctx.font='19px Arial';for(const line of noteLines){ctx.fillText(line,40,y);y+=29;}
 ctx.fillStyle='#c6202e';ctx.font='bold 19px Arial';ctx.fillText('xavikai.github.io/shum-hoquei',40,y+35);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No s’ha pogut crear la imatge.')),'image/png'));
}
export function mountWeekly(root,config,{asset,active,teamIds=null}){
 const allConfig=config;
 root.innerHTML='<p role="status">Carregant els calendaris de tots els equips…</p>';
 loaded??=loadTeams(config,asset).then(async entries=>{entries.refreshing=refreshStale(entries.filter(e=>e.team.id!==active.id));return entries;});
 loaded.then(entries=>{
  if(!root.isConnected||!location.hash.endsWith('setmana'))return;
  // Incorporate the current team’s newly refreshed calendar too.
  const refreshing=entries.refreshing;entries.refreshing=null;
  entries=entries.map(e=>e.team.id===active.id?{...e,data:active.data}:e);
  if(!moved)start=defaultWeek(entries);
  const draw=()=>{
   const range={start,end:shiftDay(start,6)},model={...weeklySchedule(entries,range),favorites:false},filename=`SHUM-partits-${start}.png`;
   const favIds=readFavorites(allConfig.teams).ids,hl=readHL()&&favIds.length>0,isFav=r=>hl&&r.teamIds?.some(id=>favIds.includes(id));
   root.innerHTML=`<div class="week-controls"><button class="secondary" id="week-prev" aria-label="Setmana anterior">← Anterior</button><label class="week-date">Setmana del dilluns<input id="week-date" type="date" value="${start}"></label><button class="secondary" id="week-next" aria-label="Setmana següent">Següent →</button><button class="secondary" id="week-today">Jornada actual</button><label class="week-highlight"><input type="checkbox" id="week-hl" ${hl?'checked':''} ${favIds.length?'':'disabled'}> ★ Ressalta els meus favorits${favIds.length?'':' <span class="muted">(encara no en tens)</span>'}</label></div><div class="section-title week-heading"><div><span class="red-tag">TOTS ELS EQUIPS DEL CLUB</span><h2>${date(range.start)} – ${date(range.end)}</h2><p class="muted">${model.rows.length} partits · ${config.teams.length} equips · Horaris de Catalunya</p></div></div><div class="week-share"><button class="primary" id="week-copy" disabled>Copia la quadrícula</button><button class="secondary" id="week-share" disabled>Comparteix imatge</button><button class="secondary" id="week-download" disabled>↓ Descarrega PNG</button></div><p class="help">Copia la imatge i enganxa-la a WhatsApp o comparteix-la des del mòbil. Cada partit surt com es juga: primer l’equip local i després el visitant.</p><p id="week-status" role="status" aria-live="polite">Preparant la imatge…</p><div class="panel table-wrap week-table"><table><caption class="sr-only">Partits dels equips seleccionats del SHUM del ${date(range.start)} al ${date(range.end)}</caption><thead><tr>${['Dia','Hora','On','Partit (local – visitant)','Resultat'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${model.rows.map(r=>`<tr${isFav(r)?' class="is-fav"':''}>${htmlCells(r).map((c,i)=>`<td class="${WEEK_CELLS[i]}">${c}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="5">Cap partit programat aquesta setmana.</td></tr>'}</tbody></table></div>${model.without.length?`<p class="help"><strong>Sense partit programat:</strong> ${esc(model.without.join(' · '))}.</p>`:''}${model.failed.length?`<p role="alert" class="week-warning"><strong>No s’han pogut consultar:</strong> ${esc(model.failed.join(' · '))}. La quadrícula és incompleta. <button class="secondary" id="week-retry">Torna-ho a provar</button></p>`:''}<p class="help">Dades publicades a FECAPA. Els horaris poden canviar; confirma’ls abans de desplaçar-te.</p>`;
   root.querySelector('#week-hl').onchange=e=>{saveHL(e.target.checked);draw();};root.querySelector('#week-prev').onclick=()=>{moved=true;start=shiftDay(start,-7);draw();};root.querySelector('#week-next').onclick=()=>{moved=true;start=shiftDay(start,7);draw();};root.querySelector('#week-today').onclick=()=>{moved=false;start=defaultWeek(entries);draw();};root.querySelector('#week-date').onchange=e=>{moved=true;if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){start=weekRange(e.target.value).start;draw();}};
   root.querySelector('#week-retry')?.addEventListener('click',()=>{loaded=null;mountWeekly(root,allConfig,{asset,active,teamIds});});
   const status=root.querySelector('#week-status'),copy=root.querySelector('#week-copy'),share=root.querySelector('#week-share'),save=root.querySelector('#week-download');
   poster(model,range,config.season).then(blob=>{
    if(!status.isConnected)return;const file=new File([blob],filename,{type:'image/png'});
    const download=()=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
    save.disabled=false;save.onclick=()=>{download();status.textContent='Imatge descarregada. Ja la pots adjuntar a WhatsApp.';};
    copy.disabled=false;copy.onclick=async()=>{try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);status.textContent='Quadrícula copiada com a imatge. Enganxa-la al xat que vulguis.';}catch{status.textContent='Aquest navegador no permet copiar la imatge. Toca «Descarrega PNG» i adjunta-la al xat.';}};
    share.disabled=false;share.onclick=async()=>{try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'SHUM · Partits de la setmana'});status.textContent='Imatge compartida.';}else{download();status.textContent='Imatge descarregada. Adjunta-la a WhatsApp o a la plataforma que vulguis.';}}catch(e){if(e.name!=='AbortError')status.textContent='No s’ha pogut compartir. Pots descarregar la imatge i adjuntar-la.';}};
    status.textContent='Imatge preparada per copiar, compartir o descarregar.';
   }).catch(()=>{if(status.isConnected)status.textContent='No s’ha pogut preparar la imatge. Torna a obrir aquest apartat.';});
  };draw();
  refreshing?.then(changed=>{if(changed&&root.isConnected&&location.hash.endsWith('setmana'))mountWeekly(root,allConfig,{asset,active,teamIds});});
 });
}
