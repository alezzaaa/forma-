import type { Garment } from '../types';
import GarmentArt from './GarmentArt';
import { categorySlot } from '../lib/constants';

/** A read-only flat-lay shared by saved looks and diary entries. */
export function OutfitArtwork({ garmentIds, garments }: { garmentIds: string[]; garments: Garment[] }) {
    const items = garmentIds.map(id => garments.find(garment => garment.id === id)).filter((garment): garment is Garment => Boolean(garment));
    return <span className={`saved-look-art${items.length > 5 || items.filter(item => categorySlot(item.category) === 'accessory').length > 1 ? ' saved-look-art--grid' : ''}`} aria-hidden="true">{items.map(garment => <span key={garment.id} className={`saved-look-piece saved-look-piece--${categorySlot(garment.category)}`}><GarmentArt garment={garment}/></span>)}</span>;
}

export default function OutfitPreview({ name, occasion, garmentIds, garments, onOpen }: { name: string; occasion?: string; garmentIds: string[]; garments: Garment[]; onOpen: () => void }) {
    return <button type="button" className="saved-look-preview" onClick={onOpen} aria-label={`Vedi ${name}`}><OutfitArtwork garmentIds={garmentIds} garments={garments}/><span className="saved-look-caption"><strong>{name}</strong>{occasion && <span>{occasion === 'Giornata casual' ? 'Tutti i giorni' : occasion}</span>}</span></button>;
}
