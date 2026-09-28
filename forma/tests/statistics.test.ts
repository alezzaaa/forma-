import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppData, Garment, Outfit, WearEvent } from '../src/types.ts';
import { buildComparisonSnapshot, buildWardrobeStatistics } from '../src/lib/statistics.ts';

const now = new Date('2026-09-28T12:00:00.000Z');
const date = '2026-09-20T12:00:00.000Z';
function garment(id: string, extra: Partial<Garment> = {}): Garment {
  return { id, name: `Capo ${id}`, category: 'T-shirt', subcategory: '', color: 'Bianco', colorHex: '#eeece5', secondaryColors: [], style: 'Minimal', seasons: ['Autunno'], formality: 2, material: 'Cotone', pattern: 'Tinta unita', image: '', favorite: false, wearCount: 99, lastWorn: date, createdAt: '2026-01-01T12:00:00.000Z', ...extra };
}
function outfit(id: string, extra: Partial<Outfit> = {}): Outfit {
  return { id, name: `Outfit ${id}`, garmentIds: ['a'], occasion: 'Università', season: 'Autunno', style: 'Minimal', rating: 0, favorite: false, createdAt: date, lastWorn: null, notes: '', explanation: '', score: 90, ...extra };
}
function event(id: string, garmentIds = ['a'], extra: Partial<WearEvent> = {}): WearEvent {
  return { id, outfitId: 'look', garmentIds, date, name: 'Look', ...extra };
}
function fixture(): AppData {
  return { version: 1, garments: [], outfits: [], history: [], preferences: { name: 'PRIVATE_NAME', favoriteColors: ['Blu'], dislikedSignatures: ['PRIVATE_REJECTION'], likedSignatures: [], preferredStyle: 'Minimal', reduceMotion: false } };
}

test('an empty wardrobe returns finite zero totals and no invented favorites or ratings', () => {
  const stats = buildWardrobeStatistics(fixture(), '30d', now);
  assert.equal(stats.totalGarments, 0);
  assert.equal(stats.outfitWears, 0);
  assert.equal(stats.garmentWears, 0);
  assert.equal(stats.rotationPercent, 0);
  assert.equal(stats.favoriteGarment, null);
  assert.equal(stats.mostWorn, null);
  assert.equal(stats.leastWorn, null);
  assert.equal(stats.favoriteOutfit, null);
  assert.equal(stats.averageRating, null);
  assert.deepEqual(stats.palette, []);
  assert.deepEqual(stats.categories, []);
  assert.equal(JSON.stringify(stats).includes('NaN'), false);
});

test('usage comes from distinct events and garments, ignoring cache, deleted items and future/invalid dates', () => {
  const data = fixture();
  data.garments = [garment('a'), garment('b'), garment('c')];
  data.history = [event('one', ['a', 'a', 'b', 'deleted']), event('one', ['a', 'b']), event('two', ['a']), event('removed', ['deleted']), event('future', ['c'], { date: '2026-09-29T00:00:00.000Z' }), event('invalid', ['c'], { date: 'not-a-date' })];
  const stats = buildWardrobeStatistics(data, '30d', now);
  assert.equal(stats.outfitWears, 2);
  assert.equal(stats.garmentWears, 3);
  assert.equal(stats.activeDays, 1);
  assert.equal(stats.wornGarments, 2);
  assert.equal(stats.unwornGarments, 1);
  assert.equal(stats.rotationPercent, 67);
  assert.equal(stats.mostWorn?.garment.id, 'a');
  assert.equal(stats.mostWorn?.count, 2);
  assert.equal(stats.leastWorn?.garment.id, 'c');
  assert.equal(stats.leastWorn?.count, 0);
  assert.equal(stats.favoriteGarment, null);
});

test('favorite garment must carry a heart, then ranks by period usage among hearts', () => {
  const data = fixture();
  data.garments = [garment('a'), garment('b', { favorite: true }), garment('c', { favorite: true })];
  data.history = [event('one', ['a', 'b']), event('two', ['a']), event('three', ['a']), event('old', ['c'], { date: '2026-01-03T12:00:00.000Z' }), event('old-two', ['c'], { date: '2026-01-04T12:00:00.000Z' })];
  const stats = buildWardrobeStatistics(data, '30d', now);
  assert.equal(stats.favoriteGarments, 2);
  assert.equal(stats.mostWorn?.garment.id, 'a');
  assert.equal(stats.favoriteGarment?.garment.id, 'b');
  assert.equal(stats.favoriteGarment?.count, 1);
  assert.equal(buildWardrobeStatistics(data, 'all', now).favoriteGarment?.garment.id, 'c');
  data.history = [];
  assert.equal(buildWardrobeStatistics(data, 'all', now).favoriteGarment?.count, 0);
});

test('primary-color and style use counts describe wears, while categories describe current inventory', () => {
  const data = fixture();
  data.garments = [garment('a', { color: 'Blu', secondaryColors: ['Bianco'] }), garment('b', { color: 'Blu', category: 'Jeans' }), garment('c', { color: 'Nero', category: 'Jeans', style: 'Casual' }), garment('d', { color: 'Rosa', category: 'Accessori' })];
  data.history = [event('one', ['a', 'b', 'c']), event('two', ['a'])];
  const stats = buildWardrobeStatistics(data, 'all', now);
  assert.deepEqual(stats.palette.map(({ color, count, percent }) => ({ color, count, percent })), [{ color: 'Blu', count: 3, percent: 75 }, { color: 'Nero', count: 1, percent: 25 }]);
  assert.equal(stats.palette.reduce((total, entry) => total + entry.count, 0), 4);
  assert.deepEqual(stats.styles, [{ style: 'Minimal', count: 3, percent: 75 }, { style: 'Casual', count: 1, percent: 25 }]);
  assert.deepEqual(stats.categories.find(item => item.category === 'Jeans'), { category: 'Jeans', count: 2, percent: 50 });
  assert.equal(stats.categories.reduce((total, entry) => total + entry.count, 0), 4);
});

test('favorite outfits rank explicit hearts by rating then wears; unrated values do not lower the average', () => {
  const data = fixture();
  data.garments = [garment('a')];
  data.outfits = [outfit('unstarred', { rating: 5 }), outfit('first', { favorite: true, rating: 4 }), outfit('second', { favorite: true, rating: 4 }), outfit('unrated'), outfit('invalid', { rating: Number.NaN }), outfit('out-of-range', { rating: 6 })];
  data.history = [event('wear', ['a'], { outfitId: 'second' })];
  const stats = buildWardrobeStatistics(data, 'all', now);
  assert.equal(stats.favoriteOutfits, 2);
  assert.equal(stats.favoriteOutfit?.outfit.id, 'second');
  assert.equal(stats.favoriteOutfit?.wears, 1);
  assert.equal(stats.ratedOutfits, 3);
  assert.equal(stats.averageRating, 4.3);
});

test('30 days uses local calendar midnight, includes its boundary and now, and excludes future times today', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Europe/Rome';
  try {
    const data = fixture();
    data.garments = [garment('a')];
    data.history = [event('outside', ['a'], { date: '2026-08-29T21:59:59.999Z' }), event('boundary', ['a'], { date: '2026-08-29T22:00:00.000Z' }), event('now', ['a'], { date: now.toISOString() }), event('later-today', ['a'], { date: '2026-09-28T13:00:00.000Z' })];
    const stats = buildWardrobeStatistics(data, '30d', now);
    assert.equal(stats.range.timezone, 'Europe/Rome');
    assert.equal(stats.range.start, '2026-08-29T22:00:00.000Z');
    assert.equal(stats.outfitWears, 2);
    assert.equal(stats.activeDays, 2);
    const all = buildWardrobeStatistics(data, 'all', now);
    assert.equal(all.range.start, null);
    assert.equal(all.outfitWears, 3);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone;
  }
});

test('calendar windows and daily activity remain local across daylight-saving changes', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Europe/Rome';
  try {
    const data = fixture();
    data.garments = [garment('a')];
    // October 25 has two 02:30 times; both belong to the same local date.
    data.history = [event('summer-offset', ['a'], { date: '2026-10-25T00:30:00.000Z' }), event('winter-offset', ['a'], { date: '2026-10-25T01:30:00.000Z' }), event('next-date', ['a'], { date: '2026-10-25T23:30:00.000Z' })];
    const stats = buildWardrobeStatistics(data, '30d', new Date('2026-10-26T12:00:00.000Z'));
    assert.equal(stats.range.start, '2026-09-26T22:00:00.000Z');
    assert.equal(stats.outfitWears, 3);
    assert.equal(stats.activeDays, 2);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone;
  }
});

test('future comparison snapshot includes aggregates and declared methodology without personal payloads', () => {
  const data = fixture();
  data.garments = [garment('PRIVATE_GARMENT_ID', { name: 'PRIVATE_GARMENT_NAME', image: 'PRIVATE_IMAGE', color: 'PRIVATE_COLOR', secondaryColors: ['PRIVATE_SECONDARY'], material: 'PRIVATE_MATERIAL', favorite: true }), garment('PRIVATE_OTHER_ID', { color: 'PRIVATE_OTHER_COLOR' })];
  data.outfits = [outfit('PRIVATE_OUTFIT_ID', { name: 'PRIVATE_OUTFIT_NAME', notes: 'PRIVATE_NOTES', explanation: 'PRIVATE_EXPLANATION', occasion: 'PRIVATE_EVENT', favorite: true, rating: 5 })];
  data.history = [event('PRIVATE_EVENT_ID', ['PRIVATE_GARMENT_ID', 'PRIVATE_OTHER_ID'], { outfitId: 'PRIVATE_OUTFIT_ID', name: 'PRIVATE_HISTORY_NAME' })];
  const snapshot = buildComparisonSnapshot(data, '30d', now);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.methodology.version, 'get-dressd-usage-v1');
  assert.equal(snapshot.methodology.source, 'history');
  assert.equal(snapshot.range.end, now.toISOString());
  assert.equal(snapshot.totals.garments, 2);
  assert.equal(snapshot.totals.garmentWears, 2);
  assert.equal(snapshot.totals.favoriteOutfits, 1);
  assert.deepEqual(snapshot.colors, [{ label: 'Altro', count: 2 }]);
  assert.equal(JSON.stringify(snapshot).includes('PRIVATE_'), false);
  assert.deepEqual(Object.keys(snapshot).sort(), ['categories', 'colors', 'methodology', 'range', 'styles', 'timezone', 'totals', 'version']);
});

test('statistics do not mutate any source collection and reject an invalid clock', () => {
  const data = fixture();
  data.garments = [garment('b'), garment('a', { favorite: true })];
  data.outfits = [outfit('b', { favorite: true, rating: 2 }), outfit('a', { favorite: true, rating: 5 })];
  data.history = [event('one', ['a', 'a', 'b'])];
  const before = structuredClone(data);
  const first = buildWardrobeStatistics(data, 'all', now);
  const second = buildWardrobeStatistics(data, 'all', now);
  buildComparisonSnapshot(data, 'all', now);
  assert.deepEqual(data, before);
  assert.deepEqual(first, second);
  assert.throws(() => buildWardrobeStatistics(data, 'all', new Date('invalid')), /Data delle statistiche/);
});
