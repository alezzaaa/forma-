export type Category = 'T-shirt' | 'Camicia' | 'Polo' | 'Felpa' | 'Maglione' | 'Giacca' | 'Cappotto' | 'Jeans' | 'Pantaloni' | 'Shorts' | 'Sneakers' | 'Scarpe eleganti' | 'Accessori';
export type Season = 'Primavera' | 'Estate' | 'Autunno' | 'Inverno';
export type Style = 'Minimal' | 'Casual' | 'Streetwear' | 'Elegante' | 'Sportivo';
export type Slot = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';
export interface Garment {
    id: string;
    name: string;
    category: Category;
    subcategory: string;
    color: string;
    colorHex: string;
    secondaryColors: string[];
    style: Style;
    seasons: Season[];
    formality: number;
    material: string;
    pattern: string;
    image: string;
    favorite: boolean;
    wearCount: number;
    lastWorn: string | null;
    createdAt: string;
    demo?: boolean;
}
export interface Outfit {
    id: string;
    name: string;
    garmentIds: string[];
    occasion: string;
    season: Season;
    style: Style;
    rating: number;
    favorite: boolean;
    createdAt: string;
    lastWorn: string | null;
    notes: string;
    explanation: string;
    score: number;
}
export interface WearEvent {
    id: string;
    outfitId: string;
    garmentIds: string[];
    date: string;
    name: string;
}
export interface Preferences {
    name: string;
    favoriteColors: string[];
    dislikedSignatures: string[];
    likedSignatures: string[];
    preferredStyle: Style;
    reduceMotion: boolean;
}
export interface AppData {
    version: 1;
    garments: Garment[];
    outfits: Outfit[];
    history: WearEvent[];
    preferences: Preferences;
}
export interface GenerateOptions {
    occasion: string;
    style: Style | 'Qualsiasi';
    temperature: number;
    weather: 'Sereno' | 'Nuvoloso' | 'Pioggia';
    formality: number;
    lockedIds: string[];
    season: Season;
    avoidIds?: string[];
}
export interface GenerateResult {
    outfits: Outfit[];
    warnings: string[];
}
