import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, LoaderCircle, Plus, RotateCcw, ScanLine, Sparkles, UploadCloud, X } from 'lucide-react';
import type { Garment } from '../types';
import { LocalRecognitionProvider, MAX_UPLOAD_FILES, removeUniformBackground } from '../lib/recognition';
import { GarmentFields, garmentValidation, useDialog } from './GarmentEditor';
import './upload.css';

type Draft = { garment: Garment; originalImage: string; needsCategory: boolean; backgroundRemoved: boolean };
export default function UploadModal({ onClose, onSave }: { onClose: () => void; onSave: (items: Garment[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [active, setActive] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ filename: '', phase: '', percent: 0, index: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const processingRef = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const busy = processing || saving || removingBackground;
  const close = () => { if (!saving && !removingBackground) onClose(); };
  const modalRef = useDialog(close);
  const titleId = useId();
  const draft = drafts[active];

  const addFiles = async (files: FileList | File[]) => {
    if (processingRef.current || saving) return;
    const selected = Array.from(files);
    if (!selected.length) return;
    const available = MAX_UPLOAD_FILES - drafts.length;
    if (selected.length > available) { setError(`Puoi aggiungere al massimo ${MAX_UPLOAD_FILES} foto per volta. Hai ancora spazio per ${available} foto.`); return; }
    processingRef.current = true;
    setProcessing(true); setError(''); setDragging(false);
    const errors: string[] = [];
    const provider = new LocalRecognitionProvider();
    const firstNewIndex = drafts.length;
    let addedCount = 0;
    for (let index = 0; index < selected.length; index++) {
      if (!alive.current) break;
      const file = selected[index];
      try {
        const result = await provider.analyze(file, status => { if (alive.current) setProgress({ ...status, filename: file.name, index: index + 1, total: selected.length }); });
        addedCount++;
        if (alive.current) setDrafts(current => [...current, { garment: result.garment, originalImage: result.garment.image, needsCategory: !result.categoryDetected, backgroundRemoved: false }]);
      } catch (cause) { errors.push(`${file.name}: ${cause instanceof Error ? cause.message : 'La foto non è stata caricata.'}`); }
    }
    if (alive.current) { setProcessing(false); setError(errors.join('\n')); if (addedCount) setActive(firstNewIndex); }
    processingRef.current = false;
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };
  const updateDraft = (garment: Garment) => setDrafts(current => current.map((item, index) => index === active ? { ...item, garment } : item));
  const resolveCategory = () => setDrafts(current => current.map((item, index) => index === active ? { ...item, needsCategory: false } : item));
  const removeDraft = (index: number) => {
    setDrafts(current => current.filter((_, i) => i !== index));
    setActive(current => Math.max(0, current >= index ? current - 1 : current));
  };
  const removeBackground = async () => {
    if (!draft) return;
    if (draft.backgroundRemoved) { setDrafts(current => current.map((item, index) => index === active ? { ...item, garment: { ...item.garment, image: item.originalImage }, backgroundRemoved: false } : item)); return; }
    setRemovingBackground(true); setError('');
    try {
      const image = await removeUniformBackground(draft.originalImage);
      if (alive.current) setDrafts(current => current.map((item, index) => index === active ? { ...item, garment: { ...item.garment, image }, backgroundRemoved: true } : item));
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Non è stato possibile rimuovere lo sfondo.'); }
    finally { if (alive.current) setRemovingBackground(false); }
  };
  const save = async () => {
    const invalidIndex = drafts.findIndex(item => garmentValidation(item.garment, item.needsCategory));
    if (invalidIndex >= 0) { setActive(invalidIndex); setError(`Foto ${invalidIndex + 1}: ${garmentValidation(drafts[invalidIndex].garment, drafts[invalidIndex].needsCategory)}`); return; }
    if (!drafts.length) return;
    setSaving(true); setError('');
    try { await onSave(drafts.map(item => ({ ...item.garment, name: item.garment.name.trim() }))); onClose(); }
    catch { setError('Non è stato possibile salvare i capi. Il tuo spazio potrebbe essere pieno: prova con meno foto.'); }
    finally { if (alive.current) setSaving(false); }
  };
  const changeActive = (index: number) => { if (!busy) { setActive(index); setError(''); } };
  return <div className="modal-backdrop upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className={`modal upload-modal ${drafts.length ? 'upload-has-drafts' : 'upload-empty'}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef} tabIndex={-1}>
      <header className="upload-header"><div><span className="upload-eyebrow">DA UNA FOTO, NUOVE POSSIBILITÀ</span><h2 id={titleId}>{drafts.length ? 'Fai spazio al tuo stile.' : 'Il tuo guardaroba inizia qui.'}</h2><p>{drafts.length ? 'Controlla i dettagli, poi lascia fare agli abbinamenti.' : 'Una foto per capo. Al resto diamo forma insieme.'}</p></div><button type="button" className="upload-icon-button" aria-label="Chiudi caricamento" onClick={close} disabled={saving || removingBackground}><X size={21} /></button></header>
      <input ref={fileRef} className="upload-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Scegli foto dei capi" onChange={e => { if (e.target.files) void addFiles(e.target.files); }} />
      <input ref={cameraRef} className="upload-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Scatta foto di un capo" onChange={e => { if (e.target.files) void addFiles(e.target.files); }} />
      {processing && <div className="upload-progress" role="status" aria-live="polite"><div className="upload-progress-text"><LoaderCircle size={18} className="upload-spin" /><span>{progress.phase || 'Preparazione delle foto'} <small>{progress.index}/{progress.total || 1}</small></span><b>{progress.percent}%</b></div><div className="upload-progress-track"><i style={{ width: `${progress.percent}%` }} /></div><p>{progress.filename}</p></div>}
      {!drafts.length && <div className="upload-welcome">
        <button className={`upload-dropzone ${dragging ? 'dragging' : ''}`} disabled={processing} type="button" onClick={() => fileRef.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}><span className="upload-drop-art"><span /><ImagePlus size={40} strokeWidth={1.15} /></span><strong>{dragging ? 'Lascia qui le tue foto' : 'Trascina qui i tuoi capi'}</strong><span>oppure scegli le foto dalla galleria</span><span className="button button-primary"><Plus size={17} /> Scegli le foto</span><small>JPEG, PNG o WebP · fino a 20 foto · 12 MB per foto</small></button>
        <button type="button" className="button button-ghost upload-camera" disabled={processing} onClick={() => cameraRef.current?.click()}><Camera size={18} /> Scatta una foto</button>
        <div className="upload-tips"><div><ScanLine size={18} /><span><b>Un capo alla volta</b><small>Stendilo su una superficie neutra.</small></span></div><div><Sparkles size={18} /><span><b>La luce fa la differenza</b><small>Usa luce naturale, senza filtri.</small></span></div></div>
        <p className="upload-local-note">Le foto restano su questo dispositivo. L’analisi locale propone il colore e usa il nome del file per suggerire la categoria; gli altri dettagli vanno verificati.</p>
      </div>}
      {!!drafts.length && <>
        <div className="upload-queue" aria-label="Foto da aggiungere">{drafts.map((item, index) => <div className={`upload-queue-item ${index === active ? 'active' : ''}`} key={item.garment.id}><button type="button" disabled={busy} aria-label={`Modifica foto ${index + 1}: ${item.garment.name}${item.needsCategory ? ', scegli categoria' : ''}`} aria-pressed={index === active} onClick={() => changeActive(index)}><img src={item.garment.image} alt="" />{item.needsCategory && <span className="upload-queue-dot" />}</button><button type="button" className="upload-queue-remove" aria-label={`Rimuovi foto ${index + 1}`} disabled={busy} onClick={() => removeDraft(index)}><X size={11} /></button></div>)}{drafts.length < MAX_UPLOAD_FILES && <button type="button" className="upload-queue-add" aria-label="Aggiungi altre foto" disabled={busy} onClick={() => fileRef.current?.click()}><Plus size={20} /></button>}<span className="upload-queue-count">{drafts.length} {drafts.length === 1 ? 'capo' : 'capi'}</span></div>
        {draft && <div className="upload-review">
          <div className="upload-preview-column"><div className={`upload-photo ${draft.backgroundRemoved ? 'upload-transparent' : ''}`}><img src={draft.garment.image} alt={`Anteprima di ${draft.garment.name}`} />{removingBackground && <div className="upload-photo-busy"><LoaderCircle className="upload-spin" size={24} /><span>Rimozione sfondo…</span></div>}</div><button className="button button-ghost upload-background-button" type="button" onClick={removeBackground} disabled={busy}>{draft.backgroundRemoved ? <RotateCcw size={16} /> : <Sparkles size={16} />}{draft.backgroundRemoved ? 'Ripristina originale' : 'Rimuovi sfondo uniforme'}</button><p className="upload-background-hint">Funziona con fondi a tinta unita. Controlla i bordi: puoi sempre ripristinare l’originale.</p><div className="upload-draft-navigation"><button type="button" className="upload-icon-button" aria-label="Capo precedente" onClick={() => changeActive(active - 1)} disabled={active === 0 || busy}><ArrowLeft size={17} /></button><span>Capo {active + 1} di {drafts.length}</span><button type="button" className="upload-icon-button" aria-label="Capo successivo" onClick={() => changeActive(active + 1)} disabled={active === drafts.length - 1 || busy}><ArrowRight size={17} /></button></div></div>
          <div className="upload-form-column"><div className="upload-draft-notice"><ScanLine size={16} /><span>Bozza automatica · verifica i dettagli</span></div><GarmentFields garment={draft.garment} onChange={updateDraft} categoryRequired={draft.needsCategory} onCategoryResolved={resolveCategory} /></div>
        </div>}
      </>}
      {(drafts.length > 0 || error) && <footer className="upload-footer">{error && <p className="upload-error" role="alert">{error}</p>}{drafts.length > 0 && <div className="upload-footer-actions"><span className="upload-save-caption"><UploadCloud size={16} /> Solo nel tuo guardaroba</span><div><button type="button" className="button button-ghost" onClick={close} disabled={saving || removingBackground}>Annulla</button><button type="button" className="button button-primary" onClick={save} disabled={busy}>{saving ? <LoaderCircle size={17} className="upload-spin" /> : <Check size={17} />}{saving ? 'Salvataggio…' : `Aggiungi ${drafts.length === 1 ? 'al guardaroba' : `${drafts.length} capi`}`}</button></div></div>}</footer>}
    </div>
  </div>;
}
