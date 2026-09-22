import type { Category, Season, Style, Slot } from '../types';
export const CATEGORIES: Category[] = ['T-shirt', 'Camicia', 'Polo', 'Felpa', 'Maglione', 'Giacca', 'Cappotto', 'Jeans', 'Pantaloni', 'Shorts', 'Sneakers', 'Scarpe eleganti', 'Accessori'];
export const SEASONS: Season[] = ['Primavera', 'Estate', 'Autunno', 'Inverno'];
export const STYLES: Style[] = ['Minimal', 'Casual', 'Streetwear', 'Elegante', 'Sportivo'];
export const OCCASIONS = ['Università', 'Lavoro', 'Appuntamento', 'Aperitivo', 'Cena', 'Festa', 'Serata', 'Palestra', 'Viaggio', 'Giornata casual'];
export const COLORS = [{ name: 'Bianco', hex: '#eeece5' }, { name: 'Nero', hex: '#26282b' }, { name: 'Grigio', hex: '#90918c' }, { name: 'Blu', hex: '#344c69' }, { name: 'Azzurro', hex: '#a1b9cf' }, { name: 'Beige', hex: '#c7b99e' }, { name: 'Marrone', hex: '#715743' }, { name: 'Verde', hex: '#68735d' }, { name: 'Rosso', hex: '#a94f4b' }, { name: 'Rosa', hex: '#c998a6' }, { name: 'Viola', hex: '#847194' }, { name: 'Giallo', hex: '#d4b85b' }, { name: 'Arancione', hex: '#c88651' }];
export const SLOT_LABELS: Record<Slot, string> = { top: 'Top', bottom: 'Pantaloni', shoes: 'Scarpe', outerwear: 'Strato esterno', accessory: 'Accessorio' };
export function categorySlot(category: Category): Slot { if (['Jeans', 'Pantaloni', 'Shorts'].includes(category))
    return 'bottom'; if (['Sneakers', 'Scarpe eleganti'].includes(category))
    return 'shoes'; if (['Giacca', 'Cappotto'].includes(category))
    return 'outerwear'; if (category === 'Accessori')
    return 'accessory'; return 'top'; }
export function currentSeason(): Season { const m = new Date().getMonth(); return m >= 2 && m <= 4 ? 'Primavera' : m >= 5 && m <= 7 ? 'Estate' : m >= 8 && m <= 10 ? 'Autunno' : 'Inverno'; }
export const defaultPreferences = { name: '', favoriteColors: [], dislikedSignatures: [], likedSignatures: [], preferredStyle: 'Minimal' as Style, reduceMotion: false };
