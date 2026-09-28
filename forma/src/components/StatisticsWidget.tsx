import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, ChartNoAxesColumnIncreasing, Heart, Layers3, Sparkles, Star, Users } from 'lucide-react';
import type { AppData } from '../types';
import { buildWardrobeStatistics, type GarmentUsage, type StatisticsPeriod } from '../lib/statistics';
import GarmentArt from './GarmentArt';
import './statistics.css';

const countLabel = (count: number) => `${count} ${count === 1 ? 'volta' : 'volte'}`;

function GarmentInsight({ title, item, empty }: { title: string; item: GarmentUsage | null; empty: string }) {
  return <article className="statistics-garment-insight">
    <div className="statistics-mini-art" aria-hidden="true">{item ? <GarmentArt garment={item.garment} /> : <Layers3 size={27} strokeWidth={1.2} />}</div>
    <div><p className="statistics-kicker">{title}</p><h4>{item?.garment.name || empty}</h4><p>{item ? `${countLabel(item.count)} nel periodo` : 'Registra il tuo prossimo look.'}</p></div>
  </article>;
}

export default function StatisticsWidget({ data, onOpenHistory }: { data: AppData; onOpenHistory: () => void }) {
  const [period, setPeriod] = useState<StatisticsPeriod>('30d');
  const [now, setNow] = useState(() => new Date());
  const headingId = useId();
  // A Home-screen app can stay open overnight. Refresh its calendar window when
  // the day changes or when the user returns, without polling in the background.
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(midnight);
      const current = new Date();
      setNow(current);
      const nextDay = new Date(current);
      nextDay.setHours(24, 0, 0, 0);
      midnight = setTimeout(refresh, Math.max(1, nextDay.getTime() - current.getTime()));
    }
    function onVisible() { if (document.visibilityState === 'visible') refresh(); }
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(midnight); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const stats = useMemo(() => buildWardrobeStatistics(data, period, new Date()), [data, period, now]);
  const favorite = stats.favoriteGarment;
  const summary = period === '30d' ? 'Negli ultimi 30 giorni' : 'Dall’inizio della tua cronologia';
  return <section className="statistics-widget" aria-labelledby={headingId}>
    <div className="statistics-header">
      <div><p className="statistics-kicker"><ChartNoAxesColumnIncreasing size={15} /> IL TUO STILE, IN NUMERI</p><h2 id={headingId}>Statistiche</h2><p>Le abitudini che rendono tuo il guardaroba.</p></div>
      <div className="statistics-period" role="group" aria-label="Periodo delle statistiche">
        <button type="button" aria-pressed={period === '30d'} onClick={() => { setNow(new Date()); setPeriod('30d'); }}>30 giorni</button>
        <button type="button" aria-pressed={period === 'all'} onClick={() => { setNow(new Date()); setPeriod('all'); }}>Sempre</button>
      </div>
    </div>
    <div className="statistics-overview">
      <article className="statistics-favorite">
        <div className="statistics-favorite-copy"><span className="statistics-heart"><Heart size={16} fill="currentColor" /></span><p className="statistics-kicker">CAPO PREFERITO</p><h3>{favorite?.garment.name || 'Il prossimo colpo di fulmine.'}</h3><p>{favorite ? `${favorite.garment.category} · ${favorite.garment.color}` : 'Metti un cuore a un capo. Questo sarà il suo posto.'}</p>{favorite && <span className="statistics-favorite-count">{countLabel(favorite.count)} nel periodo</span>}</div>
        <div className={`statistics-favorite-art${favorite ? '' : ' is-empty'}`} aria-hidden="true">{favorite ? <GarmentArt garment={favorite.garment} /> : <Heart size={58} strokeWidth={.7} />}</div>
      </article>
      <div className="statistics-numbers">
        <article><span className="statistics-kicker">LOOK INDOSSATI</span><strong>{stats.outfitWears}<span className="statistics-number-star" aria-hidden="true">✳</span></strong><p>{summary}</p></article>
        <article><span className="statistics-kicker">GUARDAROBA IN ROTAZIONE</span><strong>{stats.rotationPercent}<span>%</span></strong><div className="statistics-track" aria-hidden="true"><span style={{ width: `${stats.rotationPercent}%` }} /></div><p>{stats.wornGarments} capi indossati su {stats.totalGarments}</p></article>
      </div>
    </div>
    <div className="statistics-garment-pair">
      <GarmentInsight title="IL PIÙ INDOSSATO" item={stats.mostWorn} empty="Ancora da scoprire" />
      <GarmentInsight title="DA RISCOPRIRE" item={stats.leastWorn} empty="Il tuo spazio è libero" />
    </div>
    <div className="statistics-detail-grid">
      <article className="statistics-detail"><div className="statistics-detail-title"><h3>La tua palette</h3><span>Colori indossati</span></div>
        {stats.palette.length ? <><div className="statistics-palette-strip" aria-hidden="true">{stats.palette.map(color => <span key={color.color} style={{ background: color.hex, flex: color.count }} />)}</div><ul className="statistics-palette-list">{stats.palette.map(color => <li key={color.color}><span className="statistics-swatch" style={{ background: color.hex }} aria-hidden="true" /><span>{color.color}</span><strong>{color.percent}%</strong><span>{countLabel(color.count)}</span></li>)}</ul></> : <p className="statistics-empty">La tua palette prende vita quando scegli “Indosso questo”.</p>}
        <p className="statistics-caption">Un utilizzo per capo, in base al suo colore principale.</p>
      </article>
      <article className="statistics-detail"><div className="statistics-detail-title"><h3>Dentro il guardaroba</h3><span>{stats.totalGarments} capi</span></div>
        {stats.categories.length ? <ul className="statistics-category-list">{stats.categories.map(category => <li key={category.category}><div><span>{category.category}</span><strong>{category.count}</strong></div><div className="statistics-track" aria-hidden="true"><span style={{ width: `${category.percent}%` }} /></div></li>)}</ul> : <p className="statistics-empty">Aggiungi i tuoi primi capi per vedere la tua collezione.</p>}
        <p className="statistics-caption">{stats.unwornGarments} {stats.unwornGarments === 1 ? 'capo da provare' : 'capi da provare'} nel periodo selezionato.</p>
      </article>
    </div>
    <article className="statistics-outfits"><div className="statistics-outfit-icon"><Star size={22} strokeWidth={1.3} /></div><div className="statistics-outfit-copy"><p className="statistics-kicker">OUTFIT DEL CUORE</p><h3>{stats.favoriteOutfit?.outfit.name || 'I tuoi preferiti, tutti qui.'}</h3><p>{stats.favoriteOutfit ? `${stats.favoriteOutfit.outfit.occasion} · ${countLabel(stats.favoriteOutfit.wears)} nel periodo` : 'Metti un cuore a un outfit per ritrovarlo qui.'}</p></div><div className="statistics-outfit-totals"><div><strong>{stats.favoriteOutfits}</strong><span>preferiti</span></div><div><strong>{stats.averageRating === null ? '—' : stats.averageRating.toLocaleString('it-IT')}<small>/5</small></strong><span>rating medio</span><span>{stats.ratedOutfits} {stats.ratedOutfits === 1 ? 'valutazione' : 'valutazioni'}</span></div></div></article>
    <div className="statistics-bottom"><p><Sparkles size={15} /> Preferiti e collezione attuali. Utilizzi nel periodo scelto.</p><button type="button" className="statistics-history-link" onClick={onOpenHistory}>Apri la cronologia <ArrowUpRight size={17} /></button></div>
    <aside className="statistics-friends"><span className="statistics-friends-icon"><Users size={21} strokeWidth={1.4} /></span><div><h3>Il tuo stile, presto a confronto.</h3><p>Un nuovo modo di scoprire cosa avete in comune.</p></div><span className="statistics-coming-soon">In arrivo</span></aside>
  </section>;
}
