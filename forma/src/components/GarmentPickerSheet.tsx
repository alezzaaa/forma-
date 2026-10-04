import { useId, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { Garment } from '../types';
import { categorySlot } from '../lib/constants';
import { useModalSheet } from '../lib/useModalSheet';
import GarmentArt from './GarmentArt';
import '../pages/create.css';

interface GarmentPickerSheetProps {
  garments: Garment[];
  lockedIds?: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

/** Selection is a draft until the explicit confirmation; cancelling never changes locks. */
export default function GarmentPickerSheet({ garments, lockedIds = [], onConfirm, onClose }: GarmentPickerSheetProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmedConflict, setConfirmedConflict] = useState(false);
  const titleId = useId();
  const ref = useModalSheet(onClose);
  const chosen = garments.find(item => item.id === selected);
  const conflict = chosen && categorySlot(chosen.category) !== 'accessory'
    ? garments.find(item => lockedIds.includes(item.id) && item.id !== chosen.id && categorySlot(item.category) === categorySlot(chosen.category)) : undefined;
  const filtered = garments.filter(item => `${item.name} ${item.category} ${item.color}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')));
  function confirm() {
    if (!chosen || (conflict && !confirmedConflict)) return;
    onConfirm([...new Set([...lockedIds.filter(id => garments.some(item => item.id === id) && id !== conflict?.id), chosen.id])]);
  }
  return <div className="create-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="create-lock-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="create-lock-modal-header"><h2 id={titleId}>Scegli dal guardaroba</h2><button type="button" className="outfit-icon-button" onClick={onClose} aria-label="Chiudi selezione capi"><X size={20} /></button></div>
      <div className="create-lock-search"><Search size={18} aria-hidden="true" /><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca un capo" aria-label="Cerca un capo" /></div>
      <div className="create-sheet-scroll">
        <div className="create-lock-grid">{filtered.map(item => <button type="button" key={item.id} className={`create-lock-choice${selected === item.id ? ' is-selected' : ''}`} onClick={() => { setSelected(item.id); setConfirmedConflict(false); }} aria-pressed={selected === item.id}>
          <span className="create-lock-choice-art" aria-hidden="true"><GarmentArt garment={item} />{selected === item.id && <span><Check size={16} /></span>}</span><strong>{item.name}</strong><small>{item.category} · {item.color}{lockedIds.includes(item.id) ? ' · Bloccato' : ''}</small>
        </button>)}</div>
        {!filtered.length && <p className="create-lock-no-results">Nessun capo trovato.</p>}
        {conflict && <div className="create-lock-conflict" role="status"><h3>Sostituire il capo bloccato?</h3><p>{conflict.name} verrà sostituito da {chosen?.name}.</p><label><input type="checkbox" checked={confirmedConflict} onChange={event => setConfirmedConflict(event.target.checked)} /> Sostituisci {conflict.name}</label></div>}
      </div>
      <div className="create-lock-modal-footer"><button type="button" className="button button-ghost" onClick={onClose}>Annulla</button><button type="button" className="button button-primary" disabled={!chosen || Boolean(conflict && !confirmedConflict)} onClick={confirm}>Usa questo capo</button></div>
    </div>
  </div>;
}
