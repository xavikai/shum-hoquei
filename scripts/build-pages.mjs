import {mkdir,cp,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=new URL('../pages-dist/',import.meta.url);
await mkdir(out,{recursive:true});
await cp(new URL('../public/ui/',import.meta.url),new URL('ui/',out),{recursive:true,filter:source=>!source.endsWith('index.html')});
const ui=new URL('ui/',out),files=(await readdir(ui)).filter(f=>f.endsWith('.js')).sort();
const hash=createHash('sha256');for(const file of files)hash.update(await readFile(new URL(file,ui)));
const version=hash.digest('hex').slice(0,12);
for(const file of files){const source=await readFile(new URL(file,ui),'utf8');await writeFile(new URL(file,ui),source.replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g,`$1$2?v=${version}$3`));}
const shell=(await readFile(new URL('../app/shell.html',import.meta.url),'utf8')).replaceAll('/ui/','./ui/');
await writeFile(new URL('index.html',out),`<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="shum-storage" content="file"><title>SHUM · Infantil Or</title><link rel="icon" href="./ui/badge.svg"><link rel="stylesheet" href="./ui/style.css?v=${version}"><link rel="stylesheet" href="./ui/review.css?v=${version}"></head><body>${shell}<script type="module" src="./ui/app.js?v=${version}"></script></body></html>`);
await writeFile(new URL('.nojekyll',out),'');
console.log('GitHub Pages: pages-dist/');
