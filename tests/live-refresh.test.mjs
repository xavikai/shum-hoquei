import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingResults,shouldRefresh} from '../public/ui/live-refresh.js';
import {refreshTeam} from '../public/ui/fecapa-browser.js';

const now=Date.parse('2026-10-18T09:57:00Z'); // 11:57 a Catalunya
const data={matches:[
 {id:'a',date:'2026-10-17',time:'19:45',score:null},   // ahir, sense resultat → pendent
 {id:'b',date:'2026-10-18',time:'11:15',score:null},   // fa 42 min → encara no
 {id:'g',date:'2026-10-18',time:'10:45',score:null},   // fa 72 min → pendent
 {id:'c',date:'2026-10-18',time:'09:00',score:null},   // fa 3 h → pendent
 {id:'d',date:'2026-10-17',time:'20:00',score:[8,3]},  // ja té resultat
 {id:'e',date:'2026-09-01',time:'19:00',score:null},   // massa antic (ajornat)
 {id:'f',date:'2026-10-25',time:'12:00',score:null},   // futur
]};

test('detecta partits jugats sense resultat',()=>{
 assert.deepEqual(pendingResults(data,{now}).map(m=>m.id),['a','g','c']);
});
test('no repeteix la consulta abans de 20 minuts i també refresca RFEP',()=>{
 const team={id:'x'};
 assert.equal(shouldRefresh(team,data,{now}),true);
 assert.equal(shouldRefresh(team,data,{now,lastTry:now-15*60000}),false);
 assert.equal(shouldRefresh(team,data,{now,lastTry:now-25*60000}),true);
 assert.equal(shouldRefresh({id:'y',provider:'rfep'},data,{now}),true);
 assert.equal(shouldRefresh(team,{matches:data.matches.filter(m=>m.id==='d')},{now}),false);
});

test('loads newer published results without contacting the federation from the browser',async t=>{
 const team={file:'data/infantil-or.json'};
 const current={team:'SHUM',season:'2026/27',updatedAt:'2026-10-17T00:00:00Z',matches:[{score:null}]};
 const published={...current,updatedAt:'2026-11-16T00:00:00Z',matches:[{score:[0,6]}]};
 const fetch=t.mock.method(globalThis,'fetch',async url=>{
   assert.match(url.pathname,/\/data\/infantil-or\.json$/);
   return Response.json(published);
 });
 assert.deepEqual(await refreshTeam(team,current),{data:published,failed:0,published:true});
 assert.equal(fetch.mock.callCount(),1);
});

test('tries the federation when the published copy is older than the current calendar',async t=>{
 const team={file:'data/infantil-or.json',idc:'4786'};
 const current={team:'SHUM',season:'2026/27',updatedAt:'2026-11-16T00:00:00Z',matches:[{score:[0,6]}]};
 const older={...current,updatedAt:'2026-10-17T00:00:00Z',matches:[{score:null}]};
 const fetch=t.mock.method(globalThis,'fetch',async url=>{
   if(url instanceof URL)return Response.json(older);
   assert.match(url,/fecapa_cal_idc_4786_1\.php$/);
   return new Response(null,{status:403});
 });
 await assert.rejects(refreshTeam(team,current),/FECAPA no respon/);
 assert.equal(fetch.mock.callCount(),2);
 assert.deepEqual(current.matches[0].score,[0,6]);
});
