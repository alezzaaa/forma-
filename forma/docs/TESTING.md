# Verifica GET DRESSD 1.2

Dalla cartella `forma`, con Node >= 22.13.0:

```sh
npm ci
npm test
npm run test:render
npm run build
```

La suite comprende 57 test: motore e sostituzione esplicita, mutazioni e deduplicazione per giorno locale, statistiche, stato di Oggi, filtri, validazione capo e UUID. I test UUID coprono il percorso nativo, il fallback senza `randomUUID`, i bit di versione/variante, il formato, l’unicità e l’assenza di Web Crypto. Il rendering verifica le sei pagine con demo/vuoto, le modali, Statistiche, il contratto di backup e tutti i capi nei collage con più accessori. Crea parte senza risultati precalcolati. Il test di rendering non apre porte di rete. Non è configurato uno script lint; la build include il controllo TypeScript.

## Verifiche interattive riproducibili

È presente `npm run test:browser`, separato dai tre comandi obbligatori. Richiede Playwright e un browser Chromium disponibili nell’ambiente di QA. La dipendenza è opzionale e non entra nel bundle dell’app. Lo script accetta:

- `PLAYWRIGHT_MODULE`: percorso al modulo ESM Playwright; omesso usa `playwright` installato nell’ambiente.
- `CHROME_EXECUTABLE`: eseguibile Chrome/Chromium; omesso usa il browser gestito da Playwright.
- `QA_OUTPUT`: directory per schermate e `browser-results.json`; default `artifacts/qa` (ignorata da Git).
- `QA_UUID_FALLBACK=1`: disabilita `crypto.randomUUID` prima dell’avvio dell’app per eseguire l’intera suite con `getRandomValues`.

Esempio dopo l’installazione degli strumenti di QA:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:browser
```

Il test avvia un server locale e un contesto browser isolato: non accede al guardaroba dell’utente. Controlla registrazione degli ID visibili, doppio tocco, ritorno tra tab, scelta/annullamento sostituzione, focus, salvataggi falliti e riprova, rifiuto persistito prima della sostituzione, risultati obsoleti, conteggi/carosello, conflitti di blocco, filtri temporanei anche con zero risultati, editor senza perdita dei metadati nascosti, varianti dalla cronologia, filtro favorite, eliminazione outfit e avviso sulla cancellazione capi. I fallimenti IndexedDB sono simulati prima della transazione: i dati precedenti devono restare intatti.

Layout verificati in Chrome headless a 320, 375, 390, 430 e 1440 CSS px, oltre a 844 × 390, testo essenziale ingrandito via CSS e motion ridotto. A 390 × 844 il look e l’azione primaria di Oggi devono stare sopra i tab. Nessun risultato del test equivale a una certificazione WCAG o hardware.

## UUID su Safari e HTTP LAN

`src/lib/id.ts` centralizza tutti gli ID creati dall’app. Usa `crypto.randomUUID` quando è una funzione; altrimenti genera un UUID v4 con 16 byte da `crypto.getRandomValues`, impostando versione 4 e variante RFC 9562. Non usa `Math.random` e non modifica gli ID esistenti o lo schema persistente.

Su un IP LAN servito via HTTP `randomUUID` non è disponibile perché il contesto non è sicuro; `getRandomValues` è utilizzabile anche in quel contesto. Riferimento: [Web Crypto su MDN](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

Con Playwright disponibile e un’interfaccia LAN attiva:

```sh
QA_UUID_FALLBACK=1 npm run test:browser
npx playwright install webkit
node scripts/verify-id-browser.mjs
```

Lo script dedicato accetta `PLAYWRIGHT_MODULE` come la suite generale. Avvia un server Vite temporaneo su tutte le interfacce e usa contesti WebKit isolati a 390 × 844 su localhost e sull’IP LAN. Verifica che il primo esponga `randomUUID` e il secondo no, quindi controlla apertura Guardaroba, 1000 UUID, generazione outfit, sostituzione esplicita, collisione degli ID proposti, cronologia, riconoscimento foto, apertura bozza manuale e round-trip IndexedDB/backup versione 1. Il server viene chiuso a fine test. Non usa dati dell’utente e non sostituisce un collaudo su iPhone fisico.

Due osservazioni aggiuntive restano fuori dalla correzione UUID: nel tentativo di estendere l’intera suite a WebKit su LAN si sono osservati ricaricamenti durante la navigazione, invalidando il controllo di stabilità dell’outfit; il validatore persistente già presente rifiuta `image: ''` per capi non demo, quindi il salvataggio di un capo manuale senza foto richiede una correzione separata. Il test UUID verifica l’apertura della bozza manuale, non certifica quel salvataggio. Questi casi non sono conteggiati come test superati.

## Distribuibile

```sh
npm run package:standalone
npm start
```

`GET-DRESSD.html` è generato dalla build; i bundle e `dist` non si modificano manualmente. `Forma.html` rimane il vecchio artefatto storico e non è la consegna 1.2.

## Collaudo ancora necessario su iPhone reale

- Safari e aggiunta alla Home, portrait/landscape.
- Tastiera reale, barre Safari espanse/ridotte, safe area e ritorno da background.
- VoiceOver, zoom Safari e dimensioni testo di sistema.
- Foto/fotocamera e decodifica HEIC/HEIF dipendente dal browser.
- Quota reale e cancellazione dati del browser; esportazione/importazione verso File.
- Misurazione del percorso quotidiano in cinque secondi con utenti reali.

Il sito mantiene la disponibilità online della 1.1 senza aggiungere un service worker; l’installazione Home non prova l’avvio offline.
