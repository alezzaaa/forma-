import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { AppData } from '../types';
import { buildWardrobeStatistics, type StatisticsPeriod } from '../lib/statistics';
import GarmentArt from './GarmentArt';
import './statistics.css';

const countLabel = (count: number) => `${count} ${count === 1 ? 'utilizzo' : 'utilizzi'}`;

export default function StatisticsWidget({ data, onOpenHistory, onOpenToday }: { data: AppData; onOpenHistory: () => void; onOpenToday?: () => void }) {
  const [period, setPeriod] = useState<StatisticsPeriod>('30d');
  const [now, setNow] = useState(() => new Date());
  const headingId = useId();
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(midnight);
      const current = new Date(); setNow(current);
      const nextDay = new Date(current); nextDay.setHours(24, 0, 0, 0);
      midnight = setTimeout(refresh, Math.max(1, nextDay.getTime() - current.getTime()));
    }
    function onVisible() { if (document.visibilityState === 'visible') refresh(); }
    refresh(); document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(midnight); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const stats = useMemo(() => buildWardrobeStatistics(data, period, now), [data, period, now]);
  const summary = period === '30d' ? 'Negli ultimi 30 giorni' : 'Dall’inizio della cronologia';
  return <section className="statistics-widget" aria-label="Statistiche del guardaroba">
    <div className="statistics-period" role="group" aria-label="Periodo delle statistiche"><button type="button" aria-pressed={period === '30d'} onClick={() => { setNow(new Date()); setPeriod('30d'); }}>30 giorni</button><button type="button" aria-pressed={period === 'all'} onClick={() => { setNow(new Date()); setPeriod('all'); }}>Sempre</button></div>
    <p className="statistics-caption">{summary}</p>
    {data.garments.some(g => g.demo) && <p className="statistics-caption">I dati includono capi di esempio.</p>}
    {stats.mostWorn ? <article className="statistics-featured" aria-labelledby={headingId}><div className="statistics-featured-art" aria-hidden="true"><GarmentArt garment={stats.mostWorn.garment}/></div><div><h2 id={headingId}>Il più indossato</h2><h3>{stats.mostWorn.garment.name}</h3><p>{countLabel(stats.mostWorn.count)} nel periodo</p></div></article> : <div className="statistics-empty"><p>Nessun outfit registrato in questo periodo.</p>{onOpenToday && <button className="button button-outline" type="button" onClick={onOpenToday}>Vai a Oggi</button>}</div>}
    <dl className="statistics-summary"><div><dt>Rotazione</dt><dd>{stats.wornGarments} di {stats.totalGarments} · {stats.rotationPercent}%</dd></div><div><dt>Outfit indossati</dt><dd>{stats.outfitWears}</dd></div><div><dt>{period === 'all' ? 'Mai indossati' : 'Non indossati nel periodo'}</dt><dd>{stats.unwornGarments}</dd></div></dl>
    <section className="statistics-colors"><h2>Colori indossati</h2>{stats.palette.length ? <><div className="statistics-palette-strip" aria-hidden="true">{stats.palette.map(color => <span key={color.color} style={{ background: color.hex, flex: color.count }}/>)}</div><ul className="statistics-palette-list">{stats.palette.map(color => <li key={color.color}><span className="statistics-swatch" style={{ background: color.hex }} aria-hidden="true"/><span>{color.color}</span><strong>{color.percent}%</strong><span>{countLabel(color.count)}</span></li>)}</ul></> : <p className="muted">Registra un outfit per vedere i colori che indossi.</p>}</section>
    <details className="statistics-more"><summary>Vedi tutte le statistiche<ChevronDown size={18} aria-hidden="true"/></summary><div className="statistics-expanded">
      <p className="statistics-caption">Gli utilizzi derivano dagli eventi registrati nel periodo. Foto, colori, preferiti e inventario si riferiscono ai capi attuali; eventuali attività non registrate non sono conteggiate.</p>
      <dl className="statistics-summary"><div><dt>Giorni con outfit registrati</dt><dd>{stats.activeDays}</dd></div><div><dt>Utilizzi dei capi</dt><dd>{stats.garmentWears}</dd></div><div><dt>Capi preferiti attuali</dt><dd>{stats.favoriteGarments}</dd></div><div><dt>Outfit salvati attuali</dt><dd>{stats.favoriteOutfits}</dd></div><div><dt>Valutazione media</dt><dd>{stats.averageRating === null ? '—' : `${stats.averageRating.toLocaleString('it-IT')} / 5`}</dd></div></dl>
      <p className="statistics-caption">La media considera {stats.ratedOutfits} {stats.ratedOutfits === 1 ? 'outfit valutato' : 'outfit valutati'} nella raccolta attuale, anche fuori dal periodo selezionato.</p>
      {stats.favoriteGarment && <div className="statistics-detail"><h3>Capo preferito più indossato</h3><p>{stats.favoriteGarment.garment.name} · {countLabel(stats.favoriteGarment.count)} nel periodo</p></div>}
      {stats.leastWorn && <div className="statistics-detail"><h3>Da riscoprire</h3><p>{stats.leastWorn.garment.name} · {countLabel(stats.leastWorn.count)} nel periodo</p></div>}
      {stats.favoriteOutfit && <div className="statistics-detail"><h3>Outfit salvato in evidenza</h3><p>{stats.favoriteOutfit.outfit.name} · {countLabel(stats.favoriteOutfit.wears)} nel periodo</p><p className="statistics-caption">Tra gli outfit salvati, prima la valutazione più alta e poi gli utilizzi nel periodo.</p></div>}
      <div className="statistics-detail"><h3>Categorie nel guardaroba</h3><ul className="statistics-breakdown">{stats.categories.map(category => <li key={category.category}><span>{category.category}</span><span>{category.count} di {stats.totalGarments} · {category.percent}%</span></li>)}</ul><p className="statistics-caption">La quota è calcolata sul numero di capi presenti nel guardaroba.</p></div>
      {stats.styles.length > 0 && <div className="statistics-detail"><h3>Stili indossati</h3><ul className="statistics-breakdown">{stats.styles.map(style => <li key={style.style}><span>{style.style}</span><span>{style.percent}% · {countLabel(style.count)}</span></li>)}</ul></div>}
      <p className="statistics-caption">La rotazione divide i capi indossati per tutti i capi attuali. Colori e stili sono ponderati per gli utilizzi: un utilizzo per ogni capo di un evento. Le percentuali sono arrotondate.</p>
    </div></details>
    <button type="button" className="button button-ghost statistics-history-link" onClick={onOpenHistory}>Vedi cronologia<ArrowUpRight size={17} aria-hidden="true"/></button>
  </section>;
}
