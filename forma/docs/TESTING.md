# Verifica GET DRESSD 1.2

Dalla cartella `forma`, con Node >= 22.13.0:

```sh
npm ci
npm test
npm run test:render
npm run build
```

La suite comprende 53 test: motore e sostituzione esplicita, mutazioni e deduplicazione per giorno locale, statistiche, stato di Oggi, filtri e validazione capo. Il rendering verifica le sei pagine con demo/vuoto, le modali, Statistiche, il contratto di backup e tutti i capi nei collage con più accessori. Crea parte senza risultati precalcolati. Il test di rendering non apre porte di rete.

## Verifiche interattive riproducibili

È presente `npm run test:browser`, separato dai tre comandi obbligatori. Richiede Playwright e un browser Chromium disponibili nell’ambiente di QA. La dipendenza è opzionale e non entra nel bundle dell’app. Lo script accetta:

- `PLAYWRIGHT_MODULE`: percorso al modulo ESM Playwright; omesso usa `playwright` installato nell’ambiente.
- `CHROME_EXECUTABLE`: eseguibile Chrome/Chromium; omesso usa il browser gestito da Playwright.
- `QA_OUTPUT`: directory per schermate e `browser-results.json`; default `artifacts/qa` (ignorata da Git).

Esempio dopo l’installazione degli strumenti di QA:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:browser
```

Il test avvia un server locale e un contesto browser isolato: non accede al guardaroba dell’utente. Controlla registrazione degli ID visibili, doppio tocco, ritorno tra tab, scelta/annullamento sostituzione, focus, salvataggi falliti e riprova, rifiuto persistito prima della sostituzione, risultati obsoleti, conteggi/carosello, conflitti di blocco, filtri temporanei anche con zero risultati, editor senza perdita dei metadati nascosti, varianti dalla cronologia, filtro favorite, eliminazione outfit e avviso sulla cancellazione capi. I fallimenti IndexedDB sono simulati prima della transazione: i dati precedenti devono restare intatti.

Layout verificati in Chrome headless a 320, 375, 390, 430 e 1440 CSS px, oltre a 844 × 390, testo essenziale ingrandito via CSS e motion ridotto. A 390 × 844 il look e l’azione primaria di Oggi devono stare sopra i tab. Nessun risultato del test equivale a una certificazione WCAG o hardware.

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
