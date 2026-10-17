import {madridDay,shiftDay,weekRange,weeklySchedule} from './weekly-core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=d=>new Intl.DateTimeFormat('ca-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(d+'T12:00:00Z'));
const day=d=>new Intl.DateTimeFormat('ca-ES',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(d+'T12:00:00Z'));
let start=weekRange().start,loaded;
function loadTeams(config,asset){return Promise.all(config.teams.map(async team=>{try{const r=await fetch(asset(team.file),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.matches))throw Error();return {team,data};}catch{return {team,data:null};}}));}
function wrap(ctx,text,width){const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.length?lines:[''];}
function cells(row){return [day(row.date),row.time?row.time+' h':'Pendent',row.labels.join(' / '),row.opponent,row.place+' · '+row.host,row.score?row.score.join(' – '):'—'];}
async function poster(model,range,season){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),widths=[122,100,260,260,290,108];
 ctx.font='20px Arial';
 const rows=model.rows.map(r=>{const lines=cells(r).map((s,i)=>wrap(ctx,s,widths[i]-28));return {lines,height:Math.max(...lines.map(l=>l.length))*27+30};});
 const notes=[...(!rows.length?['Cap partit programat aquesta setmana.']:[]),...(model.without.length?['Sense partit programat: '+model.without.join(' · ')]:[]),...(model.failed.length?['Dades no disponibles: '+model.failed.join(' · ')]:[]),'Horaris de Catalunya · La pista correspon a l’equip local. Consulta possibles canvis a FECAPA.'];
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
export function mountWeekly(root,config,{asset,active}){
 root.innerHTML='<p role="status">Carregant els calendaris de tots els equips…</p>';
 loaded??=loadTeams(config,asset);
 loaded.then(entries=>{
  if(!root.isConnected||!location.hash.endsWith('setmana'))return;
  // Incorporate the current team’s newly refreshed calendar too.
  entries=entries.map(e=>e.team.id===active.id?{...e,data:active.data}:e);
  const draw=()=>{
   const range={start,end:shiftDay(start,6)},model=weeklySchedule(entries,range),filename=`SHUM-partits-${start}.png`;
   root.innerHTML=`<div class="week-controls"><button class="secondary" id="week-prev" aria-label="Setmana anterior">← Anterior</button><label class="week-date">Setmana del dilluns<input id="week-date" type="date" value="${start}"></label><button class="secondary" id="week-next" aria-label="Setmana següent">Següent →</button><button class="secondary" id="week-today">Aquesta setmana</button></div><div class="section-title week-heading"><div><span class="red-tag">TOTS ELS EQUIPS DEL CLUB</span><h2>${date(range.start)} – ${date(range.end)}</h2><p class="muted">${model.rows.length} partits · ${config.teams.length} equips · Horaris de Catalunya</p></div></div><div class="week-share"><button class="primary" id="week-copy" disabled>Copia la quadrícula</button><button class="secondary" id="week-share" disabled>Comparteix imatge</button><button class="secondary" id="week-download" disabled>↓ Descarrega PNG</button></div><p class="help">Copia la imatge i enganxa-la a WhatsApp o comparteix-la des del mòbil. La columna «On juguem» indica si és a casa o a fora i el nom de l’equip local.</p><p id="week-status" role="status" aria-live="polite">Preparant la imatge…</p><div class="panel table-wrap week-table"><table><caption class="sr-only">Partits de tots els equips del SHUM del ${date(range.start)} al ${date(range.end)}</caption><thead><tr>${['Dia','Hora','Equip SHUM','Rival','On juguem · local','Resultat'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${model.rows.map(r=>`<tr>${cells(r).map((c,i)=>`<td${i===2?' class="week-team"':''}>${esc(c)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="6">Cap partit programat aquesta setmana.</td></tr>'}</tbody></table></div>${model.without.length?`<p class="help"><strong>Sense partit programat:</strong> ${esc(model.without.join(' · '))}.</p>`:''}${model.failed.length?`<p role="alert" class="week-warning"><strong>No s’han pogut consultar:</strong> ${esc(model.failed.join(' · '))}. La quadrícula és incompleta. <button class="secondary" id="week-retry">Torna-ho a provar</button></p>`:''}<p class="help">Dades publicades a FECAPA. Els horaris poden canviar; confirma’ls abans de desplaçar-te.</p>`;
   root.querySelector('#week-prev').onclick=()=>{start=shiftDay(start,-7);draw();};root.querySelector('#week-next').onclick=()=>{start=shiftDay(start,7);draw();};root.querySelector('#week-today').onclick=()=>{start=weekRange(madridDay()).start;draw();};root.querySelector('#week-date').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){start=weekRange(e.target.value).start;draw();}};
   root.querySelector('#week-retry')?.addEventListener('click',()=>{loaded=null;mountWeekly(root,config,{asset,active});});
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
 });
}
