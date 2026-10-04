import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Plus, X, Shirt } from 'lucide-react';
import type { AppData, Category, Garment } from '../types';
import { activeFilterCount, emptyWardrobeFilters, filterWardrobe } from '../lib/wardrobe';
import type { WardrobeSort } from '../lib/wardrobe';
import GarmentCard from '../components/GarmentCard';
import GarmentDetailSheet from '../components/GarmentDetailSheet';
import WardrobeFilterSheet from '../components/WardrobeFilterSheet';
import '../components/wardrobe.css';

export default function Wardrobe({ data, onUpload, onEdit, onFavorite, onLock, onDelete, active = true }: {
  data: AppData;
  onUpload: (category?: Category) => void;
  onEdit: (garment: Garment) => void;
  onFavorite: (garment: Garment) => void;
  onLock: (garment: Garment) => void;
  onDelete?: (garment: Garment) => void;
  active?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ ...emptyWardrobeFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sort, setSort] = useState<WardrobeSort>('new');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const filtered = useMemo(() => filterWardrobe(data.garments, filters, query, sort), [data.garments, filters, query, sort]);
  const count = activeFilterCount(filters);
  const detail = data.garments.find(garment => garment.id === detailId);
  useEffect(() => { if (!active) { setFilterOpen(false); setDetailId(null); } }, [active]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => setKeyboardOpen(Boolean(viewport && window.innerHeight - viewport.height > 140));
    update();
    viewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => { viewport?.removeEventListener('resize', update); window.removeEventListener('resize', update); };
  }, []);
  return <div className={`page wardrobe-page${keyboardOpen ? ' wardrobe-keyboard-open' : ''}`}>
    <div className="page-heading"><div><h1>Guardaroba</h1>{data.garments.some(garment => garment.demo) && <p>Stai esplorando capi di esempio.</p>}</div><button className="button button-primary wardrobe-header-add" onClick={() => onUpload()}><Plus size={18} />Aggiungi capo</button></div>
    <div className="wardrobe-toolbar">
      <div className="search-input"><Search size={18} /><input aria-label="Cerca un capo" placeholder="Cerca un capo" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="icon-button" aria-label="Cancella ricerca" onClick={() => setQuery('')}><X size={18} /></button>}</div>
      <div className="wardrobe-filter-sort"><button className={`button button-outline${count ? ' selected' : ''}`} type="button" aria-haspopup="dialog" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={18} />Filtri{count > 0 && <span className="count-badge">{count}</span>}</button><select className="sort-select" aria-label="Ordina i capi" value={sort} onChange={event => setSort(event.target.value as WardrobeSort)}><option value="new">Ultimi aggiunti</option><option value="name">Nome A–Z</option><option value="rare">Meno indossati</option></select></div>
    </div>
    {filtered.length ? <><p className="results-count" role="status">{filtered.length} {filtered.length === 1 ? 'capo' : 'capi'}</p><div className="garment-grid">{filtered.map(garment => <GarmentCard key={garment.id} garment={garment} onOpen={() => setDetailId(garment.id)} />)}</div></> : <div className="empty-state"><Shirt size={44} strokeWidth={1.2} /><h2>{data.garments.length ? 'Nessun capo trovato.' : 'Aggiungi i tuoi primi capi'}</h2><p>{data.garments.length ? 'Prova a cambiare i filtri o la ricerca.' : 'Puoi aggiungere una foto o compilare i dettagli a mano.'}</p>{data.garments.length ? <div className="wardrobe-empty-actions"><button className="button button-outline" type="button" onClick={() => setFilters({ ...emptyWardrobeFilters })}>Azzera filtri</button>{query && <button className="button button-ghost" type="button" onClick={() => setQuery('')}>Cancella ricerca</button>}</div> : <button className="button button-primary" type="button" onClick={() => onUpload()}>Aggiungi capo</button>}</div>}
    <div className="wardrobe-add-bar"><button className="button button-primary" type="button" onClick={() => onUpload()}><Plus size={19} />Aggiungi capo</button></div>
    {active && filterOpen && <WardrobeFilterSheet filters={filters} garments={data.garments} query={query} onClose={() => setFilterOpen(false)} onApply={next => { setFilters(next); setFilterOpen(false); }} />}
    {active && detail && <GarmentDetailSheet garment={detail} onClose={() => setDetailId(null)} onCreate={onLock} onEdit={onEdit} onFavorite={onFavorite} onDelete={onDelete} />}
  </div>;
}
