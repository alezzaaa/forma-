import { Check, Heart, LockKeyhole, MoreHorizontal, Pencil } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Garment, Outfit } from '../types';
import { categorySlot } from '../lib/constants';
import { outfitSignature } from '../lib/engine';
import GarmentArt from './GarmentArt';
import '../pages/create.css';

interface OutfitCardProps {
  outfit: Outfit;
  garments: Garment[];
  onSave?: (outfit: Outfit) => Promise<void> | void;
  onWear?: (outfit: Outfit) => Promise<{ alreadyRecorded: boolean } | void> | void;
  onReplace?: (id: string) => void;
  onReject?: (outfit: Outfit) => Promise<void> | void;
  onEdit?: (outfit: Outfit) => void;
  onRegenerate?: () => void;
  onDetails?: (garment: Garment) => void;
  lockedIds?: string[];
  onToggleLock?: (id: string) => void;
  compact?: boolean;
  disabled?: boolean;
  eyebrow?: string;
  showOccasion?: boolean;
  wearLabel?: string;
  onHistory?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export default function OutfitCard({ outfit, garments, onSave, onWear, onReplace, onReject, onEdit, onRegenerate, onDetails, lockedIds = [], compact = false, disabled = false, eyebrow, showOccasion = false, wearLabel, onHistory, onBusyChange }: OutfitCardProps) {
  const [pending, setPending] = useState<'wear' | 'save' | 'reject' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [worn, setWorn] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [piecesOpen, setPiecesOpen] = useState(false);
  const pendingRef = useRef(false);
  const signature = outfitSignature(outfit.garmentIds);
  const today = new Date().toDateString();
  const moreId = useId();
  const piecesId = useId();
  useEffect(() => { setWorn(''); setMessage(''); setError(''); setMoreOpen(false); setPiecesOpen(false); }, [signature, today]);
  const items = outfit.garmentIds.map(id => garments.find(item => item.id === id)).filter((item): item is Garment => Boolean(item));
  const useGrid = items.filter(item => categorySlot(item.category) === 'accessory').length > 1 || items.length > 5;
  const hasLayer = items.some(item => categorySlot(item.category) === 'outerwear');
  const blocked = disabled || pending !== null || items.length !== outfit.garmentIds.length;
  const wearText = pending === 'wear' ? 'Registro…' : wearLabel ?? (worn || 'Indosso questo');
  async function act(kind: 'wear' | 'save' | 'reject') {
    if (blocked || pendingRef.current) return;
    pendingRef.current = true;
    setPending(kind); setMessage(''); setError(''); onBusyChange?.(true);
    try {
      if (kind === 'wear') {
        const outcome = await onWear?.(outfit);
        const label = outcome?.alreadyRecorded ? 'Già registrato oggi' : 'Registrato per oggi';
        setWorn(label); setMessage(label);
      } else if (kind === 'save') {
        await onSave?.(outfit);
        setMessage(outfit.favorite ? 'Outfit rimosso dai salvati.' : 'Outfit salvato.');
      } else { await onReject?.(outfit); setMoreOpen(false); setMessage('Preferenza salvata.'); }
    } catch {
      setError(kind === 'wear' ? 'Non sono riuscito a registrarlo. Riprova.' : 'Salvataggio non riuscito. Riprova.');
    } finally { pendingRef.current = false; setPending(null); onBusyChange?.(false); }
  }
  function openGarment(item: Garment) {
    if (blocked) return;
    if (onReplace) onReplace(item.id); else onDetails?.(item);
  }
  return <article className={`outfit-card${compact ? ' outfit-card--compact' : ''}`} aria-busy={pending !== null}>
    <div className={`outfit-collage outfit-collage--${items.length}${hasLayer ? ' outfit-collage--layered' : ''}${useGrid ? ' outfit-collage--grid' : ''}`} style={useGrid ? { '--outfit-grid-rows': Math.ceil(items.length / 2) } as CSSProperties : undefined}>
      <div className="outfit-collage-pieces">{items.map((item, index) => <button type="button" key={`${categorySlot(item.category)}-${index}`} className={`outfit-piece outfit-piece--${categorySlot(item.category)}`} data-garment-id={item.id} onClick={() => openGarment(item)} disabled={blocked || (!onReplace && !onDetails)} aria-label={`${onReplace ? 'Cambia' : 'Vedi dettagli di'} ${item.name}${lockedIds.includes(item.id) ? ', Bloccato' : ''}`}>
        <span className="outfit-piece-art" aria-hidden="true"><GarmentArt garment={item} /></span>{lockedIds.includes(item.id) && <span className="outfit-piece-lock is-locked" aria-hidden="true"><LockKeyhole size={16} /></span>}
      </button>)}</div>
    </div>
    <div className="outfit-card-body">
      <div className="outfit-card-heading"><div>{(eyebrow || showOccasion) && <span className="outfit-occasion">{eyebrow ?? (outfit.occasion === 'Giornata casual' ? 'Tutti i giorni' : outfit.occasion)}</span>}<h3>{outfit.name}</h3></div>{onEdit && <button type="button" className="outfit-icon-button" disabled={blocked} onClick={() => onEdit(outfit)} aria-label={`Modifica ${outfit.name}`}><Pencil size={18} /></button>}</div>
      {!compact && <p className="outfit-explanation">{outfit.explanation}</p>}
      {onWear && <button type="button" className="button button-primary outfit-wear-button" disabled={blocked} onClick={() => void act('wear')}><Check size={18} aria-hidden="true" />{wearText}</button>}
      {(onSave || onRegenerate || onReject || onDetails || onReplace) && <div className="outfit-card-actions">
        {onSave && <button type="button" className="button button-ghost" disabled={blocked} onClick={() => void act('save')} aria-pressed={outfit.favorite} aria-label={outfit.favorite ? 'Rimuovi dai salvati' : 'Salva'}><Heart size={18} fill={outfit.favorite ? 'currentColor' : 'none'} aria-hidden="true" />{pending === 'save' ? 'Salvo…' : outfit.favorite ? 'Salvato' : 'Salva'}</button>}
        <button type="button" className="button button-ghost" disabled={pending !== null} aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={18} aria-hidden="true" />Altre azioni</button>
      </div>}
      {moreOpen && <div id={moreId} className="outfit-more-actions">{onRegenerate && <button type="button" className="button button-ghost" disabled={blocked} onClick={() => { setMoreOpen(false); onRegenerate(); }}>Cambia outfit</button>}{onReject && <button type="button" className="button button-ghost" disabled={blocked} onClick={() => void act('reject')}>{pending === 'reject' ? 'Salvo…' : 'Non fa per me'}</button>}<button type="button" className="button button-ghost" aria-expanded={piecesOpen} aria-controls={piecesId} onClick={() => setPiecesOpen(open => !open)}>Vedi capi</button></div>}
      {piecesOpen && <div id={piecesId} className="outfit-pieces-list">{items.map(item => <div className="outfit-piece-row" key={item.id}><span className="outfit-color-dot" style={{ background: item.colorHex }} /><span className="outfit-piece-name">{item.name}</span>{lockedIds.includes(item.id) && <LockKeyhole size={16} aria-label="Bloccato" />}{(onReplace || onDetails) && <button type="button" className="button button-ghost" onClick={() => openGarment(item)} disabled={blocked} aria-label={`${onReplace ? 'Cambia' : 'Vedi dettagli di'} ${item.name}`}>{onReplace ? 'Cambia' : 'Dettagli'}</button>}</div>)}</div>}
      {(message || worn || wearLabel?.includes('oggi')) && <p className="outfit-action-status" role="status">{message || worn || wearLabel}{(worn || wearLabel?.includes('oggi')) && onHistory && <> · <button type="button" className="text-button" onClick={onHistory}>Vedi cronologia</button></>}</p>}
      {error && <p className="create-action-error" role="alert">{error}</p>}
    </div>
  </article>;
}
