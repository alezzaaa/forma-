import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ShieldCheck, HardDrive, Monitor, Check, Sparkles, Trash2 } from 'lucide-react';
import type { AppData, Preferences } from '../types';
import { COLORS, STYLES } from '../lib/constants';
import { parseBackup } from '../lib/storage';
export default function Settings({ data, onPreferences, onImport, onReset, onRemoveDemo, notify }: {
    data: AppData;
    onPreferences: (update: (p: Preferences) => Preferences) => Promise<void>;
    onImport: (d: AppData) => void;
    onReset: () => void;
    onRemoveDemo: () => void;
    notify: (m: string) => void;
}) {
    const [name, setName] = useState(data.preferences.name), [busy, setBusy] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const exportData = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); notify('Backup esportato. Include anche le tue foto.'); };
    return <div className="page settings-page"><div className="page-heading"><div><p className="eyebrow">COME PIACE A TE</p><h1>Il tuo spazio.</h1><p>Piccole preferenze. Un’esperienza più tua.</p></div></div><div className="settings-layout"><section className="settings-card"><div className="settings-section-title"><div className="profile-avatar">{data.preferences.name?.[0]?.toUpperCase() || 'F'}</div><div><h2>Piacere di conoscerti.</h2><p>Il tuo guardaroba, alle tue condizioni.</p></div></div><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
        await onPreferences(p => ({ ...p, name: name.trim() }));
        notify('Profilo aggiornato.');
    }
    catch { }
    finally {
        setBusy(false);
    } }}><label className="field">Come ti chiami?<input className="input" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" autoComplete="given-name"/></label><button className="button button-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva nome'}<Check size={16}/></button></form><div className="settings-divider"/><h3>Il tuo stile di partenza</h3><p className="muted">Lo useremo come ispirazione per i primi suggerimenti.</p><div className="choice-chips">{STYLES.map(style => <button className={data.preferences.preferredStyle === style ? 'active' : ''} key={style} onClick={() => void onPreferences(p => ({ ...p, preferredStyle: style })).catch(() => { })}>{style}</button>)}</div><h3>Colori che ti fanno sentire te</h3><p className="muted">I suggerimenti daranno un po’ più di spazio a questi colori.</p><div className="color-choices">{COLORS.map(color => <button key={color.name} className={data.preferences.favoriteColors.includes(color.name) ? 'active' : ''} onClick={() => void onPreferences(p => ({ ...p, favoriteColors: p.favoriteColors.includes(color.name) ? p.favoriteColors.filter(c => c !== color.name) : [...p.favoriteColors, color.name] })).catch(() => { })} aria-pressed={data.preferences.favoriteColors.includes(color.name)}><span style={{ background: color.hex }}>{data.preferences.favoriteColors.includes(color.name) && <Check size={13}/>}</span>{color.name}</button>)}</div></section>
 <div className="settings-right"><section className="settings-card privacy-card"><ShieldCheck size={27} strokeWidth={1.5}/><h2>Privato, per scelta.</h2><p>Foto e guardaroba vengono salvati solo in questo browser. Nessun account, nessun invio a servizi AI.</p><div className="local-status"><span className="status-dot"/>Salvataggio locale · IndexedDB</div><p className="small-muted">I dati non si sincronizzano tra dispositivi. Esporta un backup prima di cancellare i dati del browser.</p></section><section className="settings-card"><h3><HardDrive size={19}/> Il tuo guardaroba, al sicuro</h3><p className="muted">Porta foto, outfit e cronologia con te.</p><div className="backup-actions"><button className="button button-outline" onClick={exportData}><ArrowDownToLine size={16}/> Esporta backup</button><button className="button button-outline" onClick={() => input.current?.click()}><ArrowUpFromLine size={16}/> Importa backup</button></div><input hidden ref={input} type="file" accept=".json,application/json" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f)
        return; try {
        if (f.size > 160 * 1024 * 1024)
            throw new Error('Il backup supera il limite di 160 MB.');
        onImport(parseBackup(await f.text()));
    }
    catch (err) {
        notify(err instanceof Error ? err.message : 'Backup non valido.');
    } }}/></section><section className="settings-card motion-card"><div><h3><Monitor size={18}/> Animazioni ridotte</h3><p className="muted">Un’esperienza più tranquilla.</p></div><button className={`toggle ${data.preferences.reduceMotion ? 'on' : ''}`} role="switch" aria-label="Riduci animazioni" aria-checked={data.preferences.reduceMotion} onClick={() => void onPreferences(p => ({ ...p, reduceMotion: !p.reduceMotion })).catch(() => { })}><span /></button></section></div></div>
 <section className="settings-card learning-card"><Sparkles size={24}/><div><h3>Il tuo gusto prende forma.</h3><p>{data.preferences.likedSignatures.length} combinazioni apprezzate · {data.preferences.dislikedSignatures.length} combinazioni da evitare. Preferiti, colori e utilizzo recente influenzano il motore di abbinamento.</p></div></section><section className="settings-card data-actions"><div><h3>Un nuovo inizio</h3><p className="muted">Rimuovi la collezione dimostrativa o svuota il tuo spazio.</p></div><div>{data.garments.some(g => g.demo) && <button className="button button-outline" onClick={onRemoveDemo}>Rimuovi capi demo</button>}<button className="button button-danger" onClick={onReset}><Trash2 size={16}/> Svuota guardaroba</button></div></section><footer className="page-footer"><span>FORMA 1.0</span><span>Il riconoscimento locale crea una bozza da verificare.</span></footer></div>;
}
