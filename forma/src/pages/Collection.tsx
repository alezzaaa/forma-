import { useState } from 'react';
import { Heart, Plus, Search, Layers3, Star } from 'lucide-react';
import type { AppData, Outfit } from '../types';
import OutfitCard from '../components/OutfitCard';
import Modal from '../components/Modal';
import { OCCASIONS, SEASONS } from '../lib/constants';
export default function Collection({ data, onSave, onWear, onUpdate, onDelete, onCreate }: {
    data: AppData;
    onSave: (o: Outfit) => void;
    onWear: (o: Outfit) => void;
    onUpdate: (o: Outfit) => Promise<void>;
    onDelete: (o: Outfit) => void;
    onCreate: () => void;
}) {
    const [query, setQuery] = useState(''), [favorites, setFavorites] = useState(false), [season, setSeason] = useState(''), [editing, setEditing] = useState<Outfit | null>(null), [saving, setSaving] = useState(false);
    const outfits = data.outfits.filter(o => (!favorites || o.favorite) && (!season || o.season === season) && `${o.name} ${o.occasion} ${o.style}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return <div className="page"><div className="page-heading"><div><p className="eyebrow">LE COMBINAZIONI CHE PARLANO DI TE</p><h1>I tuoi outfit.</h1><p>Quelli riusciti bene meritano un bis.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={17}/> Crea un outfit</button></div><div className="collection-toolbar"><div className="search-input"><Search size={17}/><input aria-label="Cerca outfit" placeholder="Cerca un outfit o un’occasione…" value={query} onChange={e => setQuery(e.target.value)}/></div><select className="input" aria-label="Filtra outfit per stagione" value={season} onChange={e => setSeason(e.target.value)}><option value="">Tutte le stagioni</option>{SEASONS.map(s => <option key={s}>{s}</option>)}</select><button className={`button button-outline ${favorites ? 'selected' : ''}`} onClick={() => setFavorites(!favorites)} aria-pressed={favorites}><Heart size={17}/> Preferiti</button></div>{outfits.length ? <div className="collection-grid">{outfits.map(o => <OutfitCard key={o.id} outfit={o} garments={data.garments} onSave={onSave} onWear={onWear} onEdit={setEditing}/>)}</div> : <div className="empty-state"><Layers3 size={45} strokeWidth={1.2}/><h2>{data.outfits.length ? 'Nessun outfit in questa selezione.' : 'Il primo di tanti bei look.'}</h2><p>Salva una combinazione dal generatore per ritrovarla qui.</p><button className="button button-primary" onClick={onCreate}>Trova il tuo prossimo outfit</button></div>}
 {editing && <Modal title="Dettagli outfit" onClose={() => setEditing(null)}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); try {
        await onUpdate(editing);
        setEditing(null);
    }
    catch { }
    finally {
        setSaving(false);
    } }}><label className="field">Nome<input className="input" required maxLength={100} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}/></label><div className="form-row"><label className="field">Occasione<select className="input" value={editing.occasion} onChange={e => setEditing({ ...editing, occasion: e.target.value })}>{OCCASIONS.map(s => <option key={s}>{s}</option>)}</select></label><label className="field">Stagione<select className="input" value={editing.season} onChange={e => setEditing({ ...editing, season: e.target.value as Outfit['season'] })}>{SEASONS.map(s => <option key={s}>{s}</option>)}</select></label></div><label className="field">Note<textarea className="input" rows={3} maxLength={2000} placeholder="Un dettaglio da ricordare…" value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })}/></label><div className="field"><span>Il tuo voto</span><div className="rating-buttons">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={editing.rating >= n ? 'active' : ''} aria-label={`Valuta ${n} su 5`} onClick={() => setEditing({ ...editing, rating: editing.rating === n ? 0 : n })}><Star size={26} fill={editing.rating >= n ? 'currentColor' : 'none'}/></button>)}</div></div><p className="muted">Ultima volta indossato: {editing.lastWorn ? new Date(editing.lastWorn).toLocaleDateString('it-IT') : 'ancora da indossare'}</p><div className="modal-actions"><button type="button" className="button button-danger" onClick={() => { onDelete(editing); setEditing(null); }}>Elimina outfit</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva modifiche'}</button></div></form></Modal>}</div>;
}
