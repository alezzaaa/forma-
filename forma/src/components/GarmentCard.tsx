import type { Garment } from '../types';
import GarmentArt from './GarmentArt';
import './wardrobe.css';

export default function GarmentCard({ garment, onOpen, onEdit }: {
  garment: Garment;
  onOpen?: () => void;
  onEdit?: () => void;
  onFavorite?: () => void;
  onLock?: () => void;
}) {
  return <article className="garment-card garment-card-simple">
    <button type="button" className="garment-card-button" onClick={onOpen ?? onEdit} aria-label={`Vedi dettagli di ${garment.name}`}>
      <span className="garment-image"><GarmentArt garment={garment} /></span>
      <span className="garment-info"><span className="garment-card-name">{garment.name}</span><span className="garment-card-meta">{garment.category} · {garment.color}</span></span>
    </button>
  </article>;
}
