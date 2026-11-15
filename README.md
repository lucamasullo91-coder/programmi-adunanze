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

## Immagini WhatsApp

Pulsante **Immagini WhatsApp**: per ogni adunanza in arrivo, l’immagine per il presidente e quella per il reparto
Audio/Video (1080×1350, `src/wa/`), fatte dal programma. Chi compila preme **Conferma** (le immagini vanno nella
cartella «Programmi adunanze – immagini WhatsApp» accanto al Foglio) oppure **Modifica**: il nome cambiato resta
barrato (chiave `<riga>:<campo>~prima`), anche sul programma, e le immagini si confermano di nuovo. Lo schema del
discorso pubblico è la chiave `<riga>:schema`, il podio `<adunanza>:podio` (se scritto a mano) oppure quello letto da
Congregation Manager (`ponte_podio`) e tenuto nella cache dello script. `src/wa/immagine.tsx` è lo stesso file di
Congregation Manager (`src/components/whatsapp/immagine.tsx`): tenerli uguali.

Invii su Telegram: il proprietario apre l’indirizzo della pagina con `?riservate` in fondo, scrive token e chat di
Telegram, indirizzo e chiave pubblica di Supabase e la chiave del podio (presa da Congregation Manager → Programmi →
Reparti → WhatsApp), poi preme «Attiva invii automatici». Le chiavi stanno nelle proprietà utente del proprietario:
chi compila non le vede. Ogni 15 minuti lo script manda le immagini confermate N giorni prima alle ore scelte (3 e
19:00), di nuovo con «Aggiornamento» se vengono riconfermate, e un avviso se all’ora dell’invio non sono confermate.

## Nuovo bimestre

1. Leggere i PDF (guida `mwb_I_AAAAMM.pdf`, riviste `w_I_AAAAMM.pdf`) con `strumenti/parse_mwb.py` e `parse_w.py`.
2. Generare i mesi con `strumenti/build2.py dati` e aggiungere il bimestre in `dati/indice.json`.
3. Colori: infrasettimanale = colore del titolo «Vita cristiana e ministero» sulla copertina della Guida
   (`stile.colori.infra` nei mesi del bimestre). Fine settimana = Torre di Guardia: aggiungere copertina e articoli
   in `strumenti/colori_tdg.json` e lanciare `python3 strumenti/colori_tdg.py dati` (scurisce da solo i colori troppo chiari).
4. Fare il push: la pagina lo vede subito, senza toccare Apps Script.

## Programma espositori (OEM)

Pagina separata per il programma dell'opera con espositori mobili, con la stessa tecnica: `espositori/app.html`
(pagina completa, nessuna compilazione) caricata da `espositori/Codice.gs`, da incollare in un Foglio Google a parte
«Programma espositori – dati» (schede *Accessi* e *Mesi*: un mese per riga, in JSON, con numero di versione così due
persone non si sovrascrivono). Ruoli in *Accessi*: `compila`, `legge` (il proprietario del Foglio può tutto).
Struttura di partenza: le postazioni della congregazione, senza nomi; «Nuovo mese» copia postazioni, orari e
allestimento del mese prima con i nomi vuoti. I nomi stanno solo nel Foglio.

### Carrelli (allestimento)

Scheda **Carrelli** della stessa pagina: per ogni sala (Pianura, Soccavo) e mese, da 1 a 4 carrelli con poster e
3 ripiani da 2 posti, obiettivo, suggerimenti e link al video di jw.org. Le immagini stanno nel Foglio (scheda
`Catalogo`, una riga per voce, già rimpicciolite); le pubblicazioni si aggiungono incollando un link di jw.org
(lo script legge la pagina con `jwPagina` e scarica la copertina scelta con `jwImmagine`), i poster da una foto.
Gli allestimenti stanno nella scheda `Carrelli` (chiave `sala|AAAA-MM`). Il PDF è una pagina A4 per sala con il
pulsante del video cliccabile.
