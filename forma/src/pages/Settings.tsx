import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronRight, HardDrive, Settings2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import type { AppData, Preferences } from '../types';
import { COLORS, STYLES } from '../lib/constants';
import { parseBackup } from '../lib/storage';
import StatisticsWidget from '../components/StatisticsWidget';
import InstallCard from '../components/InstallCard';
import './profile.css';

type Section = 'statistics' | 'preferences' | 'backup' | 'install' | 'privacy';
const sectionTitles: Record<Section, string> = { statistics: 'Statistiche', preferences: 'Preferenze', backup: 'Backup', install: 'Installa app', privacy: 'Privacy e dati' };

export default function Settings({ data, onPreferences, onImport, onReset, onRemoveDemo, onOpenHistory, onOpenToday, onBack, initialSection, notify }: {
    data: AppData;
    onPreferences: (update: (p: Preferences) => Preferences) => Promise<void>;
    onImport: (d: AppData) => void;
    onReset: () => void;
    onRemoveDemo: () => void;
    onOpenHistory: () => void;
    onOpenToday?: () => void;
    onBack?: () => void;
    initialSection?: 'statistics';
    notify: (m: string) => void;
}) {
    const [section, setSection] = useState<Section | null>(initialSection ?? null);
    const [name, setName] = useState(data.preferences.name);
    const [busy, setBusy] = useState(false), [exporting, setExporting] = useState(false);
    const [error, setError] = useState(''), [backupStatus, setBackupStatus] = useState('');
    const input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null);
    const firstRender = useRef(true);
    useEffect(() => setName(data.preferences.name), [data.preferences.name]);
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        setError('');
        window.scrollTo({ top: 0 });
        heading.current?.focus();
    }, [section]);
    const savePreference = async (update: (p: Preferences) => Preferences) => {
        if (busy) return;
        setBusy(true); setError('');
        try { await onPreferences(update); }
        catch { setError('Salvataggio non riuscito. Riprova.'); }
        finally { setBusy(false); }
    };
    const exportData = async () => {
        if (exporting) return;
        setExporting(true); setError(''); setBackupStatus('');
        try {
            const file = new File([JSON.stringify(data, null, 2)], `get-dressd-backup-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
            if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: 'Backup GET DRESSD' });
                    setBackupStatus('Backup condiviso. Include anche le tue foto.');
                    return;
                } catch (shareError) {
                    if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
                    // Fall back to downloading when advertised file sharing is unavailable.
                }
            }
            const url = URL.createObjectURL(file), anchor = document.createElement('a');
            anchor.href = url; anchor.download = file.name;
            document.body.append(anchor); anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
            setBackupStatus('Download del backup avviato. Include anche le tue foto.');
        } catch { setError('Non è stato possibile preparare il backup. Riprova.'); }
        finally { setExporting(false); }
    };
    const row = (title: string, Icon: typeof Settings2, action: () => void) => <button className="profile-row" type="button" key={title} onClick={action}><Icon size={20} aria-hidden="true"/><span>{title}</span><ChevronRight size={18} aria-hidden="true"/></button>;
    return <div className="page settings-page profile-page">
        {(section || onBack) && <button className="button button-ghost profile-back" type="button" onClick={() => section ? setSection(null) : onBack?.()}><ArrowLeft size={18} aria-hidden="true"/>{section ? 'Profilo' : 'Indietro'}</button>}
        <div className="page-heading"><h1 ref={heading} tabIndex={-1}>{section ? sectionTitles[section] : 'Profilo'}</h1></div>
        {!section && <>
            <div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{data.preferences.name?.[0]?.toUpperCase() || 'G'}</div><p>{data.preferences.name || 'Il tuo profilo'}</p></div>
            <section className="profile-group" aria-label="Attività"><h2>Attività</h2>{row('Statistiche', ChartNoAxesColumnIncreasing, () => setSection('statistics'))}{row('Cronologia', CalendarDays, onOpenHistory)}</section>
            <section className="profile-group" aria-label="Personale"><h2>Personale</h2>{row('Preferenze', Settings2, () => setSection('preferences'))}</section>
            <section className="profile-group" aria-label="App e dati"><h2>App e dati</h2>{row('Backup', HardDrive, () => setSection('backup'))}{row('Installa app', Smartphone, () => setSection('install'))}{row('Privacy e dati', ShieldCheck, () => setSection('privacy'))}</section>
        </>}
        {section === 'statistics' && <StatisticsWidget data={data} onOpenHistory={onOpenHistory} onOpenToday={onOpenToday}/>}
        {section === 'preferences' && <section className="settings-card profile-content">
            <form onSubmit={async e => {
                e.preventDefault(); if (busy) return; setBusy(true); setError('');
                try { await onPreferences(p => ({ ...p, name: name.trim() })); notify('Profilo aggiornato.'); }
                catch { setError('Salvataggio non riuscito. Riprova.'); }
                finally { setBusy(false); }
            }}><label className="field">Nome<input className="input" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" autoComplete="given-name"/></label><button className="button button-primary" disabled={busy}>{busy ? 'Salvo…' : 'Salva nome'}<Check size={16} aria-hidden="true"/></button></form>
            <h2>Stile preferito</h2><p className="muted">Il punto di partenza per le proposte.</p><div className="choice-chips">{STYLES.map(style => <button type="button" disabled={busy} aria-pressed={data.preferences.preferredStyle === style} className={data.preferences.preferredStyle === style ? 'active' : ''} key={style} onClick={() => void savePreference(p => ({ ...p, preferredStyle: style }))}>{style}</button>)}</div>
            <h2>Colori preferiti</h2><div className="color-choices">{COLORS.map(color => <button type="button" disabled={busy} key={color.name} className={data.preferences.favoriteColors.includes(color.name) ? 'active' : ''} onClick={() => void savePreference(p => ({ ...p, favoriteColors: p.favoriteColors.includes(color.name) ? p.favoriteColors.filter(c => c !== color.name) : [...p.favoriteColors, color.name] }))} aria-pressed={data.preferences.favoriteColors.includes(color.name)}><span style={{ background: color.hex }} aria-hidden="true">{data.preferences.favoriteColors.includes(color.name) && <Check size={13}/>}</span>{color.name}</button>)}</div>
            <div className="profile-motion"><label htmlFor="profile-reduce-motion">Riduci animazioni</label><button id="profile-reduce-motion" type="button" disabled={busy} className={`toggle ${data.preferences.reduceMotion ? 'on' : ''}`} role="switch" aria-label="Riduci animazioni" aria-checked={data.preferences.reduceMotion} onClick={() => void savePreference(p => ({ ...p, reduceMotion: !p.reduceMotion }))}><span/></button></div>
        </section>}
        {section === 'backup' && <section className="settings-card profile-content"><p>Il backup include foto, capi, outfit, cronologia e preferenze.</p><p className="muted">Ripristinare un backup sostituisce i dati presenti. Potrai confermare dopo aver scelto il file.</p><div className="backup-actions"><button className="button button-outline" type="button" onClick={() => void exportData()} disabled={exporting}><ArrowDownToLine size={16} aria-hidden="true"/>{exporting ? 'Preparazione…' : 'Esporta backup'}</button><button className="button button-outline" type="button" onClick={() => input.current?.click()}><ArrowUpFromLine size={16} aria-hidden="true"/>Importa backup</button></div><input hidden ref={input} type="file" accept=".json,application/json" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
            setError(''); setBackupStatus('');
            try { if (file.size > 160 * 1024 * 1024) throw new Error('Il backup supera il limite di 160 MB.'); onImport(parseBackup(await file.text())); }
            catch (importError) { setError(importError instanceof Error ? importError.message : 'Backup non valido.'); }
        }}/>{backupStatus && <p role="status">{backupStatus}</p>}</section>}
        {section === 'install' && <InstallCard/>}
        {section === 'privacy' && <section className="settings-card profile-content"><p>Foto, capi e outfit sono salvati in questo browser. Un backup ti permette di conservarli e trasferirli.</p><p className="muted">Cancellare i dati del browser può rimuovere il guardaroba. Non c’è sincronizzazione tra dispositivi né recupero automatico.</p><div className="profile-data-action">{data.garments.some(g => g.demo) && <><h2>Capi di esempio</h2><p className="muted">Rimuove i capi di esempio e gli outfit e le voci di cronologia che li contengono. Gli altri capi restano disponibili.</p><button className="button button-outline" type="button" onClick={onRemoveDemo}>Rimuovi capi di esempio</button></>}</div><div className="profile-data-action"><h2>Svuota guardaroba</h2><p className="muted">Rimuove capi, outfit, cronologia e preferenze. Esporta un backup per conservarli.</p><button className="button button-danger" type="button" onClick={onReset}><Trash2 size={16} aria-hidden="true"/>Svuota guardaroba</button></div></section>}
        {error && <p className="profile-error" role="alert">{error}</p>}
    </div>;
}
