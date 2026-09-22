/** Embed the verified production build in a portable, offline HTML file. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist=resolve(root,'dist');
const names=await readdir(resolve(dist,'assets'));
const javascript=names.filter(name=>name.endsWith('.js'));
if(javascript.length!==1)throw new Error('Standalone packaging expects one JS bundle.');
let html=await readFile(resolve(dist,'index.html'),'utf8');
const script=await readFile(resolve(dist,'assets',javascript[0]),'utf8');
const styles=(await Promise.all(names.filter(name=>name.endsWith('.css')).map(name=>readFile(resolve(dist,'assets',name),'utf8')))).join('\n');
const icon=await readFile(resolve(root,'public/favicon.svg'),'utf8');
html=html.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g,'').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,'');
html=html.replace('./favicon.svg',`data:image/svg+xml,${encodeURIComponent(icon)}`);
html=html.replace('</head>',()=>`<style>${styles.replace(/<\/style/gi,'<\\/style')}</style></head>`);
html=html.replace('</body>',()=>`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script></body>`);
await writeFile(resolve(root,'Forma.html'),html);
console.log(`Forma.html pronta (${Math.round(Buffer.byteLength(html)/1024)} KB), senza risorse esterne.`);
