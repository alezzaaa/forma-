import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { Check, Heart, LoaderCircle, Trash2, X } from 'lucide-react';
import type { Category, Garment, Season, Style } from '../types';
import { CATEGORIES, COLORS, SEASONS, STYLES } from '../lib/constants';
import GarmentArt from './GarmentArt';
import './upload.css';

export function useDialog(onClose: () => void): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || [])].filter(el => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (getFocusable()[0] || ref.current)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); ref.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);
  return ref;
}

export function garmentValidation(garment: Garment, categoryRequired = false): string | null {
  if (!garment.name.trim()) return 'Dai un nome al capo prima di salvarlo.';
  if (categoryRequired || !CATEGORIES.includes(garment.category)) return 'Scegli la categoria del capo.';
  if (!garment.seasons.length) return 'Seleziona almeno una stagione.';
  return null;
}

type FieldsProps = { garment: Garment; onChange: (garment: Garment) => void; categoryRequired?: boolean; onCategoryResolved?: () => void };
export function GarmentFields({ garment, onChange, categoryRequired = false, onCategoryResolved }: FieldsProps) {
  const id = useId();
  const update = <K extends keyof Garment>(key: K, value: Garment[K]) => onChange({ ...garment, [key]: value });
  const toggleSeason = (season: Season) => update('seasons', garment.seasons.includes(season) ? garment.seasons.filter(s => s !== season) : [...garment.seasons, season]);
  return <div className="garment-fields">
    <label className="field" htmlFor={`${id}-name`}><span>Nome del capo <span className="upload-required">*</span></span><input className="input" id={`${id}-name`} value={garment.name} onChange={e => update('name', e.target.value)} maxLength={100} placeholder="Es. La mia T-shirt preferita" required /></label>
    <div className="upload-field-grid">
      <label className="field" htmlFor={`${id}-category`}><span>Categoria <span className="upload-required">*</span></span><select className={`input ${categoryRequired ? 'upload-input-attention' : ''}`} id={`${id}-category`} value={categoryRequired ? '' : garment.category} required onChange={e => { update('category', e.target.value as Category); onCategoryResolved?.(); }}><option value="" disabled>Scegli la categoria</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className="field" htmlFor={`${id}-subcategory`}><span>Sottocategoria</span><input className="input" id={`${id}-subcategory`} value={garment.subcategory} onChange={e => update('subcategory', e.target.value)} placeholder="Es. Oversize, slim…" maxLength={100} /></label>
    </div>
    <fieldset className="upload-fieldset"><legend>Colore principale <span className="upload-current-color">{garment.color}</span></legend><div className="upload-color-swatches">{COLORS.map(color => <button type="button" key={color.name} aria-label={color.name} aria-pressed={garment.color === color.name} title={color.name} className={`upload-color ${garment.color === color.name ? 'selected' : ''}`} style={{ '--swatch': color.hex } as CSSProperties} onClick={() => onChange({ ...garment, color: color.name, colorHex: color.hex, secondaryColors: garment.secondaryColors.filter(c => c !== color.name) })}>{garment.color === color.name && <Check size={14} />}</button>)}</div></fieldset>
    <fieldset className="upload-fieldset"><legend>Colori secondari <span className="upload-optional">facoltativi</span></legend><div className="upload-color-swatches upload-secondary">{COLORS.filter(c => c.name !== garment.color).map(color => <button type="button" key={color.name} aria-label={`Colore secondario ${color.name}`} aria-pressed={garment.secondaryColors.includes(color.name)} title={color.name} className={`upload-color ${garment.secondaryColors.includes(color.name) ? 'selected' : ''}`} style={{ '--swatch': color.hex } as CSSProperties} onClick={() => update('secondaryColors', garment.secondaryColors.includes(color.name) ? garment.secondaryColors.filter(c => c !== color.name) : [...garment.secondaryColors, color.name])}>{garment.secondaryColors.includes(color.name) && <Check size={12} />}</button>)}</div></fieldset>
    <div className="upload-field-grid">
      <label className="field" htmlFor={`${id}-style`}><span>Stile</span><select className="input" id={`${id}-style`} value={garment.style} onChange={e => update('style', e.target.value as Style)}>{STYLES.map(style => <option key={style}>{style}</option>)}</select></label>
      <label className="field" htmlFor={`${id}-material`}><span>Materiale</span><input className="input" id={`${id}-material`} value={garment.material} onChange={e => update('material', e.target.value)} placeholder="Es. Cotone" maxLength={100} /></label>
    </div>
    <fieldset className="upload-fieldset"><legend>Stagioni <span className="upload-required">*</span></legend><div className="upload-season-options">{SEASONS.map(season => <button className={`upload-choice ${garment.seasons.includes(season) ? 'selected' : ''}`} type="button" aria-pressed={garment.seasons.includes(season)} key={season} onClick={() => toggleSeason(season)}>{season}</button>)}</div></fieldset>
    <div className="upload-field-grid">
      <label className="field" htmlFor={`${id}-pattern`}><span>Pattern</span><input className="input" id={`${id}-pattern`} list={`${id}-patterns`} value={garment.pattern} onChange={e => update('pattern', e.target.value)} placeholder="Es. Tinta unita" maxLength={100} /><datalist id={`${id}-patterns`}>{['Tinta unita', 'Righe', 'Quadri', 'Grafica', 'Floreale', 'Pois'].map(value => <option key={value} value={value} />)}</datalist></label>
      <label className="field" htmlFor={`${id}-formality`}><span>Formalità</span><select className="input" id={`${id}-formality`} value={garment.formality} onChange={e => update('formality', Number(e.target.value))}>{['Molto casual', 'Casual', 'Smart casual', 'Elegante', 'Formale'].map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
    </div>
    <button type="button" className={`upload-favorite ${garment.favorite ? 'selected' : ''}`} aria-pressed={garment.favorite} onClick={() => update('favorite', !garment.favorite)}><Heart size={17} fill={garment.favorite ? 'currentColor' : 'none'} /><span>{garment.favorite ? 'Tra i tuoi preferiti' : 'Aggiungi ai preferiti'}</span></button>
  </div>;
}

export default function GarmentEditor({ garment, onClose, onSave, onDelete }: { garment: Garment; onClose: () => void; onSave: (garment: Garment) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [draft, setDraft] = useState<Garment>({ ...garment, seasons: [...garment.seasons], secondaryColors: [...garment.secondaryColors] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const close = () => { if (!busy) onClose(); };
  const ref = useDialog(close);
  const titleId = useId();
  const save = async () => {
    const validation = garmentValidation(draft);
    if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try { await onSave({ ...draft, name: draft.name.trim() }); onClose(); }
    catch { setError('Non è stato possibile salvare il capo. Riprova.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!onDelete) return;
    setBusy(true); setError('');
    try { await onDelete(); onClose(); }
    catch { setError('Non è stato possibile eliminare il capo. Riprova.'); }
    finally { setBusy(false); }
  };
  return <div className="modal-backdrop upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal upload-modal garment-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
      <header className="upload-header"><div><span className="upload-eyebrow">IL TUO GUARDAROBA</span><h2 id={titleId}>Ogni dettaglio, a modo tuo.</h2></div><button type="button" className="upload-icon-button" aria-label="Chiudi modifica capo" onClick={close} disabled={busy}><X size={21} /></button></header>
      <div className="upload-review">
        <div className="upload-preview-column"><div className="upload-photo"><GarmentArt garment={draft} /></div><div className="upload-photo-caption"><span>{garment.wearCount} {garment.wearCount === 1 ? 'volta indossato' : 'volte indossato'}</span><span>{garment.lastWorn ? `Ultimo utilizzo: ${new Date(garment.lastWorn).toLocaleDateString('it-IT')}` : 'Pronto per il prossimo outfit'}</span></div></div>
        <div className="upload-form-column"><GarmentFields garment={draft} onChange={setDraft} /></div>
      </div>
      <footer className="upload-footer">
        {error && <p className="upload-error" role="alert">{error}</p>}
        {confirmDelete ? <div className="upload-delete-confirm"><p>Eliminare questo capo dal guardaroba? L’operazione non si può annullare.</p><div><button className="button button-ghost" type="button" onClick={() => setConfirmDelete(false)} disabled={busy}>Annulla</button><button className="button upload-danger" type="button" onClick={remove} disabled={busy}>{busy ? <LoaderCircle size={17} className="upload-spin" /> : <Trash2 size={17} />} Elimina capo</button></div></div> : <div className="upload-footer-actions">{onDelete ? <button type="button" className="upload-icon-button upload-delete" aria-label="Elimina capo" onClick={() => setConfirmDelete(true)} disabled={busy}><Trash2 size={18} /></button> : <span />}<div><button type="button" className="button button-ghost" onClick={close} disabled={busy}>Annulla</button><button type="button" className="button button-primary" onClick={save} disabled={busy}>{busy ? <LoaderCircle size={17} className="upload-spin" /> : <Check size={17} />} Salva modifiche</button></div></div>}
      </footer>
    </div>
  </div>;
}
