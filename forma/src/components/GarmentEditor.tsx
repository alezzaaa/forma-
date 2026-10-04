import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react';
import type { Category, Garment, Season, Style } from '../types';
import { CATEGORIES, COLORS, SEASONS, STYLES } from '../lib/constants';
import { garmentValidationIssue } from '../lib/wardrobe';
import type { GarmentValidationField } from '../lib/wardrobe';
import GarmentArt from './GarmentArt';
import { useModalSheet } from '../lib/useModalSheet';
import './upload.css';

export const useDialog = useModalSheet;
export function garmentValidation(garment: Garment, categoryRequired = false): string | null { return garmentValidationIssue(garment, categoryRequired)?.message ?? null; }
export function focusGarmentError(container: HTMLElement | null, field: GarmentValidationField) {
  requestAnimationFrame(() => {
    const target = container?.querySelector<HTMLElement>(`[data-garment-field="${field}"]`);
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  });
}

export function DiscardChangesDialog({ onCancel, onDiscard }: { onCancel: () => void; onDiscard: () => void }) {
  const ref = useDialog(onCancel);
  const title = useId();
  return <div className="modal-backdrop upload-backdrop upload-discard-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div ref={ref} className="modal upload-modal upload-discard-dialog" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1}>
      <header className="upload-header"><h2 id={title}>Scartare le modifiche?</h2></header>
      <div className="upload-discard-actions"><button className="button button-primary" type="button" onClick={onCancel}>Continua a modificare</button><button className="button upload-danger" type="button" onClick={onDiscard}>Scarta modifiche</button></div>
    </div>
  </div>;
}

type FieldsProps = { garment: Garment; onChange: (garment: Garment) => void; categoryRequired?: boolean; onCategoryResolved?: () => void; showValidation?: boolean };
export function GarmentFields({ garment, onChange, categoryRequired = false, onCategoryResolved, showValidation = false }: FieldsProps) {
  const id = useId();
  const issue = showValidation ? garmentValidationIssue(garment, categoryRequired) : null;
  const update = <K extends keyof Garment>(key: K, value: Garment[K]) => onChange({ ...garment, [key]: value });
  const invalid = (field: GarmentValidationField) => issue?.field === field;
  const describedBy = (field: GarmentValidationField) => invalid(field) ? `${id}-error` : undefined;
  const toggleSeason = (season: Season) => update('seasons', garment.seasons.includes(season) ? garment.seasons.filter(value => value !== season) : [...garment.seasons, season]);
  return <div className="garment-fields">
    <label className="field" htmlFor={`${id}-name`}><span>Nome</span><input className="input" id={`${id}-name`} data-garment-field="name" value={garment.name} onChange={event => update('name', event.target.value)} maxLength={100} placeholder="Es. Camicia bianca" required aria-invalid={invalid('name')} aria-describedby={describedBy('name')} /></label>
    <label className="field" htmlFor={`${id}-category`}><span>Categoria</span><select className={`input ${categoryRequired ? 'upload-input-attention' : ''}`} id={`${id}-category`} data-garment-field="category" value={categoryRequired ? '' : garment.category} required aria-invalid={invalid('category')} aria-describedby={describedBy('category')} onChange={event => { update('category', event.target.value as Category); onCategoryResolved?.(); }}><option value="" disabled>Scegli la categoria</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
    <fieldset className="upload-fieldset"><legend>Colore principale <span className="upload-current-color">{garment.color}</span></legend><div className="upload-color-swatches">{COLORS.map((color, index) => <button type="button" key={color.name} data-garment-field={index === 0 ? 'color' : undefined} aria-label={color.name} aria-pressed={garment.color === color.name} aria-invalid={invalid('color')} aria-describedby={describedBy('color')} title={color.name} className={`upload-color ${garment.color === color.name ? 'selected' : ''}`} style={{ '--swatch': color.hex } as CSSProperties} onClick={() => onChange({ ...garment, color: color.name, colorHex: color.hex, secondaryColors: garment.secondaryColors.filter(value => value !== color.name) })}>{garment.color === color.name && <Check size={14} />}</button>)}</div></fieldset>
    <fieldset className="upload-fieldset"><legend>Stagioni</legend><div className="upload-season-options">{SEASONS.map((season, index) => <button className={`upload-choice ${garment.seasons.includes(season) ? 'selected' : ''}`} data-garment-field={index === 0 ? 'seasons' : undefined} type="button" aria-pressed={garment.seasons.includes(season)} aria-invalid={invalid('seasons')} aria-describedby={describedBy('seasons')} key={season} onClick={() => toggleSeason(season)}>{season}</button>)}</div></fieldset>
    <label className="field" htmlFor={`${id}-style`}><span>Stile</span><select className="input" id={`${id}-style`} value={garment.style} onChange={event => update('style', event.target.value as Style)}>{STYLES.map(style => <option key={style}>{style}</option>)}</select></label>
    {issue && <p className="upload-field-error" id={`${id}-error`}>{issue.message}</p>}
    <details className="garment-field-details"><summary>Dettagli <ChevronDown size={18} /></summary><div className="garment-fields">
      <label className="field" htmlFor={`${id}-subcategory`}><span>Sottocategoria</span><input className="input" id={`${id}-subcategory`} value={garment.subcategory} onChange={event => update('subcategory', event.target.value)} placeholder="Es. Oversize, slim…" maxLength={100} /></label>
      <fieldset className="upload-fieldset"><legend>Colori secondari <span className="upload-optional">facoltativi</span></legend><div className="upload-color-swatches upload-secondary">{COLORS.filter(color => color.name !== garment.color).map(color => <button type="button" key={color.name} aria-label={`Colore secondario ${color.name}`} aria-pressed={garment.secondaryColors.includes(color.name)} title={color.name} className={`upload-color ${garment.secondaryColors.includes(color.name) ? 'selected' : ''}`} style={{ '--swatch': color.hex } as CSSProperties} onClick={() => update('secondaryColors', garment.secondaryColors.includes(color.name) ? garment.secondaryColors.filter(value => value !== color.name) : [...garment.secondaryColors, color.name])}>{garment.secondaryColors.includes(color.name) && <Check size={12} />}</button>)}</div></fieldset>
      <label className="field" htmlFor={`${id}-material`}><span>Materiale</span><input className="input" id={`${id}-material`} value={garment.material} onChange={event => update('material', event.target.value)} placeholder="Es. Cotone" maxLength={100} /></label>
      <label className="field" htmlFor={`${id}-pattern`}><span>Fantasia</span><input className="input" id={`${id}-pattern`} list={`${id}-patterns`} value={garment.pattern} onChange={event => update('pattern', event.target.value)} placeholder="Es. Tinta unita" maxLength={100} /><datalist id={`${id}-patterns`}>{['Tinta unita', 'Righe', 'Quadri', 'Grafica', 'Floreale', 'Pois'].map(value => <option key={value} value={value} />)}</datalist></label>
      <label className="field" htmlFor={`${id}-formality`}><span>Formalità</span><select className="input" id={`${id}-formality`} value={garment.formality} onChange={event => update('formality', Number(event.target.value))}>{['Molto casual', 'Casual', 'Smart casual', 'Elegante', 'Formale'].map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
    </div></details>
  </div>;
}

export default function GarmentEditor({ garment, onClose, onSave }: { garment: Garment; onClose: () => void; onSave: (garment: Garment) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [draft, setDraft] = useState<Garment>({ ...garment, seasons: [...garment.seasons], secondaryColors: [...garment.secondaryColors] });
  const original = useRef(JSON.stringify(garment));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const updateDraft = (next: Garment) => { setDraft(next); setError(''); };
  const close = () => { if (!pending.current) { if (JSON.stringify(draft) !== original.current) setConfirmDiscard(true); else onClose(); } };
  const ref = useDialog(close);
  const titleId = useId();
  const save = async () => {
    if (pending.current) return;
    const issue = garmentValidationIssue(draft);
    if (issue) { setShowValidation(true); setError(issue.message); focusGarmentError(ref.current, issue.field); return; }
    pending.current = true;
    setBusy(true); setError('');
    try { await onSave({ ...draft, name: draft.name.trim() }); onClose(); }
    catch { setError('Non sono riuscito a salvare il capo. Riprova.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <><div className="modal-backdrop upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal upload-modal garment-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1} aria-busy={busy}>
      <header className="upload-header"><h2 id={titleId}>Modifica capo</h2><button type="button" className="upload-icon-button" aria-label="Chiudi modifica capo" onClick={close} disabled={busy}><X size={21} /></button></header>
      <div className="upload-scroll"><div className="upload-review">
        <div className="upload-preview-column"><div className="upload-photo"><GarmentArt garment={draft} /></div></div>
        <div className="upload-form-column"><fieldset className="upload-edit-fields" disabled={busy}><GarmentFields garment={draft} onChange={updateDraft} showValidation={showValidation} /></fieldset></div>
      </div></div>
      <footer className="upload-footer">{error && <p className="upload-error" role="alert">{error}</p>}<div className="upload-footer-actions"><div><button type="button" className="button button-ghost" onClick={close} disabled={busy}>Annulla</button><button type="button" className="button button-primary" onClick={save} disabled={busy}>{busy ? <LoaderCircle size={17} className="upload-spin" /> : <Check size={17} />}{busy ? 'Salvo…' : 'Salva'}</button></div></div></footer>
    </div>
  </div>{confirmDiscard && <DiscardChangesDialog onCancel={() => setConfirmDiscard(false)} onDiscard={onClose} />}</>;
}
