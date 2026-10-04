import { useId, useState } from 'react';
import { X } from 'lucide-react';
import type { Garment } from '../types';
import { CATEGORIES, COLORS, SEASONS, STYLES } from '../lib/constants';
import { emptyWardrobeFilters, filterWardrobe } from '../lib/wardrobe';
import type { WardrobeFilters } from '../lib/wardrobe';
import { useModalSheet } from '../lib/useModalSheet';
import './wardrobe.css';

export default function WardrobeFilterSheet({ filters, garments, query, onClose, onApply }: {
  filters: WardrobeFilters;
  garments: Garment[];
  query: string;
  onClose: () => void;
  onApply: (filters: WardrobeFilters) => void;
}) {
  const [draft, setDraft] = useState({ ...filters });
  const ref = useModalSheet(onClose);
  const titleId = useId();
  const count = filterWardrobe(garments, draft, query).length;
  const update = <K extends keyof WardrobeFilters>(key: K, value: WardrobeFilters[K]) => setDraft(current => ({ ...current, [key]: value }));
  return <div className="modal-backdrop wardrobe-sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="modal wardrobe-sheet wardrobe-filter-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="wardrobe-sheet-header"><h2 id={titleId}>Filtri</h2><button className="icon-button" type="button" aria-label="Chiudi filtri" onClick={onClose}><X size={20} /></button></header>
      <div className="wardrobe-sheet-scroll wardrobe-filter-fields">
        <label className="field" htmlFor={`${titleId}-category`}><span id={`${titleId}-category-label`}>Categoria</span><select id={`${titleId}-category`} aria-labelledby={`${titleId}-category-label`} className="input" value={draft.category} onChange={event => update('category', event.target.value)}><option value="">Tutte</option>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field" htmlFor={`${titleId}-color`}><span id={`${titleId}-color-label`}>Colore</span><select id={`${titleId}-color`} aria-labelledby={`${titleId}-color-label`} className="input" value={draft.color} onChange={event => update('color', event.target.value)}><option value="">Tutti</option>{COLORS.map(value => <option key={value.name}>{value.name}</option>)}</select></label>
        <label className="field" htmlFor={`${titleId}-season`}><span id={`${titleId}-season-label`}>Stagione</span><select id={`${titleId}-season`} aria-labelledby={`${titleId}-season-label`} className="input" value={draft.season} onChange={event => update('season', event.target.value)}><option value="">Tutte</option>{SEASONS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field" htmlFor={`${titleId}-style`}><span id={`${titleId}-style-label`}>Stile</span><select id={`${titleId}-style`} aria-labelledby={`${titleId}-style-label`} className="input" value={draft.style} onChange={event => update('style', event.target.value)}><option value="">Tutti</option>{STYLES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field" htmlFor={`${titleId}-formality`}><span id={`${titleId}-formality-label`}>Formalità</span><select id={`${titleId}-formality`} aria-labelledby={`${titleId}-formality-label`} className="input" value={draft.formality} onChange={event => update('formality', event.target.value)}><option value="">Tutte</option>{['Relax', 'Casual', 'Smart casual', 'Elegante', 'Formale'].map((value, index) => <option key={value} value={index + 1}>{value}</option>)}</select></label>
        <label className="check-field"><input type="checkbox" checked={draft.favorite} onChange={event => update('favorite', event.target.checked)} />Solo preferiti</label>
        <label className="check-field"><input type="checkbox" checked={draft.recent} onChange={event => update('recent', event.target.checked)} />Indossati negli ultimi sette giorni</label>
        <button className="text-button" type="button" onClick={() => setDraft({ ...emptyWardrobeFilters })}>Azzera filtri</button>
      </div>
      <footer className="wardrobe-sheet-footer wardrobe-filter-actions"><button className="button button-ghost" type="button" onClick={onClose}>Annulla</button><button className="button button-primary" type="button" onClick={() => onApply(draft)}>Mostra {count} {count === 1 ? 'capo' : 'capi'}</button></footer>
    </div>
  </div>;
}
