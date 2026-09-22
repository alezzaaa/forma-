import { ArrowLeftRight, Check, Heart, LockKeyhole, Pencil, RotateCw, ThumbsDown } from 'lucide-react';
import type { Garment, Outfit } from '../types';
import { categorySlot } from '../lib/constants';
import GarmentArt from './GarmentArt';
import '../pages/create.css';

interface OutfitCardProps {
  outfit: Outfit;
  garments: Garment[];
  onSave?: (outfit: Outfit) => void;
  onWear?: (outfit: Outfit) => void;
  onReplace?: (id: string) => void;
  onReject?: (outfit: Outfit) => void;
  onEdit?: (outfit: Outfit) => void;
  onRegenerate?: () => void;
  lockedIds?: string[];
  onToggleLock?: (id: string) => void;
  compact?: boolean;
}

export default function OutfitCard({ outfit, garments, onSave, onWear, onReplace, onReject, onEdit, onRegenerate, lockedIds = [], onToggleLock, compact = false }: OutfitCardProps) {
  const items = outfit.garmentIds.map(id => garments.find(item => item.id === id)).filter((item): item is Garment => Boolean(item));
  return (
    <article className={`outfit-card${compact ? ' outfit-card--compact' : ''}`}>
      <div className={`outfit-collage outfit-collage--${items.length}`}>
        <span className="outfit-collage-label">{outfit.style} / {outfit.season}</span>
        {onSave && <button type="button" className={`outfit-heart${outfit.favorite ? ' is-favorite' : ''}`} onClick={() => onSave(outfit)} aria-label={outfit.favorite ? 'Rimuovi outfit dai preferiti' : 'Salva outfit'} title={outfit.favorite ? 'Outfit salvato' : 'Salva outfit'} aria-pressed={outfit.favorite}><Heart size={18} fill={outfit.favorite ? 'currentColor' : 'none'} /></button>}
        <div className="outfit-collage-pieces">
          {items.map(item => <div key={item.id} className={`outfit-piece outfit-piece--${categorySlot(item.category)}`}>
            <div className="outfit-piece-art"><GarmentArt garment={item} /></div>
            {onToggleLock && <button type="button" className={`outfit-piece-lock${lockedIds.includes(item.id) ? ' is-locked' : ''}`} onClick={() => onToggleLock(item.id)} aria-label={`${lockedIds.includes(item.id) ? 'Sblocca' : 'Blocca'} ${item.name}`} title={lockedIds.includes(item.id) ? 'Capo bloccato: rimane nelle prossime proposte' : 'Costruisci le prossime proposte intorno a questo capo'} aria-pressed={lockedIds.includes(item.id)}><LockKeyhole size={13} /></button>}
            {!onToggleLock && lockedIds.includes(item.id) && <span className="outfit-piece-lock is-locked"><LockKeyhole size={13} aria-label="Capo bloccato" /></span>}
          </div>)}
        </div>
        <span className="outfit-collage-count">{items.length} capi, un insieme.</span>
      </div>
      <div className="outfit-card-body">
        <div className="outfit-card-heading"><div><span className="outfit-occasion">{outfit.occasion}</span><h3>{outfit.name}</h3></div>{onEdit && <button type="button" className="outfit-icon-button" onClick={() => onEdit(outfit)} aria-label={`Modifica ${outfit.name}`} title="Modifica nome, rating e note"><Pencil size={16} /></button>}</div>
        {!compact && <p className="outfit-explanation">{outfit.explanation}</p>}
        {!compact && <div className="outfit-pieces-list">{items.map(item => <div className="outfit-piece-row" key={item.id}><span className="outfit-color-dot" style={{ background: item.colorHex }} /><span className="outfit-piece-name" title={item.name}>{item.name}</span>{lockedIds.includes(item.id) ? <LockKeyhole size={13} className="outfit-row-lock" aria-label="Bloccato" /> : onReplace && <button type="button" className="outfit-replace-button" onClick={() => onReplace(item.id)} aria-label={`Sostituisci ${item.name}`} title={`Sostituisci ${item.name}`}><ArrowLeftRight size={14} /></button>}</div>)}</div>}
        {(onWear || onRegenerate || onReject) && <div className="outfit-card-actions">{onWear && <button type="button" className="button outfit-wear-button" onClick={() => onWear(outfit)}><Check size={16} /> Indosso questo</button>}{onRegenerate && <button type="button" className="outfit-icon-button" onClick={onRegenerate} aria-label={`Rigenera ${outfit.name}`} title="Un'altra proposta"><RotateCw size={16} /></button>}{onReject && <button type="button" className="outfit-icon-button" onClick={() => onReject(outfit)} aria-label={`Non mi piace ${outfit.name}`} title="Non fa per me"><ThumbsDown size={15} /></button>}</div>}
      </div>
    </article>
  );
}
