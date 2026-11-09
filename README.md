# Programmi adunanze

Pagina per compilare i programmi delle adunanze (infrasettimanale e fine settimana) con la grafica dei
programmi della congregazione. Il bimestre è già impostato dalla *Guida per l’adunanza Vita e ministero* e
dalla *Torre di Guardia* per lo studio: chi compila scrive solo i nomi, può cambiare una data e mettere
un’assemblea o un congresso al posto di un’adunanza, poi scarica il PDF.

## Come è fatto

- `dist/app.js` — la pagina (un solo file), costruita da `src/` con `npm run build`.
- `dati/` — un file per mese con la struttura del programma, più `indice.json` con i bimestri disponibili.
  Nessun nome di persona: i nomi stanno nel Foglio Google del proprietario.
- `apps-script/Codice.gs` — il codice da incollare una volta nel Foglio Google «Programmi adunanze – dati».
  Serve la pagina, controlla chi può compilare (scheda *Accessi*) e salva i dati (scheda *Programma*).
- `strumenti/` — script che leggono i PDF della guida e della rivista e generano `dati/`.

## Nuovo bimestre

1. Leggere i PDF (guida `mwb_I_AAAAMM.pdf`, riviste `w_I_AAAAMM.pdf`) con `strumenti/parse_mwb.py` e `parse_w.py`.
2. Generare i mesi con `strumenti/build2.py dati` e aggiungere il bimestre in `dati/indice.json`.
3. Colori: infrasettimanale = colore del titolo «Vita cristiana e ministero» sulla copertina della Guida
   (`stile.colori.infra` nei mesi del bimestre). Fine settimana = Torre di Guardia: aggiungere copertina e articoli
   in `strumenti/colori_tdg.json` e lanciare `python3 strumenti/colori_tdg.py dati` (scurisce da solo i colori troppo chiari).
4. Fare il push: la pagina lo vede subito, senza toccare Apps Script.
