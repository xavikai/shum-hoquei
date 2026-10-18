import test from 'node:test';
import assert from 'node:assert/strict';
import {madridDay,weekRange,shiftDay,weeklySchedule} from '../public/ui/weekly-core.js';
test('weeks are Monday to Sunday in Madrid across DST and year changes',()=>{
 assert.equal(madridDay(new Date('2026-10-18T22:30:00Z')),'2026-10-19');
 assert.deepEqual(weekRange('2026-10-18'),{start:'2026-10-12',end:'2026-10-18'});
 assert.deepEqual(weekRange('2027-01-01'),{start:'2026-12-28',end:'2027-01-03'});
 assert.equal(shiftDay('2026-10-25',1),'2026-10-26');
});
test('club schedule filters own matches, retains multiple games and deduplicates club derbies',()=>{
 const match={id:'x',officialId:'20',date:'2026-10-17',time:'16:00',home:'SHUM A',away:'SHUM B',score:[0,0]};
 const entries=[{team:{id:'a',idc:'1',label:'A'},data:{team:'SHUM A',matches:[match,{...match,id:'away',officialId:'21',date:'2026-10-18',time:'',home:'Rival',away:'SHUM A',score:null},{...match,officialId:'22',date:'2026-10-19'},{...match,officialId:'23',home:'Altres',away:'Rival'}]}},{team:{id:'b',idc:'1',label:'B'},data:{team:'SHUM B',matches:[match]}},{team:{idc:'2',label:'C'},data:{team:'SHUM C',matches:[]}},{team:{idc:'3',label:'D'},data:null}];
 const s=weeklySchedule(entries,weekRange('2026-10-17'));
 assert.equal(s.rows.length,2);assert.deepEqual(s.rows[0].labels,['A','B']);assert.equal(s.rows[0].teamIds.length,2);assert.deepEqual(s.rows[0].score,[0,0]);assert.equal(s.rows[1].place,'A fora');assert.equal(s.rows[1].host,'Rival');assert.deepEqual(s.without,['C']);assert.deepEqual(s.failed,['D']);
});
import {defaultWeek} from '../public/ui/weekly-core.js';
test('la quadrícula passa a la propera jornada quan la setmana ja té tots els resultats',()=>{
 const mk=(date,score)=>({id:date,officialId:date,date,time:'12:00',home:'SHUM A',away:'Rival',score});
 const e=ms=>[{team:{idc:'1',label:'A'},data:{team:'SHUM A',matches:ms}}];
 const sun=new Date('2026-10-18T18:00:00Z'),mon=new Date('2026-10-19T09:00:00Z'),wed=new Date('2026-10-21T09:00:00Z');
 assert.equal(defaultWeek(e([mk('2026-10-17',null),mk('2026-10-25',null)]),sun),'2026-10-12');
 assert.equal(defaultWeek(e([mk('2026-10-17',[1,0]),mk('2026-10-25',null)]),sun),'2026-10-19');
 assert.equal(defaultWeek(e([mk('2026-10-18',null),mk('2026-10-25',null)]),mon),'2026-10-12');
 assert.equal(defaultWeek(e([mk('2026-10-18',null),mk('2026-10-25',null)]),wed),'2026-10-19');
 assert.equal(defaultWeek(e([mk('2026-10-17',[1,0]),mk('2026-11-07',null)]),sun),'2026-11-02');
});
