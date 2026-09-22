# Verifica della versione 1.0

## Controlli eseguiti

- Build di produzione Vite e compilazione TypeScript strict riuscite.
- **28 test automatici superati**: 14 sul generatore e 14 sulle operazioni sui dati.
- Rendering HTML di tutte le 6 pagine, sia con dati dimostrativi sia con guardaroba vuoto; rendering delle modali di caricamento e modifica.
- Verifica del contratto dati tra outfit generati, esportazione e validazione dei backup.
- Avvio del server della build: risposte corrette per pagina, JavaScript e CSS; rifiuto dei percorsi esterni alla cartella pubblica.
- Controllo del file autonomo: un solo modulo JavaScript, sintassi valida, stili e risorse incorporati.
- Ispezione delle illustrazioni SVG dimostrative renderizzate.

I test coprono blocchi obbligatori, ruoli mancanti, unicità delle proposte, caldo/freddo, occasioni, preferenze, sostituzione singola, avvisi, immutabilità dei dati, duplicati giornalieri, conteggi, salvataggi per firma, rimozione selettiva e conservazione delle preferenze non coinvolte.

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

1. Aprire la home; verificare navigazione desktop e barra inferiore a 390 px.
2. Caricare JPEG/PNG/WebP, anche multipli; correggere una categoria e controllare la preview.
3. Salvare, ricaricare la pagina e verificare la persistenza della foto.
4. Generare outfit; bloccare un capo e verificare che le nuove proposte lo contengano tutte.
5. Cambiare un parametro: le vecchie proposte devono richiedere rigenerazione prima di essere scelte.
6. Sostituire un capo e controllare che gli altri rimangano; salvare e indossare il risultato.
7. Registrare di nuovo lo stesso look nello stesso giorno: la cronologia non deve duplicarsi.
8. Esportare un backup, importarlo e confermare il riepilogo; verificare foto e cronologia.
9. Usare Tab/Escape nelle modali e attivare Animazioni ridotte nelle preferenze.
10. Per le prove distruttive, utilizzare soltanto la collezione demo o conservare prima un backup.
