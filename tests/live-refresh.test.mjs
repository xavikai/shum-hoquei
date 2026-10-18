import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingResults,shouldRefresh} from '../public/ui/live-refresh.js';

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
test('no repeteix la consulta abans de 10 minuts ni per a RFEP',()=>{
 const team={id:'x'};
 assert.equal(shouldRefresh(team,data,{now}),true);
 assert.equal(shouldRefresh(team,data,{now,lastTry:now-5*60000}),false);
 assert.equal(shouldRefresh(team,data,{now,lastTry:now-12*60000}),true);
 assert.equal(shouldRefresh({id:'y',provider:'rfep'},data,{now}),false);
 assert.equal(shouldRefresh(team,{matches:data.matches.filter(m=>m.id==='d')},{now}),false);
});
