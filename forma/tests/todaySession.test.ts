import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppData, Garment } from '../src/types.ts';
import { advanceToday, createTodaySession, wardrobeStructureKey } from '../src/lib/todaySession.ts';
import { recordWornOutfit, toggleGarmentFavorite, toggleSavedOutfit } from '../src/lib/mutations.ts';
import { outfitSignature } from '../src/lib/engine.ts';

function fixture(tops = 2): AppData {
  const garment = (id: string, category: Garment['category']): Garment => ({ id, name: id, category, subcategory: '', color: 'Bianco', colorHex: '#eeece5', secondaryColors: [], style: 'Minimal', seasons: ['Autunno'], formality: 2, material: '', pattern: '', image: '', favorite: false, wearCount: 0, lastWorn: null, createdAt: '2026-09-01T12:00:00.000Z' });
  return { version: 1, garments: [...Array.from({ length: tops }, (_, i) => garment(`top-${i}`, 'Camicia')), garment('bottom', 'Pantaloni'), garment('shoes', 'Sneakers')], outfits: [], history: [], preferences: { name: '', favoriteColors: [], likedSignatures: [], dislikedSignatures: [], preferredStyle: 'Minimal', reduceMotion: false } };
}

test('today source ignores usage and favorites but invalidates real garment changes', () => {
  const data = fixture(), key = wardrobeStructureKey(data), session = createTodaySession(data);
  assert.equal(wardrobeStructureKey(toggleGarmentFavorite(data, data.garments[0].id)), key);
  assert.equal(wardrobeStructureKey(recordWornOutfit(data, session.outfits[0]).data), key);
  assert.equal(wardrobeStructureKey(toggleSavedOutfit(data, session.outfits[0])), key);
  assert.notEqual(wardrobeStructureKey({ ...data, garments: data.garments.slice(1) }), key);
  assert.notEqual(wardrobeStructureKey({ ...data, garments: data.garments.map((g, i) => i ? g : { ...g, category: 'Cappotto' }) }), key);
});

test('zero, one and two looks use real counts and exhaustion keeps the last selection', () => {
  assert.equal(createTodaySession(fixture(0)).outfits.length, 0);
  for (const count of [1, 2]) {
    const data = fixture(count); let session = createTodaySession(data);
    assert.equal(session.outfits.length, count);
    for (let i = 1; i < count; i++) session = advanceToday(data, session);
    const last = session.outfits[session.index];
    session = advanceToday(data, session);
    assert.equal(session.exhausted, true);
    assert.equal(session.outfits[session.index], last);
    assert.equal(session.index, count - 1);
  }
});

test('advancing looks never silently reintroduces a seen signature', () => {
  const data = fixture(7); let session = createTodaySession(data);
  const observed = new Set([outfitSignature(session.outfits[0].garmentIds)]);
  for (let i = 0; i < 20; i++) {
    const next = advanceToday(data, session);
    if (next.exhausted) break;
    const signature = outfitSignature(next.outfits[next.index].garmentIds);
    assert.ok(!observed.has(signature)); observed.add(signature); session = next;
  }
  assert.equal(observed.size, 7);
});

test('two rapid queued wear actions with distinct draft IDs persist one exact combination', async () => {
  let data = fixture(); const look = createTodaySession(data).outfits[0];
  let queue = Promise.resolve(); const outcomes: boolean[] = [];
  function enqueue(id: string) { const work = queue.then(async () => { const result = recordWornOutfit(data, { ...look, id }); await Promise.resolve(); data = result.data; outcomes.push(result.alreadyRecorded); }); queue = work; return work; }
  await Promise.all([enqueue('draft-a'), enqueue('draft-b')]);
  assert.deepEqual(outcomes, [false, true]); assert.equal(data.history.length, 1);
  assert.deepEqual(new Set(data.history[0].garmentIds), new Set(look.garmentIds));
  assert.ok(data.garments.every(g => g.wearCount === (look.garmentIds.includes(g.id) ? 1 : 0)));
});
