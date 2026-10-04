import { useEffect, useRef, useState } from 'react';
import { Check, Layers3, MoreHorizontal, Plus, Search, SlidersHorizontal, Star } from 'lucide-react';
import type { AppData, Outfit, WearEvent } from '../types';
import OutfitPreview, { OutfitArtwork } from '../components/OutfitPreview';
import Modal from '../components/Modal';
import { OCCASIONS, SEASONS } from '../lib/constants';
import './profile.css';

export default function Collection({ data, onSave, onWear, onUpdate, onDelete, onCreate, onVariant, active = true }: {
    data: AppData;
    onSave: (o: Outfit) => Promise<void>;
    onWear: (o: Outfit) => Promise<{ alreadyRecorded: boolean }>;
    onUpdate: (o: Outfit) => Promise<void>;
    onDelete: (o: Outfit) => void;
    onCreate: () => void;
    onVariant: (o: Outfit | WearEvent) => void;
    active?: boolean;
}) {
    const [query, setQuery] = useState(''), [season, setSeason] = useState('');
    const [filterOpen, setFilterOpen] = useState(false), [draftSeason, setDraftSeason] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null), [editing, setEditing] = useState<Outfit | null>(null);
    const [busy, setBusy] = useState<'wear' | 'save' | 'edit' | null>(null), [error, setError] = useState(''), [status, setStatus] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const busyRef = useRef(false);
    const editForm = useRef<HTMLFormElement>(null), overflowButton = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false), isEditing = Boolean(editing);
    useEffect(() => {
        if (isEditing) { editForm.current?.focus({ preventScroll: true }); wasEditing.current = true; }
        else if (wasEditing.current) { wasEditing.current = false; overflowButton.current?.focus({ preventScroll: true }); }
    }, [isEditing]);
    const saved = data.outfits.filter(outfit => outfit.favorite === true);
    const matches = (outfit: Outfit, selectedSeason: string) => (!selectedSeason || outfit.season === selectedSeason) && `${outfit.name} ${outfit.occasion} ${outfit.occasion === 'Giornata casual' ? 'Tutti i giorni' : ''} ${outfit.style}`.toLocaleLowerCase('it-IT').includes(query.trim().toLocaleLowerCase('it-IT'));
    const outfits = saved.filter(outfit => matches(outfit, season)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const draftCount = saved.filter(outfit => matches(outfit, draftSeason)).length;
    const selected = data.outfits.find(outfit => outfit.id === selectedId);
    const close = () => { if (busyRef.current) return; setSelectedId(null); setEditing(null); setMenuOpen(false); setError(''); setStatus(''); };
    useEffect(() => { if (!active) { setSelectedId(null); setEditing(null); setFilterOpen(false); setMenuOpen(false); setError(''); setStatus(''); } }, [active]);
    useEffect(() => { if (selectedId && !selected) { setSelectedId(null); setEditing(null); } }, [selectedId, selected]);
    const run = async (kind: 'wear' | 'save' | 'edit', action: () => Promise<void>) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(kind); setError(''); setStatus('');
        try { await action(); }
        catch { setError(kind === 'wear' ? 'Non sono riuscito a registrarlo. Riprova.' : 'Salvataggio non riuscito. Riprova.'); }
        finally { busyRef.current = false; setBusy(null); }
    };
    return <div className="page saved-page"><div className="page-heading"><h1>Salvati</h1><button className="button button-primary" type="button" onClick={onCreate}><Plus size={18} aria-hidden="true"/>Crea un outfit</button></div>
        {saved.length > 0 && <div className="saved-toolbar"><div className="search-input"><Search size={18} aria-hidden="true"/><input aria-label="Cerca un outfit" placeholder="Cerca un outfit" value={query} onChange={e => setQuery(e.target.value)}/></div><button className="button button-outline" type="button" onClick={() => { setDraftSeason(season); setFilterOpen(true); }}><SlidersHorizontal size={18} aria-hidden="true"/>Filtri{season ? ' · 1' : ''}</button></div>}
        {outfits.length ? <div className="saved-grid">{outfits.map(outfit => <OutfitPreview key={outfit.id} name={outfit.name} occasion={outfit.occasion} garmentIds={outfit.garmentIds} garments={data.garments} onOpen={() => { setSelectedId(outfit.id); setError(''); setStatus(''); setMenuOpen(false); }}/>)}</div> : <div className="empty-state"><Layers3 size={42} strokeWidth={1.3} aria-hidden="true"/><h2>{saved.length ? 'Nessun outfit trovato.' : 'I look che salvi li ritrovi qui.'}</h2>{saved.length ? <button className="button button-outline" type="button" onClick={() => { setQuery(''); setSeason(''); }}>Azzera filtri</button> : <button className="button button-primary" type="button" onClick={onCreate}>Crea un outfit</button>}</div>}
        {active && filterOpen && <Modal title="Filtri" onClose={() => setFilterOpen(false)} className="saved-dialog"><div className="saved-dialog-scroll"><label className="field">Stagione<select className="input" value={draftSeason} onChange={e => setDraftSeason(e.target.value)}><option value="">Tutte le stagioni</option>{SEASONS.map(value => <option key={value}>{value}</option>)}</select></label><button className="button button-ghost" type="button" onClick={() => setDraftSeason('')}>Azzera filtri</button><p className="muted">I più recenti sono mostrati per primi, in base alla data di creazione.</p></div><div className="saved-dialog-footer"><button type="button" className="button button-outline" onClick={() => setFilterOpen(false)}>Annulla</button><button type="button" className="button button-primary" onClick={() => { setSeason(draftSeason); setFilterOpen(false); }}>Mostra {draftCount} outfit</button></div></Modal>}
        {active && selected && <Modal title={editing ? 'Modifica dettagli' : selected.name} onClose={close} className="saved-dialog">
            {editing ? <form className="saved-edit-form" aria-label="Modifica dettagli" ref={editForm} tabIndex={-1} onSubmit={e => { e.preventDefault(); if (!editing.name.trim()) { setError('Inserisci il nome dell’outfit.'); (e.currentTarget.elements.namedItem('outfit-name') as HTMLInputElement | null)?.focus(); return; } void run('edit', async () => { await onUpdate({ ...editing, name: editing.name.trim() }); setEditing(null); setStatus('Outfit aggiornato.'); }); }}><div className="saved-dialog-scroll"><label className="field">Nome<input name="outfit-name" className="input" required maxLength={100} value={editing.name} disabled={Boolean(busy)} onChange={e => setEditing({ ...editing, name: e.target.value })}/></label><div className="form-row"><label className="field">Occasione<select className="input" disabled={Boolean(busy)} value={editing.occasion} onChange={e => setEditing({ ...editing, occasion: e.target.value })}>{OCCASIONS.map(value => <option key={value} value={value}>{value === 'Giornata casual' ? 'Tutti i giorni' : value}</option>)}</select></label><label className="field">Stagione<select className="input" disabled={Boolean(busy)} value={editing.season} onChange={e => setEditing({ ...editing, season: e.target.value as Outfit['season'] })}>{SEASONS.map(value => <option key={value}>{value}</option>)}</select></label></div><label className="field">Note<textarea className="input" disabled={Boolean(busy)} rows={3} maxLength={2000} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })}/></label><div className="field"><span>Valutazione</span><div className="rating-buttons">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" disabled={Boolean(busy)} className={editing.rating >= n ? 'active' : ''} aria-label={`${n} su 5`} aria-pressed={editing.rating === n} onClick={() => setEditing({ ...editing, rating: editing.rating === n ? 0 : n })}><Star size={24} fill={editing.rating >= n ? 'currentColor' : 'none'}/></button>)}</div></div><p className="muted">Ultima volta indossato: {editing.lastWorn ? new Date(editing.lastWorn).toLocaleDateString('it-IT') : 'ancora da indossare'}</p></div><div className="saved-dialog-footer">{error && <p role="alert" className="profile-error">{error}</p>}<button type="button" className="button button-outline" disabled={Boolean(busy)} onClick={() => { setEditing(null); setError(''); }}>Annulla</button><button className="button button-primary" disabled={Boolean(busy)}>{busy === 'edit' ? 'Salvo…' : 'Salva'}</button></div></form> : <>
                <div className="saved-dialog-scroll"><OutfitArtwork garmentIds={selected.garmentIds} garments={data.garments}/><p className="saved-context">{selected.occasion === 'Giornata casual' ? 'Tutti i giorni' : selected.occasion} · {selected.season}</p><ul className="saved-piece-list">{selected.garmentIds.map(id => data.garments.find(garment => garment.id === id)).filter(garment => Boolean(garment)).map(garment => garment && <li key={garment.id}><span className="color-dot" style={{ background: garment.colorHex }} aria-hidden="true"/><span>{garment.name}</span><span>{garment.category} · {garment.color}</span></li>)}</ul><button className="button button-ghost saved-overflow-toggle" type="button" ref={overflowButton} disabled={Boolean(busy)} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} aria-hidden="true"/>Altre azioni</button>{menuOpen && <div className="saved-overflow"><button type="button" disabled={Boolean(busy)} onClick={() => { setEditing({ ...selected }); setMenuOpen(false); setError(''); setStatus(''); }}>Modifica dettagli</button><button type="button" disabled={Boolean(busy)} onClick={() => void run('save', async () => { await onSave(selected); setSelectedId(null); setMenuOpen(false); })}>{busy === 'save' ? 'Salvo…' : 'Rimuovi dai salvati'}</button><button type="button" className="saved-delete" disabled={Boolean(busy)} onClick={() => { setSelectedId(null); setMenuOpen(false); onDelete(selected); }}>Elimina outfit</button></div>}</div>
                <div className="saved-dialog-footer">{error && <p role="alert" className="profile-error">{error}</p>}{status && <p role="status">{status}</p>}<button className="button button-primary" type="button" disabled={Boolean(busy)} aria-busy={busy === 'wear'} onClick={() => void run('wear', async () => { const result = await onWear(selected); setStatus(result.alreadyRecorded ? 'Già registrato oggi' : 'Registrato per oggi'); })}><Check size={17} aria-hidden="true"/>{busy === 'wear' ? 'Registro…' : 'Indosso questo'}</button><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => { setSelectedId(null); onVariant(selected); }}>Crea una variante</button></div>
            </>}
        </Modal>}
    </div>;
}
