import {validateRosters} from './player-stats.js';
import {validateCoaches} from './coaches.js';
import {validateMarks} from './video-core.js';
import {safeURL} from './core.js';
export function analysisFile(match,marks){return {format:'shum-analysis',version:1,savedAt:new Date().toISOString(),match:{id:match.id,home:match.home,away:match.away,date:match.date,round:match.round},rosters:validateRosters(match.rosters),note:String(match.note||'').slice(0,2000),coaches:validateCoaches(match.coaches),video:safeURL(match.video||''),marks:validateMarks(marks)};}
export function parseAnalysis(input,matchId){if(input?.format!=='shum-analysis'||input.version!==1||input.match?.id!==matchId)throw Error('Aquest fitxer no és una anàlisi d’aquest partit.');return {rosters:validateRosters(input.rosters),note:input.note===undefined?undefined:String(input.note).slice(0,2000),coaches:validateCoaches(input.coaches),video:safeURL(input.video||''),marks:validateMarks(input.marks)};}
