import type { AppData, GenerateOptions, Outfit } from '../types.ts';
import { currentSeason } from './constants.ts';
import { generateOutfits, outfitSignature } from './engine.ts';

export interface TodaySession {
  sourceKey: string;
  options: GenerateOptions;
  outfits: Outfit[];
  index: number;
  seen: string[];
  changed: boolean;
  exhausted: boolean;
}

/** Usage and favorites affect future ranking, never invalidate a look under the finger. */
export function wardrobeStructureKey(data: AppData): string {
  return JSON.stringify(data.garments.map(({ favorite: _favorite, wearCount: _count, lastWorn: _last, ...garment }) => garment));
}
export function createTodaySession(data: AppData): TodaySession {
  const options: GenerateOptions = { occasion: 'Giornata casual', style: data.preferences.preferredStyle, temperature: 20, weather: 'Sereno', formality: 2, lockedIds: [], season: currentSeason() };
  const outfits = generateOutfits(data.garments, data.preferences, options, 3, data.preferences.dislikedSignatures).outfits;
  return { sourceKey: wardrobeStructureKey(data), options, outfits, index: 0, seen: outfits.map(o => outfitSignature(o.garmentIds)), changed: false, exhausted: false };
}
export function advanceToday(data: AppData, session: TodaySession): TodaySession {
  if (session.index < session.outfits.length - 1) return { ...session, index: session.index + 1, changed: true, exhausted: false };
  const options = { ...session.options, season: currentSeason() };
  const next = generateOutfits(data.garments, data.preferences, options, 3, [...session.seen, ...data.preferences.dislikedSignatures]).outfits;
  if (!next.length) return { ...session, exhausted: true };
  return { ...session, options, outfits: [...session.outfits, ...next], index: session.outfits.length, seen: [...session.seen, ...next.map(o => outfitSignature(o.garmentIds))], changed: true, exhausted: false };
}
