import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateOutfits, getReplacementCandidates, isCompleteOutfit, outfitSignature, outfitWarnings, prepareInitialDraft, replaceGarment, replaceGarmentWith } from '../src/lib/engine.ts';
import { categorySlot } from '../src/lib/constants.ts';
import type { Category, Garment, GenerateOptions, Preferences } from '../src/types.ts';

const preferences: Preferences = { name: '', favoriteColors: [], dislikedSignatures: [], likedSignatures: [], preferredStyle: 'Minimal', reduceMotion: false };
const options: GenerateOptions = { occasion: 'Università', style: 'Minimal', temperature: 23, weather: 'Sereno', formality: 2, lockedIds: [], season: 'Primavera' };
function garment(id: string, category: Category, fields: Partial<Garment> = {}): Garment {
  return { id, name: id, category, subcategory: '', color: 'Bianco', colorHex: '#eeece5', secondaryColors: [], style: 'Minimal', seasons: ['Primavera'], formality: 2, material: '', pattern: 'Tinta unita', image: '', favorite: false, wearCount: 0, lastWorn: null, createdAt: '2026-01-01', ...fields };
}
const basics = [garment('top', 'T-shirt'), garment('bottom', 'Pantaloni'), garment('shoes', 'Sneakers')];

test('empty or incomplete wardrobes produce actionable warnings and no partial outfit', () => {
  const empty = generateOutfits([], preferences, options);
  assert.equal(empty.outfits.length, 0);
  assert.equal(empty.warnings.length, 3);
  const partial = generateOutfits(basics.slice(0, 2), preferences, options);
  assert.equal(partial.outfits.length, 0);
  assert.match(partial.warnings.join(' '), /scarpe/i);
});

test('every suggestion is complete, unique, exclusively owned and leaves inputs untouched', () => {
  const wardrobe = [...basics, garment('top2', 'Polo'), garment('bottom2', 'Jeans'), garment('shoes2', 'Sneakers')];
  const snapshot = JSON.stringify(wardrobe);
  const result = generateOutfits(wardrobe, preferences, options);
  assert.equal(result.outfits.length, 3);
  assert.equal(new Set(result.outfits.map(outfit => outfitSignature(outfit.garmentIds))).size, 3);
  for (const outfit of result.outfits) {
    const items = outfit.garmentIds.map(id => wardrobe.find(item => item.id === id)!);
    assert.ok(items.every(Boolean));
    for (const slot of ['top', 'bottom', 'shoes']) assert.equal(items.filter(item => categorySlot(item.category) === slot).length, 1);
    assert.ok(outfit.score >= 0 && outfit.score <= 100);
    assert.ok(outfit.explanation.length > 20);
  }
  assert.equal(JSON.stringify(wardrobe), snapshot);
});

test('single available outfit is never duplicated to fill the requested count', () => {
  const result = generateOutfits(basics, preferences, options);
  assert.equal(result.outfits.length, 1);
  assert.match(result.warnings.join(' '), /1 combinazione completa/);
});

test('all locks are preserved, including multiple accessories', () => {
  const wardrobe = [...basics, garment('top2', 'Camicia'), garment('ring', 'Accessori'), garment('watch', 'Accessori')];
  const lockedIds = ['top2', 'ring', 'watch'];
  const result = generateOutfits(wardrobe, preferences, { ...options, lockedIds });
  assert.equal(result.outfits.length, 1);
  assert.ok(lockedIds.every(id => result.outfits.every(outfit => outfit.garmentIds.includes(id))));
  assert.ok(!result.outfits[0].garmentIds.includes('top'));
});

test('incompatible or stale locks are reported instead of silently ignored', () => {
  const wardrobe = [...basics, garment('top2', 'Camicia')];
  const conflicting = generateOutfits(wardrobe, preferences, { ...options, lockedIds: ['top', 'top2'] });
  assert.equal(conflicting.outfits.length, 0);
  assert.match(conflicting.warnings.join(' '), /più capi/);
  const stale = generateOutfits(wardrobe, preferences, { ...options, lockedIds: ['deleted'] });
  assert.equal(stale.outfits.length, 0);
  assert.match(stale.warnings.join(' '), /non è più/);
});

test('hot weather excludes heavy layers, except explicit locks with a warning', () => {
  const wardrobe = [...basics, garment('wool', 'Maglione'), garment('coat', 'Cappotto')];
  const hot = { ...options, temperature: 32 };
  const result = generateOutfits(wardrobe, preferences, hot);
  assert.ok(result.outfits.every(outfit => !outfit.garmentIds.includes('wool') && !outfit.garmentIds.includes('coat')));
  const locked = generateOutfits(wardrobe, preferences, { ...hot, lockedIds: ['wool', 'coat'] });
  assert.ok(locked.outfits.every(outfit => outfit.garmentIds.includes('wool') && outfit.garmentIds.includes('coat')));
  assert.match(locked.warnings.join(' '), /troppo caldo/);
});

test('unavailable warm-weather top returns explicit limitation instead of a heavy suggestion', () => {
  const wardrobe = [garment('wool', 'Maglione'), ...basics.slice(1)];
  const result = generateOutfits(wardrobe, preferences, { ...options, temperature: 32 });
  assert.equal(result.outfits.length, 0);
  assert.match(result.warnings.join(' '), /più leggero/);
});

test('cold weather adds available outerwear and warns when it is missing', () => {
  const cold = { ...options, temperature: 5 };
  const result = generateOutfits([...basics, garment('coat', 'Cappotto')], preferences, cold);
  assert.ok(result.outfits.every(outfit => outfit.garmentIds.includes('coat')));
  const missing = generateOutfits(basics, preferences, cold);
  assert.equal(missing.outfits.length, 1);
  assert.match(missing.warnings.join(' '), /strato esterno/);
});

test('recently worn clothes and disliked combinations lose priority', () => {
  const wardrobe = [...basics.map(item => item.id === 'top' ? { ...item, lastWorn: new Date().toISOString(), wearCount: 30 } : item), garment('fresh', 'T-shirt')];
  const result = generateOutfits(wardrobe, preferences, options, 1);
  assert.ok(result.outfits[0].garmentIds.includes('fresh'));
  const disliked = { ...preferences, dislikedSignatures: [outfitSignature(['fresh', 'bottom', 'shoes'])] };
  assert.ok(generateOutfits(wardrobe, disliked, options, 1).outfits[0].garmentIds.includes('top'));
});

test('style, season and formality influence ranking and preference colors break equal choices', () => {
  const bad = garment('wrong', 'Camicia', { style: 'Elegante', seasons: ['Inverno'], formality: 5 });
  const result = generateOutfits([...basics, bad], preferences, options, 1);
  assert.ok(result.outfits[0].garmentIds.includes('top'));
  const favored = garment('favored', 'T-shirt', { color: 'Nero', colorHex: '#26282b' });
  const personalized = generateOutfits([...basics, favored], { ...preferences, favoriteColors: ['Nero'] }, options, 1);
  assert.ok(personalized.outfits[0].garmentIds.includes('favored'));
  const compromise = generateOutfits([bad, ...basics.slice(1)], preferences, options, 1);
  assert.match(compromise.warnings.join(' '), /formalità/);
  assert.match(compromise.warnings.join(' '), /primavera/);
});

test('replacement changes only the chosen slot and preserves all locks', () => {
  const wardrobe = [...basics, garment('new-top', 'Polo'), garment('new-shoes', 'Sneakers')];
  const lockedOptions = { ...options, lockedIds: ['shoes'] };
  const outfit = generateOutfits(basics, preferences, lockedOptions, 1).outfits[0];
  const replaced = replaceGarment(outfit, 'top', wardrobe, preferences, lockedOptions)!;
  assert.ok(replaced);
  assert.equal(replaced.id, outfit.id);
  assert.deepEqual(new Set(replaced.garmentIds), new Set(['new-top', 'bottom', 'shoes']));
  assert.equal(replaceGarment(outfit, 'shoes', wardrobe, preferences, lockedOptions), null);
  assert.equal(replaceGarment(outfit, 'top', basics, preferences, lockedOptions), null);
});

test('signatures ignore order and duplicates, and zero requested outfits is safe', () => {
  assert.equal(outfitSignature(['z', 'a', 'a']), outfitSignature(['a', 'z']));
  assert.deepEqual(generateOutfits(basics, preferences, options, 0), { outfits: [], warnings: [] });
});

test('warnings follow the actual replacement and disappear when its compromise is removed', () => {
  const wardrobe = [...basics, garment('winter-formal', 'Camicia', { formality: 5, seasons: ['Inverno'] })];
  const original = generateOutfits(basics, preferences, options, 1).outfits[0];
  assert.deepEqual(outfitWarnings([original], wardrobe, preferences, options), []);
  const changed = replaceGarment(original, 'top', wardrobe, preferences, options)!;
  assert.ok(changed.garmentIds.includes('winter-formal'));
  const warnings = outfitWarnings([changed], wardrobe, preferences, options);
  assert.match(warnings.join(' '), /formalità/);
  assert.match(warnings.join(' '), /primavera/);
  const restored = replaceGarment(changed, 'winter-formal', wardrobe, preferences, options)!;
  assert.deepEqual(outfitWarnings([restored], wardrobe, preferences, options), []);
});

test('occasion changes gym versus dinner recommendations while chosen formality remains the target', () => {
  const wardrobe = [
    garment('sport-top', 'T-shirt', { style: 'Sportivo' }),
    garment('dinner-top', 'Camicia', { style: 'Elegante' }),
    garment('sport-bottom', 'Pantaloni', { style: 'Sportivo' }),
    garment('dinner-bottom', 'Pantaloni', { style: 'Elegante' }),
    garment('sport-shoes', 'Sneakers', { style: 'Sportivo' }),
    garment('dinner-shoes', 'Scarpe eleganti', { style: 'Elegante' }),
  ];
  const gym = generateOutfits(wardrobe, preferences, { ...options, style: 'Qualsiasi', occasion: 'Palestra' }, 1).outfits[0];
  const dinner = generateOutfits(wardrobe, preferences, { ...options, style: 'Qualsiasi', occasion: 'Cena' }, 1).outfits[0];
  assert.deepEqual(new Set(gym.garmentIds), new Set(['sport-top', 'sport-bottom', 'sport-shoes']));
  assert.deepEqual(new Set(dinner.garmentIds), new Set(['dinner-top', 'dinner-bottom', 'dinner-shoes']));
  assert.equal(gym.style, 'Sportivo');
  assert.equal(dinner.style, 'Elegante');
  const casualDinner = generateOutfits([...basics, garment('formal-shirt', 'Camicia', { style: 'Elegante', formality: 5 })], preferences, { ...options, occasion: 'Cena', formality: 1 }, 1).outfits[0];
  assert.ok(casualDinner.garmentIds.includes('top'));
});


test('replacement candidates share the slot while season, style and formality remain weighted', () => {
  const original = generateOutfits(basics, preferences, options, 1).outfits[0];
  const wardrobe = [...basics, garment('polo', 'Polo'), garment('formal', 'Camicia', { style: 'Elegante', seasons: ['Inverno'], formality: 5 }), garment('coat', 'Cappotto'), garment('warm', 'Maglione')];
  const candidates = getReplacementCandidates(original, 'top', wardrobe, preferences, { ...options, temperature: 30 });
  assert.deepEqual(candidates.map(item => item.id), ['polo', 'formal']);
});

test('explicit replacement applies the chosen candidate and preserves every other ID and lock', () => {
  const lockedIds = ['bottom', 'ring', 'watch'];
  const wardrobe = [...basics, garment('ring', 'Accessori'), garment('watch', 'Accessori'), garment('polo', 'Polo'), garment('formal', 'Camicia', { formality: 5, seasons: ['Inverno'] })];
  const context = { ...options, lockedIds };
  const original = { ...generateOutfits(wardrobe.filter(item => !['polo', 'formal'].includes(item.id)), preferences, context, 1).outfits[0], favorite: true, rating: 5, notes: 'Original note', lastWorn: '2026-01-01T12:00:00.000Z' };
  const snapshot = JSON.stringify(original);
  const changed = replaceGarmentWith(original, 'top', wardrobe, preferences, context, 'formal')!;
  assert.ok(changed);
  assert.notEqual(changed.id, original.id);
  assert.deepEqual(changed.garmentIds, original.garmentIds.map(id => id === 'top' ? 'formal' : id));
  assert.ok(lockedIds.every(id => changed.garmentIds.includes(id)));
  assert.equal(changed.favorite, false);
  assert.equal(changed.rating, 0);
  assert.equal(changed.notes, '');
  assert.equal(changed.lastWorn, null);
  assert.equal(JSON.stringify(original), snapshot);
  assert.match(outfitWarnings([changed], wardrobe, preferences, context).join(' '), /formalità/);
});

test('replacement never offers disliked combinations or copies of another visible proposal', () => {
  const original = generateOutfits(basics, preferences, options, 1).outfits[0];
  const wardrobe = [...basics, garment('polo', 'Polo'), garment('shirt', 'Camicia'), garment('tee', 'T-shirt')];
  const disliked = { ...preferences, dislikedSignatures: [outfitSignature(['polo', 'bottom', 'shoes'])] };
  const visible = [outfitSignature(['shirt', 'bottom', 'shoes'])];
  assert.deepEqual(getReplacementCandidates(original, 'top', wardrobe, disliked, options, visible).map(item => item.id), ['tee']);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe, disliked, options, 'polo', visible), null);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe, disliked, options, 'shirt', visible), null);
});

test('explicit replacement revalidates deletion, category, temperature, locks and duplicate IDs', () => {
  const original = generateOutfits(basics, preferences, options, 1).outfits[0];
  const wardrobe = [...basics, garment('candidate', 'Polo')];
  assert.equal(getReplacementCandidates(original, 'top', wardrobe, preferences, options)[0].id, 'candidate');
  assert.equal(replaceGarmentWith(original, 'top', basics, preferences, options, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', [...basics, garment('candidate', 'Jeans')], preferences, options, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', [...basics, garment('candidate', 'Maglione')], preferences, { ...options, temperature: 30 }, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe, preferences, { ...options, lockedIds: ['top'] }, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe, preferences, { ...options, lockedIds: ['missing'] }, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe, preferences, options, 'bottom'), null);
  assert.equal(replaceGarmentWith({ ...original, garmentIds: [...original.garmentIds, 'top'] }, 'top', wardrobe, preferences, options, 'candidate'), null);
  assert.equal(replaceGarmentWith(original, 'top', wardrobe.filter(item => item.id !== 'shoes'), preferences, options, 'candidate'), null);
});

test('replacing one accessory preserves the other accessories without adding an existing ID', () => {
  const wardrobe = [...basics, garment('ring', 'Accessori'), garment('watch', 'Accessori'), garment('belt', 'Accessori')];
  const original = generateOutfits(wardrobe, preferences, { ...options, lockedIds: ['ring', 'watch'] }, 1).outfits[0];
  const context = { ...options, lockedIds: ['watch'] };
  assert.deepEqual(getReplacementCandidates(original, 'ring', wardrobe, preferences, context).map(item => item.id), ['belt']);
  const changed = replaceGarmentWith(original, 'ring', wardrobe, preferences, context, 'belt')!;
  assert.equal(changed.garmentIds.length, original.garmentIds.length);
  assert.ok(changed.garmentIds.includes('watch'));
});

test('generation exhausts seen and disliked signatures instead of silently repeating them', () => {
  const only = outfitSignature(basics.map(item => item.id));
  assert.deepEqual(generateOutfits(basics, preferences, options, 3, [only]).outfits, []);
  assert.deepEqual(generateOutfits(basics, { ...preferences, dislikedSignatures: [only] }, options).outfits, []);
});

test('wear-event drafts resolve absent metadata from the current Create context before saving', () => {
  const original = { ...generateOutfits(basics, preferences, options, 1).outfits[0], occasion: '', explanation: '' };
  const context = { ...options, occasion: 'Cena', season: 'Autunno' as const, style: 'Elegante' as const };
  const draft = prepareInitialDraft(original, basics, preferences, context);
  assert.equal(draft.occasion, 'Cena');
  assert.equal(draft.season, 'Autunno');
  assert.equal(draft.style, 'Elegante');
  assert.ok(draft.explanation.length > 20);
  assert.deepEqual(draft.garmentIds, original.garmentIds);
  assert.equal(original.occasion, '');
  assert.equal(original.explanation, '');
  assert.equal(prepareInitialDraft(original, basics, preferences, { ...context, style: 'Qualsiasi' }).style, 'Minimal');
});

test('saved-outfit drafts retain original occasion, season and style independently of current defaults', () => {
  const original = generateOutfits(basics, preferences, options, 1).outfits[0];
  const draft = prepareInitialDraft(original, basics, preferences, { ...options, occasion: 'Cena', season: 'Inverno', style: 'Elegante' });
  assert.equal(draft.occasion, original.occasion);
  assert.equal(draft.season, original.season);
  assert.equal(draft.style, original.style);
  assert.ok(isCompleteOutfit(draft, basics));
  assert.equal(isCompleteOutfit({ ...draft, garmentIds: ['top', 'bottom'] }, basics), false);
  assert.equal(isCompleteOutfit(draft, basics.filter(item => item.id !== 'shoes')), false);
});
