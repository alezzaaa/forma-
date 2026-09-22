import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AppData, Garment, Outfit} from '../src/types.ts';
import {outfitSignature} from '../src/lib/engine.ts';
import {recordWornOutfit, rejectOutfit, removeGarments, toggleGarmentFavorite, toggleSavedOutfit} from '../src/lib/mutations.ts';

const firstDay='2026-09-20T12:00:00.000Z';
const nextDay='2026-09-21T12:00:00.000Z';
function garment(id:string,category:Garment['category'],extra:Partial<Garment>={}):Garment {
  return {id,name:id,category,subcategory:'',color:'Bianco',colorHex:'#eeece5',secondaryColors:[],style:'Minimal',seasons:['Autunno'],formality:2,material:'Cotone',pattern:'Tinta unita',image:'',demo:true,favorite:false,wearCount:0,lastWorn:null,createdAt:'2026-09-01T12:00:00.000Z',...extra};
}
function fixture():AppData {
  return {version:1,garments:[garment('top','T-shirt'),garment('top-two','Camicia'),garment('bottom','Pantaloni'),garment('shoes','Sneakers'),garment('demo-coat','Cappotto')],outfits:[],history:[],preferences:{name:'Alessandro',favoriteColors:['Blu'],dislikedSignatures:[],likedSignatures:[],preferredStyle:'Minimal',reduceMotion:true}};
}
function outfit(extra:Partial<Outfit>={}):Outfit {
  return {id:'look-one',name:'Il mio outfit',garmentIds:['top','bottom','shoes'],occasion:'Università',season:'Autunno',style:'Minimal',rating:0,favorite:false,createdAt:firstDay,lastWorn:null,notes:'',explanation:'Colori semplici.',score:90,...extra};
}
function deepFreeze<T>(value:T):T {
  if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}
  return value;
}

test('favorite toggles one garment without changing the input; removed IDs are rejected',()=>{
  const data=deepFreeze(fixture());
  const toggled=toggleGarmentFavorite(data,'top');
  assert.equal(toggled.garments[0].favorite,true);
  assert.equal(data.garments[0].favorite,false);
  assert.deepEqual(toggleGarmentFavorite(toggled,'top'),data);
  assert.throws(()=>toggleGarmentFavorite(data,'missing'),/non è più presente/);
});

test('saving an outfit applies a like and removes an earlier rejection',()=>{
  const proposal=deepFreeze(outfit());
  const data=fixture();
  const signature=outfitSignature(proposal.garmentIds);
  data.preferences.dislikedSignatures=[signature,'other'];
  const saved=toggleSavedOutfit(deepFreeze(data),proposal);
  assert.equal(saved.outfits.length,1);
  assert.equal(saved.outfits[0].favorite,true);
  assert.deepEqual(saved.preferences.likedSignatures,[signature]);
  assert.deepEqual(saved.preferences.dislikedSignatures,['other']);
  assert.equal(proposal.favorite,false);
  assert.notEqual(saved.outfits[0].garmentIds,proposal.garmentIds);
});

test('matching by signature toggles a saved outfit and preserves its personal metadata',()=>{
  const data=fixture();
  const original=outfit({id:'saved',name:'Cena preferita',notes:'Con la giacca',rating:5,favorite:true});
  data.outfits=[original];data.preferences.likedSignatures=[outfitSignature(original.garmentIds)];
  const changed=toggleSavedOutfit(deepFreeze(data),outfit({id:'different',garmentIds:['shoes','top','bottom'],name:'Nuova proposta'}));
  assert.equal(changed.outfits.length,1);
  assert.deepEqual(changed.outfits[0],{...original,favorite:false});
  assert.deepEqual(changed.preferences.likedSignatures,[]);
  assert.deepEqual(changed.preferences.dislikedSignatures,[]);
  const likedAgain=toggleSavedOutfit(changed,outfit());
  assert.equal(likedAgain.preferences.likedSignatures.length,1);
});

test('different combinations with the same proposed outfit ID receive distinct saved IDs',()=>{
  const data=fixture();data.outfits=[outfit()];
  const changed=toggleSavedOutfit(data,outfit({garmentIds:['top-two','bottom','shoes']}));
  assert.equal(new Set(changed.outfits.map(item=>item.id)).size,2);
  assert.equal(changed.outfits[1].id,'look-one');
});

test('missing, duplicated and empty garment references cannot be saved or worn',()=>{
  const data=fixture();
  for(const garmentIds of [['missing','bottom','shoes'],['top','top','shoes'],[]]) {
    assert.throws(()=>toggleSavedOutfit(data,outfit({garmentIds})));
    assert.throws(()=>recordWornOutfit(data,outfit({garmentIds}),firstDay));
  }
  assert.throws(()=>recordWornOutfit(data,outfit(),'invalid date'),/data di utilizzo/);
  assert.equal(data.history.length,0);
});

test('rejecting clears saved favorites and likes while preserving unrelated feedback',()=>{
  const data=fixture();const look=outfit({favorite:true});const signature=outfitSignature(look.garmentIds);
  data.outfits=[look];data.preferences.likedSignatures=[signature,'unrelated'];data.preferences.dislikedSignatures=['another'];
  const rejected=rejectOutfit(deepFreeze(data),outfit({id:'new-id',garmentIds:[...look.garmentIds].reverse()}));
  assert.equal(rejected.outfits[0].favorite,false);
  assert.deepEqual(rejected.preferences.likedSignatures,['unrelated']);
  assert.deepEqual(rejected.preferences.dislikedSignatures,['another',signature]);
  assert.deepEqual(rejectOutfit(rejected,look),rejected);
});

test('recording wear updates only worn garments and preserves saved outfit identity and notes',()=>{
  const data=fixture();data.outfits=[outfit({id:'saved-look',name:'Nome personale',notes:'Da tenere',rating:4,favorite:true})];
  const changed=recordWornOutfit(deepFreeze(data),deepFreeze(outfit()),firstDay);
  assert.equal(changed.alreadyRecorded,false);
  assert.equal(changed.data.outfits.length,1);
  assert.equal(changed.data.history[0].outfitId,'saved-look');
  assert.equal(changed.data.history[0].name,'Nome personale');
  assert.equal(changed.data.outfits[0].notes,'Da tenere');
  assert.equal(changed.data.outfits[0].lastWorn,firstDay);
  for(const item of changed.data.garments) {
    const included=['top','bottom','shoes'].includes(item.id);
    assert.equal(item.wearCount,included?1:0);
    assert.equal(item.lastWorn,included?firstDay:null);
  }
  assert.equal(data.history.length,0);
  assert.notEqual(changed.data.history[0].garmentIds,data.outfits[0].garmentIds);
});

test('same local day and garment signature are idempotent even with another outfit ID or order',()=>{
  const morning=new Date(2026,8,20,0,15).toISOString();
  const evening=new Date(2026,8,20,23,45).toISOString();
  const first=recordWornOutfit(fixture(),outfit(),morning);
  const repeated=recordWornOutfit(deepFreeze(first.data),outfit({id:'new',garmentIds:['shoes','bottom','top']}),evening);
  assert.equal(repeated.alreadyRecorded,true);
  assert.equal(repeated.data,first.data);
  assert.equal(repeated.data.history.length,1);
  const tomorrow=new Date(2026,8,21,0,15).toISOString();
  const next=recordWornOutfit(repeated.data,outfit(),tomorrow);
  assert.equal(next.alreadyRecorded,false);
  assert.equal(next.data.history.length,2);
  assert.equal(next.data.garments.find(item=>item.id==='top')!.wearCount,2);
  assert.equal(new Set(next.data.history.map(event=>event.id)).size,2);
});

test('two different outfits on the same day count shared garments twice',()=>{
  const first=recordWornOutfit(fixture(),outfit(),firstDay).data;
  const second=recordWornOutfit(first,outfit({id:'look-two',garmentIds:['top-two','bottom','shoes']}),firstDay);
  assert.equal(second.alreadyRecorded,false);
  assert.equal(second.data.history.length,2);
  assert.equal(second.data.garments.find(item=>item.id==='top')!.wearCount,1);
  assert.equal(second.data.garments.find(item=>item.id==='top-two')!.wearCount,1);
  assert.equal(second.data.garments.find(item=>item.id==='shoes')!.wearCount,2);
});

test('backdated wear adds an event without moving latest usage dates backward',()=>{
  const recent=recordWornOutfit(fixture(),outfit(),nextDay).data;
  const backdated=recordWornOutfit(recent,outfit(),firstDay).data;
  assert.equal(backdated.history.length,2);
  assert.equal(backdated.garments[0].wearCount,2);
  assert.equal(backdated.garments[0].lastWorn,nextDay);
  assert.equal(backdated.outfits[0].lastWorn,nextDay);
});

test('removing demo garments removes affected events but retains user looks and learning',()=>{
  const personal=outfit();const demoLook=outfit({id:'demo-look',garmentIds:['top','bottom','shoes','demo-coat']});
  let data=recordWornOutfit(fixture(),personal,firstDay).data;
  data=recordWornOutfit(data,demoLook,nextDay).data;
  const personalSignature=outfitSignature(personal.garmentIds),demoSignature=outfitSignature(demoLook.garmentIds);
  data.preferences.likedSignatures=[personalSignature,demoSignature];
  data.preferences.dislikedSignatures=['bottom|shoes|top-two','demo-coat|top-two'];
  const original=structuredClone(data);
  const removed=removeGarments(deepFreeze(data),['demo-coat']);
  assert.deepEqual(data,original);
  assert.equal(removed.garments.some(item=>item.id==='demo-coat'),false);
  assert.equal(removed.history.length,1);
  assert.equal(removed.outfits.length,1);
  assert.equal(removed.outfits[0].id,personal.id);
  assert.equal(removed.outfits[0].lastWorn,firstDay);
  assert.equal(removed.garments.find(item=>item.id==='shoes')!.wearCount,1);
  assert.equal(removed.garments.find(item=>item.id==='shoes')!.lastWorn,firstDay);
  assert.deepEqual(removed.preferences,{...original.preferences,likedSignatures:[personalSignature],dislikedSignatures:['bottom|shoes|top-two']});
});

test('removal recomputes surviving outfit dates from historical signatures, including unsaved IDs',()=>{
  const data=fixture();
  data.outfits=[outfit({id:'saved-later',lastWorn:nextDay})];
  data.history=[{id:'event',outfitId:'old-generated-id',garmentIds:['shoes','top','bottom'],date:firstDay,name:'Vecchio nome'}];
  const removed=removeGarments(data,['demo-coat']);
  assert.equal(removed.outfits[0].lastWorn,firstDay);
  assert.equal(removed.garments.find(item=>item.id==='top')!.wearCount,1);
  const emptyHistory=removeGarments({...data,history:[]},['demo-coat']);
  assert.equal(emptyHistory.outfits[0].lastWorn,null);
  assert.ok(emptyHistory.garments.every(item=>item.wearCount===0&&item.lastWorn===null));
});

test('removing nothing or unknown IDs is a no-op; full removal clears dependent data',()=>{
  const data=recordWornOutfit(fixture(),outfit(),firstDay).data;
  assert.equal(removeGarments(data,[]),data);
  assert.equal(removeGarments(data,['missing']),data);
  const removed=removeGarments(deepFreeze(data),data.garments.map(item=>item.id));
  assert.deepEqual(removed.garments,[]);
  assert.deepEqual(removed.history,[]);
  assert.deepEqual(removed.outfits,[]);
  assert.equal(removed.preferences.name,'Alessandro');
});

test('removal matches entire IDs in learned signatures, not ID substrings',()=>{
  const data=fixture();data.preferences.likedSignatures=['bottom|shoes|top-two','bottom|shoes|top'];
  const removed=removeGarments(data,['top']);
  assert.deepEqual(removed.preferences.likedSignatures,['bottom|shoes|top-two']);
});
