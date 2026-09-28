import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';

const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false},appType:'custom'});
try {
  await server.listen();
  const { createDemoData, createEmptyData }=await server.ssrLoadModule('/src/data/demo.ts');
  const { parseBackup }=await server.ssrLoadModule('/src/lib/storage.ts');
  const { generateOutfits }=await server.ssrLoadModule('/src/lib/engine.ts');
  const data=createDemoData();
  assert.deepEqual(parseBackup(JSON.stringify(data)),data);
  assert.deepEqual(parseBackup(JSON.stringify(createEmptyData())),createEmptyData());
  const invalid=structuredClone(data);invalid.garments[0].image='https://example.com/track.png';
  assert.throws(()=>parseBackup(JSON.stringify(invalid)),/foto PNG/);
  const dangling=structuredClone(data);dangling.outfits[0].garmentIds=['missing'];
  assert.throws(()=>parseBackup(JSON.stringify(dangling)),/inesistente/);
  const noop=()=>{};const asyncNoop=async()=>{};
  const props={data,onNavigate:noop,onUpload:noop,onEdit:noop,onFavorite:noop,onLock:noop,onWear:noop,onSave:noop,onReject:noop,onCreate:noop,onUpdate:asyncNoop,onDelete:noop,onPreferences:asyncNoop,onImport:noop,onReset:noop,onRemoveDemo:noop,onOpenHistory:noop,notify:noop,initialLockedIds:[]};
  for(const name of ['Home','Wardrobe','Collection','History','Settings','CreateOutfit']) {
    const module=await server.ssrLoadModule(`/src/pages/${name}.tsx`);
    for(const current of [data,createEmptyData()]) {
      const html=renderToStaticMarkup(createElement(module.default,{...props,data:current}));
      assert.ok(html.length>1000,`${name} renders substantial HTML`);
      assert.ok(!html.includes('NaN'),`${name} has no invalid numbers`);
      assert.ok(!html.includes('undefined'),`${name} has no undefined labels`);
      if(name==='CreateOutfit'&&current.garments.length)assert.equal((html.match(/class="outfit-card"/g)||[]).length,3);
      if(name==='Settings') {
        assert.ok(html.includes('Statistiche') && html.includes('30 giorni') && html.includes('Sempre'));
        assert.ok(html.includes('GET DRESSD 1.1'));
        assert.ok(html.includes('Apri la cronologia'));
        if(!current.garments.length) assert.ok(html.includes('Il prossimo colpo di fulmine.'));
      }
    }
    console.log(`PASS render ${name}: demo + empty`);
  }
  for(const name of ['UploadModal','GarmentEditor']) {
    const module=await server.ssrLoadModule(`/src/components/${name}.tsx`);
    const html=renderToStaticMarkup(createElement(module.default,{garment:data.garments[0],onClose:noop,onSave:asyncNoop,onDelete:asyncNoop}));
    assert.ok(html.includes('role="dialog"'));
    console.log(`PASS render ${name}`);
  }
  for(const [style,formality,temperature] of [['Casual',2,20],['Sportivo',1,28],['Elegante',4,8]]) {
    const result=generateOutfits(data.garments,data.preferences,{occasion:style==='Sportivo'?'Palestra':'Cena',style,formality,temperature,weather:'Sereno',season:'Autunno',lockedIds:[]},3);
    const withGenerated={...data,outfits:[...data.outfits,...result.outfits]};
    assert.doesNotThrow(()=>parseBackup(JSON.stringify(withGenerated)));
  }
  console.log('PASS generated outfits match persistence schema');
  const {default:OutfitCard}=await server.ssrLoadModule('/src/components/OutfitCard.tsx');
  const accessories=data.garments.filter(item=>item.category==='Accessori');
  const multipleAccessories={...data.outfits[0],garmentIds:[...data.outfits[0].garmentIds,...accessories.map(item=>item.id)]};
  const multiHtml=renderToStaticMarkup(createElement(OutfitCard,{outfit:multipleAccessories,garments:data.garments,onWear:noop}));
  assert.ok(multiHtml.includes('outfit-collage--grid'),'multiple accessories receive separate grid cells');
  for(const item of accessories) assert.ok(multiHtml.includes(item.name));
  console.log('PASS multiple accessories have a complete, separate-cell outfit preview');
  if(process.argv.includes('--art')) {
    const {default:Art}=await server.ssrLoadModule('/src/components/GarmentArt.tsx');
    const columns=6,w=200,h=230,rows=Math.ceil(data.garments.length/columns);
    const tiles=data.garments.map((garment,i)=>{const x=(i%columns)*w,y=Math.floor(i/columns)*h;const svg=renderToStaticMarkup(createElement(Art,{garment}),{identifierPrefix:`art-${i}-`}).replace('style="width:100%;height:100%;overflow:visible"','style="overflow:visible"').replace('<svg',`<svg x="${x+12}" y="${y+5}" width="176" height="192"`);return `<rect x="${x+4}" y="${y+4}" width="192" height="222" rx="12" fill="#e6e4dc"/>${svg}<text x="${x+12}" y="${y+214}" font-size="10" fill="#303630" font-family="sans-serif">${garment.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>`;}).join('');
    await mkdir('../qa',{recursive:true});
    await writeFile('../qa/garments.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*w}" height="${rows*h}"><rect width="100%" height="100%" fill="#111216"/>${tiles}</svg>`);
  }
} finally { await server.close(); }
