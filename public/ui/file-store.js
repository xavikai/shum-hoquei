import {validateMarks} from './video-core.js';
import {safeURL} from './core.js';
export const fileMode=typeof document!=='undefined'&&document.querySelector('meta[name="shum-storage"]')?.content==='file';
const drafts=new Map();
function readDraft(id){if(drafts.has(id))return drafts.get(id);let marks=[];try{marks=validateMarks(JSON.parse(localStorage.getItem('shum-marks-'+id)||'[]'));}catch{}drafts.set(id,marks);return marks;}
export async function readFileMarks(id){return {marks:readDraft(id),shared:false};}
export async function writeFileMarks(id,marks){const clean=validateMarks(marks);drafts.set(id,clean);try{localStorage.setItem('shum-marks-'+id,JSON.stringify(clean));}catch{}return {marks:clean,shared:false};}
export async function writeFileVideo(id,video){return {id,video:safeURL(video)};}
