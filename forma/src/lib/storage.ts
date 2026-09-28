import type {AppData, Garment, Outfit, Preferences, WearEvent} from '../types';
import {CATEGORIES, SEASONS, STYLES} from './constants';

const DB_NAME = 'forma-wardrobe';
const STORE = 'snapshots';
const SNAPSHOT_KEY = 'current';
const MAX_BACKUP_LENGTH = 160 * 1024 * 1024;
const MAX_IMAGE_LENGTH = 16 * 1024 * 1024;
let databasePromise:Promise<IDBDatabase>|null = null;
let writeQueue:Promise<void> = Promise.resolve();

function storageError(error:unknown):Error {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'QuotaExceededError') return new Error('Spazio del browser esaurito. Esporta un backup e riduci le foto prima di riprovare.');
  if (name === 'SecurityError' || name === 'InvalidStateError') return new Error('Il browser non consente di salvare il guardaroba. Controlla le impostazioni dei dati dei siti e la navigazione privata.');
  return new Error('Non è stato possibile accedere al guardaroba salvato. Riprova e conserva un backup dei tuoi dati.');
}

function openDatabase():Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve,reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Questo browser non supporta il salvataggio locale necessario a GET DRESSD. Usa un browser aggiornato.'));
      return;
    }
    let request:IDBOpenDBRequest;
    try { request = indexedDB.open(DB_NAME,1); } catch (error) {reject(storageError(error));return;}
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onerror = () => reject(storageError(request.error));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Il guardaroba è aperto in un’altra scheda. Chiudi le altre schede di GET DRESSD e riprova.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {db.close();return;}
      db.onversionchange = () => {db.close();databasePromise=null;};
      db.onclose = () => {databasePromise=null;};
      resolve(db);
    };
  }).catch(error => {databasePromise=null;throw error;});
  return databasePromise;
}

/** null means first launch; corrupt/unavailable storage rejects instead of resetting. */
export async function loadData():Promise<AppData|null> {
  const db = await openDatabase();
  const value = await new Promise<unknown>((resolve,reject) => {
    let transaction:IDBTransaction;
    try {transaction=db.transaction(STORE,'readonly');} catch(error) {reject(storageError(error));return;}
    const request = transaction.objectStore(STORE).get(SNAPSHOT_KEY);
    let result:unknown;
    request.onsuccess=() => {result=request.result;};
    transaction.oncomplete=() => resolve(result);
    transaction.onerror=() => reject(storageError(transaction.error));
    transaction.onabort=() => reject(storageError(transaction.error));
  });
  if (value === undefined) return null;
  try {return validateAppData(value);} catch (error) {
    throw new Error(`Il guardaroba salvato non è valido e non è stato sostituito. ${error instanceof Error ? error.message : ''}`);
  }
}

/** Snapshot writes are serialized and atomic; a failed write never overwrites the previous commit. */
export function saveData(data:AppData):Promise<void> {
  let snapshot:AppData;
  try {snapshot=validateAppData(data);} catch(error) {return Promise.reject(error);}
  const task = writeQueue.catch(() => undefined).then(async () => {
    const db=await openDatabase();
    await new Promise<void>((resolve,reject) => {
      let transaction:IDBTransaction;
      try {transaction=db.transaction(STORE,'readwrite');} catch(error) {reject(storageError(error));return;}
      transaction.oncomplete=() => resolve();
      transaction.onerror=() => reject(storageError(transaction.error));
      transaction.onabort=() => reject(storageError(transaction.error));
      try {transaction.objectStore(STORE).put(snapshot,SNAPSHOT_KEY);} catch(error) {transaction.abort();reject(storageError(error));}
    });
  });
  writeQueue=task;
  return task;
}

type RecordValue = Record<string,unknown>;
const fail = (path:string, reason:string):never => {throw new Error(`Backup non valido: ${path} ${reason}.`);};
function object(value:unknown,path:string,required:string[],optional:string[]=[]):RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(path,'deve essere un oggetto');
  const result=value as RecordValue;
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(result,key)) fail(`${path}.${key}`,'è mancante');
  for (const key of Object.keys(result)) if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`,'non è un campo supportato');
  return result;
}
function string(value:unknown,path:string,max=200,min=0):string {
  if (typeof value!=='string' || value.length<min || value.length>max) return fail(path,`deve essere un testo di ${min}–${max} caratteri`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return fail(path,'contiene caratteri non supportati');
  return value;
}
function id(value:unknown,path:string):string {
  const result=string(value,path,100,1);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) return fail(path,'deve essere un identificativo valido');
  return result;
}
function bool(value:unknown,path:string):boolean {if(typeof value!=='boolean')return fail(path,'deve essere vero o falso');return value;}
function number(value:unknown,path:string,min:number,max:number,integer=false):number {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))return fail(path,`deve essere ${integer?'un intero':'un numero'} tra ${min} e ${max}`);
  return value;
}
function array<T>(value:unknown,path:string,max:number,parse:(item:unknown,path:string)=>T,min=0):T[] {
  if(!Array.isArray(value)||value.length<min||value.length>max)return fail(path,`deve contenere ${min}–${max} elementi`);
  return value.map((item,index)=>parse(item,`${path}[${index}]`));
}
function unique<T>(values:T[],path:string):T[] {if(new Set(values).size!==values.length)return fail(path,'contiene duplicati');return values;}
function enumeration<T extends string>(value:unknown,path:string,choices:readonly T[]):T {
  if(typeof value!=='string'||!choices.includes(value as T))return fail(path,'contiene un valore non supportato');
  return value as T;
}
function date(value:unknown,path:string):string {
  const result=string(value,path,40,20);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(result)||!Number.isFinite(Date.parse(result)))return fail(path,'deve essere una data ISO valida');
  const [year,month,day]=result.slice(0,10).split('-').map(Number);
  const monthDays=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>monthDays[month-1])return fail(path,'deve essere una data di calendario valida');
  return result;
}
const nullableDate=(value:unknown,path:string) => value===null?null:date(value,path);
function image(value:unknown,path:string,demo:boolean):string {
  const result=string(value,path,MAX_IMAGE_LENGTH);
  if(result===''&&demo)return result;
  const match=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(result);
  if(!match||match[2].length%4!==0)return fail(path,'deve essere una foto PNG, JPEG o WebP incorporata');
  // Restrict MIME and file signatures. SVG, HTML, URLs and other active content cannot enter the gallery.
  const header=match[2].slice(0,16);
  const bytes=atob(header);
  const valid=match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
  if(!valid)return fail(path,'non corrisponde al formato immagine dichiarato');
  return result;
}
function parseGarment(value:unknown,path:string):Garment {
  const x=object(value,path,['id','name','category','subcategory','color','colorHex','secondaryColors','style','seasons','formality','material','pattern','image','favorite','wearCount','lastWorn','createdAt'],['demo']);
  const demo=x.demo===undefined?undefined:bool(x.demo,`${path}.demo`);
  const colorHex=string(x.colorHex,`${path}.colorHex`,7,7);
  if(!/^#[\da-fA-F]{6}$/.test(colorHex))fail(`${path}.colorHex`,'deve essere un colore esadecimale');
  return {id:id(x.id,`${path}.id`),name:string(x.name,`${path}.name`,160,1),category:enumeration(x.category,`${path}.category`,CATEGORIES),subcategory:string(x.subcategory,`${path}.subcategory`,120),color:string(x.color,`${path}.color`,50,1),colorHex,
    secondaryColors:unique(array(x.secondaryColors,`${path}.secondaryColors`,12,(v,p)=>string(v,p,50,1)),`${path}.secondaryColors`),style:enumeration(x.style,`${path}.style`,STYLES),seasons:unique(array(x.seasons,`${path}.seasons`,4,(v,p)=>enumeration(v,p,SEASONS),1),`${path}.seasons`),formality:number(x.formality,`${path}.formality`,1,5,true),material:string(x.material,`${path}.material`,160),pattern:string(x.pattern,`${path}.pattern`,120),image:image(x.image,`${path}.image`,demo===true),favorite:bool(x.favorite,`${path}.favorite`),wearCount:number(x.wearCount,`${path}.wearCount`,0,1000000,true),lastWorn:nullableDate(x.lastWorn,`${path}.lastWorn`),createdAt:date(x.createdAt,`${path}.createdAt`),...(demo===undefined?{}:{demo})};
}
function parseOutfit(value:unknown,path:string):Outfit {
  const x=object(value,path,['id','name','garmentIds','occasion','season','style','rating','favorite','createdAt','lastWorn','notes','explanation','score']);
  return {id:id(x.id,`${path}.id`),name:string(x.name,`${path}.name`,160,1),garmentIds:unique(array(x.garmentIds,`${path}.garmentIds`,20,id,1),`${path}.garmentIds`),occasion:string(x.occasion,`${path}.occasion`,100,1),season:enumeration(x.season,`${path}.season`,SEASONS),style:enumeration(x.style,`${path}.style`,STYLES),rating:number(x.rating,`${path}.rating`,0,5,true),favorite:bool(x.favorite,`${path}.favorite`),createdAt:date(x.createdAt,`${path}.createdAt`),lastWorn:nullableDate(x.lastWorn,`${path}.lastWorn`),notes:string(x.notes,`${path}.notes`,5000),explanation:string(x.explanation,`${path}.explanation`,2000),score:number(x.score,`${path}.score`,0,100)};
}
function parseHistory(value:unknown,path:string):WearEvent {
  const x=object(value,path,['id','outfitId','garmentIds','date','name']);
  return {id:id(x.id,`${path}.id`),outfitId:id(x.outfitId,`${path}.outfitId`),garmentIds:unique(array(x.garmentIds,`${path}.garmentIds`,20,id,1),`${path}.garmentIds`),date:date(x.date,`${path}.date`),name:string(x.name,`${path}.name`,160,1)};
}
function parsePreferences(value:unknown,path:string):Preferences {
  const x=object(value,path,['name','favoriteColors','dislikedSignatures','likedSignatures','preferredStyle','reduceMotion']);
  return {name:string(x.name,`${path}.name`,80),favoriteColors:unique(array(x.favoriteColors,`${path}.favoriteColors`,30,(v,p)=>string(v,p,50,1)),`${path}.favoriteColors`),dislikedSignatures:unique(array(x.dislikedSignatures,`${path}.dislikedSignatures`,10000,(v,p)=>string(v,p,2020,1)),`${path}.dislikedSignatures`),likedSignatures:unique(array(x.likedSignatures,`${path}.likedSignatures`,10000,(v,p)=>string(v,p,2020,1)),`${path}.likedSignatures`),preferredStyle:enumeration(x.preferredStyle,`${path}.preferredStyle`,STYLES),reduceMotion:bool(x.reduceMotion,`${path}.reduceMotion`)};
}
function validateAppData(value:unknown):AppData {
  const x=object(value,'guardaroba',['version','garments','outfits','history','preferences']);
  if(x.version!==1)fail('version','non è supportata (richiesta versione 1)');
  const garments=array(x.garments,'garments',5000,parseGarment);
  const outfits=array(x.outfits,'outfits',10000,parseOutfit);
  const history=array(x.history,'history',50000,parseHistory);
  unique(garments.map(item=>item.id),'garments.id');unique(outfits.map(item=>item.id),'outfits.id');unique(history.map(item=>item.id),'history.id');
  const garmentIds=new Set(garments.map(item=>item.id));
  for(const [collection,items] of [['outfits',outfits],['history',history]] as const) {
    for(const item of items) for(const garmentId of item.garmentIds) if(!garmentIds.has(garmentId))fail(`${collection}.${item.id}.garmentIds`,'fa riferimento a un capo inesistente');
  }
  return {version:1,garments,outfits,history,preferences:parsePreferences(x.preferences,'preferences')};
}

/** Import is all-or-nothing. Caller must save the returned validated snapshot explicitly. */
export function parseBackup(raw:string):AppData {
  if(typeof raw!=='string'||raw.length>MAX_BACKUP_LENGTH)throw new Error('Il backup supera il limite di 160 MB.');
  let value:unknown;
  try {value=JSON.parse(raw);} catch {throw new Error('Questo file non è un backup JSON valido di GET DRESSD.');}
  return validateAppData(value);
}
