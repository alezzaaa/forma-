import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays } from 'lucide-react';
import type { AppData, Garment, Outfit, WearEvent } from '../types';
import OutfitPreview, { OutfitArtwork } from '../components/OutfitPreview';
import Modal from '../components/Modal';
import './profile.css';

function dateLabel(date: Date, today: Date) {
    if (date.toDateString() === today.toDateString()) return 'Oggi';
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function History({ data, onCreate, onVariant, onBack, onOpenStatistics }: {
    data: AppData;
    onEdit?: (g: Garment) => void;
    onCreate: () => void;
    onVariant: (o: Outfit | WearEvent) => void;
    onBack?: () => void;
    onOpenStatistics: () => void;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [today, setToday] = useState(() => new Date());
    const selected = data.history.find(event => event.id === selectedId);
    useEffect(() => {
        let midnight: ReturnType<typeof setTimeout>;
        const refresh = () => { clearTimeout(midnight); const now = new Date(); setToday(now); const next = new Date(now); next.setHours(24, 0, 0, 0); midnight = setTimeout(refresh, Math.max(1, next.getTime() - now.getTime())); };
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        refresh(); document.addEventListener('visibilitychange', onVisible);
        return () => { clearTimeout(midnight); document.removeEventListener('visibilitychange', onVisible); };
    }, []);
    const groups = new Map<string, { label: string; events: WearEvent[] }>();
    for (const event of [...data.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
        const date = new Date(event.date), key = date.toDateString();
        const group = groups.get(key) ?? { label: dateLabel(date, today), events: [] };
        group.events.push(event); groups.set(key, group);
    }
    const available = selected?.garmentIds.map(id => data.garments.find(garment => garment.id === id)).filter((garment): garment is Garment => Boolean(garment)) ?? [];
    return <div className="page diary-page">{onBack && <button className="button button-ghost profile-back" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true"/>Indietro</button>}<div className="page-heading"><h1>Cronologia</h1></div>
        {groups.size ? [...groups].map(([key, group]) => <section className="diary-day" key={key}><h2>{group.label}</h2><div className="saved-grid">{group.events.map(event => <OutfitPreview key={event.id} name={event.name} garmentIds={event.garmentIds} garments={data.garments} onOpen={() => setSelectedId(event.id)}/>)}</div></section>) : <div className="empty-state"><CalendarDays size={42} strokeWidth={1.3} aria-hidden="true"/><h2>Qui trovi gli outfit che hai indossato.</h2><button className="button button-primary" type="button" onClick={onCreate}>Scegli un outfit</button></div>}
        <button type="button" className="button button-ghost diary-statistics" onClick={onOpenStatistics}>Vedi statistiche<ArrowUpRight size={18} aria-hidden="true"/></button>
        {selected && <Modal title={selected.name} onClose={() => setSelectedId(null)} className="saved-dialog"><div className="saved-dialog-scroll"><OutfitArtwork garmentIds={selected.garmentIds} garments={data.garments}/><p className="saved-context">Indossato {new Date(selected.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p><ul className="saved-piece-list">{available.map(garment => <li key={garment.id}><span className="color-dot" style={{ background: garment.colorHex }} aria-hidden="true"/><span>{garment.name}</span><span>{garment.category} · {garment.color}</span></li>)}</ul>{available.length < selected.garmentIds.length && <p className="muted">Alcuni capi non sono più disponibili nel guardaroba.</p>}</div><div className="saved-dialog-footer"><button type="button" className="button button-primary" disabled={available.length === 0} onClick={() => { setSelectedId(null); onVariant(selected); }}>Crea una variante</button></div></Modal>}
    </div>;
}
