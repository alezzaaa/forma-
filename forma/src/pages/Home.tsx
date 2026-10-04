import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import type { AppData, Category, Garment, Outfit } from '../types';
import { categorySlot } from '../lib/constants';
import { outfitSignature, outfitWarnings } from '../lib/engine';
import { advanceToday, createTodaySession, wardrobeStructureKey } from '../lib/todaySession';
import type { TodaySession } from '../lib/todaySession';
import OutfitCard from '../components/OutfitCard';
import GarmentCard from '../components/GarmentCard';
import GarmentDetailSheet from '../components/GarmentDetailSheet';
import GarmentPickerSheet from '../components/GarmentPickerSheet';
import ReplacementSheet from '../components/ReplacementSheet';

interface Props {
  data: AppData;
  onNavigate: (page: string) => void;
  onUpload: (category?: Category) => void;
  onEdit: (garment: Garment) => void;
  onFavorite: (garment: Garment) => void;
  onDelete?: (garment: Garment) => void;
  onLock: (garment: Garment) => void;
  onWear: (outfit: Outfit) => Promise<{ alreadyRecorded: boolean }>;
  session?: TodaySession;
  setSession?: Dispatch<SetStateAction<TodaySession | null>>;
  active?: boolean;
  localDay?: string;
}

export default function Home({ data, onNavigate, onUpload, onEdit, onFavorite, onDelete, onLock, onWear, session: external, setSession: setExternal, active = true, localDay = new Date().toDateString() }: Props) {
  const [local, setLocal] = useState(() => createTodaySession(data));
  const session = external ?? local;
  const setSession = (next: TodaySession) => { if (setExternal) setExternal(next); else setLocal(next); };
  const [replacement, setReplacement] = useState<string | null>(null);
  const [detail, setDetail] = useState<Garment | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const sourceKey = wardrobeStructureKey(data);
  const invalid = sourceKey !== session.sourceKey;
  useEffect(() => { if (invalid) { setSession(createTodaySession(data)); setReplacement(null); } }, [sourceKey]);
  useEffect(() => { if (!active) { setReplacement(null); setDetail(null); setPicker(false); } }, [active]);
  const suggestion = session.outfits[session.index];
  const signature = suggestion ? outfitSignature(suggestion.garmentIds) : '';
  const wornToday = data.history.some(event => new Date(event.date).toDateString() === localDay && outfitSignature(event.garmentIds) === signature);
  const latest = [...data.garments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const rediscover = [...data.garments].filter(g => g.wearCount <= 1).sort((a, b) => a.wearCount - b.wearCount).slice(0, 4);
  const missing = ([['top', 'un capo superiore', 'T-shirt'], ['bottom', 'un pantalone', 'Pantaloni'], ['shoes', 'le scarpe', 'Sneakers']] as const).filter(([slot]) => !data.garments.some(g => categorySlot(g.category) === slot));
  const warnings = suggestion && !invalid ? outfitWarnings([suggestion], data.garments, data.preferences, session.options) : [];
  function next() { if (!busy && !invalid) setSession(advanceToday(data, session)); }
  function previous() { if (!busy && session.index > 0) setSession({ ...session, index: session.index - 1, changed: true, exhausted: false }); }
  function toggleLock(id: string) {
    const lockedIds = session.options.lockedIds.includes(id) ? session.options.lockedIds.filter(value => value !== id) : [...session.options.lockedIds, id];
    const outfits = session.outfits.filter(outfit => lockedIds.every(value => outfit.garmentIds.includes(value)));
    setSession({ ...session, options: { ...session.options, lockedIds }, outfits, index: Math.max(0, outfits.findIndex(o => o.id === suggestion.id)), exhausted: false });
  }
  return <div className="page home-page">
    <h1 className="sr-only" tabIndex={-1}>Oggi</h1>
    <section className="today-look" aria-label="Outfit per oggi" onTouchStart={event => { const t = event.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={event => { const start = touch.current; touch.current = null; if (!start || busy) return; const t = event.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else previous(); } }}>
      {suggestion ? <>
        <OutfitCard outfit={suggestion} garments={data.garments} eyebrow="Per oggi" showOccasion={false} onWear={onWear} wearLabel={wornToday ? 'Registrato per oggi' : undefined} onHistory={() => onNavigate('history')} onBusyChange={setBusy} disabled={invalid} lockedIds={session.options.lockedIds} onReplace={id => setReplacement(id)} />
        {warnings.length > 0 && <div className="today-warnings" role="status">{warnings.map(w => <p key={w}>{w}</p>)}</div>}
        <div className="today-actions"><button className="button button-outline" disabled={busy || invalid} onClick={next}>Cambia</button><button className="text-button" disabled={busy} onClick={() => setPicker(true)}>Parti da un capo <ArrowRight size={16}/></button></div>
        {session.changed && session.outfits.length > 1 && <div className="today-pagination"><button className="button button-ghost" disabled={busy || session.index === 0} onClick={previous}>Precedente</button><span role="status" aria-live="polite">{session.index + 1} di {session.outfits.length}</span><button className="button button-ghost" disabled={busy} onClick={next}>Successivo</button></div>}
        {session.exhausted && <p className="today-limit" role="status">Hai visto tutte le proposte disponibili.{session.outfits.length === 1 && ' Aggiungi capi o modifica le preferenze per altre combinazioni.'}</p>}
      </> : <div className="empty-state">
        <h2>{!data.garments.length ? 'Aggiungi i tuoi primi capi' : missing.length ? `Mancano ${missing.map(([, label]) => label).join(' e ')} per completare il look.` : 'Nessun outfit con queste preferenze.'}</h2>
        {!data.garments.length && <p>Per un outfit completo servono un capo superiore, un pantalone e un paio di scarpe.</p>}
        {!missing.length && data.garments.length > 0 && <button className="button button-primary" onClick={() => onNavigate('create')}>Modifica preferenze</button>}
        <button className={`button ${missing.length ? 'button-primary' : 'button-outline'}`} onClick={() => onUpload(missing[0]?.[2])}>Aggiungi capo</button>
      </div>}
    </section>
    {data.garments.some(g => g.demo) && <p className="today-demo">Stai esplorando capi di esempio. <button className="text-button" onClick={() => onUpload()}>Aggiungi i tuoi capi</button></p>}
    <section className="today-secondary"><div className="section-heading"><h2>Continua il guardaroba</h2><button className="text-button" onClick={() => onNavigate('wardrobe')}>Guardaroba <ArrowRight size={16}/></button></div><div className="garment-grid home-garments">{latest.map(g => <GarmentCard key={g.id} garment={g} onOpen={() => setDetail(g)}/>)}</div><button className="button button-outline" onClick={() => onUpload()}><Plus size={18}/>Aggiungi capo</button></section>
    {rediscover.length >= 2 && <section className="today-secondary"><div className="section-heading"><h2>Da riscoprire</h2></div><div className="garment-grid home-garments">{rediscover.map(g => <GarmentCard key={g.id} garment={g} onOpen={() => setDetail(g)}/>)}</div></section>}
    {active && picker && <GarmentPickerSheet garments={data.garments} onClose={() => setPicker(false)} onConfirm={ids => { setPicker(false); const garment = data.garments.find(g => g.id === ids[0]); if (garment) onLock(garment); }}/ >}
    {active && replacement && suggestion && !invalid && <ReplacementSheet outfit={suggestion} garmentId={replacement} garments={data.garments} preferences={data.preferences} options={session.options} excludedSignatures={session.outfits.filter(o => o.id !== suggestion.id).map(o => outfitSignature(o.garmentIds))} onClose={() => setReplacement(null)} onToggleLock={toggleLock} onDetails={g => { setReplacement(null); setDetail(g); }} onUpload={() => { setReplacement(null); onUpload(); }} onPreferences={() => { setReplacement(null); onNavigate('create'); }} onApply={outfit => { setSession({ ...session, outfits: session.outfits.map(o => o.id === suggestion.id ? outfit : o), seen: [...session.seen, outfitSignature(outfit.garmentIds)] }); setReplacement(null); }}/ >}
    {active && detail && data.garments.some(g => g.id === detail.id) && <GarmentDetailSheet garment={data.garments.find(g => g.id === detail.id)!} onClose={() => setDetail(null)} onCreate={onLock} onEdit={onEdit} onFavorite={onFavorite} onDelete={onDelete}/ >}
  </div>;
}
