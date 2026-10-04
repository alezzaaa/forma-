import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeFilterCount, emptyWardrobeFilters, filterWardrobe, garmentValidationIssue } from '../src/lib/wardrobe.ts';
import type { Garment } from '../src/types.ts';

const garment: Garment = { id: 'camicia', name: 'Camicia bianca', category: 'Camicia', subcategory: 'Oxford', color: 'Bianco', colorHex: '#eeece5', secondaryColors: ['Blu'], style: 'Minimal', seasons: ['Autunno'], formality: 3, material: 'Cotone', pattern: 'Righe', image: '', favorite: true, wearCount: 2, lastWorn: '2026-09-28T12:00:00Z', createdAt: '2026-08-01T12:00:00Z' };
const other: Garment = { ...garment, id: 'jeans', name: 'Jeans blu', category: 'Jeans', color: 'Blu', favorite: false, wearCount: 0, lastWorn: null, createdAt: '2026-09-01T12:00:00Z' };

test('wardrobe count combines every criterion with the current search without mutating source data', () => {
  const garments = [garment, other];
  const before = JSON.stringify(garments);
  const filters = { category: 'Camicia', color: 'Bianco', season: 'Autunno', style: 'Minimal', formality: '3', favorite: true, recent: true };
  const now = Date.parse('2026-09-29T12:00:00Z');
  assert.deepEqual(filterWardrobe(garments, filters, ' COTONE ', 'new', now).map(item => item.id), ['camicia']);
  assert.equal(filterWardrobe(garments, filters, 'jeans', 'new', now).length, 0);
  assert.equal(activeFilterCount(filters), 7);
  assert.equal(JSON.stringify(garments), before);
});

test('resetting draft criteria preserves the independent search and ordering', () => {
  const applied = { ...emptyWardrobeFilters, category: 'Jeans', color: 'Blu' };
  const draft = { ...applied, ...emptyWardrobeFilters };
  assert.equal(activeFilterCount(applied), 2);
  assert.equal(activeFilterCount(draft), 0);
  assert.deepEqual(filterWardrobe([garment, other], draft, 'camicia', 'rare').map(item => item.id), ['camicia']);
  assert.deepEqual(filterWardrobe([garment, other], draft, '', 'new').map(item => item.id), ['jeans', 'camicia']);
  assert.deepEqual(filterWardrobe([garment, other], draft, '', 'name').map(item => item.id), ['camicia', 'jeans']);
  assert.deepEqual(filterWardrobe([garment, other], draft, '', 'rare').map(item => item.id), ['jeans', 'camicia']);
});

test('recent filter excludes unworn, invalid, future and seven-day-old dates', () => {
  const now = Date.parse('2026-09-29T12:00:00Z');
  const daysAgo = (days: number) => ({ ...garment, id: String(days), lastWorn: new Date(now - days * 86400000).toISOString() });
  assert.deepEqual(filterWardrobe([daysAgo(0), daysAgo(6), daysAgo(7), daysAgo(-1), other, { ...garment, lastWorn: 'invalid' }], { ...emptyWardrobeFilters, recent: true }, '', 'name', now).map(item => item.id), ['0', '6']);
});

test('garment validation accepts photos optional and preserves hidden fields while locating first error', () => {
  const original = JSON.stringify(garment);
  assert.equal(garmentValidationIssue(garment), null);
  assert.deepEqual(garmentValidationIssue({ ...garment, name: '  ' }), { field: 'name', message: 'Inserisci il nome del capo.' });
  assert.equal(garmentValidationIssue(garment, true)?.field, 'category');
  assert.equal(garmentValidationIssue({ ...garment, category: 'missing' as Garment['category'] })?.field, 'category');
  assert.equal(garmentValidationIssue({ ...garment, color: 'missing' })?.field, 'color');
  assert.deepEqual(garmentValidationIssue({ ...garment, seasons: [] }), { field: 'seasons', message: 'Scegli almeno una stagione.' });
  assert.equal(JSON.stringify(garment), original);
});
