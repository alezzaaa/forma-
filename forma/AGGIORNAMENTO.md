# Aggiornare il sito a GET DRESSD 1.1

Il pacchetto contiene la nuova versione. Il sito online cambia dopo che carichi i file e GitHub completa la pubblicazione.

1. Scarica ed estrai `GET-DRESSD-1.1.0.zip` sul computer.
2. Apri il tuo repository [alezzaaa/forma-](https://github.com/alezzaaa/forma-).
3. Nella pagina principale del repository scegli **Add file → Upload files**.
4. Trascina la cartella **`forma`** estratta dallo ZIP. Deve sostituire i file negli stessi percorsi, per esempio `forma/package.json` e `forma/src/App.tsx`. Non entrare prima nella cartella `forma` su GitHub, altrimenti rischi di creare `forma/forma/`.
5. Scrivi come messaggio `Aggiorna a GET DRESSD 1.1` e premi **Commit changes** sul ramo `main`.
6. Apri **Actions** e aspetta che il workflow di pubblicazione diventi verde. Può ancora chiamarsi “Pubblica Forma”: il suo nome non influisce sull'app.
7. Riapri [il sito](https://alezzaaa.github.io/forma-/) e ricarica la pagina. Troverai **GET DRESSD** e il widget **Statistiche** in **Tu / Il tuo spazio**.

Non caricare lo ZIP come unico file: GitHub Pages ha bisogno dei file estratti. Non caricare `node_modules`. Conserva il workflow esistente `.github/workflows/deploy.yml`: continua a compilare dalla cartella `forma` e pubblicare `forma/dist`. Non serve rinominare il repository né cambiare le impostazioni di Pages.

Il nome interno del database non cambia. Utilizzando lo stesso browser e lo stesso indirizzo, il guardaroba già salvato resta compatibile. Puoi conservare una copia anche da **Il tuo spazio → Esporta backup**.

## Icona su iPhone

Apri il sito aggiornato in Safari, poi il menu di condivisione e **Aggiungi alla schermata Home**. Conferma il nome **GET DRESSD** e, se presente, attiva **Apri come app web**. Vedi la [guida Apple](https://support.apple.com/it-it/guide/iphone/iphea86e5236/ios).

Se un'icona già presente mantiene il vecchio nome o disegno, puoi continuare a usarla: l'app si aggiorna visitando il sito. Prima di rimuovere una vecchia app dalla Home per aggiungerla nuovamente, conserva un backup del guardaroba.

## Novità

- Nome, icona e metadati **GET DRESSD**.
- **Statistiche** personali con vista degli ultimi 30 giorni o di sempre; base tecnica per confrontarle in futuro con gli amici.
- Navigazione, modali e controlli rivisti per il tocco su iPhone.
- Caricamento HEIC/HEIF quando il browser può decodificare il formato, con messaggio dedicato negli altri casi.

Il confronto con gli amici non è ancora attivo. I dati restano locali al browser e non vengono inviati a un servizio esterno.
