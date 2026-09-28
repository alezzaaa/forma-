import { useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, Shirt, Layers3, Sparkles, History as HistoryIcon, Settings as SettingsIcon, ArrowUpRight, Search, UserRound, X, Check, ArrowRight, AlertCircle } from 'lucide-react';
import type { AppData, Garment, Outfit, Preferences } from './types';
import { loadData, saveData } from './lib/storage';
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
import Modal from './components/Modal';
const NAV = [{ id: 'home', label: 'Home', icon: HomeIcon }, { id: 'wardrobe', label: 'Guardaroba', icon: Shirt }, { id: 'outfits', label: 'I tuoi outfit', icon: Layers3 }, { id: 'create', label: 'Crea outfit', icon: Sparkles }, { id: 'history', label: 'Cronologia', icon: HistoryIcon }];
const MOBILE_NAV = [NAV[0], NAV[1], { ...NAV[3], label: 'Crea' }, { ...NAV[2], label: 'Outfit' }, { id: 'settings', label: 'Tu', icon: UserRound }];
interface Confirm {
    title: string;
    message: string;
    label: string;
    action: () => Promise<void>;
    danger?: boolean;
}
export default function App() {
    const [data, setData] = useState<AppData | null>(null), [page, setPage] = useState(() => location.hash.slice(1) || 'home'), [upload, setUpload] = useState(false), [editing, setEditing] = useState<Garment | null>(null), [toast, setToast] = useState(''), [loadError, setLoadError] = useState(''), [locked, setLocked] = useState<string[]>([]), [confirm, setConfirm] = useState<Confirm | null>(null), [confirmBusy, setConfirmBusy] = useState(false);
    const dataRef = useRef<AppData | null>(null), queue = useRef(Promise.resolve()), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notify = (message: string) => { setToast(message); if (toastTimer.current)
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4500); };
    useEffect(() => { let active = true; async function init() { try {
        let d = await loadData();
        if (!d) {
            d = createDemoData();
            await saveData(d);
        }
        if (active) {
            dataRef.current = d;
            setData(d);
        }
    }
    catch (err) {
        if (active)
            setLoadError(err instanceof Error ? err.message : 'Impossibile aprire il guardaroba.');
    } } void init(); return () => { active = false; }; }, []);
    useEffect(() => { const handle = () => setPage(location.hash.slice(1) || 'home'); window.addEventListener('hashchange', handle); return () => window.removeEventListener('hashchange', handle); }, []);
    useEffect(() => { document.documentElement.dataset.reducedMotion = data?.preferences.reduceMotion ? 'true' : 'false'; }, [data?.preferences.reduceMotion]);
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = `GET DRESSD — ${[...NAV, { id: 'settings', label: 'Impostazioni' }].find(n => n.id === page)?.label || 'Home'}`; }, [page]);
    const navigate = (target: string) => { if (target !== 'create')
        setLocked([]); location.hash = target; setPage(target); };
    const commit = (updater: (d: AppData) => AppData): Promise<void> => { const work = queue.current.then(async () => { if (!dataRef.current)
        throw new Error('Il guardaroba non è ancora pronto.'); const next = updater(dataRef.current); await saveData(next); dataRef.current = next; setData(next); }); queue.current = work.catch(err => { notify(err instanceof Error ? err.message : 'Salvataggio non riuscito. Riprova.'); }); return work; };
    const safe = (promise: Promise<unknown>) => { void promise.catch(() => { }); };
    const toggleFavorite = (g: Garment) => safe(commit(d => toggleGarmentFavorite(d, g.id)));
    const lockGarment = (g: Garment) => { setLocked([g.id]); navigate('create'); };
    const saveOutfit = (outfit: Outfit) => safe(commit(d => toggleSavedOutfit(d, outfit)).then(() => notify('La tua selezione è stata aggiornata.')));
    const wearOutfit = (outfit: Outfit) => { let duplicate = false; safe(commit(d => { const result = recordWornOutfit(d, outfit); duplicate = result.alreadyRecorded; return result.data; }).then(() => notify(duplicate ? 'Hai già registrato questo outfit oggi.' : 'Ottima scelta. Outfit registrato per oggi.'))); };
    const rejectOutfit = (outfit: Outfit) => safe(commit(d => rejectSelection(d, outfit)).then(() => notify('Ricevuto. Daremo spazio ad altre combinazioni.')));
    const deleteGarments = (ids: string[]) => commit(d => removeGarments(d, ids));
    const requestDelete = (g: Garment) => { setEditing(null); setConfirm({ title: `Eliminare ${g.name}?`, message: 'Saranno eliminati anche gli outfit e le voci di cronologia che contengono questo capo. Le statistiche verranno ricalcolate.', label: 'Elimina capo', danger: true, action: async () => { await deleteGarments([g.id]); notify('Capo eliminato.'); } }); };
    if (loadError)
        return <div className="startup-state"><AlertCircle size={40}/><h1>Il guardaroba non si apre.</h1><p>{loadError}</p><p>Apri l’app in un browser che consenta il salvataggio locale, oppure avviala con il server incluso.</p><button className="button button-primary" onClick={() => location.reload()}>Riprova</button></div>;
    if (!data)
        return <div className="startup-state"><div className="brand-mark">GD</div><p>GET DRESSD. Il tuo stile, ogni giorno.</p><div className="loader-line"/></div>;
    const common = { data, onUpload: () => setUpload(true), onEdit: setEditing, onFavorite: toggleFavorite, onLock: lockGarment };
    const route = NAV.some(n => n.id === page) || page === 'settings' ? page : 'home';
    return <div className="app-shell"><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Vai al contenuto</a><aside className="sidebar"><a className="brand" href="#home" aria-label="GET DRESSD, home"><div className="brand-mark" aria-hidden="true">GD</div><span className="brand-wordmark">GET<br />DRESSD</span></a><div className="sidebar-label">IL TUO QUOTIDIANO</div><nav aria-label="Navigazione principale">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${route === id ? 'active' : ''} ${id === 'create' ? 'nav-create' : ''}`} onClick={() => navigate(id)} aria-current={route === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.7}/><span>{label}</span>{id === 'wardrobe' && <span className="nav-count">{data.garments.length}</span>}{id === 'create' && <span className="nav-spark">✦</span>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="note-star">✳</span><h3>Meno acquisti.<br />Più abbinamenti.</h3><p>Riscopri il potenziale<br />di quello che hai già.</p><button onClick={() => navigate('create')}>Lasciati ispirare <ArrowUpRight size={15}/></button></div><button className={`profile-button ${route === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><span className="profile-avatar">{data.preferences.name?.[0]?.toUpperCase() || 'G'}</span><span><strong>{data.preferences.name || 'Il tuo spazio'}</strong><small>Guardaroba personale</small></span><SettingsIcon size={17}/></button></div></aside>
 <main className="main-content" id="main" tabIndex={-1}><header className="topbar"><div className="breadcrumb"><a className="mobile-wordmark" href="#home" aria-label="GET DRESSD, home">GET DRESSD<span>✳</span></a><span>Il tuo spazio</span><span>/</span><strong>{route === 'settings' ? 'Impostazioni' : NAV.find(n => n.id === route)?.label}</strong></div><div className="topbar-actions"><span className="today-date">{new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="topbar-divider"/><button className="icon-button" onClick={() => navigate('wardrobe')} aria-label="Cerca un capo"><Search size={18}/></button><button className="topbar-avatar" onClick={() => navigate('settings')} aria-label="Il tuo profilo">{data.preferences.name?.[0]?.toUpperCase() || 'G'}</button></div></header>
 {route === 'home' && <Home {...common} onNavigate={navigate} onWear={wearOutfit}/>}{route === 'wardrobe' && <Wardrobe {...common}/>}{route === 'create' && <CreateOutfit data={data} initialLockedIds={locked} onSave={saveOutfit} onWear={wearOutfit} onReject={rejectOutfit} notify={notify}/>}{route === 'outfits' && <Collection data={data} onSave={saveOutfit} onWear={wearOutfit} onCreate={() => navigate('create')} onUpdate={async (o) => { await commit(d => ({ ...d, outfits: d.outfits.map(v => v.id === o.id ? o : v) })); notify('Outfit aggiornato.'); }} onDelete={o => setConfirm({ title: 'Eliminare questo outfit?', message: 'L’outfit verrà rimosso dalla raccolta. La cronologia di utilizzo rimarrà disponibile.', label: 'Elimina outfit', danger: true, action: async () => { await commit(d => ({ ...d, outfits: d.outfits.filter(v => v.id !== o.id) })); notify('Outfit eliminato.'); } })}/>}{route === 'history' && <History data={data} onEdit={setEditing} onCreate={() => navigate('create')}/>}{route === 'settings' && <Settings data={data} onOpenHistory={() => navigate('history')} onPreferences={async (update: (p: Preferences) => Preferences) => { await commit(d => ({ ...d, preferences: update(d.preferences) })); }} notify={notify} onImport={imported => setConfirm({ title: 'Ripristinare il backup?', message: `Il backup contiene ${imported.garments.length} capi e ${imported.outfits.length} outfit. Sostituirà i dati presenti in questo browser. Esporta prima un backup se vuoi conservarli.`, label: 'Ripristina backup', action: async () => { await commit(() => imported); notify('Backup ripristinato.'); } })} onRemoveDemo={() => setConfirm({ title: 'Il guardaroba, solo tuo.', message: 'Rimuoviamo i capi dimostrativi e gli outfit e le voci di cronologia che li contengono. Le tue foto restano al loro posto.', label: 'Rimuovi demo', action: async () => { await deleteGarments(dataRef.current!.garments.filter(g => g.demo).map(g => g.id)); notify('Pronto per il tuo stile.'); } })} onReset={() => setConfirm({ title: 'Svuotare il guardaroba?', message: 'Foto, outfit e cronologia saranno eliminati da questo browser. L’operazione non può essere annullata. Esporta un backup se vuoi conservarli.', label: 'Svuota tutto', danger: true, action: async () => { await commit(() => createEmptyData()); notify('Il tuo spazio è pronto per un nuovo inizio.'); } })}/>}</main>
 <nav className="mobile-nav" aria-label="Navigazione mobile">{MOBILE_NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`${route === id || (route === 'history' && id === 'settings') ? 'active' : ''} ${id === 'create' ? 'mobile-create' : ''}`} onClick={() => navigate(id)} aria-current={route === id ? 'page' : undefined} aria-label={id === 'settings' ? 'Tu, statistiche e impostazioni' : label}><span className="mobile-nav-icon"><Icon size={22} strokeWidth={1.8}/></span><span>{label}</span></button>)}</nav>
 {upload && <UploadModal onClose={() => setUpload(false)} onSave={async (items) => { await commit(d => ({ ...d, garments: [...items, ...d.garments] })); setUpload(false); notify(`${items.length} ${items.length === 1 ? 'capo aggiunto' : 'capi aggiunti'} al tuo guardaroba.`); }}/>}{editing && <GarmentEditor garment={editing} onClose={() => setEditing(null)} onSave={async (garment) => { await commit(d => ({ ...d, garments: d.garments.map(g => g.id === garment.id ? garment : g) })); setEditing(null); notify('Capo aggiornato.'); }} onDelete={async () => requestDelete(editing)}/>}
 {confirm && <Modal title={confirm.title} onClose={() => !confirmBusy && setConfirm(null)}><p className="confirm-message">{confirm.message}</p><div className="modal-actions"><button className="button button-outline" disabled={confirmBusy} onClick={() => setConfirm(null)}>Annulla</button><button disabled={confirmBusy} className={`button ${confirm.danger ? 'button-danger' : 'button-primary'}`} onClick={async () => { setConfirmBusy(true); try {
        await confirm.action();
        setConfirm(null);
    }
    catch { }
    finally {
        setConfirmBusy(false);
    } }}>{confirmBusy ? 'Un momento…' : confirm.label}<ArrowRight size={16}/></button></div></Modal>}
 {toast && <div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Chiudi notifica" onClick={() => setToast('')}><X size={16}/></button></div>}
 </div>;
}
