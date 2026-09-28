import type { AppData, Garment, Outfit } from '../types.ts';
import { CATEGORIES, COLORS, STYLES } from './constants.ts';

export type StatisticsPeriod = '30d' | 'all';
export interface StatisticsRange {
  period: StatisticsPeriod;
  start: string | null;
  end: string;
  timezone: string;
}
export interface GarmentUsage { garment: Garment; count: number }
export interface WardrobeStatistics {
  range: StatisticsRange;
  outfitWears: number;
  garmentWears: number;
  activeDays: number;
  wornGarments: number;
  unwornGarments: number;
  rotationPercent: number;
  totalGarments: number;
  favoriteGarments: number;
  favoriteGarment: GarmentUsage | null;
  mostWorn: GarmentUsage | null;
  leastWorn: GarmentUsage | null;
  palette: { color: string; hex: string; count: number; percent: number }[];
  categories: { category: string; count: number; percent: number }[];
  styles: { style: string; count: number; percent: number }[];
  favoriteOutfits: number;
  favoriteOutfit: { outfit: Outfit; wears: number } | null;
  averageRating: number | null;
  ratedOutfits: number;
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round(value / total * 100) : 0;
}

/**
 * Usage derives exclusively from history, never cached wearCount/lastWorn fields.
 * "30d" means today and the previous 29 local calendar dates, up to now.
 * Future/invalid dates and duplicate event IDs are ignored. Each existing garment
 * counts once per event; two different outfits in a day can count it twice.
 * Events without any remaining wardrobe garment do not count. Color uses the
 * current primary color of each garment (secondary colors do not double count).
 * Inventory, favorites and ratings describe the current collection, not its past.
 */
export function buildWardrobeStatistics(data: AppData, period: StatisticsPeriod = '30d', now = new Date()): WardrobeStatistics {
  if (!Number.isFinite(now.getTime())) throw new Error('Data delle statistiche non valida.');
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);
  const range: StatisticsRange = {
    period,
    start: period === '30d' ? start.toISOString() : null,
    end: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
  const garments = new Map(data.garments.map(garment => [garment.id, garment]));
  const counts = new Map<string, number>();
  const outfitCounts = new Map<string, number>();
  const activeDays = new Set<string>();
  const eventIds = new Set<string>();
  let outfitWears = 0;
  let garmentWears = 0;

  for (const event of data.history) {
    const date = new Date(event.date);
    if (!Number.isFinite(date.getTime()) || date > now || (period === '30d' && date < start) || eventIds.has(event.id)) continue;
    const ids = [...new Set(event.garmentIds)].filter(id => garments.has(id));
    if (!ids.length) continue;
    eventIds.add(event.id);
    outfitWears += 1;
    garmentWears += ids.length;
    activeDays.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    outfitCounts.set(event.outfitId, (outfitCounts.get(event.outfitId) || 0) + 1);
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }

  const usage = [...garments.values()].map(garment => ({ garment, count: counts.get(garment.id) || 0 }));
  const ranked = [...usage].sort((a, b) => b.count - a.count || a.garment.id.localeCompare(b.garment.id));
  const least = [...usage].sort((a, b) => a.count - b.count || a.garment.createdAt.localeCompare(b.garment.createdAt) || a.garment.id.localeCompare(b.garment.id));
  const paletteMap = new Map<string, { color: string; hex: string; count: number }>();
  const categoryMap = new Map<string, number>();
  const styleMap = new Map<string, number>();
  for (const { garment, count } of usage) {
    categoryMap.set(garment.category, (categoryMap.get(garment.category) || 0) + 1);
    if (!count) continue;
    const color = paletteMap.get(garment.color) || { color: garment.color, hex: garment.colorHex, count: 0 };
    color.count += count;
    paletteMap.set(garment.color, color);
    styleMap.set(garment.style, (styleMap.get(garment.style) || 0) + count);
  }
  const favorites = data.outfits.filter(outfit => outfit.favorite).sort((a, b) => b.rating - a.rating || (outfitCounts.get(b.id) || 0) - (outfitCounts.get(a.id) || 0) || a.id.localeCompare(b.id));
  const ratings = data.outfits.map(outfit => outfit.rating).filter(rating => Number.isFinite(rating) && rating > 0 && rating <= 5);
  return {
    range, outfitWears, garmentWears, activeDays: activeDays.size,
    wornGarments: counts.size,
    unwornGarments: garments.size - counts.size,
    rotationPercent: percentage(counts.size, garments.size),
    totalGarments: garments.size,
    favoriteGarments: usage.filter(item => item.garment.favorite).length,
    favoriteGarment: ranked.find(item => item.garment.favorite) || null,
    mostWorn: ranked.find(item => item.count > 0) || null,
    leastWorn: least[0] || null,
    palette: [...paletteMap.values()].sort((a, b) => b.count - a.count || a.color.localeCompare(b.color)).map(item => ({ ...item, percent: percentage(item.count, garmentWears) })),
    categories: [...categoryMap.entries()].map(([category, count]) => ({ category, count, percent: percentage(count, garments.size) })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    styles: [...styleMap.entries()].map(([style, count]) => ({ style, count, percent: percentage(count, garmentWears) })).sort((a, b) => b.count - a.count || a.style.localeCompare(b.style)),
    favoriteOutfits: favorites.length,
    favoriteOutfit: favorites[0] ? { outfit: favorites[0], wears: outfitCounts.get(favorites[0].id) || 0 } : null,
    averageRating: ratings.length ? Math.round(ratings.reduce((total, rating) => total + rating, 0) / ratings.length * 10) / 10 : null,
    ratedOutfits: ratings.length,
  };
}

/** Aggregate-only contract for a future, opt-in friends comparison. No I/O. */
export function buildComparisonSnapshot(data: AppData, period: StatisticsPeriod = '30d', now = new Date()) {
  const stats = buildWardrobeStatistics(data, period, now);
  // Only standard vocabulary crosses this boundary, never custom labels or IDs.
  const aggregate = (values: { label: string; count: number }[], allowed: readonly string[]) => {
    const counts = new Map<string, number>();
    for (const item of values) {
      const label = allowed.includes(item.label) ? item.label : 'Altro';
      counts.set(label, (counts.get(label) || 0) + item.count);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  return {
    version: 1 as const,
    methodology: {
      version: 'get-dressd-usage-v1',
      source: 'history',
      window: 'local-calendar-days-including-today-through-now',
      unit: 'distinct-current-garment-per-distinct-event-id',
      wardrobe: 'current-inventory',
      color: 'current-primary-color',
      ratings: 'current-rated-outfits-only-1-to-5',
      futureEvents: 'excluded',
    },
    timezone: stats.range.timezone,
    range: { period, start: stats.range.start, end: stats.range.end },
    totals: {
      garments: stats.totalGarments, favoriteGarments: stats.favoriteGarments,
      outfitWears: stats.outfitWears, garmentWears: stats.garmentWears, activeDays: stats.activeDays,
      wornGarments: stats.wornGarments, unwornGarments: stats.unwornGarments,
      rotationPercent: stats.rotationPercent, favoriteOutfits: stats.favoriteOutfits,
      averageRating: stats.averageRating, ratedOutfits: stats.ratedOutfits,
    },
    colors: aggregate(stats.palette.map(item => ({ label: item.color, count: item.count })), COLORS.map(item => item.name)),
    categories: aggregate(stats.categories.map(item => ({ label: item.category, count: item.count })), CATEGORIES),
    styles: aggregate(stats.styles.map(item => ({ label: item.style, count: item.count })), STYLES),
  };
}

export type ComparisonSnapshot = ReturnType<typeof buildComparisonSnapshot>;
