import test from 'node:test';
import assert from 'node:assert/strict';
import {validFavorites,preferredTeam,filteredTeams} from '../public/ui/favorites-core.js';
const teams=[{id:'infantil'},{id:'benjami'},{id:'senior'}];
test('favorites reject unknown IDs and duplicates without losing the valid selection',()=>{
 assert.deepEqual(validFavorites(['infantil','missing','benjami','infantil',42],teams),['infantil','benjami']);
 assert.deepEqual(validFavorites({ids:['infantil']},teams),[]);
 assert.deepEqual(filteredTeams(teams,['infantil','benjami'],'favorites'),teams.slice(0,2));
 assert.deepEqual(filteredTeams(teams,['infantil'],'all'),teams);
 assert.deepEqual(filteredTeams(teams,[],'favorites'),teams);
});
test('start on a favorite while allowing direct links to every other team',()=>{
 assert.equal(preferredTeam(teams,{saved:'senior',favorites:['benjami'],fallback:'infantil'}).id,'benjami');
 assert.equal(preferredTeam(teams,{wanted:'senior',favorites:['benjami'],fallback:'infantil'}).id,'senior');
 assert.equal(preferredTeam(teams,{saved:'infantil',favorites:['infantil','benjami']}).id,'infantil');
 assert.equal(preferredTeam(teams,{favorites:[],fallback:'infantil'}).id,'infantil');
});
