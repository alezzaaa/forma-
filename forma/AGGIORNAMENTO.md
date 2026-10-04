# Aggiornare GET DRESSD a 1.2

La modifica è sul branch `codex/get-dressd-1.2`, basato su `1db7a4f`. Revisionare la pull request e unirla a `main` per attivare il workflow GitHub Pages esistente. Il workflow continua a compilare `forma/` e pubblicare `forma/dist`. Non occorre cambiare repository, dominio o impostazioni Pages.

Prima del merge, dalla cartella `forma` con Node >= 22.13.0:

```sh
npm ci
npm test
npm run test:render
npm run build
```

Per il pacchetto locale: `npm run package:standalone`; `npm start` serve la build su `http://127.0.0.1:4173`. Il file `GET-DRESSD.html` viene generato dalla build, senza modifiche manuali ai bundle.

Il database IndexedDB e il formato backup rimangono versione 1. Usando lo stesso browser e lo stesso indirizzo si continua ad accedere ai dati esistenti. Esporta un backup da **Profilo → Backup** prima di cambiare origine o cancellare i dati del browser.

L’installazione in Home conserva manifest e icone della 1.1. Il sito non include un service worker: installazione e disponibilità offline sono proprietà diverse. Prima del rilascio verificare su iPhone reale Safari/Home, tastiera, safe area, rotazione, ritorno dal background e VoiceOver; i test desktop non sostituiscono queste prove.

Dettagli: [verifiche](docs/TESTING.md) e [report 1.2](docs/GET_DRESSD_1.2_IMPLEMENTAZIONE.md).
