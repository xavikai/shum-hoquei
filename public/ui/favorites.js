import {validFavorites,filteredTeams,shouldOnboard} from './favorites-core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='shum-favorites';
const installedKey='shum-installed-onboarding';
export function readFavorites(teams){try{const raw=localStorage.getItem(key);return {configured:raw!==null,ids:validFavorites(JSON.parse(raw||'[]'),teams)};}catch{return {configured:false,ids:[]};}}
export function initFavorites(config,current,onChange,onPick){
 const stored=readFavorites(config.teams);let ids=stored.ids,mode=ids.length?'favorites':'all';
 const bar=document.querySelector('#favorites-bar'),dialog=document.querySelector('#favorites-dialog');
 const api={get ids(){return ids;},get mode(){return mode;},get teams(){return filteredTeams(config.teams,ids,mode);}};
 function paint(){
  bar.innerHTML=`<div class="favorites-top"><strong>★ Els meus equips</strong><div><button id="show-favorites" class="secondary" aria-pressed="${mode==='favorites'}" ${!ids.length?'disabled':''}>Només favorits</button><button id="show-all-teams" class="secondary" aria-pressed="${mode==='all'}">Tots els equips</button><button id="edit-favorites" class="secondary">Edita favorits</button></div></div><div class="favorite-shortcuts">${config.teams.filter(t=>ids.includes(t.id)).map(t=>`<button class="favorite-chip ${t.id===current?'selected':''}" data-favorite-team="${esc(t.id)}" aria-pressed="${t.id===current}">★ ${esc(t.label)}</button>`).join('')||'<span class="help">Tria els equips que vols tenir sempre a mà.</span>'}</div>${mode==='all'&&ids.length?'<p class="help">Estàs consultant tots els equips. Els teus favorits es conserven.</p>':''}`;
  bar.querySelector('#edit-favorites').onclick=()=>open(false);
  for(const [selector,next] of [['#show-favorites','favorites'],['#show-all-teams','all']])bar.querySelector(selector).onclick=()=>{mode=next;paint();onChange(api);};
  bar.querySelectorAll('[data-favorite-team]').forEach(b=>b.onclick=()=>onPick(b.dataset.favoriteTeam));
 }
 function open(first){
  dialog.innerHTML=`<div class="favorite-dialog-content"><h2 id="favorites-title">${first?'Quins equips vols seguir?':'Els teus equips favorits'}</h2><p>Marca tots els equips que t’interessen. Els tindràs a mà i veuràs els seus partits per defecte.</p><form id="favorites-form">${[...new Set(config.teams.map(t=>t.section))].map(section=>`<fieldset><legend>${esc(section)}</legend>${config.teams.filter(t=>t.section===section).map(t=>`<label class="favorite-option"><input type="checkbox" name="favorite" value="${esc(t.id)}" ${ids.includes(t.id)?'checked':''}><span>${esc(t.label)}</span></label>`).join('')}</fieldset>`).join('')}<p class="help">La selecció es recorda en aquest navegador. Pots canviar-la amb «Edita favorits».</p><p id="favorites-error" role="alert"></p><div class="form-row"><button class="primary" type="submit">Desa els favorits</button><button class="secondary" type="button" id="favorites-all">${first?'Prefereixo veure tots els equips':'Sense favorits · veure tots'}</button>${!first?'<button class="secondary" type="button" id="favorites-cancel">Cancel·la</button>':''}</div></form></div>`;
  const save=next=>{try{localStorage.setItem(key,JSON.stringify(next));if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)localStorage.setItem(installedKey,'1');}catch{dialog.querySelector('#favorites-error').textContent='No s’ha pogut recordar la selecció. S’aplicarà mentre tinguis la web oberta.';}
   ids=next;mode=ids.length?'favorites':'all';dialog.close();paint();onChange(api,true);
  };
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const next=[...dialog.querySelectorAll('input:checked')].map(el=>el.value);if(!next.length){dialog.querySelector('#favorites-error').textContent='Marca almenys un equip o tria «veure tots els equips».';return;}save(next);};
  dialog.querySelector('#favorites-all').onclick=()=>save([]);dialog.querySelector('#favorites-cancel')?.addEventListener('click',()=>dialog.close());dialog.showModal();
 }
 const media=window.matchMedia('(display-mode: standalone)');const onboard=()=>{let done=false;try{done=localStorage.getItem(installedKey)==='1';}catch{}if(shouldOnboard(media.matches||navigator.standalone===true,done)&&!dialog.open)open(true);};paint();media.addEventListener('change',onboard);onboard();return api;
}
