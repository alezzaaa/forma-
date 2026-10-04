import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Share, Smartphone } from 'lucide-react';

export default function InstallCard() {
    const [installed, setInstalled] = useState(false);
    useEffect(() => {
        const media = window.matchMedia('(display-mode: standalone)');
        const update = () => setInstalled(media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return <section className="settings-card install-card">
        <div className="install-heading"><span className="install-icon" aria-hidden="true">GD</span><div><h2>Aggiungi alla schermata Home</h2></div></div>
        {installed ? <p className="install-ready"><Check size={18}/> L’app è aperta dalla schermata Home.</p> : <>
            <p>Su iPhone puoi aprire GET DRESSD dalla schermata Home. Segui le istruzioni in Safari.</p>
            <details className="install-steps"><summary><Smartphone size={18}/> Aggiungi alla Home <span aria-hidden="true">+</span></summary>
                <ol><li>Apri il sito di GET DRESSD in <strong>Safari</strong>.</li><li>Apri il menu <strong>Condividi</strong> <Share size={15} aria-label="icona Condividi"/>.</li><li>Scegli <strong>Aggiungi alla schermata Home</strong>. Se presente, attiva <strong>Apri come app web</strong>, poi tocca <strong>Aggiungi</strong>.</li></ol>
                <p>Se nell’app aggiunta non trovi i tuoi capi, esporta il backup da Safari e importalo qui.</p>
                <a href="https://support.apple.com/it-it/guide/iphone/iphea86e5236/ios" target="_blank" rel="noreferrer">Guida Apple <ArrowUpRight size={15}/></a>
            </details>
        </>}
    </section>;
}
