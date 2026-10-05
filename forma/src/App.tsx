import { useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, Shirt, Layers3, Plus, History as HistoryIcon, Settings as SettingsIcon, Search, X, Check, AlertCircle } from 'lucide-react';
import type { AppData, Category, Garment, Outfit, Preferences, WearEvent } from './types';
import { loadData, saveData } from './lib/storage';
import { currentSeason } from './lib/constants';
import { createId } from './lib/id';
import { outfitSignature } from './lib/engine';
import { createTodaySession } from './lib/todaySession';
import { readPageScrollPosition } from './lib/useModalSheet';
import type { TodaySession } from './lib/todaySession';
import { createDemoData, createEmptyData } from './data/demo';
import { toggleGarmentFavorite, toggleSavedOutfit, recordWornOutfit, rejectOutfit as rejectSelection, removeGarments } from './lib/mutations';
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import Collection from './pages/Collection';
import History from './pages/History';
import Settings from './pages/Settings';
import CreateOutfit from './pages/CreateOutfit';
import UploadModal from './components/UploadModal';
import GarmentEditor from './components/GarmentEditor';
import GarmentDetailSheet from './components/GarmentDetailSheet';
import Modal from './components/Modal';

const NAV = [{ id: 'home', label: 'Oggi', icon: HomeIcon }, { id: 'wardrobe', label: 'Guardaroba', icon: Shirt }, { id: 'create', label: 'Crea', icon: Plus }, { id: 'outfits', label: 'Salvati', icon: Layers3 }];
const SECONDARY = [{ id: 'settings', label: 'Profilo', icon: SettingsIcon }, { id: 'history', label: 'Cronologia', icon: HistoryIcon }];
function knownPage(hash: string) { return [...NAV, ...SECONDARY].some(n => n.id === hash) ? hash : 'home'; }
interface Confirm { title: string; message: string; label: string; action: () => Promise<void>; danger?: boolean; }

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [page, setPage] = useState(() => knownPage(location.hash.slice(1)));
  const [visited, setVisited] = useState(() => new Set(['home', knownPage(location.hash.slice(1))]));
  const [upload, setUpload] = useState(false), [uploadCategory, setUploadCategory] = useState<Category>();
  const [editing, setEditing] = useState<Garment | null>(null), [detail, setDetail] = useState<Garment | null>(null);
  const [toast, setToast] = useState(''), [loadError, setLoadError] = useState('');
  const [locked, setLocked] = useState<string[]>([]), [draft, setDraft] = useState<Outfit>();
  const [createEntryRevision, setCreateEntryRevision] = useState(0);
  const [today, setToday] = useState<TodaySession | null>(null);
  const [localDay, setLocalDay] = useState(() => new Date().toDateString());
  const [settingsSection, setSettingsSection] = useState<'statistics'>();
  const [settingsEntryRevision, setSettingsEntryRevision] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null), [confirmBusy, setConfirmBusy] = useState(false), [confirmError, setConfirmError] = useState('');
  const dataRef = useRef<AppData | null>(null), queue = useRef(Promise.resolve()), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page), scrollPositions = useRef<Record<string, number>>({}), returnPages = useRef<string[]>([]);
  const notify = (message: string) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4500); };
  useEffect(() => { let active = true; async function init() { try { let loaded = await loadData(); if (!loaded) { loaded = createDemoData(); await saveData(loaded); } if (active) { dataRef.current = loaded; setToday(createTodaySession(loaded)); setData(loaded); } } catch (error) { if (active) setLoadError(error instanceof Error ? error.message : 'Impossibile aprire il guardaroba.'); } } void init(); return () => { active = false; }; }, []);
  function changePage(target: string, pushReturn = true) {
    const next = knownPage(target), previous = pageRef.current;
    if (next === previous) return;
    scrollPositions.current[previous] = readPageScrollPosition().y;
    if (pushReturn && SECONDARY.some(n => n.id === next)) returnPages.current.push(previous);
    if (NAV.some(n => n.id === next)) returnPages.current = [];
    setUpload(false); setEditing(null); setDetail(null); setConfirm(null); setConfirmError('');
    pageRef.current = next; setPage(next); setVisited(pages => new Set([...pages, next]));
  }
  function navigate(target: string) { changePage(target); if (location.hash !== `#${knownPage(target)}`) location.hash = knownPage(target); }
  function openProfile(section?: 'statistics') {
    setSettingsSection(section);
    setSettingsEntryRevision(revision => revision + 1);
    scrollPositions.current.settings = 0;
    navigate('settings');
  }
  function back() { const target = returnPages.current.pop() ?? 'home'; changePage(target, false); location.hash = target; }
  useEffect(() => { const handle = () => changePage(location.hash.slice(1)); window.addEventListener('hashchange', handle); return () => window.removeEventListener('hashchange', handle); }, []);
  useEffect(() => { document.documentElement.dataset.reducedMotion = data?.preferences.reduceMotion ? 'true' : 'false'; }, [data?.preferences.reduceMotion]);
  useEffect(() => {
    document.title = `GET DRESSD — ${[...NAV, ...SECONDARY].find(n => n.id === page)?.label ?? 'Oggi'}`;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositions.current[page] ?? 0, behavior: 'instant' });
      const heading = document.querySelector<HTMLElement>(`[data-page="${page}"] h1`);
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [page, data !== null, settingsEntryRevision]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function updateDay() { setLocalDay(new Date().toDateString()); const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 20); clearTimeout(timer); timer = setTimeout(updateDay, Math.max(20, tomorrow.getTime() - Date.now())); }
    updateDay(); window.addEventListener('focus', updateDay); document.addEventListener('visibilitychange', updateDay);
    return () => { clearTimeout(timer); window.removeEventListener('focus', updateDay); document.removeEventListener('visibilitychange', updateDay); };
  }, []);
  useEffect(() => { const viewport = window.visualViewport; const update = () => document.documentElement.toggleAttribute('data-keyboard-open', Boolean(viewport && window.innerHeight - viewport.height > 140)); viewport?.addEventListener('resize', update); return () => { viewport?.removeEventListener('resize', update); document.documentElement.removeAttribute('data-keyboard-open'); }; }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const commit = (updater: (current: AppData) => AppData): Promise<void> => {
    const work = queue.current.then(async () => { if (!dataRef.current) throw new Error('Il guardaroba non è ancora pronto.'); const next = updater(dataRef.current); await saveData(next); dataRef.current = next; setData(next); });
    queue.current = work.catch(error => { notify(error instanceof Error ? error.message : 'Salvataggio non riuscito. Riprova.'); });
    return work;
  };
  const toggleFavorite = (garment: Garment) => { void commit(current => toggleGarmentFavorite(current, garment.id)).catch(() => {}); };
  const lockGarment = (garment: Garment) => { setLocked([garment.id]); setDraft(undefined); setCreateEntryRevision(revision => revision + 1); navigate('create'); };
  const variant = (source: Outfit | WearEvent) => {
    const now = new Date().toISOString();
    // An event has no context metadata; Create applies its current context to this entry.
    setDraft('occasion' in source ? { ...source, id: createId(), garmentIds: [...source.garmentIds], favorite: false, lastWorn: null, createdAt: now } : { id: createId(), name: source.name, garmentIds: [...source.garmentIds], occasion: '', season: currentSeason(), style: dataRef.current!.preferences.preferredStyle, rating: 0, favorite: false, createdAt: now, lastWorn: null, notes: '', explanation: '', score: 0 });
    setLocked([]); setCreateEntryRevision(revision => revision + 1); navigate('create');
  };
  const saveOutfit = async (outfit: Outfit): Promise<void> => { let saved = false; await commit(current => { const next = toggleSavedOutfit(current, outfit); saved = next.outfits.some(o => outfitSignature(o.garmentIds) === outfitSignature(outfit.garmentIds) && o.favorite); return next; }); notify(saved ? 'Outfit salvato.' : 'Outfit rimosso dai salvati.'); };
  const wearOutfit = async (outfit: Outfit): Promise<{ alreadyRecorded: boolean }> => { let alreadyRecorded = false; await commit(current => { const result = recordWornOutfit(current, outfit); alreadyRecorded = result.alreadyRecorded; return result.data; }); notify(alreadyRecorded ? 'Già registrato oggi' : 'Registrato per oggi'); return { alreadyRecorded }; };
  const rejectOutfit = async (outfit: Outfit): Promise<void> => { await commit(current => rejectSelection(current, outfit)); notify('Preferenza salvata.'); };
  const deleteGarments = (ids: string[]) => commit(current => removeGarments(current, ids));
  const requestDelete = (garment: Garment) => { setEditing(null); setDetail(null); setConfirmError(''); setConfirm({ title: `Eliminare ${garment.name}?`, message: 'Verranno eliminati anche gli outfit e le voci di cronologia che contengono questo capo. Le statistiche saranno ricalcolate.', label: 'Elimina capo', danger: true, action: async () => { await deleteGarments([garment.id]); notify('Capo eliminato.'); } }); };
  const openUpload = (category?: Category) => { setUploadCategory(category); setUpload(true); };
  if (loadError) return <div className="startup-state"><AlertCircle size={40}/><h1>Il guardaroba non si apre.</h1><p>{loadError}</p><button className="button button-primary" onClick={() => location.reload()}>Riprova</button></div>;
  if (!data || !today) return <div className="startup-state" role="status"><div className="startup-flatlay" aria-hidden="true"/><p>Apro il guardaroba…</p></div>;
  const common = { data, onUpload: openUpload, onEdit: setEditing, onFavorite: toggleFavorite, onLock: lockGarment, onDelete: requestDelete };
  const secondary = SECONDARY.some(n => n.id === page);
  return <div className={`app-shell${secondary ? ' is-secondary' : ''}${page === 'wardrobe' ? ' is-wardrobe' : ''}`}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Vai al contenuto</a>
    <aside className="sidebar"><a className="brand" href="#home" aria-label="GET DRESSD, Oggi"><div className="brand-mark" aria-hidden="true">GD</div><span className="brand-wordmark">GET<br/>DRESSD</span></a><div className="sidebar-label">Guardaroba personale</div><nav aria-label="Navigazione principale">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''} ${id === 'create' ? 'nav-create' : ''}`} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><p className="sidebar-label">Profilo</p>{SECONDARY.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => id === 'settings' ? openProfile() : navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19}/>{label}</button>)}</div></aside>
    <main className="main-content" id="main" tabIndex={-1}>
      <header className="topbar"><div className="breadcrumb"><a className="mobile-wordmark" href="#home">GET DRESSD</a><strong>{[...NAV, ...SECONDARY].find(n => n.id === page)?.label}</strong></div><div className="topbar-actions"><span className="today-date">{new Date(localDay).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</span><button className="icon-button" onClick={() => navigate('wardrobe')} aria-label="Cerca un capo"><Search size={18}/></button><button className="topbar-avatar" onClick={() => openProfile()} aria-label="Apri profilo">{data.preferences.name?.[0]?.toUpperCase() || 'G'}</button></div></header>
      <div data-page="home" hidden={page !== 'home'}><Home {...common} onNavigate={navigate} onWear={wearOutfit} session={today} setSession={setToday} localDay={localDay} active={page === 'home'}/></div>
      {visited.has('wardrobe') && <div data-page="wardrobe" hidden={page !== 'wardrobe'}><Wardrobe {...common} active={page === 'wardrobe'}/></div>}
      {visited.has('create') && <div data-page="create" hidden={page !== 'create'}><CreateOutfit data={data} initialLockedIds={locked} initialDraft={draft} initialEntryRevision={createEntryRevision} active={page === 'create'} onSave={saveOutfit} onWear={wearOutfit} onReject={rejectOutfit} onUpload={() => openUpload()} onDetails={setDetail} notify={notify}/></div>}
      {visited.has('outfits') && <div data-page="outfits" hidden={page !== 'outfits'}><Collection data={data} onSave={saveOutfit} onWear={wearOutfit} onCreate={() => navigate('create')} onVariant={variant} active={page === 'outfits'} onUpdate={async outfit => { await commit(current => ({ ...current, outfits: current.outfits.map(o => o.id === outfit.id ? outfit : o) })); notify('Outfit aggiornato.'); }} onDelete={outfit => setConfirm({ title: 'Eliminare questo outfit?', message: 'L’outfit verrà eliminato dalla raccolta. La cronologia rimarrà disponibile.', label: 'Elimina outfit', danger: true, action: async () => { await commit(current => ({ ...current, outfits: current.outfits.filter(o => o.id !== outfit.id) })); notify('Outfit eliminato.'); } })}/></div>}
      {page === 'history' && <div data-page="history"><History data={data} onEdit={setEditing} onCreate={() => navigate('home')} onVariant={variant} onBack={back} onOpenStatistics={() => openProfile('statistics')}/></div>}
      {page === 'settings' && <div data-page="settings"><Settings key={settingsEntryRevision} data={data} initialSection={settingsSection} onBack={back} onOpenToday={() => navigate('home')} onOpenHistory={() => navigate('history')} onPreferences={async (update: (p: Preferences) => Preferences) => { await commit(current => ({ ...current, preferences: update(current.preferences) })); }} notify={notify} onImport={imported => setConfirm({ title: 'Ripristinare il backup?', message: `Il backup contiene ${imported.garments.length} capi e ${imported.outfits.length} outfit. Sostituirà i dati presenti in questo browser. Esporta prima un backup se vuoi conservarli.`, label: 'Ripristina backup', action: async () => { await commit(() => imported); notify('Backup ripristinato.'); } })} onRemoveDemo={() => setConfirm({ title: 'Rimuovere i capi di esempio?', message: 'Verranno eliminati i capi di esempio, gli outfit e le voci di cronologia che li contengono. I tuoi altri capi rimarranno nel guardaroba.', label: 'Rimuovi capi di esempio', danger: true, action: async () => { await deleteGarments(dataRef.current!.garments.filter(g => g.demo).map(g => g.id)); notify('Capi di esempio rimossi.'); } })} onReset={() => setConfirm({ title: 'Svuotare il guardaroba?', message: 'Foto, capi, outfit e cronologia saranno eliminati da questo browser. L’operazione non può essere annullata. Esporta un backup se vuoi conservarli.', label: 'Svuota guardaroba', danger: true, action: async () => { await commit(() => createEmptyData()); notify('Guardaroba svuotato.'); } })}/></div>}
    </main>
    {!secondary && <nav className="mobile-nav" aria-label="Navigazione mobile">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`${page === id ? 'active' : ''} ${id === 'create' ? 'mobile-create' : ''}`} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><span className="mobile-nav-icon"><Icon size={22}/></span><span>{label}</span></button>)}</nav>}
    {detail && data.garments.some(g => g.id === detail.id) && <GarmentDetailSheet garment={data.garments.find(g => g.id === detail.id)!} onClose={() => setDetail(null)} onCreate={lockGarment} onEdit={g => { setDetail(null); setEditing(g); }} onFavorite={toggleFavorite} onDelete={requestDelete}/>}
    {upload && <UploadModal initialCategory={uploadCategory} onClose={() => setUpload(false)} onSave={async items => { await commit(current => ({ ...current, garments: [...items, ...current.garments] })); setUpload(false); notify(`${items.length} ${items.length === 1 ? 'capo aggiunto' : 'capi aggiunti'}.`); }}/>}
    {editing && <GarmentEditor garment={editing} onClose={() => setEditing(null)} onSave={async garment => { await commit(current => ({ ...current, garments: current.garments.map(g => g.id === garment.id ? garment : g) })); setEditing(null); notify('Capo aggiornato.'); }} onDelete={async () => requestDelete(editing)}/>}
    {confirm && <Modal title={confirm.title} onClose={() => !confirmBusy && setConfirm(null)}><p className="confirm-message">{confirm.message}</p>{confirmError && <p role="alert">{confirmError}</p>}<div className="modal-actions"><button className="button button-outline" disabled={confirmBusy} onClick={() => setConfirm(null)}>Annulla</button><button disabled={confirmBusy} className={`button ${confirm.danger ? 'button-danger' : 'button-primary'}`} onClick={async () => { setConfirmBusy(true); setConfirmError(''); try { await confirm.action(); setConfirm(null); } catch { setConfirmError('Salvataggio non riuscito. Riprova.'); } finally { setConfirmBusy(false); } }}>{confirmBusy ? 'Salvo…' : confirm.label}</button></div></Modal>}
    {toast && <div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Chiudi notifica" onClick={() => setToast('')}><X size={16}/></button></div>}
  </div>;
}
