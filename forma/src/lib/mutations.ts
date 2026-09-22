import type {AppData, Outfit} from '../types.ts';
import {outfitSignature} from './engine.ts';

function checkedGarmentIds(data:AppData, outfit:Outfit):Set<string> {
  const ids=new Set(outfit.garmentIds);
  if(!ids.size)throw new Error('Questo outfit non contiene capi. Genera un nuovo outfit.');
  if(ids.size!==outfit.garmentIds.length)throw new Error('Questo outfit contiene capi duplicati. Genera un nuovo outfit.');
  const owned=new Set(data.garments.map(garment=>garment.id));
  if([...ids].some(id=>!owned.has(id)))throw new Error('Un capo non è più disponibile. Genera un nuovo outfit.');
  return ids;
}

function latest(a:string|null,b:string):string {return a&&Date.parse(a)>Date.parse(b)?a:b;}

function newSavedOutfit(data:AppData,outfit:Outfit):Outfit {
  return {...outfit,id:data.outfits.some(item=>item.id===outfit.id)?crypto.randomUUID():outfit.id,garmentIds:[...outfit.garmentIds]};
}

/** Immutable state operations; persistence and UI messages remain the caller's responsibility. */
export function toggleGarmentFavorite(data:AppData,id:string):AppData {
  if(!data.garments.some(garment=>garment.id===id))throw new Error('Questo capo non è più presente nel guardaroba.');
  return {...data,garments:data.garments.map(garment=>garment.id===id?{...garment,favorite:!garment.favorite}:garment)};
}

export function toggleSavedOutfit(data:AppData,outfit:Outfit):AppData {
  checkedGarmentIds(data,outfit);
  const signature=outfitSignature(outfit.garmentIds);
  const existing=data.outfits.find(item=>outfitSignature(item.garmentIds)===signature);
  const favorite=existing?!existing.favorite:true;
  return {...data,
    outfits:existing
      ?data.outfits.map(item=>outfitSignature(item.garmentIds)===signature?{...item,favorite}:item)
      :[{...newSavedOutfit(data,outfit),favorite:true},...data.outfits],
    preferences:{...data.preferences,
      likedSignatures:favorite?[...new Set([...data.preferences.likedSignatures,signature])]:data.preferences.likedSignatures.filter(item=>item!==signature),
      dislikedSignatures:favorite?data.preferences.dislikedSignatures.filter(item=>item!==signature):data.preferences.dislikedSignatures,
    },
  };
}

export function recordWornOutfit(data:AppData,outfit:Outfit,now=new Date().toISOString()):{data:AppData;alreadyRecorded:boolean} {
  const wornIds=checkedGarmentIds(data,outfit);
  const timestamp=Date.parse(now);
  if(!Number.isFinite(timestamp))throw new Error('La data di utilizzo non è valida.');
  const date=new Date(timestamp).toISOString();
  const signature=outfitSignature(outfit.garmentIds);
  const localDay=new Date(date).toDateString();
  const duplicate=data.history.some(event=>new Date(event.date).toDateString()===localDay&&outfitSignature(event.garmentIds)===signature);
  if(duplicate)return {data,alreadyRecorded:true};
  const existing=data.outfits.find(item=>outfitSignature(item.garmentIds)===signature);
  const saved=existing??newSavedOutfit(data,outfit);
  const nextSaved={...saved,lastWorn:latest(saved.lastWorn,date)};
  return {alreadyRecorded:false,data:{...data,
    garments:data.garments.map(garment=>wornIds.has(garment.id)?{...garment,wearCount:garment.wearCount+1,lastWorn:latest(garment.lastWorn,date)}:garment),
    outfits:existing?data.outfits.map(item=>outfitSignature(item.garmentIds)===signature?{...item,lastWorn:latest(item.lastWorn,date)}:item):[nextSaved,...data.outfits],
    history:[{id:crypto.randomUUID(),outfitId:saved.id,garmentIds:[...saved.garmentIds],date,name:saved.name},...data.history],
  }};
}

export function rejectOutfit(data:AppData,outfit:Outfit):AppData {
  checkedGarmentIds(data,outfit);
  const signature=outfitSignature(outfit.garmentIds);
  return {...data,
    outfits:data.outfits.map(item=>outfitSignature(item.garmentIds)===signature?{...item,favorite:false}:item),
    preferences:{...data.preferences,
      likedSignatures:data.preferences.likedSignatures.filter(item=>item!==signature),
      dislikedSignatures:[...new Set([...data.preferences.dislikedSignatures,signature])],
    },
  };
}

export function removeGarments(data:AppData,ids:string[]):AppData {
  const ownedIds=new Set(data.garments.map(garment=>garment.id));
  const removed=new Set(ids.filter(id=>ownedIds.has(id)));
  if(!removed.size)return data;
  const affected=(garmentIds:string[])=>garmentIds.some(id=>removed.has(id));
  const history=data.history.filter(event=>!affected(event.garmentIds));
  const counts=new Map<string,number>();
  const garmentDates=new Map<string,string>();
  const outfitDates=new Map<string,string>();
  for(const event of history) {
    for(const id of new Set(event.garmentIds)) {
      counts.set(id,(counts.get(id)??0)+1);
      garmentDates.set(id,latest(garmentDates.get(id)??null,event.date));
    }
    const signature=outfitSignature(event.garmentIds);
    outfitDates.set(signature,latest(outfitDates.get(signature)??null,event.date));
  }
  return {...data,
    garments:data.garments.filter(garment=>!removed.has(garment.id)).map(garment=>({...garment,wearCount:counts.get(garment.id)??0,lastWorn:garmentDates.get(garment.id)??null})),
    outfits:data.outfits.filter(outfit=>!affected(outfit.garmentIds)).map(outfit=>({...outfit,lastWorn:outfitDates.get(outfitSignature(outfit.garmentIds))??null})),
    history,
    preferences:{...data.preferences,
      likedSignatures:data.preferences.likedSignatures.filter(signature=>!affected(signature.split('|'))),
      dislikedSignatures:data.preferences.dislikedSignatures.filter(signature=>!affected(signature.split('|'))),
    },
  };
}
