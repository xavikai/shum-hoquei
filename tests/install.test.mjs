import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/ui/install.js',import.meta.url),'utf8');
function setup(installed=false){
 const windowEvents={},button={hidden:false,addEventListener(type,fn){this[type]=fn;}},dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}},close={addEventListener(type,fn){this[type]=fn;}};
 const media={matches:installed,addEventListener(){}};
 vm.runInNewContext(source,{window:{matchMedia:()=>media,addEventListener:(type,fn)=>windowEvents[type]=fn},navigator:{},document:{querySelector:selector=>({'#install-app':button,'#install-dialog':dialog,'#close-install':close})[selector]}});
 return {windowEvents,button,dialog,close};
}
test('install button uses the browser prompt once and falls back to instructions',async()=>{
 const s=setup();let prompted=0,prevented=false;
 s.windowEvents.beforeinstallprompt({preventDefault(){prevented=true;},async prompt(){prompted++;},userChoice:Promise.resolve({outcome:'dismissed'})});
 await s.button.click();assert.ok(prevented);assert.equal(prompted,1);assert.equal(s.dialog.open,false);assert.equal(s.button.hidden,false);
 await s.button.click();assert.equal(s.dialog.open,true);s.close.click();assert.equal(s.dialog.open,false);
 s.windowEvents.appinstalled();assert.equal(s.button.hidden,true);
 assert.equal(setup(true).button.hidden,true);
});
test('manifest launches at the website root rather than the asset folder',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/ui/manifest.json',import.meta.url),'utf8'));
 const base='https://xavikai.github.io/shum-infantil-or/ui/manifest.json';
 assert.equal(new URL(manifest.start_url,base).href,'https://xavikai.github.io/shum-infantil-or/#inici');
 assert.equal(new URL(manifest.scope,base).pathname,'/shum-infantil-or/');
 for(const icon of manifest.icons){const data=await readFile(new URL('../public/ui/'+icon.src,import.meta.url));assert.equal(data.readUInt32BE(16),parseInt(icon.sizes));}
});
