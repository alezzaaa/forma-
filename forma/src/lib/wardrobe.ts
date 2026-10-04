import type { Garment } from '../types';
import { CATEGORIES, COLORS, SEASONS } from './constants.ts';

export interface WardrobeFilters {
  category: string;
  color: string;
  season: string;
  style: string;
  formality: string;
  favorite: boolean;
  recent: boolean;
}
export const emptyWardrobeFilters: WardrobeFilters = { category: '', color: '', season: '', style: '', formality: '', favorite: false, recent: false };
export type WardrobeSort = 'new' | 'name' | 'rare';
export function activeFilterCount(filters: WardrobeFilters): number { return Object.values(filters).filter(Boolean).length; }
export function filterWardrobe(garments: Garment[], filters: WardrobeFilters, query = '', sort: WardrobeSort = 'new', now = Date.now()): Garment[] {
  const search = query.trim().toLocaleLowerCase('it');
  return garments.filter(garment => {
    const worn = garment.lastWorn ? new Date(garment.lastWorn).getTime() : NaN;
    return (!search || `${garment.name} ${garment.category} ${garment.color} ${garment.material} ${garment.style}`.toLocaleLowerCase('it').includes(search))
      && (!filters.category || garment.category === filters.category)
      && (!filters.color || garment.color === filters.color)
      && (!filters.season || garment.seasons.some(season => season === filters.season))
      && (!filters.style || garment.style === filters.style)
      && (!filters.formality || garment.formality === Number(filters.formality))
      && (!filters.favorite || garment.favorite)
      && (!filters.recent || (worn <= now && now - worn < 7 * 86400000));
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'it') : sort === 'rare' ? a.wearCount - b.wearCount : b.createdAt.localeCompare(a.createdAt));
}
export type GarmentValidationField = 'name' | 'category' | 'color' | 'seasons';
export function garmentValidationIssue(garment: Garment, categoryRequired = false): { field: GarmentValidationField; message: string } | null {
  if (!garment.name.trim()) return { field: 'name', message: 'Inserisci il nome del capo.' };
  if (categoryRequired || !CATEGORIES.includes(garment.category)) return { field: 'category', message: 'Scegli la categoria del capo.' };
  if (!COLORS.some(color => color.name === garment.color)) return { field: 'color', message: 'Scegli il colore principale.' };
  if (!garment.seasons.length || garment.seasons.some(season => !SEASONS.includes(season))) return { field: 'seasons', message: 'Scegli almeno una stagione.' };
  return null;
}
