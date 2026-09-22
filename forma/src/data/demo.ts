import type {AppData, Garment, Outfit, Season, Style} from '../types';
import {currentSeason, defaultPreferences} from '../lib/constants';

const ago = (days:number) => new Date(Date.now() - days * 86400000).toISOString();
const allSeasons:Season[] = ['Primavera','Estate','Autunno','Inverno'];
const midSeasons:Season[] = ['Primavera','Autunno'];

export function createEmptyData():AppData {
  return {version:1, garments:[], outfits:[], history:[], preferences:{...defaultPreferences, favoriteColors:[], dislikedSignatures:[], likedSignatures:[]}};
}

/** Deliberately recognizable demo pieces. No remote images or personal data. */
export function createDemoData():AppData {
  const make = (id:string, name:string, category:Garment['category'], color:string, colorHex:string, style:Style, seasons:Season[], formality:number, extra:Partial<Garment> = {}):Garment => ({
    id, name, category, subcategory:category, color, colorHex, secondaryColors:[], style, seasons:[...seasons], formality,
    material:'Cotone', pattern:'Tinta unita', image:'', favorite:false, wearCount:0, lastWorn:null, createdAt:ago(35), demo:true, ...extra,
  });
  const garments:Garment[] = [
    make('g-white-tee','T-shirt essential','T-shirt','Bianco','#eeece5','Minimal',allSeasons,1,{subcategory:'Girocollo oversize',favorite:true,createdAt:ago(1)}),
    make('g-charcoal-trousers','Pantalone relaxed','Pantaloni','Grigio','#4d5054','Minimal',allSeasons,3,{subcategory:'Gamba ampia',material:'Misto lana',favorite:true,createdAt:ago(2)}),
    make('g-cream-sneakers','Sneakers everyday','Sneakers','Bianco','#e5dfcf','Minimal',allSeasons,1,{subcategory:'Low-top',material:'Pelle',secondaryColors:['Beige'],favorite:true,createdAt:ago(3)}),
    make('g-olive-bomber','Bomber olive','Giacca','Verde','#68735d','Streetwear',midSeasons,2,{subcategory:'Bomber',material:'Nylon',favorite:true,createdAt:ago(4)}),
    make('g-dark-jeans','Denim straight','Jeans','Blu','#344c69','Casual',allSeasons,2,{subcategory:'Straight fit',material:'Denim',favorite:true,createdAt:ago(5)}),
    make('g-black-tee','T-shirt washed black','T-shirt','Nero','#303237','Streetwear',allSeasons,1,{subcategory:'Girocollo boxy',createdAt:ago(6)}),
    make('g-blue-shirt','Camicia Oxford','Camicia','Azzurro','#a1b9cf','Casual',allSeasons,3,{subcategory:'Button-down',createdAt:ago(8)}),
    make('g-white-shirt','Camicia in lino','Camicia','Bianco','#f0ebe0','Elegante',['Primavera','Estate'],4,{subcategory:'Collo classico',material:'Lino',createdAt:ago(10)}),
    make('g-beige-chinos','Chino sabbia','Pantaloni','Beige','#c7b99e','Casual',allSeasons,3,{subcategory:'Chino regular',createdAt:ago(12)}),
    make('g-black-loafers','Mocassini penny','Scarpe eleganti','Nero','#26282b','Elegante',midSeasons,4,{subcategory:'Mocassini',material:'Pelle',createdAt:ago(14)}),
    make('g-navy-blazer','Blazer destrutturato','Giacca','Blu','#27394e','Elegante',midSeasons,4,{subcategory:'Blazer monopetto',material:'Misto lana',createdAt:ago(16)}),
    make('g-grey-hoodie','Felpa Sunday','Felpa','Grigio','#a4a49f','Streetwear',['Primavera','Autunno','Inverno'],1,{subcategory:'Con cappuccio',favorite:true,createdAt:ago(18)}),
    make('g-black-cargo','Cargo utility','Pantaloni','Nero','#2f3331','Streetwear',allSeasons,1,{subcategory:'Cargo',createdAt:ago(19)}),
    make('g-black-sneakers','Sneakers runner','Sneakers','Nero','#303338','Sportivo',allSeasons,1,{subcategory:'Running',material:'Mesh',secondaryColors:['Grigio'],createdAt:ago(20)}),
    make('g-cream-knit','Maglione soft wool','Maglione','Beige','#d4ccb9','Minimal',['Autunno','Inverno'],3,{subcategory:'Girocollo',material:'Lana',favorite:true,createdAt:ago(22)}),
    make('g-camel-coat','Cappotto cammello','Cappotto','Marrone','#aa8863','Elegante',['Autunno','Inverno'],4,{subcategory:'Cappotto lungo',material:'Lana',createdAt:ago(23)}),
    make('g-navy-polo','Polo navy','Polo','Blu','#344c69','Casual',['Primavera','Estate'],3,{subcategory:'Piqué',createdAt:ago(25)}),
    make('g-stone-shorts','Bermuda stone','Shorts','Beige','#c6bea9','Casual',['Estate'],1,{subcategory:'Bermuda',material:'Lino e cotone',createdAt:ago(27)}),
    make('g-black-sport-top','T-shirt training','T-shirt','Nero','#272b2f','Sportivo',['Primavera','Estate','Autunno'],1,{subcategory:'Tecnica',material:'Poliestere riciclato',createdAt:ago(28)}),
    make('g-sport-shorts','Shorts training','Shorts','Grigio','#696e72','Sportivo',['Primavera','Estate','Autunno'],1,{subcategory:'Shorts sportivi',material:'Poliestere',createdAt:ago(29)}),
    make('g-black-cap','Cap everyday','Accessori','Nero','#26282b','Streetwear',allSeasons,1,{subcategory:'Cappellino',createdAt:ago(31)}),
    make('g-brown-belt','Cintura essentials','Accessori','Marrone','#715743','Elegante',allSeasons,3,{subcategory:'Cintura',material:'Pelle',createdAt:ago(33)}),
  ];
  const outfit = (id:string, name:string, garmentIds:string[], occasion:string, style:Style, explanation:string, extra:Partial<Outfit> = {}):Outfit => ({
    id, name, garmentIds, occasion, season:currentSeason(), style, rating:0, favorite:true,
    createdAt:ago(12), lastWorn:null, notes:'', explanation, score:88, ...extra,
  });
  const outfits:Outfit[] = [
    outfit('o-everyday','Everyday, elevated',['g-white-tee','g-charcoal-trousers','g-cream-sneakers','g-olive-bomber'],'Università','Minimal','La T-shirt chiara illumina il grigio dei pantaloni. Il bomber oliva aggiunge colore, le sneakers tengono insieme il look.',{rating:5,score:94}),
    outfit('o-afterhours','Dopo le sei',['g-blue-shirt','g-beige-chinos','g-black-loafers','g-navy-blazer'],'Aperitivo','Elegante','Azzurro e sabbia creano un contrasto morbido. Blazer navy e mocassini aggiungono il giusto grado di eleganza.',{rating:4,score:91}),
    outfit('o-weekend','Weekend uniforme',['g-grey-hoodie','g-black-cargo','g-cream-sneakers','g-black-cap'],'Giornata casual','Streetwear','Grigio e nero costruiscono una base semplice. Le sneakers chiare alleggeriscono la silhouette rilassata.',{rating:5,score:89}),
    outfit('o-quiet','Quiet morning',['g-cream-knit','g-dark-jeans','g-cream-sneakers','g-camel-coat'],'Appuntamento','Minimal','Le tonalità calde del cappotto riprendono il maglione. Il denim scuro dà profondità senza appesantire.',{rating:4,season:'Autunno',score:90}),
  ];
  const worn = [
    {outfit:outfits[0],days:0},
    {outfit:outfits[2],days:2},
    {outfit:outfits[1],days:4},
    {outfit:outfits[0],days:7},
    {outfit:outfits[3],days:10},
  ];
  const history = worn.map(({outfit:look,days},i) => ({id:`h-demo-${i+1}`,outfitId:look.id,garmentIds:[...look.garmentIds],date:ago(days),name:look.name}));
  for (const event of history) {
    for (const id of event.garmentIds) {
      const garment = garments.find(item => item.id===id)!;
      garment.wearCount += 1;
      if (!garment.lastWorn || event.date > garment.lastWorn) garment.lastWorn = event.date;
    }
    const look = outfits.find(item => item.id===event.outfitId)!;
    if (!look.lastWorn || event.date > look.lastWorn) look.lastWorn = event.date;
  }
  // Recently imported demo pieces still predate their first recorded wear.
  for (const garment of garments) {
    const firstWear=history.filter(event=>event.garmentIds.includes(garment.id)).map(event=>event.date).sort()[0];
    if(firstWear && garment.createdAt>firstWear) garment.createdAt=new Date(Date.parse(firstWear)-86400000).toISOString();
  }
  return {version:1, garments, outfits, history, preferences:{...defaultPreferences,name:'',favoriteColors:['Bianco','Verde','Beige'],dislikedSignatures:[],likedSignatures:[],preferredStyle:'Minimal'}};
}
