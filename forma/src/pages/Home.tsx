import { ArrowUpRight, ArrowRight, Sparkles, Plus, Shirt, Layers3, CalendarDays, MoveUpRight, Sun, LockKeyhole } from 'lucide-react';
import { useMemo } from 'react';
import type { AppData, Garment, Outfit } from '../types';
import GarmentArt from '../components/GarmentArt';
import GarmentCard from '../components/GarmentCard';
import { generateOutfits } from '../lib/engine';
import { currentSeason } from '../lib/constants';
interface Props {
    data: AppData;
    onNavigate: (page: string) => void;
    onUpload: () => void;
    onEdit: (g: Garment) => void;
    onFavorite: (g: Garment) => void;
    onLock: (g: Garment) => void;
    onWear: (o: Outfit) => void;
}
export default function Home({ data, onNavigate, onUpload, onEdit, onFavorite, onLock, onWear }: Props) {
    const suggestion = useMemo(() => generateOutfits(data.garments, data.preferences, { occasion: 'Giornata casual', style: data.preferences.preferredStyle, temperature: 20, weather: 'Sereno', formality: 2, lockedIds: [], season: currentSeason() }, 1).outfits[0], [data.garments, data.preferences]);
    const heroItems = suggestion?.garmentIds.map(id => data.garments.find(g => g.id === id)).filter((g): g is Garment => !!g) ?? [];
    const worn = data.garments.filter(g => g.wearCount > 0).length;
    const unused = data.garments.length - worn;
    const latest = [...data.garments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
    return <div className="page home-page"><div className="page-heading"><div><p className="eyebrow">IL TUO SPAZIO, IL TUO STILE</p><h1>{data.preferences.name ? `Ciao, ${data.preferences.name}.` : 'Ogni giorno, più te.'}</h1><p>Tutto quello che ti serve è già nel tuo guardaroba.</p></div><button className="button button-outline" onClick={onUpload}><Plus size={17}/> Aggiungi un capo</button></div>
 <section className="hero"><div className="hero-copy"><div className="hero-season"><Sun size={15}/><span>{currentSeason()}, nuove possibilità</span></div><h2>Meno dubbi.<br /><em>Più stile.</em></h2><p>Il prossimo outfit che amerai?<br />Si nasconde tra i capi che hai già.</p><button className="button button-primary hero-cta" onClick={() => onNavigate('create')}><Sparkles size={18}/> Cosa mi metto oggi? <ArrowUpRight size={18}/></button><div className="hero-footnote"><span className="tiny-orbit"/>Il tuo guardaroba. Infinite combinazioni.</div></div>
 <div className="hero-board"><div className="board-topline"><span>THE EVERYDAY EDIT</span><span>N° 01</span></div>{heroItems.length > 0 ? <><div className="hero-flatlay">{heroItems.slice(0, 4).map((g, i) => <button key={g.id} className={`hero-garment hero-garment-${i}`} onClick={() => onEdit(g)} aria-label={`Scopri ${g.name}`}><GarmentArt garment={g}/></button>)}<div className="board-stamp"><span>LESS,</span><em>but better.</em></div></div><div className="board-bottomline"><div><span className="small-caps">SELEZIONATO PER TE</span><h3>Everyday, elevated.</h3></div><button className="board-arrow" onClick={() => onNavigate('create')} aria-label="Scopri gli outfit"><ArrowUpRight size={22}/></button></div></> : <div className="hero-empty"><Shirt size={55} strokeWidth={1}/><h3>Il tuo stile parte da qui.</h3><button className="button button-dark" onClick={onUpload}>Aggiungi il primo capo</button></div>}</div></section>
 <section className="stats-strip" aria-label="Il guardaroba in numeri">{[{ value: data.garments.length, label: 'Capi nel guardaroba', icon: Shirt }, { value: data.outfits.filter(o => o.favorite).length, label: 'Outfit preferiti', icon: Layers3 }, { value: data.history.length, label: 'Outfit indossati', icon: CalendarDays }, { value: `${data.garments.length ? Math.round(worn / data.garments.length * 100) : 0}%`, label: 'Guardaroba utilizzato', icon: MoveUpRight }].map(({ value, label, icon: Icon }) => <div className="stat" key={label}><div className="stat-value">{value}<Icon size={19}/></div><span>{label}</span></div>)}</section>
 <section><div className="section-heading"><div><p className="eyebrow">IL TUO GUARDAROBA</p><h2>Già tuoi. Nuove possibilità.</h2></div><button className="text-button" onClick={() => onNavigate('wardrobe')}>Vedi tutti <ArrowRight size={16}/></button></div><div className="garment-grid home-garments">{latest.map(g => <GarmentCard key={g.id} garment={g} onEdit={() => onEdit(g)} onFavorite={() => onFavorite(g)} onLock={() => onLock(g)}/>)}{!latest.length && <button className="empty-wardrobe-card" onClick={onUpload}><Plus size={30}/><h3>Inizia con i tuoi preferiti</h3><p>Carica una foto per ogni capo.</p></button>}</div></section>
 <section className="home-bottom"><div className="rediscover"><div className="insight-icon"><LockKeyhole size={25} strokeWidth={1.4}/></div><div><p className="eyebrow">PARTI DA QUELLO CHE AMI</p><h3>Un capo fisso. Un nuovo punto di vista.</h3><p>Blocca le tue sneakers preferite. Al resto pensiamo noi.</p></div><button className="circle-button" aria-label="Scegli un capo da bloccare" onClick={() => onNavigate('wardrobe')}><ArrowUpRight size={22}/></button></div><button className="small-insight" onClick={() => onNavigate('history')}><span className="eyebrow">DA RISCOPRIRE</span><div><strong>{unused}</strong><ArrowUpRight size={22}/></div><p>capi ancora da indossare.<br />Diamogli una nuova occasione.</p></button></section>
 {data.history.length > 0 && <section className="recent-line"><span className="status-dot"/><span>L’ultimo look: <strong>{data.history[0].name}</strong></span><button className="text-button" onClick={() => onNavigate('history')}>La tua cronologia <ArrowRight size={14}/></button></section>}
 <footer className="page-footer"><span>FORMA</span><span>Meno cose. Più possibilità.</span><span>Fatto per il tuo quotidiano.</span></footer></div>;
}
