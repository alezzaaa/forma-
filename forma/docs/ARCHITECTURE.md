# GET DRESSD — architettura

## MVP eseguibile

L'app è una SPA React + TypeScript distribuita da Vite. L'interfaccia è in italiano e usa una navigazione persistente con adattamento mobile, schede visive dei capi, filtri e modali per modifica e caricamento. Le animazioni CSS rispettano la preferenza di movimento ridotto. Il motore di outfit e il riconoscimento delle immagini sono separati dai componenti: le funzioni di dominio si possono riutilizzare dietro una futura API.

Il funzionamento locale non richiede un account, un database remoto, credenziali AI o chiamate a servizi di terzi. Le foto importate e il guardaroba restano nel browser del dispositivo. Non sono sincronizzati automaticamente tra browser, dispositivi o indirizzi web diversi. Cancellare i dati del sito può eliminare il guardaroba: l'esportazione JSON permette di conservarlo e importarlo nuovamente.

## Modello e persistenza

`src/types.ts` definisce il contratto `AppData`, versione 1, con capi, outfit salvati, eventi d'uso e preferenze. `src/lib/storage.ts` espone `loadData`, `saveData` e `parseBackup`.

La versione 1.1 cambia il nome pubblico in GET DRESSD, mantenendo il nome interno IndexedDB `forma-wardrobe`, il formato `AppData` versione 1 e la cartella di progetto `forma`. L'aggiornamento non richiede una migrazione dei dati. Il browser deve restare sullo stesso indirizzo per accedere al guardaroba salvato in precedenza.

IndexedDB contiene un archivio `snapshots` con una voce `current`: una singola transazione sostituisce tutto il documento. Le scritture vengono serializzate, così una modifica precedente non può concludersi dopo una più recente nella stessa scheda. Viene salvata una copia validata del payload. Errori di quota, accesso o corruzione sono riportati all'interfaccia; non vengono sostituiti silenziosamente con dati vuoti. Il chiamante deve attendere il salvataggio o segnalare l'errore e mantenere il contenuto in memoria per permetterne l'esportazione. Questa prima versione non risolve modifiche concorrenti provenienti da più schede: usare una sola scheda per modificare il guardaroba.

Un backup viene controllato interamente prima dell'importazione: versione, campi, enum, intervalli numerici, ID univoci, date, dimensioni, riferimenti ai capi e immagini. Sono ammesse soltanto immagini PNG, JPEG e WebP incorporate come data URL con intestazione coerente; non sono accettati SVG o URL remoti. Il limite del documento importabile è 160 MB, quello di ciascuna immagine incorporata è 16 MB; il normale flusso di importazione ridimensiona le foto. I capi dimostrativi possono avere un'immagine vuota e vengono illustrati dall'interfaccia. Questi limiti non rappresentano una garanzia di spazio disponibile: la quota effettiva è stabilita dal browser.

Il legame tra un evento d'uso e un outfit è un identificativo d'archivio: l'utente può indossare una proposta senza salvarla tra gli outfit preferiti. Ogni evento contiene quindi anche il nome e gli ID dei capi. I riferimenti ai capi devono esistere nel documento importato. Quando elimina un capo, l’app elimina interamente gli outfit e gli eventi che lo contengono, dopo conferma esplicita. Ricalcola conteggi e ultime date dalla cronologia restante e conserva le preferenze apprese per le combinazioni non coinvolte. Per una versione commerciale, è preferibile archiviare anziché cancellare, mantenendo i dati storici.

I dati dimostrativi di `src/data/demo.ts` includono 22 capi, 4 combinazioni salvate e 5 eventi d'uso. Conteggi e ultime date d'uso sono calcolati dagli eventi. `createEmptyData` consente di iniziare con un guardaroba personale vuoto.

## Composizione degli outfit

Il generatore usa esclusivamente ID del guardaroba corrente. I vincoli espliciti, inclusi i capi bloccati, vengono considerati prima della valutazione. Il punteggio combina compatibilità cromatica, occasione, stile, temperatura, stagione, formalità e segnali personali. L'uso recente limita le ripetizioni; preferiti, apprezzamenti e combinazioni rifiutate influenzano le proposte. La composizione segue ruoli distinti: top, parte inferiore, scarpe e, quando pertinenti, strato esterno/accessori.

Le proposte sono una selezione euristica spiegabile, non il risultato di un modello AI addestrato sul gusto dell'utente. Se il guardaroba non permette tre alternative realmente distinte o non contiene una categoria indispensabile, l'app deve comunicarlo. Il blocco non deve essere ignorato per riempire una proposta.

## Analisi foto e integrazione AI

L'analizzatore locale propone metadati provvisori e lascia sempre la conferma all'utente. Non è un classificatore visivo affidabile di materiali, categorie o stagioni. Il trattamento dello sfondo dipende dalle caratteristiche della foto e richiede controllo della preview; le immagini con sfondi complessi richiederanno un modello di segmentazione dedicato. Il materiale deve restare sconosciuto quando non ci sono informazioni sufficienti.

Il caricamento tenta la decodifica HEIC/HEIF con le capacità del browser e normalizza le immagini supportate. In caso di formato non decodificabile viene richiesta una conversione in JPEG/PNG. La persistenza continua ad accettare soltanto immagini PNG, JPEG e WebP: l'estensione del supporto in ingresso non allarga il contratto dei backup.

Per integrare un servizio multimodale, sostituire l'adapter in `src/lib/recognition.ts` con un endpoint autenticato che accetta una foto e restituisce dati conformi al contratto, confidenza per campo e avvertenze. Tenere le API key sul server. Conservare valori suggeriti e valori confermati separatamente in una futura migrazione, non sovrascrivere correzioni manuali e dare all'utente il controllo sull'invio delle foto. Prevedere time-out, annullamento, retry e un fallback alla compilazione manuale.

## Statistiche e futuri confronti

`src/lib/statistics.ts` calcola le metriche senza modificare i dati. I periodi disponibili sono gli ultimi 30 giorni di calendario locale e l'intera cronologia fino al momento del calcolo. Le statistiche di utilizzo derivano dagli eventi; la composizione descrive il guardaroba attuale. Il preferito esplicito e il capo più indossato sono concetti distinti. Gli stati senza capi, senza utilizzi o senza preferiti hanno messaggi dedicati.

`StatisticsWidget` riceve `AppData` e un callback di navigazione verso la cronologia. `buildComparisonSnapshot` prepara un contratto versionato con intervallo, fuso orario, metodologia e aggregati. Esclude foto, nomi, identificativi dei capi, note e singoli eventi. È una base per un futuro confronto esplicito: non invia né pubblica nulla. Prima di introdurre amici serviranno account, consenso alla condivisione, controllo degli accessi e regole comuni sui periodi confrontati.

## Esperienza iPhone

Il viewport usa `viewport-fit=cover`; la UI riserva spazio per le safe area senza disattivare lo zoom. I metadati Apple e `public/manifest.webmanifest` descrivono l'installazione dalla Home. `start_url` e `scope` sono relativi, così l'app funziona anche sotto il percorso GitHub Pages `/forma-/`. Le icone sono PNG da 180, 192 e 512 px, derivate dall'originale SVG. Non sono inclusi service worker o cache per garantire l'avvio offline del sito.

La copia autonoma `GET-DRESSD.html` incorpora bundle, CSS e icone e rimuove il collegamento al manifest. Resta distinta dall'app ospitata: i browser possono attribuire ai file locali uno spazio di salvataggio diverso o limitato.

## Passaggio a un prodotto commerciale

`docs/schema.sql` è un riferimento PostgreSQL normalizzato, non una dipendenza eseguita dall'MVP. Include utenti, capi, stagioni e colori secondari, outfit e relative associazioni, preferenze e cronologia. Le chiavi composte nelle associazioni impediscono riferimenti tra proprietari diversi; l'API deve comunque applicare l'autorizzazione per utente a ogni operazione. Le foto vanno in object storage privato; il database memorizza le chiavi. Le viste calcolano utilizzi e ultime date dalla cronologia. L'archiviazione conserva gli eventi anche quando un capo non è più disponibile.

La migrazione può mantenere gli attuali contratti TypeScript dietro un repository remoto e aggiungere autenticazione, revisioni per conflitti, migrazioni versionate, paginazione, immagini con miniature, backup e cancellazione account. I suggerimenti non richiedono di condividere l'intera cronologia con un modello AI.

## Estensioni previste

| Estensione | Punto di integrazione |
| --- | --- |
| Meteo automatico | Provider meteo che precompila temperatura e condizioni dopo scelta del luogo. |
| Calendario ed eventi | Adapter calendario che traduce eventi autorizzati in occasione e vincoli. |
| Valigia per viaggi | Selettore di combinazioni che riusa capi per più giorni e occasioni. |
| Acquisti e analisi colore | Servizi separati che evidenziano mancanze senza inserire capi inesistenti nelle proposte. |
| Virtual try-on | Job asincrono su server con consenso all'uso di foto della persona. |
| Foto di outfit completi | Segmentazione multi-capo, revisione degli elementi e inserimento singolo. |
| Condivisione | Pubblicazione esplicita di una copia dell'outfit con controllo di visibilità. |
| Confronto statistiche | Snapshot aggregati con metodo e periodo comuni, autorizzazione esplicita tra amici. |

Queste estensioni non sono attive nell'MVP. Anche il meteo resta una scelta manuale finché non viene integrato un provider.


## Sessioni 1.2 e compatibilità

`AppData.version` rimane 1; il database `forma-wardrobe`, store `snapshots`, resta invariato. Oggi usa `TodaySession` in App, mai nel backup. Le pagine principali mantengono stato e scroll durante il cambio tab; le sheet si chiudono prima della navigazione. Un contatore transitorio distingue nuovi ingressi dallo stesso capo.

I callback wear/save/reject espongono Promise e completano soltanto dopo la scrittura serializzata; gli errori restano recuperabili nelle viste. La deduplicazione avviene per firma dei capi e giorno locale. `getReplacementCandidates` e `replaceGarmentWith` separano scelta e applicazione, rivalidano l’inventario e preservano gli altri ID. Le varianti sono bozze indipendenti, normalizzate al contesto di Crea se provengono da un evento senza metadati.

Il carosello usa CSS scroll-snap, pulsanti e indice calcolato dallo scroll. `useModalSheet` gestisce VisualViewport, scroll, focus, Escape e isolamento inert del contenuto sottostante. `GarmentFields` mantiene un solo modello per editor e revisione upload.
