import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Cloud, CloudRain, Info, LockKeyhole, Search, Sparkles, Sun, Thermometer, UnlockKeyhole, WandSparkles, X } from 'lucide-react';
import type { AppData, GenerateOptions, Outfit, Preferences, Season, Style } from '../types';
import { currentSeason, OCCASIONS, SEASONS, STYLES } from '../lib/constants';
import { generateOutfits, outfitSignature, outfitWarnings, replaceGarment } from '../lib/engine';
import GarmentArt from '../components/GarmentArt';
import OutfitCard from '../components/OutfitCard';
import './create.css';

interface CreateOutfitProps {
  data: AppData;
  initialLockedIds: string[];
  onSave: (outfit: Outfit) => void;
  onWear: (outfit: Outfit) => void;
  onReject: (outfit: Outfit) => void;
  notify: (message: string) => void;
}

export default function CreateOutfit({ data, initialLockedIds, onSave, onWear, onReject, notify }: CreateOutfitProps) {
  const [options, setOptions] = useState<GenerateOptions>(() => ({ occasion: 'Giornata casual', style: data.preferences.preferredStyle, temperature: 20, weather: 'Sereno', formality: 2, lockedIds: initialLockedIds.filter(id => data.garments.some(g => g.id === id)), season: currentSeason() }));
  const [result, setResult] = useState(() => generateOutfits(data.garments, data.preferences, options, 3));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lockPicker, setLockPicker] = useState(false);
  const [query, setQuery] = useState('');
  const generationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const appliedRevision = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const pickerOpenerRef = useRef<HTMLElement | null>(null);
  const initialLockKey = initialLockedIds.join('|');
  const previousLockKey = useRef(initialLockKey);
  const wardrobeKey = JSON.stringify(data.garments.map(item => [item.id, item.name, item.category, item.color, item.colorHex, item.style, item.seasons, item.formality, item.pattern, item.favorite, item.wearCount, item.lastWorn]));
  const previousWardrobeKey = useRef(wardrobeKey);
  const sourceKey = `${initialLockKey}::${wardrobeKey}`;
  const latestSourceKey = useRef(sourceKey);
  latestSourceKey.current = sourceKey;
  const sourcesChanged = previousWardrobeKey.current !== wardrobeKey || previousLockKey.current !== initialLockKey;
  const resultsStale = dirty || sourcesChanged;

  function invalidateResults() {
    revision.current += 1;
    if (generationTimer.current !== null) { clearTimeout(generationTimer.current); generationTimer.current = null; }
    setBusy(false);
    setDirty(true);
  }

  function canUseResults() {
    if (busy || resultsStale || appliedRevision.current !== revision.current || latestSourceKey.current !== sourceKey) {
      notify('Rigenera per applicare le preferenze e i capi bloccati prima di scegliere un outfit.');
      return false;
    }
    return true;
  }

  useEffect(() => () => { if (generationTimer.current) clearTimeout(generationTimer.current); }, []);
  useEffect(() => {
    if (!lockPicker) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') { setLockPicker(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]') ?? []);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', handleKeys);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener('keydown', handleKeys); pickerOpenerRef.current?.focus(); };
  }, [lockPicker]);
  useEffect(() => {
    if (previousLockKey.current === initialLockKey) return;
    previousLockKey.current = initialLockKey;
    setOptions(previous => ({ ...previous, lockedIds: initialLockedIds.filter(id => data.garments.some(g => g.id === id)) }));
    invalidateResults();
  }, [initialLockKey, initialLockedIds, data.garments]);
  useEffect(() => {
    if (previousWardrobeKey.current === wardrobeKey) return;
    previousWardrobeKey.current = wardrobeKey;
    const availableIds = new Set(data.garments.map(item => item.id));
    setOptions(previous => ({ ...previous, lockedIds: previous.lockedIds.filter(id => availableIds.has(id)) }));
    setResult(previous => ({ ...previous, outfits: previous.outfits.filter(outfit => outfit.garmentIds.every(id => availableIds.has(id))) }));
    invalidateResults();
  }, [wardrobeKey, data.garments]);

  function updateOption<K extends keyof GenerateOptions>(key: K, value: GenerateOptions[K]) {
    setOptions(previous => ({ ...previous, [key]: value }));
    invalidateResults();
  }

  function toggleLock(id: string) {
    updateOption('lockedIds', options.lockedIds.includes(id) ? options.lockedIds.filter(item => item !== id) : [...options.lockedIds, id]);
  }

  function generate() {
    if (busy || generationTimer.current !== null) return;
    const requestedRevision = revision.current;
    const requestedSource = sourceKey;
    setBusy(true);
    generationTimer.current = setTimeout(() => {
      generationTimer.current = null;
      if (requestedRevision !== revision.current || requestedSource !== latestSourceKey.current) { setBusy(false); setDirty(true); return; }
      const next = generateOutfits(data.garments, data.preferences, options, 3);
      if (!dirty && result.outfits.length) {
        const existing = new Set(result.outfits.map(item => outfitSignature(item.garmentIds)));
        const candidates = generateOutfits(data.garments, data.preferences, { ...options, avoidIds: result.outfits[0].garmentIds }, 20).outfits;
        const novel = candidates.filter(item => !existing.has(outfitSignature(item.garmentIds))).slice(0, 3);
        next.outfits = [...novel, ...next.outfits.filter(item => !novel.some(other => outfitSignature(other.garmentIds) === outfitSignature(item.garmentIds)))].slice(0, 3);
        if (!novel.length) notify('Hai già visto gli abbinamenti disponibili. Aggiungi capi o modifica le preferenze per nuove idee.');
      }
      if (next.outfits.length) next.warnings = [...next.warnings.filter(warning => warning.startsWith('Con questi capi e blocchi')), ...outfitWarnings(next.outfits, data.garments, data.preferences, options)];
      setResult(next);
      appliedRevision.current = requestedRevision;
      setDirty(false);
      setBusy(false);
    }, data.preferences.reduceMotion ? 0 : 260);
  }

  function regenerateOne(outfit: Outfit, preferences: Preferences = data.preferences, rejected = false) {
    if (!canUseResults()) return;
    const existing = new Set(result.outfits.map(item => outfitSignature(item.garmentIds)));
    const replacement = generateOutfits(data.garments, preferences, { ...options, avoidIds: outfit.garmentIds }, 20).outfits.find(item => !existing.has(outfitSignature(item.garmentIds)) && !preferences.dislikedSignatures.includes(outfitSignature(item.garmentIds)));
    if (!replacement) {
      if (rejected) setResult(previous => {
        const outfits = previous.outfits.filter(item => item.id !== outfit.id);
        return { outfits, warnings: outfitWarnings(outfits, data.garments, preferences, options) };
      });
      notify(rejected ? 'Preferenza salvata. Non ci sono altre proposte compatibili: modifica i filtri per nuove idee.' : 'Hai già visto tutti gli abbinamenti disponibili con questi filtri. Prova a sbloccare un capo o cambiare stile.');
      return;
    }
    const nextOutfit = replacement;
    setResult(previous => {
      const outfits = previous.outfits.map(item => item.id === outfit.id ? nextOutfit : item);
      return { outfits, warnings: outfitWarnings(outfits, data.garments, preferences, options) };
    });
  }

  function replaceOne(outfit: Outfit, garmentId: string) {
    if (!canUseResults()) return;
    const existing = new Set(result.outfits.filter(item => item.id !== outfit.id).map(item => outfitSignature(item.garmentIds)));
    const protectedIds = new Set([...outfit.garmentIds, ...options.lockedIds]);
    let pool = data.garments;
    let next: Outfit | null = null;
    while (pool.length) {
      const candidate = replaceGarment(outfit, garmentId, pool, data.preferences, options);
      if (!candidate) break;
      const signature = outfitSignature(candidate.garmentIds);
      if (!existing.has(signature) && !data.preferences.dislikedSignatures.includes(signature)) { next = candidate; break; }
      // Retry without only this new candidate; keep the current outfit and every lock intact.
      const rejectedCandidateId = candidate.garmentIds.find(id => !protectedIds.has(id));
      if (!rejectedCandidateId) break;
      pool = pool.filter(item => item.id !== rejectedCandidateId);
    }
    if (!next) { notify('Non ci sono altri capi compatibili per una proposta diversa. Prova a cambiare i filtri.'); return; }
    const replacement = { ...next, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setResult(previous => {
      const outfits = previous.outfits.map(item => item.id === outfit.id ? replacement : item);
      return { outfits, warnings: outfitWarnings(outfits, data.garments, data.preferences, options) };
    });
  }

  function rejectOne(outfit: Outfit) {
    if (!canUseResults()) return;
    const signature = outfitSignature(outfit.garmentIds);
    const preferences: Preferences = { ...data.preferences, dislikedSignatures: [...new Set([...data.preferences.dislikedSignatures, signature])], likedSignatures: data.preferences.likedSignatures.filter(item => item !== signature) };
    onReject(outfit);
    regenerateOne(outfit, preferences, true);
  }

  const filteredGarments = data.garments.filter(item => `${item.name} ${item.category} ${item.color}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')));
  const lockedGarments = options.lockedIds.map(id => data.garments.find(item => item.id === id)).filter(Boolean);
  const savedSignatures = new Set(data.outfits.filter(item => item.favorite).map(item => outfitSignature(item.garmentIds)));

  return <div className="page create-page">
    <div className="page-heading create-page-heading"><div><span className="eyebrow">IL TUO STYLIST QUOTIDIANO</span><h1>Un buon outfit.<br className="create-heading-break" /> Una cosa in meno.</h1><p>Dimmi che giornata hai in mente. Al resto pensiamo insieme.</p></div><div className="create-heading-symbol" aria-hidden="true"><WandSparkles size={29} strokeWidth={1.3} /></div></div>
    <div className="create-workspace">
      <aside className="create-controls" aria-label="Preferenze outfit">
        <div className="create-control-heading"><span className="create-step">01</span><div><h2>La tua giornata</h2><p>Il contesto fa la differenza.</p></div></div>
        <label className="field">Dove si va?<select className="input" value={options.occasion} onChange={event => updateOption('occasion', event.target.value)}>{OCCASIONS.map(occasion => <option key={occasion}>{occasion}</option>)}</select></label>
        <div className="field"><span>Il tuo mood</span><div className="create-style-options">{(['Qualsiasi', ...STYLES] as const).map(style => <button type="button" key={style} className={`create-style-chip${options.style === style ? ' is-selected' : ''}`} onClick={() => updateOption('style', style as Style | 'Qualsiasi')} aria-pressed={options.style === style}>{style}</button>)}</div></div>
        <div className="create-weather-top"><span><Thermometer size={14} /> Temperatura</span><strong>{options.temperature}°<span>C</span></strong></div>
        <input className="create-temperature" type="range" min="-5" max="40" value={options.temperature} onChange={event => updateOption('temperature', Number(event.target.value))} aria-label="Temperatura in gradi Celsius" aria-valuetext={`${options.temperature} gradi Celsius`} />
        <div className="create-weather-options">{([{ label: 'Sereno', Icon: Sun }, { label: 'Nuvoloso', Icon: Cloud }, { label: 'Pioggia', Icon: CloudRain }] as const).map(({ label, Icon }) => <button type="button" key={label} className={options.weather === label ? 'is-selected' : ''} onClick={() => updateOption('weather', label)} aria-pressed={options.weather === label}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="create-select-row"><label className="field">Stagione<select className="input" value={options.season} onChange={event => updateOption('season', event.target.value as Season)}>{SEASONS.map(season => <option key={season}>{season}</option>)}</select></label><label className="field">Formalità<select className="input" value={options.formality} onChange={event => updateOption('formality', Number(event.target.value))}><option value={1}>Rilassato</option><option value={2}>Casual</option><option value={3}>Curato</option><option value={4}>Elegante</option><option value={5}>Formale</option></select></label></div>
        <div className="create-lock-section"><div className="create-lock-title"><LockKeyhole size={15} /><h3>Parti da un capo</h3><span>Opzionale</span></div><p>Le tue sneakers del cuore? Bloccale qui.</p>
          {lockedGarments.length > 0 && <div className="create-locked-items">{lockedGarments.map(item => item && <div className="create-locked-item" key={item.id}><div className="create-lock-thumbnail"><GarmentArt garment={item} /></div><span>{item.name}</span><button type="button" onClick={() => toggleLock(item.id)} aria-label={`Sblocca ${item.name}`}><X size={14} /></button></div>)}</div>}
          <button type="button" className="create-add-lock" onClick={event => { pickerOpenerRef.current = event.currentTarget; setLockPicker(true); }}><LockKeyhole size={14} />{lockedGarments.length ? 'Aggiungi un altro capo' : 'Scegli dal guardaroba'}<ArrowRight size={14} /></button>
        </div>
        <button type="button" className="button button-primary create-generate-button" onClick={generate} disabled={busy || !data.garments.length}><Sparkles size={17} className={busy ? 'create-spin' : ''} />{busy ? 'Trovo i tuoi abbinamenti…' : 'Genera i miei outfit'}{!busy && <ArrowRight size={17} />}</button>
        <p className="create-local-note">Solo i tuoi capi. Nuove possibilità.</p>
      </aside>
      <section className={`create-results${busy ? ' is-generating' : ''}`} aria-label="Outfit suggeriti" aria-busy={busy}>
        <div className="create-results-heading"><div><span className="eyebrow">IL BELLO È GIÀ NEL TUO ARMADIO</span><h2>{result.outfits.length ? `${result.outfits.length} ${result.outfits.length === 1 ? 'possibilità, tutta tua' : 'possibilità, tutte tue'}` : 'Il prossimo outfit parte da qui'}</h2></div>{resultsStale ? <span className="create-dirty-label">Preferenze aggiornate</span> : <span className="create-results-label"><span /> Scelti per te</span>}</div>
        {resultsStale && <div className="create-warnings" role="status"><Info size={16} /><div><p>Rigenera per applicare le preferenze e i capi bloccati. Le proposte precedenti non sono ancora aggiornate.</p><button type="button" className="button button-ghost" onClick={generate} disabled={busy || !data.garments.length}><Sparkles size={15} />{busy ? 'Aggiornamento…' : 'Rigenera le proposte'}</button></div></div>}
        {!resultsStale && result.warnings.length > 0 && <div className="create-warnings" role="status"><Info size={16} /><div>{result.warnings.map(warning => <p key={warning}>{warning}</p>)}</div></div>}
        {result.outfits.length > 0 ? <div className="create-outfits-grid">{result.outfits.map(outfit => <OutfitCard key={outfit.id} outfit={{ ...outfit, favorite: savedSignatures.has(outfitSignature(outfit.garmentIds)) }} garments={data.garments} onSave={resultsStale || busy ? undefined : item => { if (canUseResults()) onSave(item); }} onWear={resultsStale || busy ? undefined : item => { if (canUseResults()) onWear(item); }} onReplace={resultsStale || busy ? undefined : id => replaceOne(outfit, id)} onRegenerate={resultsStale || busy ? undefined : () => regenerateOne(outfit)} onReject={resultsStale || busy ? undefined : rejectOne} lockedIds={options.lockedIds} onToggleLock={toggleLock} />)}</div> : <div className="create-empty"><div className="create-empty-icon"><Sparkles size={32} strokeWidth={1.3} /></div><h3>Facciamo spazio alle idee.</h3><p>Per un outfit completo servono almeno un top, un pantalone e un paio di scarpe compatibili. Aggiungili al guardaroba, oppure modifica i filtri e i capi bloccati.</p></div>}
        <div className="create-bottom-note"><Sparkles size={15} /><p>Gli abbinamenti considerano colori, stagione, stile e le tue preferenze.<br />Salva quelli che ami: le prossime proposte ti somiglieranno di più.</p></div>
      </section>
    </div>
    {lockPicker && <div className="create-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setLockPicker(false); }}><div ref={modalRef} className="create-lock-modal" role="dialog" aria-modal="true" aria-labelledby="lock-modal-title"><div className="create-lock-modal-header"><div><span className="eyebrow">OUTFIT LOCK</span><h2 id="lock-modal-title">Quel capo, assolutamente.</h2><p>Scegli uno o più capi. Costruiamo l’outfit attorno a loro.</p></div><button type="button" className="outfit-icon-button" onClick={() => setLockPicker(false)} aria-label="Chiudi selezione capi"><X size={20} /></button></div><div className="create-lock-search"><Search size={17} /><input autoFocus className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca un capo, un colore…" aria-label="Cerca un capo da bloccare" /></div><div className="create-lock-grid">{filteredGarments.map(item => <button type="button" key={item.id} className={`create-lock-choice${options.lockedIds.includes(item.id) ? ' is-selected' : ''}`} onClick={() => toggleLock(item.id)} aria-pressed={options.lockedIds.includes(item.id)}><div className="create-lock-choice-art"><GarmentArt garment={item} />{options.lockedIds.includes(item.id) && <span><Check size={14} /></span>}</div><strong>{item.name}</strong><small>{item.category} · {item.color}</small></button>)}{!filteredGarments.length && <p className="create-lock-no-results">Nessun capo trovato. Prova un’altra ricerca.</p>}</div><div className="create-lock-modal-footer"><button type="button" className="button button-ghost" onClick={() => updateOption('lockedIds', [])} disabled={!options.lockedIds.length}><UnlockKeyhole size={15} />Sblocca tutti</button><button type="button" className="button button-primary" onClick={() => setLockPicker(false)}>Conferma{options.lockedIds.length > 0 && ` (${options.lockedIds.length})`}<Check size={16} /></button></div></div></div>}
  </div>;
}
