import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LockKeyhole, X } from 'lucide-react';
import type { AppData, Garment, GenerateOptions, GenerateResult, Outfit, Preferences, Season, Style } from '../types';
import { currentSeason, SEASONS, STYLES } from '../lib/constants';
import { generateOutfits, isCompleteOutfit, outfitSignature, outfitWarnings, prepareInitialDraft } from '../lib/engine';
import GarmentArt from '../components/GarmentArt';
import GarmentPickerSheet from '../components/GarmentPickerSheet';
import ReplacementSheet from '../components/ReplacementSheet';
import OutfitCard from '../components/OutfitCard';
import OutfitCarousel from '../components/OutfitCarousel';
import './create.css';

interface CreateOutfitProps {
  data: AppData;
  initialLockedIds: string[];
  initialDraft?: Outfit;
  initialEntryRevision?: number;
  active?: boolean;
  onSave: (outfit: Outfit) => Promise<void> | void;
  onWear: (outfit: Outfit) => Promise<{ alreadyRecorded: boolean } | void> | void;
  onReject: (outfit: Outfit) => Promise<void> | void;
  onUpload?: () => void;
  onDetails?: (garment: Garment) => void;
  notify: (message: string) => void;
}
const QUICK_OCCASIONS = ['Giornata casual', 'Lavoro', 'Aperitivo', 'Cena'];
const OTHER_OCCASIONS = ['Università', 'Appuntamento', 'Festa', 'Serata', 'Palestra', 'Viaggio'];
const occasionLabel = (occasion: string) => occasion === 'Giornata casual' ? 'Tutti i giorni' : occasion;

export default function CreateOutfit({ data, initialLockedIds, initialDraft, initialEntryRevision = 0, active = true, onSave, onWear, onReject, onUpload, onDetails, notify }: CreateOutfitProps) {
  const [options, setOptions] = useState<GenerateOptions>(() => ({ occasion: initialDraft?.occasion || 'Giornata casual', style: initialDraft?.occasion ? initialDraft.style : data.preferences.preferredStyle, temperature: 20, weather: 'Sereno', formality: 2, lockedIds: initialDraft ? [] : initialLockedIds.filter(id => data.garments.some(item => item.id === id)), season: initialDraft?.occasion ? initialDraft.season : currentSeason() }));
  const [result, setResult] = useState<GenerateResult>(() => ({ outfits: initialDraft ? [prepareInitialDraft(initialDraft, data.garments, data.preferences, options)] : [], warnings: [] }));
  const [hasGenerated, setHasGenerated] = useState(Boolean(initialDraft));
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [invalidatedOutfitIds, setInvalidatedOutfitIds] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState(!initialDraft);
  const [lockPicker, setLockPicker] = useState(false);
  const [replacement, setReplacement] = useState<{ outfitId: string; garmentId: string } | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [moreOccasionsOpen, setMoreOccasionsOpen] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [carouselReset, setCarouselReset] = useState(0);
  const preferencesId = useId();
  const otherId = useId();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const generationFrame = useRef<number | null>(null);
  const latestActive = useRef(active);
  latestActive.current = active;
  const revision = useRef(0);
  const appliedRevision = useRef(0);
  const seenSignatures = useRef(new Set(initialDraft ? [outfitSignature(initialDraft.garmentIds)] : []));
  const initialLockKey = initialLockedIds.join('|');
  const draftKey = initialDraft?.id ?? '';
  const entryKey = `${initialEntryRevision}::${initialLockKey}::${draftKey}`;
  const previousEntryKey = useRef(entryKey);
  // Usage/favorite changes must never move a proposal while it is being used.
  const wardrobeKey = JSON.stringify(data.garments.map(item => [item.id, item.name, item.category, item.color, item.colorHex, item.style, item.seasons, item.formality, item.pattern, item.image]));
  const previousWardrobeKey = useRef(wardrobeKey);
  const sourceKey = `${entryKey}::${wardrobeKey}`;
  const latestSourceKey = useRef(sourceKey);
  latestSourceKey.current = sourceKey;
  const latestData = useRef(data);
  latestData.current = data;
  const sourcesChanged = previousWardrobeKey.current !== wardrobeKey || previousEntryKey.current !== entryKey;
  const resultsStale = dirty || sourcesChanged || appliedRevision.current !== revision.current;
  const needsLocks = (outfit: Outfit) => options.lockedIds.some(id => !outfit.garmentIds.includes(id));
  const invalidated = (outfit: Outfit) => invalidatedOutfitIds.has(outfit.id) || needsLocks(outfit) || !isCompleteOutfit(outfit, data.garments);
  const needsUpdate = resultsStale || result.outfits.some(invalidated);

  function invalidateResults() {
    revision.current += 1;
    if (generationFrame.current !== null) { cancelAnimationFrame(generationFrame.current); generationFrame.current = null; }
    setBusy(false); setDirty(true); setExhausted(false); setReplacement(null);
  }
  function canUse(outfit?: Outfit) {
    if (busy || resultsStale || appliedRevision.current !== revision.current || latestSourceKey.current !== sourceKey || (outfit && invalidated(outfit))) {
      notify('Le proposte vanno aggiornate.'); return false;
    }
    return true;
  }
  useEffect(() => () => { if (generationFrame.current !== null) cancelAnimationFrame(generationFrame.current); }, []);
  useEffect(() => { if (!active) { setLockPicker(false); setReplacement(null); } }, [active]);
  useEffect(() => {
    if (previousEntryKey.current === entryKey) return;
    previousEntryKey.current = entryKey;
    invalidateResults();
    setPreferencesOpen(false); setEditing(!initialDraft); setMoreOccasionsOpen(false);
    if (initialDraft) {
      const nextOptions = { ...options, ...(initialDraft.occasion ? { occasion: initialDraft.occasion, style: initialDraft.style, season: initialDraft.season } : {}), lockedIds: [] };
      setOptions(nextOptions);
      setResult({ outfits: [prepareInitialDraft(initialDraft, data.garments, data.preferences, nextOptions)], warnings: [] }); setHasGenerated(true);
      setInvalidatedOutfitIds(new Set());
      appliedRevision.current = revision.current; setDirty(false);
      seenSignatures.current = new Set([outfitSignature(initialDraft.garmentIds)]); setCarouselReset(previous => previous + 1);
    } else {
      setOptions(previous => ({ ...previous, lockedIds: initialLockedIds.filter(id => data.garments.some(item => item.id === id)) }));
      setResult({ outfits: [], warnings: [] }); setHasGenerated(false); setInvalidatedOutfitIds(new Set());
      seenSignatures.current.clear(); appliedRevision.current = revision.current; setDirty(false);
    }
  }, [entryKey, initialDraft, initialLockedIds, data.garments]);
  useEffect(() => {
    if (previousWardrobeKey.current === wardrobeKey) return;
    previousWardrobeKey.current = wardrobeKey;
    const ids = new Set(data.garments.map(item => item.id));
    setOptions(previous => ({ ...previous, lockedIds: previous.lockedIds.filter(id => ids.has(id)) }));
    setResult(previous => ({ ...previous, outfits: previous.outfits.filter(outfit => outfit.garmentIds.every(id => ids.has(id))) }));
    invalidateResults();
  }, [wardrobeKey, data.garments]);

  function updateOption<K extends keyof GenerateOptions>(key: K, value: GenerateOptions[K]) {
    if (JSON.stringify(options[key]) === JSON.stringify(value)) return;
    setOptions(previous => ({ ...previous, [key]: value })); invalidateResults();
  }
  function generate(more = false) {
    if (busy || pendingId || generationFrame.current !== null) return;
    const requestedRevision = revision.current;
    const requestedSource = sourceKey;
    const continueSeen = more && !needsUpdate;
    setBusy(true); setReplacement(null);
    // The next paint can display the honest busy state; there is no decorative timer.
    generationFrame.current = requestAnimationFrame(() => {
      generationFrame.current = null;
      if (requestedRevision !== revision.current || requestedSource !== latestSourceKey.current) { setBusy(false); setDirty(true); return; }
      const next = generateOutfits(latestData.current.garments, latestData.current.preferences, options, 3, continueSeen ? [...seenSignatures.current] : []);
      if (continueSeen && !next.outfits.length) { setExhausted(true); setBusy(false); notify('Hai visto tutte le proposte disponibili.'); return; }
      if (!continueSeen) seenSignatures.current.clear();
      next.outfits.forEach(item => seenSignatures.current.add(outfitSignature(item.garmentIds)));
      setResult(next); setHasGenerated(true); setInvalidatedOutfitIds(new Set()); appliedRevision.current = requestedRevision;
      setDirty(false); setBusy(false); setEditing(false); setPreferencesOpen(false); setExhausted(false);
      setCarouselReset(previous => previous + 1);
      requestAnimationFrame(() => {
        const heading = resultsHeadingRef.current;
        if (!heading || !latestActive.current) return;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ behavior: data.preferences.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      });
    });
  }
  function changeOne(outfit: Outfit, preferences: Preferences = latestData.current.preferences, rejected = false) {
    const next = generateOutfits(latestData.current.garments, preferences, { ...options, avoidIds: outfit.garmentIds }, 1, [...seenSignatures.current]).outfits[0];
    if (!next && !rejected) { setExhausted(true); notify('Hai visto tutte le proposte disponibili.'); return; }
    if (next) seenSignatures.current.add(outfitSignature(next.garmentIds));
    setResult(previous => {
      const outfits = previous.outfits.flatMap(item => item.id === outfit.id ? next ? [next] : [] : [item]);
      return { outfits, warnings: outfitWarnings(outfits, latestData.current.garments, preferences, options) };
    });
    if (!next) setExhausted(true);
  }
  async function rejectOne(outfit: Outfit) {
    if (!canUse(outfit)) throw new Error('Stale outfit');
    const requestedSource = sourceKey;
    const requestedRevision = revision.current;
    await onReject(outfit);
    // Persistence must finish first. A changed context cannot install an old replacement.
    if (requestedSource !== latestSourceKey.current || requestedRevision !== revision.current) return;
    const signature = outfitSignature(outfit.garmentIds);
    const preferences = latestData.current.preferences;
    changeOne(outfit, { ...preferences, dislikedSignatures: [...new Set([...preferences.dislikedSignatures, signature])], likedSignatures: preferences.likedSignatures.filter(item => item !== signature) }, true);
    notify('Preferenza salvata.');
  }
  function toggleSheetLock(id: string) {
    if (!replacement || !canUse(result.outfits.find(item => item.id === replacement.outfitId))) return;
    const lockedIds = options.lockedIds.includes(id) ? options.lockedIds.filter(item => item !== id) : [...options.lockedIds, id];
    setOptions(previous => ({ ...previous, lockedIds }));
    setInvalidatedOutfitIds(previous => new Set([...previous, ...result.outfits.filter(outfit => lockedIds.some(locked => !outfit.garmentIds.includes(locked))).map(outfit => outfit.id)]));
    // The visible look remains valid; cards lacking a new lock are individually disabled.
    revision.current += 1; appliedRevision.current = revision.current;
    setExhausted(false);
  }
  function applyReplacement(next: Outfit) {
    if (!replacement) return;
    const original = result.outfits.find(item => item.id === replacement.outfitId);
    if (!original || !canUse(original)) return;
    seenSignatures.current.add(outfitSignature(next.garmentIds));
    setResult(previous => {
      const outfits = previous.outfits.map(item => item.id === original.id ? next : item);
      return { outfits, warnings: outfitWarnings(outfits, data.garments, data.preferences, options) };
    });
    setReplacement(null); setExhausted(false);
  }
  const lockedGarments = options.lockedIds.map(id => data.garments.find(item => item.id === id)).filter((item): item is Garment => Boolean(item));
  const savedSignatures = new Set(data.outfits.filter(item => item.favorite).map(item => outfitSignature(item.garmentIds)));
  const replacingOutfit = result.outfits.find(item => item.id === replacement?.outfitId);
  const summary = `${options.style} · ${options.temperature} °C · ${options.weather} · ${options.season}`;
  const warnings = result.outfits.length ? outfitWarnings(result.outfits, data.garments, data.preferences, options) : result.warnings;

  return <div className="page create-page">
    <div className="page-heading create-page-heading"><h1>Crea</h1></div>
    <div className={`create-workspace${hasGenerated && !editing ? ' is-results-focused' : ''}`}>
      {(!hasGenerated || editing) ? <section className="create-controls" aria-label="Preferenze outfit">
        <fieldset className="create-occasion-fieldset"><legend>Dove vai?</legend><div className="create-occasion-options">{QUICK_OCCASIONS.map(occasion => <button type="button" key={occasion} className={`create-style-chip${options.occasion === occasion ? ' is-selected' : ''}`} aria-pressed={options.occasion === occasion} onClick={() => { updateOption('occasion', occasion); setMoreOccasionsOpen(false); }}>{occasionLabel(occasion)}</button>)}<button type="button" className={`create-style-chip${OTHER_OCCASIONS.includes(options.occasion) ? ' is-selected' : ''}`} aria-expanded={moreOccasionsOpen} aria-controls={otherId} onClick={() => setMoreOccasionsOpen(open => !open)}>{OTHER_OCCASIONS.includes(options.occasion) ? options.occasion : 'Altro'} <ChevronDown size={15} /></button></div>{moreOccasionsOpen && <div id={otherId} className="create-occasion-options create-other-occasions">{OTHER_OCCASIONS.map(occasion => <button type="button" className={`create-style-chip${options.occasion === occasion ? ' is-selected' : ''}`} key={occasion} aria-pressed={options.occasion === occasion} onClick={() => { updateOption('occasion', occasion); setMoreOccasionsOpen(false); }}>{occasion}</button>)}</div>}</fieldset>
        <div className="create-lock-section"><div className="create-lock-title"><h2>Parti da un capo?</h2><span>Facoltativo</span></div>
          {lockedGarments.length > 0 && <div className="create-locked-items">{lockedGarments.map(item => <div className="create-locked-item" key={item.id}><div className="create-lock-thumbnail" aria-hidden="true"><GarmentArt garment={item} /></div><span>{item.name}<small><LockKeyhole size={12} aria-hidden="true" /> Bloccato</small></span><button type="button" className="outfit-icon-button" onClick={() => updateOption('lockedIds', options.lockedIds.filter(id => id !== item.id))} aria-label={`Sblocca ${item.name}`}><X size={18} /></button></div>)}</div>}
          <button type="button" className="create-add-lock" onClick={() => setLockPicker(true)}>{lockedGarments.length ? 'Aggiungi un altro capo' : 'Scegli dal guardaroba'}</button>{lockedGarments.length > 1 && <button type="button" className="button button-ghost" onClick={() => updateOption('lockedIds', [])}>Sblocca tutti</button>}
        </div>
        <div className="create-advanced"><button type="button" className="create-advanced-toggle" aria-expanded={preferencesOpen} aria-controls={preferencesId} onClick={() => setPreferencesOpen(open => !open)}>Altre preferenze<ChevronDown size={18} /></button><p className="create-effective-summary">{summary}</p>
          {preferencesOpen && <div id={preferencesId} className="create-preferences"><label className="field">Stile<select className="input" value={options.style} onChange={event => updateOption('style', event.target.value as Style | 'Qualsiasi')}><option>Qualsiasi</option>{STYLES.map(style => <option key={style}>{style}</option>)}</select></label><label className="field">Temperatura · {options.temperature} °C<input className="create-temperature" type="range" min="-5" max="40" value={options.temperature} onChange={event => updateOption('temperature', Number(event.target.value))} aria-valuetext={`${options.temperature} gradi Celsius`} /></label><label className="field">Meteo<select className="input" value={options.weather} onChange={event => updateOption('weather', event.target.value as GenerateOptions['weather'])}><option>Sereno</option><option>Nuvoloso</option><option>Pioggia</option></select></label><div className="create-select-row"><label className="field">Stagione<select className="input" value={options.season} onChange={event => updateOption('season', event.target.value as Season)}>{SEASONS.map(season => <option key={season}>{season}</option>)}</select></label><label className="field">Formalità<select className="input" value={options.formality} onChange={event => updateOption('formality', Number(event.target.value))}><option value={1}>Rilassato</option><option value={2}>Casual</option><option value={3}>Curato</option><option value={4}>Elegante</option><option value={5}>Formale</option></select></label></div><p className="create-weather-note">Temperatura e meteo sono impostati da te.</p></div>}
        </div>
        <button type="button" className="button button-primary create-generate-button" onClick={() => generate()} disabled={busy || Boolean(pendingId) || !data.garments.length}>{busy ? 'Cerco un outfit…' : hasGenerated ? 'Aggiorna outfit' : 'Mostrami un outfit'}</button>
        {!data.garments.length && <div className="create-empty"><p>Per un outfit completo servono un capo superiore, un pantalone e un paio di scarpe.</p>{onUpload && <button type="button" className="button" onClick={onUpload}>Aggiungi capo</button>}</div>}
      </section> : <div className="create-context-summary"><div><strong>{occasionLabel(options.occasion)}{lockedGarments.length > 0 && ` · ${lockedGarments.map(item => item.name).join(', ')}`}</strong><p>{summary}</p></div><button type="button" className="button button-ghost" onClick={() => setEditing(true)}>Modifica</button></div>}
      {hasGenerated && <section className="create-results" aria-label="Outfit suggeriti" aria-busy={busy}>
        <div className="create-results-heading"><h2 ref={resultsHeadingRef} tabIndex={-1}>{result.outfits.length === 1 ? '1 proposta' : `${result.outfits.length} proposte`}</h2></div>
        {needsUpdate && <div className="create-warnings" role="status"><p>Le proposte vanno aggiornate.</p><button type="button" className="button" onClick={() => generate()} disabled={busy || Boolean(pendingId)}>{busy ? 'Cerco un outfit…' : 'Aggiorna outfit'}</button></div>}
        {!resultsStale && warnings.length > 0 && <div className="create-warnings" role="status">{warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
        {result.outfits.length ? <OutfitCarousel resetKey={carouselReset} disabled={busy || Boolean(pendingId)} reduceMotion={data.preferences.reduceMotion} onMore={needsUpdate ? undefined : () => generate(true)}>{result.outfits.map((outfit, index) => <OutfitCard key={index} outfit={{ ...outfit, favorite: savedSignatures.has(outfitSignature(outfit.garmentIds)) }} garments={data.garments} disabled={busy || resultsStale || invalidated(outfit) || (pendingId !== null && pendingId !== outfit.id)} onSave={async item => { if (!canUse(item)) throw new Error('Stale outfit'); await onSave(item); }} onWear={async item => { if (!canUse(item)) throw new Error('Stale outfit'); return await onWear(item); }} onReplace={id => { if (canUse(outfit)) setReplacement({ outfitId: outfit.id, garmentId: id }); }} onRegenerate={() => { if (canUse(outfit)) changeOne(outfit); }} onReject={rejectOne} lockedIds={options.lockedIds} onBusyChange={isBusy => setPendingId(isBusy ? outfit.id : null)} />)}</OutfitCarousel> : <div className="create-empty"><h3>Nessun outfit con queste preferenze.</h3><button type="button" className="button" onClick={() => setEditing(true)}>Modifica preferenze</button>{onUpload && <button type="button" className="button button-ghost" onClick={onUpload}>Aggiungi capo</button>}</div>}
        {exhausted && <p className="create-exhausted" role="status">Hai visto tutte le proposte disponibili.</p>}
      </section>}
    </div>
    {active && lockPicker && <GarmentPickerSheet garments={data.garments} lockedIds={options.lockedIds} onClose={() => setLockPicker(false)} onConfirm={ids => { updateOption('lockedIds', ids); setLockPicker(false); }} />}
    {active && replacement && replacingOutfit && !resultsStale && <ReplacementSheet outfit={replacingOutfit} garmentId={replacement.garmentId} garments={data.garments} preferences={data.preferences} options={options} excludedSignatures={result.outfits.filter(item => item.id !== replacingOutfit.id).map(item => outfitSignature(item.garmentIds))} onApply={applyReplacement} onClose={() => setReplacement(null)} onToggleLock={toggleSheetLock} onDetails={onDetails} onUpload={onUpload} onPreferences={() => setEditing(true)} />}
  </div>;
}
