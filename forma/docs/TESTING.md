# Verifica della versione 1.1 — GET DRESSD

## Controlli eseguiti

- Build di produzione Vite e compilazione TypeScript strict riuscite.
- **37 test automatici superati**: 14 sul generatore, 14 sulle operazioni sui dati e 9 sulle statistiche.
- Rendering HTML di tutte le 6 pagine, sia con dati dimostrativi sia con guardaroba vuoto; rendering delle modali di caricamento e modifica.
- Verifica del contratto dati tra outfit generati, esportazione e validazione dei backup.
- Rendering del widget Statistiche con dati demo/vuoti, link alla cronologia e del collage con più accessori in celle separate.
- Avvio del server della build: risposte corrette per pagina, JavaScript e CSS; rifiuto dei percorsi esterni alla cartella pubblica.
- Controllo del file autonomo: un solo modulo JavaScript, sintassi valida, stili e risorse incorporati.
- Ispezione delle illustrazioni SVG dimostrative renderizzate.

I test coprono blocchi obbligatori, ruoli mancanti, unicità delle proposte, caldo/freddo, occasioni, preferenze, sostituzione singola, avvisi, immutabilità dei dati, duplicati giornalieri, conteggi, salvataggi per firma, rimozione selettiva e conservazione delle preferenze non coinvolte. Le statistiche sono verificate anche al confine dei 30 giorni, nel fuso Europe/Rome e al cambio dell’ora; escludono eventi futuri, distinguono preferiti espliciti da utilizzo e producono snapshot aggregati senza nomi, foto o ID personali.

## Limite della verifica

Nell'ambiente di sviluppo non era disponibile un browser eseguibile e il download di Chromium era bloccato. Non sono quindi stati eseguiti un collaudo interattivo completo desktop/mobile o test reali di fotocamera, canvas e IndexedDB su Safari/Chrome. Il rendering HTML verifica i componenti, non il layout visivo nel browser né le interazioni reali.

## Comandi riproducibili

```bash
npm install
npm test
npm run test:render
npm run package:standalone
npm start
```

## Controllo pratico sul dispositivo

1. Aprire la home; verificare navigazione desktop e barra inferiore a 320, 390 e 430 px e in orizzontale. La scheda **Tu** apre impostazioni e statistiche.
2. Caricare JPEG/PNG/WebP, anche multipli; provare Foto, fotocamera e HEIC su Safari. Correggere una categoria e controllare la preview. Aprire la tastiera e verificare che salvataggio e chiusura restino accessibili.
3. Salvare, ricaricare la pagina e verificare la persistenza della foto.
4. Generare outfit; bloccare un capo e verificare che le nuove proposte lo contengano tutte.
5. Cambiare un parametro: le vecchie proposte devono richiedere rigenerazione prima di essere scelte.
6. Sostituire un capo e controllare che gli altri rimangano; salvare e indossare il risultato.
7. Registrare di nuovo lo stesso look nello stesso giorno: la cronologia non deve duplicarsi.
8. Esportare un backup, importarlo e confermare il riepilogo; verificare foto e cronologia.
9. Usare Tab/Escape nelle modali e attivare Animazioni ridotte nelle preferenze.
10. Per le prove distruttive, utilizzare soltanto la collezione demo o conservare prima un backup.
11. In Statistiche cambiare periodo, registrare un outfit e controllare i conteggi aggiornati. Il confronto amici è presentato come futuro e non invia dati.
12. Aggiungere alla Home da Safari: verificare nome GET DRESSD, icona GD, margini per notch/indicatore Home e avvio sullo stesso percorso GitHub Pages. Provare la condivisione del backup verso File.
