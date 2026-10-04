import { useEffect, useId, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Garment, GenerateOptions, Outfit, Preferences } from '../types';
import { getReplacementCandidates, replaceGarmentWith } from '../lib/engine';
import { useModalSheet } from '../lib/useModalSheet';
import GarmentArt from './GarmentArt';
import '../pages/create.css';

interface ReplacementSheetProps {
  outfit: Outfit;
  garmentId: string;
  garments: Garment[];
  preferences: Preferences;
  options: GenerateOptions;
  excludedSignatures?: readonly string[];
  onApply: (outfit: Outfit) => void;
  onClose: () => void;
  onToggleLock?: (id: string) => void;
  onDetails?: (garment: Garment) => void;
  onUpload?: () => void;
  onPreferences?: () => void;
}

export default function ReplacementSheet({ outfit, garmentId, garments, preferences, options, excludedSignatures = [], onApply, onClose, onToggleLock, onDetails, onUpload, onPreferences }: ReplacementSheetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const titleId = useId();
  const originatingCard = useRef(typeof document === 'undefined' ? null : document.activeElement?.closest<HTMLElement>('.outfit-card'));
  const ref = useModalSheet(onClose);
  const current = garments.find(item => item.id === garmentId);
  const locked = options.lockedIds.includes(garmentId);
  const candidates = getReplacementCandidates(outfit, garmentId, garments, preferences, options, excludedSignatures);
  useEffect(() => { if (!current) onClose(); }, [current, onClose]);
  function apply() {
    if (!selected) return;
    const changed = replaceGarmentWith(outfit, garmentId, garments, preferences, options, selected, excludedSignatures);
    if (!changed) { setError('Questo capo non è più disponibile per il look. Scegli un’altra alternativa.'); setSelected(null); return; }
    onApply(changed);
    requestAnimationFrame(() => {
      const button = originatingCard.current?.querySelector<HTMLButtonElement>(`[data-garment-id="${CSS.escape(selected)}"]`);
      if (button?.isConnected && !button.closest('[hidden], [inert]') && button.getClientRects().length > 0) button.focus({ preventScroll: true });
    });
  }
  if (!current) return null;
  return <div className="create-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="create-lock-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="create-lock-modal-header"><div><h2 id={titleId}>Cambia capo</h2><p>{current.name}</p></div><button type="button" className="outfit-icon-button" onClick={onClose} aria-label="Chiudi cambio capo"><X size={20} /></button></div>
      <div className="create-sheet-scroll">
        <div className="replacement-tools">{onToggleLock && <label className="replacement-lock"><input type="checkbox" checked={locked} onChange={() => { setSelected(null); onToggleLock(garmentId); }} /> Mantieni questo capo</label>}{onDetails && <button type="button" className="button button-ghost" onClick={() => { onClose(); onDetails(current); }}>Vedi dettagli</button>}</div>
        {locked ? <div className="replacement-empty"><p>Questo capo resta nelle prossime proposte.</p>{onToggleLock && <button type="button" className="button button-ghost" onClick={() => onToggleLock(garmentId)}>Sblocca per cambiarlo</button>}</div> : candidates.length ? <div className="create-lock-grid">{candidates.map(item => <button type="button" key={item.id} className={`create-lock-choice${selected === item.id ? ' is-selected' : ''}`} onClick={() => { setSelected(item.id); setError(''); }} aria-pressed={selected === item.id}>
          <span className="create-lock-choice-art" aria-hidden="true"><GarmentArt garment={item} />{selected === item.id && <span><Check size={16} /></span>}</span><strong>{item.name}</strong><small>{item.category} · {item.color}</small>
        </button>)}</div> : <div className="replacement-empty"><p>Non hai altri capi compatibili.</p>{onUpload && <button type="button" className="button" onClick={() => { onClose(); onUpload(); }}>Aggiungi capo</button>}{onPreferences && <button type="button" className="button button-ghost" onClick={() => { onClose(); onPreferences(); }}>Modifica preferenze</button>}</div>}
        {error && <p role="alert" className="create-action-error">{error}</p>}
      </div>
      <div className="create-lock-modal-footer"><button type="button" className="button button-ghost" onClick={onClose}>Annulla</button><button type="button" className="button button-primary" disabled={locked || !selected || !candidates.some(item => item.id === selected)} onClick={apply}>Usa questo capo</button></div>
    </div>
  </div>;
}
