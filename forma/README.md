# GET DRESSD

**Il tuo guardaroba. Più possibilità.**

Una web app in italiano per organizzare i vestiti, comporre outfit e rispondere a «Cosa mi metto oggi?». Interfaccia scura, navigazione per desktop e smartphone, foto personali e salvataggio locale. È un MVP funzionante: non richiede un account né chiavi API.

**Versione 1.1.0:** nuovo nome e icona, widget Statistiche nel profilo, navigazione e schermate ottimizzate per iPhone. La cartella del progetto resta `forma` per mantenere compatibile la pubblicazione esistente. L'archivio del browser e il formato dei backup rimangono compatibili con la versione precedente.

Per aggiornare il sito GitHub Pages già pubblicato, segui [AGGIORNAMENTO.md](AGGIORNAMENTO.md).

## Aprila subito

Il pacchetto include l'app già compilata, oltre al codice sorgente.

**Avvio consigliato, con salvataggio sullo stesso indirizzo locale:**

1. Estrai lo ZIP e apri la cartella `forma` nel Terminale.
2. Assicurati di avere Node.js **22.13 o successivo** (`node --version`).
3. Esegui:

```bash
npm start
```

Apri [http://127.0.0.1:4173](http://127.0.0.1:4173). Per questo avvio non serve installare le dipendenze: il server incluso serve la cartella `dist` già pronta. Il comando equivalente è `node serve.mjs`. Lascia aperto il Terminale mentre usi l'app; per arrestarla premi `Ctrl+C`.

**Apertura con doppio clic:** apri `GET-DRESSD.html` in un browser moderno. È un file autonomo, senza risorse da scaricare. Alcuni browser limitano il salvataggio dei file aperti direttamente: se compare un errore di accesso al guardaroba, usa l'avvio locale descritto sopra. Anche spostare il file può cambiare lo spazio di salvataggio riconosciuto dal browser.

Non è inclusa una pubblicazione online: `localhost` funziona sul computer che esegue il server.

## Su iPhone

Apri l'indirizzo pubblicato in **Safari**. Per avere GET DRESSD nella Home, apri il menu di condivisione, scegli **Aggiungi alla schermata Home** e conferma. Se Safari mostra l'opzione **Apri come app web**, lasciala attiva. Le istruzioni aggiornate sono nella [guida Apple](https://support.apple.com/it-it/guide/iphone/iphea86e5236/ios).

L'app include icona, nome e visualizzazione autonoma, spazi per notch e indicatore Home, barra di navigazione inferiore, campi di testo più leggibili e controlli adatti al tocco. In **Tu** trovi statistiche, preferenze, backup e accesso alla cronologia. Il sito pubblicato richiede una connessione per il caricamento iniziale: non è incluso un service worker per l'avvio offline. La copia HTML autonoma resta una modalità separata, consigliata soprattutto su desktop.

## Il primo outfit

1. Esplora i **22 capi dimostrativi** e le combinazioni già presenti.
2. Apri **Crea outfit** e scegli occasione, stile, temperatura, meteo e formalità.
3. Se vuoi partire da una scarpa o da un altro capo, aggiungilo ai **capi bloccati**. Puoi bloccarne più di uno, purché i ruoli siano compatibili.
4. Genera fino a **3 proposte distinte**. Puoi cambiare un singolo capo, rigenerare, esprimere una preferenza o salvare il look.
5. Premi **Indosso questo**: l'app aggiorna cronologia, utilizzi e suggerimenti successivi.

Le proposte usano esclusivamente i capi presenti nel guardaroba. Se mancano categorie necessarie o combinazioni sufficienti, l'app lo segnala. Non inventa vestiti per completare una proposta.

## Aggiungi i tuoi vestiti

In **Guardaroba**, usa il pulsante per aggiungere un capo: scegli le foto dalla galleria, trascinale nella finestra di caricamento oppure usa la fotocamera sui dispositivi che la supportano.

- Una foto per capo, fino a **20 foto per caricamento**.
- Formati consigliati: **JPEG, PNG e WebP**, fino a **12 MB e 60 megapixel per foto**. Le foto **HEIC/HEIF** vengono aperte se il browser è in grado di decodificarle e convertite in un formato compatibile; quando non è possibile, l'app invita a usare JPEG o PNG. Le foto vengono elaborate una alla volta per contenere l’uso di memoria.
- L'app ottimizza la foto, estrae colori indicativi e prepara una scheda modificabile. Categoria, stile, stagione, materiale, pattern e formalità vanno verificati prima del salvataggio.
- La rimozione dello sfondo funziona su **fondi uniformi**, quando il capo si distingue dal fondo. Controlla l'anteprima e torna all'originale se il risultato non è corretto.

Il riconoscimento locale non è un modello visivo AI: per la categoria usa indizi nel nome del file, se presenti, mentre i colori vengono stimati dai pixel. Per esempio, `camicia-azzurra.jpg` aiuta più di `IMG_1234.jpg`. I materiali non vengono riconosciuti automaticamente. L'app dichiara queste informazioni come bozze da verificare.

Per passare al tuo guardaroba personale, apri il profilo **Il tuo spazio → Rimuovi capi demo**. Verranno eliminate anche le combinazioni e la cronologia legate alla demo; i capi personali restano disponibili.

## Le sezioni

| Sezione | Cosa puoi fare |
| --- | --- |
| Home | Vedere un suggerimento, gli ultimi capi e le statistiche rapide. |
| Guardaroba | Cercare, filtrare, modificare, segnare preferiti e bloccare un capo per un outfit. |
| Crea outfit | Impostare il contesto, confrontare proposte e sostituire singoli elementi. |
| I tuoi outfit | Conservare i look, assegnare nome e voto, aggiungere note e registrare utilizzi. |
| Cronologia | Consultare i look indossati e le statistiche su capi e colori. |
| Il tuo spazio / Tu | Consultare Statistiche, scegliere preferenze, ridurre le animazioni e gestire backup e dati. |

Il motore combina regole su colori, ruoli, stile, stagione e formalità con preferiti, combinazioni apprezzate/rifiutate e utilizzo recente. È un sistema euristico personalizzato; non addestra un modello AI sul tuo profilo.

## Statistiche personali

Il widget **Statistiche** nel profilo mostra capi preferiti, utilizzi, colori e distribuzione del guardaroba. Puoi scegliere **30 giorni** oppure **Sempre**: le metriche di utilizzo vengono calcolate dalla cronologia, mentre dimensioni e composizione descrivono il guardaroba attuale. Un capo viene indicato come preferito solo quando lo hai segnato con il cuore.

Il confronto con amici è previsto come passo successivo. Il modulo `src/lib/statistics.ts` prepara un riepilogo aggregato con periodo e metodo di calcolo, senza esportare foto, nomi dei capi o cronologia individuale. Non ci sono ancora account, amici, classifiche o condivisione automatica.

## Salvataggio e backup

Foto, outfit e preferenze vengono salvati in **IndexedDB nel browser**. La versione inclusa non invia le foto a un server, non richiede login e non sincronizza i dispositivi. Il database PostgreSQL documentato nel progetto è un riferimento per un futuro backend, non un servizio già attivo.

Per conservare o trasferire il guardaroba:

1. Apri **Il tuo spazio → Esporta backup**. Il file JSON include anche le immagini.
2. Conserva il file in una posizione a tua scelta.
3. Nell'altro browser o dispositivo, apri GET DRESSD e scegli **Importa backup**.
4. Verifica il riepilogo e conferma: il ripristino **sostituisce** i dati già presenti in quel browser.

Il limite di importazione è **160 MB**. Se il guardaroba cresce molto, controlla le dimensioni del backup ed evita foto inutilmente pesanti. La quantità di dati salvabile dipende anche dalla quota concessa dal browser.

Usa sempre lo stesso browser e lo stesso indirizzo: `localhost:4173`, `localhost:5173`, `127.0.0.1` e il file aperto con doppio clic possono avere guardaroba separati. Esporta e importa un backup quando cambi modalità di avvio. La cancellazione dei dati del sito può eliminare il guardaroba; la navigazione privata può limitarne la persistenza. Per modificare i dati, usa una sola scheda alla volta.

Eliminare un capo elimina anche gli outfit e gli eventi che lo contengono e ricalcola le statistiche; l'app chiede conferma. **Svuota guardaroba** rimuove tutti i dati locali dell'app. Esporta un backup prima di queste operazioni se vuoi conservarli.

## Modificare il progetto

Stack: **React, TypeScript, Vite, CSS e Lucide**. Le animazioni usano CSS e rispettano la preferenza di movimento ridotto. Non sono necessari Tailwind, Framer Motion o un backend.

Per installare le dipendenze e avviare lo sviluppo:

```bash
npm install
npm run dev
```

Apri l'indirizzo indicato dal Terminale, normalmente [http://127.0.0.1:5173](http://127.0.0.1:5173). L'installazione iniziale richiede accesso al registro npm.

| Comando | Risultato |
| --- | --- |
| `npm start` | Serve la versione compilata inclusa su `127.0.0.1:4173`. |
| `npm run dev` | Avvia il server di sviluppo con aggiornamento automatico. |
| `npm run build` | Controlla TypeScript e compila la versione statica in `dist`. |
| `npm run preview` | Verifica localmente l'ultima build prodotta da Vite. |
| `npm test` | Esegue i test automatici del motore, delle operazioni sui dati e delle statistiche. |
| `npm run test:render` | Verifica il rendering HTML delle pagine con dati demo e vuoti. |
| `npm run package:standalone` | Ricompila e aggiorna il file autonomo `GET-DRESSD.html`. |

La cartella `dist` può essere pubblicata su un hosting statico. La navigazione usa l'hash dell'URL. Pubblicare il sito non aggiunge account, backup sul server o sincronizzazione: i dati rimangono locali al browser e al nuovo indirizzo. `GET-DRESSD.html` è la copia autonoma fornita nel pacchetto; dopo modifiche al sorgente usa la build aggiornata in `dist`.

## Dove intervenire

| Percorso | Responsabilità |
| --- | --- |
| `src/App.tsx` | Navigazione, stato applicativo e operazioni persistenti. |
| `src/pages/` | Home, guardaroba, generatore, raccolta outfit, cronologia e preferenze. |
| `src/components/` | Card, modali, caricamento e modifica dei capi. |
| `src/lib/engine.ts` | Generazione, valutazione, blocchi e sostituzione dei capi. |
| `src/lib/recognition.ts` | Analisi locale, trattamento immagini e adapter AI remoto. |
| `src/lib/storage.ts` | IndexedDB e validazione dei backup. |
| `src/lib/mutations.ts` | Operazioni pure su preferiti, cronologia e rimozione capi. |
| `src/lib/statistics.ts` | Metriche personali e riepilogo aggregato per futuri confronti. |
| `src/types.ts` | Contratti TypeScript del dominio. |
| `src/data/demo.ts` | Guardaroba dimostrativo e creazione del guardaroba vuoto. |
| `docs/ARCHITECTURE.md` | Scelte architetturali, limiti e punti di estensione. |
| `docs/schema.sql` | Schema PostgreSQL di riferimento per un futuro backend. |

## Funzioni future

L'adapter `RemoteRecognitionProvider` permette di collegare un endpoint di riconoscimento, ma il pacchetto usa l'analizzatore locale. Per attivare un modello multimodale servono un servizio backend e credenziali custodite sul server; nessuna chiave va inserita nel codice del browser.

Meteo automatico, calendario, valigie per viaggi, suggerimenti d'acquisto, analisi dei colori personali, virtual try-on, riconoscimento di più capi da una foto e condivisione con amici **non sono attivi in questa versione**. Temperatura e meteo sono scelti manualmente. Autenticazione, sincronizzazione, gestione dei conflitti e infrastruttura di produzione richiedono ulteriore implementazione prima di un rilascio commerciale.
