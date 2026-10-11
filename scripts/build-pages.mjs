import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
const out=new URL('../pages-dist/',import.meta.url);
await mkdir(out,{recursive:true});
await cp(new URL('../public/ui/',import.meta.url),new URL('ui/',out),{recursive:true,filter:source=>!source.endsWith('index.html')});
const shell=(await readFile(new URL('../app/shell.html',import.meta.url),'utf8')).replaceAll('/ui/','./ui/');
await writeFile(new URL('index.html',out),`<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="shum-storage" content="file"><title>SHUM · Infantil Or</title><link rel="icon" href="./ui/badge.svg"><link rel="stylesheet" href="./ui/style.css"><link rel="stylesheet" href="./ui/review.css"></head><body>${shell}<script type="module" src="./ui/app.js"></script></body></html>`);
await writeFile(new URL('.nojekyll',out),'');
console.log('GitHub Pages: pages-dist/');
