import type { Garment, GenerateOptions, GenerateResult, Outfit, Preferences, Slot, Style } from '../types.ts';
import { categorySlot, SLOT_LABELS } from './constants.ts';

const REQUIRED_SLOTS: Slot[] = ['top', 'bottom', 'shoes'];
const SLOT_ORDER: Slot[] = [...REQUIRED_SLOTS, 'outerwear', 'accessory'];
const WARM_TOPS = new Set(['Felpa', 'Maglione']);
const BEAM_SIZE = 360;
const DAY = 86_400_000;

/** Stable, order-independent identity, also used when learning likes and dislikes. */
export function outfitSignature(ids: string[]): string {
  return [...new Set(ids)].sort().join('|');
}

function ordered(items: Garment[]): Garment[] {
  return [...items].sort((a, b) => SLOT_ORDER.indexOf(categorySlot(a.category)) - SLOT_ORDER.indexOf(categorySlot(b.category)) || a.id.localeCompare(b.id));
}

function uniqueItems(garments: Garment[]): Garment[] {
  return [...new Map(garments.map(garment => [garment.id, garment])).values()];
}

function compatibleStyle(a: Style, b: Style): boolean {
  return a === b || (['Minimal', 'Casual'].includes(a) && ['Minimal', 'Casual', 'Elegante'].includes(b))
    || (['Streetwear', 'Sportivo'].includes(a) && ['Streetwear', 'Sportivo', 'Casual'].includes(b))
    || (a === 'Elegante' && b === 'Minimal');
}

function appropriateTemperature(garment: Garment, temperature: number): boolean {
  if (temperature >= 25 && (WARM_TOPS.has(garment.category) || categorySlot(garment.category) === 'outerwear')) return false;
  if (temperature >= 21 && garment.category === 'Cappotto') return false;
  return true;
}

/** Occasion adds practical context without replacing the user's chosen formality target. */
function occasionScore(garment: Garment, options: GenerateOptions): number {
  const slot = categorySlot(garment.category);
  if (options.occasion === 'Palestra') {
    let score = garment.style === 'Sportivo' ? 20 : slot === 'accessory' || slot === 'outerwear' ? -3 : -10;
    if (garment.category === 'Scarpe eleganti') score -= 20;
    if (garment.category === 'Jeans' || garment.category === 'Camicia') score -= 10;
    return score;
  }
  if (['Cena', 'Appuntamento', 'Aperitivo'].includes(options.occasion)) {
    return (garment.style === 'Sportivo' ? -7 : 0)
      + (['Camicia', 'Polo'].includes(garment.category) ? 3 : 0)
      + (garment.style === 'Elegante' && options.formality >= 3 ? 4 : 0);
  }
  if (options.occasion === 'Lavoro') {
    return (garment.style === 'Sportivo' ? -5 : 0)
      + (['Camicia', 'Polo'].includes(garment.category) ? 3 : 0)
      - (garment.category === 'Shorts' && options.formality >= 2 ? 5 : 0);
  }
  if (['Università', 'Viaggio'].includes(options.occasion)) {
    return (['Casual', 'Minimal'].includes(garment.style) ? 3 : 0)
      + (garment.category === 'Sneakers' ? 3 : garment.category === 'Scarpe eleganti' ? -3 : 0);
  }
  return 0;
}

function individualScore(garment: Garment, preferences: Preferences, options: GenerateOptions): number {
  let score = 55;
  const style = options.style === 'Qualsiasi' ? preferences.preferredStyle : options.style;
  score += garment.seasons.includes(options.season) ? 10 : -13;
  score += garment.style === style ? 11 : compatibleStyle(garment.style, style) ? 3 : -8;
  score -= Math.abs(garment.formality - options.formality) * 8;
  score += occasionScore(garment, options);
  if (garment.favorite) score += 3;
  if (preferences.favoriteColors.some(color => color.toLowerCase() === garment.color.toLowerCase())) score += 5;
  score -= Math.log2(1 + Math.max(0, garment.wearCount)) * 1.3;
  if (garment.lastWorn) {
    const elapsed = (Date.now() - Date.parse(garment.lastWorn)) / DAY;
    if (Number.isFinite(elapsed)) score -= 18 * Math.exp(-Math.max(0, elapsed) / 3);
  }
  if (options.avoidIds?.includes(garment.id)) score -= 13;
  if (!appropriateTemperature(garment, options.temperature)) score -= 23;
  if (options.temperature <= 12) {
    if (WARM_TOPS.has(garment.category)) score += 8;
    if (garment.category === 'Shorts') score -= 28;
    if (garment.category === 'Cappotto') score += 8;
  }
  if (options.temperature >= 25 && garment.category === 'Shorts') score += 5;
  if (options.weather === 'Pioggia' && garment.category === 'Giacca' && options.temperature < 25) score += 4;
  return score;
}

function colorInfo(garment: Garment): { hue: number; saturation: number; neutral: boolean } {
  const match = garment.colorHex.match(/^#([\da-f]{6})$/i);
  if (!match) return { hue: 0, saturation: 0, neutral: /nero|bianco|grigio|beige|marrone/i.test(garment.color) };
  const rgb = [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = rgb;
  const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return { hue, saturation, neutral: saturation < 0.2 || lightness < 0.18 || lightness > 0.88 || /nero|bianco|grigio|beige|marrone/i.test(garment.color) };
}

function harmonyScore(items: Garment[]): number {
  if (items.length < 2) return 0;
  let total = 0, pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = colorInfo(items[i]), b = colorInfo(items[j]);
      const distance = Math.min(Math.abs(a.hue - b.hue), 360 - Math.abs(a.hue - b.hue));
      total += a.neutral || b.neutral ? 5 : distance <= 40 ? 7 : distance <= 75 ? 3 : distance >= 150 ? 3 : -5;
      total += compatibleStyle(items[i].style, items[j].style) || compatibleStyle(items[j].style, items[i].style) ? 2 : -3;
      pairs++;
    }
  }
  const loudColors = items.filter(item => { const c = colorInfo(item); return !c.neutral && c.saturation > 0.6; }).length;
  const patterns = items.filter(item => item.pattern && !/tinta unita|nessuno|solid|non specificato/i.test(item.pattern)).length;
  const formalitySpread = Math.max(...items.map(item => item.formality)) - Math.min(...items.map(item => item.formality));
  return total / pairs - Math.max(0, loudColors - 2) * 4 - Math.max(0, patterns - 1) * 3 - formalitySpread * 2;
}

function combinationScore(items: Garment[], preferences: Preferences, options: GenerateOptions): number {
  if (!items.length) return 0;
  let score = items.reduce((sum, item) => sum + individualScore(item, preferences, options), 0) / items.length + harmonyScore(items);
  const signature = outfitSignature(items.map(item => item.id));
  if (preferences.likedSignatures.includes(signature)) score += 11;
  if (preferences.dislikedSignatures.includes(signature)) score -= 70;
  if (options.temperature <= 14 && items.some(item => categorySlot(item.category) === 'outerwear')) score += 6;
  if (options.weather === 'Pioggia' && options.temperature < 25 && items.some(item => item.category === 'Giacca')) score += 3;
  return score;
}

function describe(items: Garment[], options: GenerateOptions): string {
  const top = items.find(item => categorySlot(item.category) === 'top');
  const bottom = items.find(item => categorySlot(item.category) === 'bottom');
  const outerwear = items.find(item => categorySlot(item.category) === 'outerwear');
  if (!top || !bottom) return 'Una combinazione costruita con i capi del tuo guardaroba.';
  const colors = new Set(items.map(item => item.color.toLowerCase()));
  const colorSentence = colors.size === 1
    ? `Un look in ${top.color.toLowerCase()}, essenziale e coerente.`
    : top.color.toLowerCase() === bottom.color.toLowerCase()
      ? `Una base in ${top.color.toLowerCase()} lascia spazio ai dettagli.`
    : `${top.color} e ${bottom.color.toLowerCase()}: una base ${colorInfo(top).neutral || colorInfo(bottom).neutral ? 'equilibrata, facile da abbinare' : 'a colori, con carattere'}.`;
  const occasionPhrases: Record<string, string> = {
    'Università': "l'università", 'Lavoro': 'il lavoro', 'Appuntamento': 'un appuntamento',
    'Aperitivo': 'un aperitivo', 'Cena': 'una cena', 'Festa': 'una festa', 'Serata': 'una serata',
    'Palestra': 'la palestra', 'Viaggio': 'un viaggio', 'Giornata casual': 'una giornata casual',
  };
  const warmth = outerwear && options.temperature <= 14
    ? `${outerwear.name} aggiunge uno strato per i ${options.temperature}°.`
    : items.some(item => !appropriateTemperature(item, options.temperature))
      ? 'Il capo bloccato guida il look: valuta il caldo previsto.'
    : options.temperature >= 25 ? 'Strati leggeri per la giornata calda.'
      : `Pensato per ${occasionPhrases[options.occasion] ?? options.occasion.toLowerCase()}.`;
  return `${colorSentence} ${warmth}`;
}

function inferredStyle(items: Garment[], preferences: Preferences): Style {
  const styleCounts = new Map<Style, number>();
  for (const item of items) styleCounts.set(item.style, (styleCounts.get(item.style) ?? 0) + 1);
  return [...styleCounts].sort((a, b) => b[1] - a[1] || Number(b[0] === preferences.preferredStyle) - Number(a[0] === preferences.preferredStyle))[0]?.[0] ?? preferences.preferredStyle;
}

function createOutfit(items: Garment[], preferences: Preferences, options: GenerateOptions, index: number): Outfit {
  const descriptions = ['Il tuo equilibrio', 'Un altro punto di vista', 'Cambio di ritmo', 'La tua alternativa'];
  const score = Math.max(0, Math.min(100, Math.round(combinationScore(items, preferences, options))));
  return {
    id: globalThis.crypto.randomUUID(), name: descriptions[index % descriptions.length],
    garmentIds: ordered(items).map(item => item.id), occasion: options.occasion, season: options.season,
    style: options.style === 'Qualsiasi' ? inferredStyle(items, preferences) : options.style,
    rating: 0, favorite: false, createdAt: new Date().toISOString(), lastWorn: null,
    notes: '', explanation: describe(items, options), score,
  };
}

/** Re-check the outfits actually shown after regeneration or a single-piece replacement.
 * Availability/count warnings belong to generateOutfits, since this function only sees a selection.
 */
export function outfitWarnings(outfits: Outfit[], garments: Garment[], preferences: Preferences, options: GenerateOptions): string[] {
  if (!outfits.length) return [];
  const warnings: string[] = [];
  const byId = new Map(garments.map(item => [item.id, item]));
  const itemsByOutfit = outfits.map(outfit => outfit.garmentIds.map(id => byId.get(id)).filter((item): item is Garment => Boolean(item)));
  if (outfits.some(outfit => outfit.garmentIds.some(id => !byId.has(id)))) warnings.push('Una proposta contiene un capo non più disponibile. Genera nuovi outfit.');
  if (outfits.some(outfit => options.lockedIds.some(id => !outfit.garmentIds.includes(id)))) warnings.push('I capi bloccati sono cambiati: genera nuovi outfit per includerli in ogni proposta.');
  if (itemsByOutfit.some(items => REQUIRED_SLOTS.some(slot => items.filter(item => categorySlot(item.category) === slot).length !== 1))) warnings.push('Una proposta non contiene esattamente un top, un pantalone e un paio di scarpe. Genera un nuovo outfit completo.');
  const used = uniqueItems(itemsByOutfit.flat());
  for (const item of used) {
    const locked = options.lockedIds.includes(item.id);
    if (!appropriateTemperature(item, options.temperature)) warnings.push(`${item.name}${locked ? ' resta bloccato, ma' : ''} potrebbe essere troppo caldo per ${options.temperature}°.`);
    if (locked && options.temperature <= 12 && item.category === 'Shorts') warnings.push(`${item.name} resta bloccato, ma con ${options.temperature}° potrebbe essere troppo leggero.`);
  }
  if (options.temperature <= 14 && itemsByOutfit.some(items => !items.some(item => categorySlot(item.category) === 'outerwear'))) {
    warnings.push(`Con ${options.temperature}° è consigliato uno strato esterno: aggiungi una giacca o un cappotto al guardaroba.`);
  }
  if (used.some(item => !item.seasons.includes(options.season))) warnings.push(`Alcuni capi proposti non sono segnati per ${options.season.toLowerCase()}: controlla che siano adatti alla giornata.`);
  if (used.some(item => Math.abs(item.formality - options.formality) > 1)) warnings.push('Il guardaroba disponibile non copre del tutto la formalità scelta: alcune proposte richiedono un compromesso.');
  if (options.style !== 'Qualsiasi' && used.some(item => !compatibleStyle(item.style, options.style as Style) && !compatibleStyle(options.style as Style, item.style))) warnings.push(`Le proposte includono anche capi di altri stili per completare il look ${options.style.toLowerCase()}.`);
  if (options.temperature <= 12 && used.some(item => item.category === 'Shorts' && !options.lockedIds.includes(item.id))) warnings.push(`I pantaloni disponibili sono leggeri per ${options.temperature}°: valuta un'alternativa più calda.`);
  if (options.occasion === 'Palestra' && used.some(item => REQUIRED_SLOTS.includes(categorySlot(item.category)) && item.style !== 'Sportivo')) warnings.push('Alcuni capi non sono segnati come sportivi: verifica che siano comodi e adatti al tuo allenamento.');
  if (outfits.some(outfit => preferences.dislikedSignatures.includes(outfitSignature(outfit.garmentIds)))) warnings.push('Le alternative sono limitate: una proposta era stata scartata in precedenza.');
  return [...new Set(warnings)];
}

/** Generates complete, ranked combinations. Locks are hard constraints; taste is a soft preference. */
export function generateOutfits(garments: Garment[], preferences: Preferences, options: GenerateOptions, count = 3): GenerateResult {
  const warnings: string[] = [];
  const requested = Number.isFinite(count) ? Math.max(0, Math.min(20, Math.floor(count))) : 3;
  if (!requested) return { outfits: [], warnings };
  const inventory = uniqueItems(garments);
  const byId = new Map(inventory.map(item => [item.id, item]));
  const lockIds = [...new Set(options.lockedIds)];
  if (lockIds.some(id => !byId.has(id))) return { outfits: [], warnings: ['Un capo bloccato non è più nel guardaroba. Rimuovi il blocco e riprova.'] };
  const locked = lockIds.map(id => byId.get(id)!);
  for (const slot of [...REQUIRED_SLOTS, 'outerwear'] as Slot[]) {
    if (locked.filter(item => categorySlot(item.category) === slot).length > 1) {
      warnings.push(`Hai bloccato più capi nella categoria ${SLOT_LABELS[slot].toLowerCase()}. Mantienine uno per creare un outfit completo.`);
    }
  }
  if (warnings.length) return { outfits: [], warnings };
  const usable = inventory.filter(item => lockIds.includes(item.id) || appropriateTemperature(item, options.temperature));
  const slotPool = (slot: Slot): Garment[] => {
    const fixed = locked.filter(item => categorySlot(item.category) === slot);
    return fixed.length ? fixed : usable.filter(item => categorySlot(item.category) === slot)
      .sort((a, b) => individualScore(b, preferences, options) - individualScore(a, preferences, options)).slice(0, 16);
  };
  const pools = REQUIRED_SLOTS.map(slotPool);
  for (let i = 0; i < pools.length; i++) {
    if (!pools[i].length) {
      const exists = inventory.some(item => categorySlot(item.category) === REQUIRED_SLOTS[i]);
      warnings.push(exists
        ? `Non hai ${SLOT_LABELS[REQUIRED_SLOTS[i]].toLowerCase()} adatti a ${options.temperature}°. Aggiungi un capo più leggero o modifica la temperatura.`
        : `Aggiungi almeno un capo nella categoria ${SLOT_LABELS[REQUIRED_SLOTS[i]].toLowerCase()} per creare un outfit completo.`);
    }
  }
  if (pools.some(pool => !pool.length)) return { outfits: [], warnings };
  const outerwear = slotPool('outerwear');
  const outerLocked = locked.some(item => categorySlot(item.category) === 'outerwear');
  const outerOptions: (Garment | null)[] = outerLocked || (options.temperature <= 14 && outerwear.length)
    ? outerwear : options.temperature < 25 ? [null, ...outerwear] : [null];
  const stages: (Garment | null)[][] = [...pools, outerOptions];
  let beam: Garment[][] = [[]];
  for (const stage of stages) {
    beam = beam.flatMap(items => stage.map(item => item ? [...items, item] : items))
      .map(items => ({ items, score: combinationScore(items, preferences, options) }))
      .sort((a, b) => b.score - a.score).slice(0, BEAM_SIZE).map(candidate => candidate.items);
  }
  const lockedAccessories = locked.filter(item => categorySlot(item.category) === 'accessory');
  if (lockedAccessories.length) beam = beam.map(items => [...items, ...lockedAccessories]);
  else {
    const accessories = slotPool('accessory').slice(0, 6);
    beam = beam.flatMap(items => [items, ...accessories.map(item => [...items, item])]);
  }
  // De-duplicate before diversity selection; a single wardrobe combination is never repeated.
  const candidates = [...new Map(beam.map(items => [outfitSignature(items.map(item => item.id)), items])).values()]
    .map(items => ({ items, score: combinationScore(items, preferences, options) }));
  const chosen: Garment[][] = [];
  while (chosen.length < requested && candidates.length) {
    let bestIndex = 0, bestScore = -Infinity;
    candidates.forEach((candidate, index) => {
      const overlap = chosen.length ? Math.max(...chosen.map(previous => candidate.items.filter(item => !lockIds.includes(item.id) && previous.some(other => item.id === other.id)).length)) : 0;
      const noveltyScore = candidate.score - overlap * 6;
      if (noveltyScore > bestScore) { bestIndex = index; bestScore = noveltyScore; }
    });
    chosen.push(candidates.splice(bestIndex, 1)[0].items);
  }
  if (chosen.length < requested) warnings.push(`Con questi capi e blocchi sono disponibili ${chosen.length} ${chosen.length === 1 ? 'combinazione completa' : 'combinazioni complete'}. Aggiungi altri capi per avere più alternative.`);
  const outfits = chosen.map((items, index) => createOutfit(items, preferences, options, index));
  return { outfits, warnings: [...new Set([...warnings, ...outfitWarnings(outfits, inventory, preferences, options)])] };
}

/** Replaces exactly one unlocked slot while preserving every other garment and the outfit identity. */
export function replaceGarment(outfit: Outfit, garmentId: string, garments: Garment[], preferences: Preferences, options: GenerateOptions): Outfit | null {
  if (!outfit.garmentIds.includes(garmentId) || options.lockedIds.includes(garmentId)) return null;
  const byId = new Map(garments.map(item => [item.id, item]));
  if (outfit.garmentIds.some(id => !byId.has(id)) || options.lockedIds.some(id => !outfit.garmentIds.includes(id))) return null;
  const current = byId.get(garmentId)!;
  const retained = outfit.garmentIds.filter(id => id !== garmentId).map(id => byId.get(id)!);
  const alternatives = uniqueItems(garments).filter(item => categorySlot(item.category) === categorySlot(current.category)
    && !outfit.garmentIds.includes(item.id) && appropriateTemperature(item, options.temperature));
  alternatives.sort((a, b) => combinationScore([...retained, b], preferences, options) - combinationScore([...retained, a], preferences, options));
  if (!alternatives.length) return null;
  const items = [...retained, alternatives[0]];
  return { ...outfit, garmentIds: ordered(items).map(item => item.id), explanation: describe(items, options),
    score: Math.max(0, Math.min(100, Math.round(combinationScore(items, preferences, options)))),
    style: options.style === 'Qualsiasi' ? inferredStyle(items, preferences) : options.style,
    favorite: false, rating: 0, lastWorn: null };
}
