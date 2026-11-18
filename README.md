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

## Portale della congregazione

Un'unica pagina per tutto l'ecosistema, con un link personale per persona (`…/exec?k=CODICE`) e senza account
Google: `portale/app.html` (pagina completa, nessuna compilazione) caricata da `portale/Codice.gs`, da incollare nel
Foglio «Congregazione – dati». L'app web gira **come il proprietario** (Esegui come: Io · Chi ha accesso: Chiunque):
il Foglio non si condivide con nessuno e lo script manda a ciascuno solo i dati del suo ambito.

- Scheda **Fratelli**: riga 1 sezioni, riga 2 intestazioni, riga 3 regola di sblocco (anziani, nominati, fratelli,
  fratelli battezzati, tutti), dati dalla riga 4. Anagrafica A–P, abilitazioni da Q, Note in fondo.
- Scheda **Accessi**: una riga per persona con codice segreto, ambiti (`tutto`, `inf`, `fs`, `reparti`, `comitive`,
  `oem`) e casella Attivo. Chi non ha ambiti vedrà solo il sondaggio.
- Scheda **Registro**: accessi (uno al giorno per persona) e ogni modifica, con chi e quando.
- Blocchi controllati dal server a ogni salvataggio; la sigla e le spunte non più ammesse si sistemano da sole.
- Backup settimanale del Foglio nella cartella «Congregazione – backup» (ultime 8 copie).
- Nessun nome su GitHub: i dati stanno solo nel Foglio.
- **Calendario** (scheda *Impostazioni*, chiave `calendario`): periodi con giorno e ora delle adunanze (ognuno vale dalla
  sua data), settimane speciali (lunedì, nome, luogo, adunanze sì/no, comitive sì/no), comitive di congregazione.
  Le settimane appartengono al mese del loro lunedì.
- **Sondaggio** (schede *Sondaggi* e *Risposte*): un sondaggio ha mesi delle adunanze per i nominati, mese per i fratelli
  in turnazione, mese delle comitive, scadenza e destinatari. Ognuno vede solo le sezioni che lo riguardano. Chiavi:
  adunanza `<lunedì>-INFRA|FINE`, comitiva `<data>|<ora>`. Le risposte dopo la scadenza sono segnate.
  Pagine per Luca: Sondaggi (crea), Invio dei link (WhatsApp, promemoria, compila per conto), Risultati.
- **Variazioni** del calendario: comitiva annullata (resta grigia con il motivo), comitiva aggiunta, adunanza spostata
  (annulla da sola le comitive del pomeriggio di quel giorno). Valgono per sondaggio, comitive e reparti; chi ha
  risposto prima di una variazione compare in «Da avvisare».
- **Sondaggio dell'opera pubblica** (`tipo: oem`): a parte, solo per gli abilitati OEM, con i turni delle postazioni
  del mese (chiave `<data>|<postazione>|<fascia>`).
- **Turnazione reparti** (`portale/reparti.js` + `portale/motore-reparti.js`): stesso motore e stesse regole
  dell'artefatto di dicembre. Abilitazioni dall'anagrafica, assenze dal sondaggio e quelle segnate a mano (anche
  «dal… al…»), parti dal Foglio «Programmi adunanze» (chiave `foglioProgrammi` in Impostazioni, righe della guida su
  GitHub), storico dei mesi prima. Si salva in Impostazioni (`reparti:AAAA-MM`, turni in forma compatta). Foglio A4
  generale e personale con `portale/stampa.css`.
- **Comitive** (`portale/comitive.js`): offerte dal sondaggio, proposta con priorità a chi ha una sola disponibilità
  e quote proporzionali alle offerte; tre versioni del foglio A4. Si salva in `comitive:AAAA-MM`.
- **Programmi adunanze ed Espositori nel portale** (`portale/programmi.js`): le pagine di sempre (`dist/app.js`,
  `espositori/app.html`) aperte in un riquadro a tutto schermo; il riquadro chiede al portale (postMessage) e il portale
  chiama il server con il link personale (`pa_*`, `oem_*`). I dati restano nei loro Fogli (chiavi `foglioProgrammi`,
  `foglioEspositori` in Impostazioni), aperti dallo script come il proprietario: i Fogli non vanno più condivisi.
  Il podio arriva dalla Turnazione reparti del portale; gli invii Telegram partono dallo script del portale (pagina Telegram).
- Velocità: dentro ogni chiamata ogni scheda si legge una volta sola; i codici di accesso stanno nella cache dello
  script (si svuota a ogni modifica degli Accessi).

### Bacheca e pubblicazione

In bacheca va solo quello che è pubblicato: ogni programma ha il suo pulsante **Pubblica** (un mese alla volta), che salva una copia
nelle Impostazioni (`pub:<tipo>:AAAA-MM`). Chi compila può continuare a lavorare: la bacheca cambia solo alla pubblicazione successiva.
I nominati vedono anche la vista **Adunanze e reparti** (ogni adunanza con la sua turnazione accanto, impaginazione di CM).

### Pronto per WhatsApp

Settimana per settimana, le immagini da mandare nei gruppi:

| Immagine | Chi la conferma | Chi la vede |
|---|---|---|
| Presidente (per adunanza) | chi compila quel programma (inf / fs) | tutti i nominati |
| Audio/Video · prove (podio + parti con assistente) | chi compila quel programma | chi compila, coordinatore e assistente Audio/Video |
| Reparto Audio/Video, Uscieri, Letteratura e territori, Pulizie (per settimana) | in automatico, quando si pubblica la turnazione | coordinatore e assistente di quel reparto (colonne «RUOLI NEI REPARTI») |

Luca vede tutto. Alla pubblicazione della turnazione il portale prepara in un riquadro nascosto i PNG dei reparti e li salva nella
cartella Drive delle immagini (`wa:reparti:<lunedì>`); l'attivatore Telegram li manda con lo stesso anticipo, prima della prima
adunanza della settimana, e li rimanda con «Aggiornamento» se la turnazione cambia ed è ripubblicata.
