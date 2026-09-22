import { Heart, ArrowUpRight, LockKeyhole } from 'lucide-react';
import type { Garment } from '../types';
import GarmentArt from './GarmentArt';
export default function GarmentCard({ garment, onEdit, onFavorite, onLock }: {
    garment: Garment;
    onEdit: () => void;
    onFavorite: () => void;
    onLock: () => void;
}) { return <article className="garment-card"><div className="garment-image"><button className="garment-open" onClick={onEdit} aria-label={`Modifica ${garment.name}`}><GarmentArt garment={garment}/></button><span className="garment-tag">{garment.category}</span><button className={`garment-heart ${garment.favorite ? 'is-favorite' : ''}`} onClick={onFavorite} aria-label={`${garment.favorite ? 'Rimuovi' : 'Aggiungi'} ${garment.name} ${garment.favorite ? 'dai' : 'ai'} preferiti`}><Heart size={17} fill={garment.favorite ? 'currentColor' : 'none'}/></button><button className="garment-lock" onClick={onLock}><LockKeyhole size={13}/> Crea un outfit</button>{garment.wearCount === 0 && <span className="unworn-dot" title="Mai indossato"/>}</div><div className="garment-info"><button onClick={onEdit}><span>{garment.name}</span><ArrowUpRight size={15}/></button><p><span className="color-dot" style={{ background: garment.colorHex }}/>{garment.color} <span>·</span> {garment.style}</p></div></article>; }
