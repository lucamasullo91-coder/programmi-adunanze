# CLAUDE.md — Portale della Congregazione

Istruzioni fisse per Claude quando lavora su questo repository. Leggile tutte prima di toccare il codice.
Se una regola qui è in conflitto con una richiesta, chiedi prima di procedere.

## 1. Il progetto in breve

Portale web (Google Apps Script + Foglio Google «Congregazione – dati») per la congregazione Napoli Pianura Trencia.
Lo usano Luca (proprietario) e alcuni fratelli che compilano i programmi. Sezioni:

- **Programmi adunanze** — infrasettimanale e fine settimana. Chi compila inserisce solo i nomi.
- **Turnazione reparti** — uscieri, audio/video, letteratura, territori, più le pulizie (lette dal Programma pulizie).
- **Programma pulizie** — per anno teocratico (settembre–agosto), chiave `pulizie:AAAA`.
- **Comitive**, **Espositori (OEM)**, **Sondaggio disponibilità**, **Bacheca**, **Pronto per WhatsApp**.

Struttura del repository:

- `portale/` — il portale: `Codice.gs` (server), `app.html`, un file `.js` per sezione, `motore-reparti.js` (proposta automatica dei turni).
- `apps-script/`, `espositori/` — script dei programmi singoli.
- `src/` → `dist/app.js` — la pagina dei Programmi adunanze (`npm run build`).
- `dati/AAAA-MM.json` — struttura di ogni mese dalla guida (parti, durate, colori, carattere). Nessun nome di persona.
- `strumenti/` — script che leggono guida e Torre di Guardia e generano `dati/`.
- `portale/pdf.js` — PDF dei fogli del portale (ogni foglio A4 → immagine → pagina), costruito da `strumenti/portale-pdf/pdf.ts` con
  `npx esbuild strumenti/portale-pdf/pdf.ts --bundle --minify --format=iife --target=es2019,safari14 --outfile=portale/pdf.js`.

I dati delle persone stanno **solo** nel Foglio Google, mai nel repository (il repository è pubblico).

## 2. Come lavorare con Luca

1. **Prima si progetta, poi si esegue.** Fai domande, proponi struttura e piano, aspetta l'ok. Solo dopo scrivi codice.
2. **Se c'è un intoppo** (fonte non raggiungibile, dato incoerente, errore), fermati e chiedi se andare avanti.
3. **Le modifiche devono funzionare al primo colpo.** Prima di dire "fatto", prova il codice e controlla i casi limite (sezione 5).
4. **Non far ripetere le regole.** Sono qui sotto. Se Luca ne stabilisce una nuova, proponi di aggiungerla a questo file.
5. **Consumi contenuti:** leggi solo i file che servono, niente riscritture complete di file grandi.
6. Lingua: italiano. Testi dell'interfaccia semplici, senza termini tecnici.

## 3. Principi di progettazione (valgono per ogni modifica)

- **Una sola fonte per ogni dato.** Ogni informazione si scrive in un solo posto, le altre sezioni la *leggono* al momento,
  non la *copiano*. Esempi: date, orari, eventi e immagini delle settimane speciali vengono dai Programmi adunanze /
  calendario; le pulizie dal Programma pulizie; chi ha parti che escludono dai reparti dai programmi adunanze.
  Una copia salvata in un'altra sezione diventa vecchia appena qualcuno modifica l'originale.
- **Dati, regole e grafica separati.** I dati nel Foglio, le regole nel codice (o nelle Impostazioni), la grafica nei CSS.
- **Chi compila vede solo il suo compito.** Il "dietro le quinte" (chiavi, collegamenti, Telegram, telefoni) resta visibile solo a Luca.
- **Gratis e senza blocchi.** Niente servizi a crediti o a pagamento. Restare nei limiti di Google Apps Script.

## 4. Regole fisse

### Turnazione reparti
- Abilitazioni dall'anagrafica. Le abilitazioni non vengono spuntate in automatico (eccezione: comitive di congregazione già spuntate per i nominati).
- Esclusi da uscieri e audio/video, *solo per quell'adunanza*:
  - infrasettimanale: presidente, discorso dei Tesori, Gemme spirituali, parti di Vita cristiana, conduttore e lettore dello studio biblico;
  - fine settimana: presidente, conduttore e lettore della Torre di Guardia.
  - Preghiere, lettura biblica ed Efficaci nel ministero **non** escludono. Letteratura, territori e pulizie restano possibili.
- Le parti si leggono dai programmi adunanze, non si segnano a mano.
- Un incarico da fermo + uno di audio/video al massimo per adunanza; stesso coordinatore uscieri per tutta la settimana
  (deve essere un nominato); niente stesso posto due settimane di fila; equità con lo storico dei mesi precedenti.
- Assenze anche come periodo "dal… al…", con calcolo automatico delle adunanze saltate.
- Calendario: richiesta disponibilità il 10, promemoria il 17, scadenza il 20, proposta il 21, foglio entro il 25.

### Pulizie
- Si compilano solo nel Programma pulizie (Luca e il coordinatore del reparto Pulizie). La turnazione le mostra e la proposta le rispetta.
- Il referente deve essere del gruppo di turno, altrimenti il campo resta vuoto. Per il coordinatore è preferibile, ma non obbligatorio.
- Coordinatore e referente si possono cambiare per una sola adunanza (campi `cI`/`rI`/`cF`/`rF` della settimana nel Programma pulizie, anche dalla scheda Pulizie della turnazione). Il referente resta sempre del gruppo di turno: se non c'è nessuno, resta vuoto.
- Se chi è in servizio alle pulizie risulta assente a quell'adunanza, compare sempre un avviso.
- Gruppi: Agnello, Ciotola, Colasante, Guerrazzi, Muto, Sodano.

### Comitive
- Equità rispetto alle disponibilità date sul totale del mese. Chi dà una sola disponibilità ha la priorità ed entra comunque.
- Una comitiva annullata o spostata resta in grigio con il motivo.
- Giorno, ora e luogo di una comitiva si cambiano dal programma (solo quella settimana o da lì in poi): il cambio va nelle
  variazioni del Calendario (`tipo: 'cambiata'`), la chiave della comitiva resta quella originale (conduttore e offerte restano).
- Domeniche dei gruppi: lo «schema del mese» mostra chi sta con chi (lettere A, B… con colori); i gruppi possono stare insieme o da soli.

### Avvisi Telegram (solo a Luca)
- Giorno dell'adunanza alle 9:00: «Promemoria turni reparti» con le immagini di tutti i reparti, poi presidente e Audio/Video · prove.
- Lunedì 9:00 pulizie della settimana (e pulizia generale); domenica 19:30 i suoi impegni della settimana dopo;
  parti 10 giorni prima e comitive 3 giorni prima alle 9:00; allarme sostituzione una volta all'ora (solo casi nuovi).
- Orari e giorni si cambiano nella pagina Telegram del portale (proprietà utente `AVVISI`).

### Immagini WhatsApp dei reparti
- Intestazione come sul programma (tutto maiuscolo), colore dell'adunanza del mese; niente striscia «Reparto …».
- Uscieri e Audio/Video nell'ordine del programma, ruolo a sinistra e nome per esteso a destra sulla stessa riga.
- Letteratura e territori nel colore di Efficaci nel ministero, due riquadri grandi con icona (libro, cartina).

### Espositori (OEM)
- Regolamento completo: documento «Turnazione espositori OEM — regolamento». Al centro c'è l'equità; la priorità ai pionieri regolari è subordinata all'equità.

## 5. Casi limite da provare sempre

- Settimana di assemblea, congresso o Commemorazione (niente adunanza, evento con immagine del programma).
- Adunanza spostata (es. visita del sorvegliante in un'altra congregazione) e comitive spostate o annullate.
- Persona assente tutto il mese, ma già scelta per un incarico (es. coordinatore pulizie): va segnalato come avviso.
- Settimana a cavallo tra due mesi o tra due anni teocratici (agosto/settembre).
- Nomi scritti a mano (`txt:`) invece che scelti dall'anagrafica: non entrano nella turnazione, va segnalato.

## 6. Grafica

- Ispirata alle pubblicazioni, a jw.org e a JW Library. Carattere **Fira Sans** (non IBM Plex); Noto Serif solo dove imita il testo delle pubblicazioni.
- Colori dei programmi da `dati/AAAA-MM.json` → `stile.colori`: infrasettimanale = colore del titolo sulla copertina della guida
  del bimestre, fine settimana = colore della Torre di Guardia. Numero e tema delle parti nel colore della sezione.
- Un cambio di colori, date, orari o immagini nei Programmi adunanze deve comparire da solo anche nella turnazione reparti
  e nella bacheca (principio della sezione 3).
- Date: per esteso in maiuscolo nel colore della sezione (es. MER 7 GEN). Nomi per esteso, nome e cognome sulla stessa riga.
- Studio Torre di Guardia "(60 min)", non "un'ora".
- Intestazione della turnazione reparti: due colonne allineate ai riquadri delle settimane (titolo e orari finiscono con il riquadro
  dell'infrasettimanale; l'orario dell'infrasettimanale finisce dove finiscono i nomi della prima colonna). A destra la pulizia generale
  (titolo con scopa, «Quando» e «Gruppo» grandi alla pari, sotto coordinatore e referente) e, nel personale, «I miei turni»;
  nel personale a sinistra il riquadro «Programma personale di NOME». Nei mesi senza pulizia generale la colonna destra resta vuota.
- Gruppi sempre in maiuscolo.

## 7. Contenuti di jw.org

- Fonti solo jw.org e wol.jw.org, **in italiano**, mai tradotte dall'inglese.
- Il portale **non** legge jw.org in automatico: le condizioni d'uso vietano strumenti distribuiti che estraggono dati dal sito.
- I dati di ogni bimestre li prepara Claude: procedura in `README.md` → «Nuovo bimestre». Poi si fa il push e il portale li vede subito.

## 8. Rilascio (checklist obbligatoria)

1. Modifica fatta e provata (sezione 5).
2. Se è cambiato `src/`: `npm run build` e commit anche di `dist/app.js`.
3. Commit con messaggio chiaro in italiano e push.
4. Se è cambiato un file `.gs`: Luca lo incolla in Apps Script, poi **Esegui il deployment → Gestisci deployment → Modifica →
   Versione: Nuova versione → Esegui il deployment**. Senza questo passaggio il link del portale continua a usare il codice vecchio.
5. Scrivi a Luca in 3 righe: cosa è cambiato, cosa deve fare lui, cosa controllare.
