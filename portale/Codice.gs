/**
 * Portale della congregazione — da incollare UNA VOLTA nell'editor Apps Script del Foglio Google
 * «Congregazione – dati» (Estensioni → Apps Script), al posto di tutto il codice che c'è.
 * La pagina arriva da GitHub (portale/app.html): gli aggiornamenti non richiedono di toccare questo codice.
 *
 * Primo avvio:
 *   1. Nell'editor scegli la funzione «impostazione» e premi Esegui (autorizza quando Google lo chiede).
 *      Crea le schede Accessi e Registro, un codice per ogni persona e il backup settimanale.
 *   2. Esegui il deployment → Nuovo deployment → Applicazione web:
 *        Esegui come: Io · Chi ha accesso: Chiunque
 *   3. Torna nel Foglio: menu Congregazione → «Il mio link». Apri quel link: è il tuo accesso al portale.
 *
 * Il Foglio NON va condiviso con nessuno. Si entra solo con il link personale (…/exec?k=CODICE):
 * il codice decide chi sei e cosa puoi vedere e modificare (scheda Accessi).
 * I nomi delle persone stanno solo in questo Foglio, mai su GitHub.
 */
const REPO = 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/';

const FOGLIO = 'Fratelli';
const RIGA_SEZIONI = 1, RIGA_TITOLI = 2, RIGA_REGOLE = 3, RIGA_DATI = 4;
// Colonne dell'anagrafica (1 = A)
const C = { id: 1, nome: 2, n: 3, cognome: 4, alias: 5, sesso: 6, tel: 7, gruppo: 8, nomina: 9, servizio: 10, ruolo: 11, sigla: 12, nucleo: 13, stato: 14, reparti: 15, oem: 16 };
const PRIMA_ABIL = 17;      // Q: prima abilitazione delle adunanze
const AMBITI = ['inf', 'fs', 'reparti', 'comitive', 'oem'];
const NOMI_AMBITI = { tutto: 'Tutto', inf: 'Infrasettimanale', fs: 'Fine settimana', reparti: 'Reparti', comitive: 'Comitive', oem: 'Espositori OEM' };
const LISTE = {
  6: ['Uomo', 'Donna'],
  8: ['Agnello', 'Ciotola', 'Colasante', 'Guerrazzi', 'Muto', 'Sodano'],
  9: ['Nessuna', 'Anziano', 'Servitore di ministero'],
  10: ['P', 'PA', 'PR', 'NB'],
  11: ['', 'SGS', 'SDG', 'ASS'],
  14: ['Attivo', 'Trasferito', 'Non più attivo'],
};
const GRIGIO = '#E3E3E3';
const RUOLI_REPARTO_ = ['', 'Coordinatore', 'Assistente'];

/* ───────────────────────── Pagina ───────────────────────── */

function doGet(e) {
  const k = (e && e.parameter && e.parameter.k) || '';
  const io = utente_(k);
  if (!io) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:32px;max-width:520px;margin:auto;line-height:1.5">' +
        '<h2 style="color:#3E4A59">Congregazione Napoli Pianura Trencia</h2><p>Questo link non è valido o è stato ' +
        'disattivato. Chiedi a chi gestisce il portale di mandartene uno nuovo.</p></div>'
    ).setTitle('Portale della congregazione').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  // Link diretti: ?k=…&s=<sondaggio> apre il sondaggio, ?k=…&v=bacheca la bacheca (sempre con i permessi di chi apre)
  const par = (e && e.parameter) || {};
  const apri = { s: /^S\w{6,20}$/.test(par.s || '') ? par.s : '', v: ['bacheca', 'whatsapp'].indexOf(par.v) >= 0 ? par.v : '' };
  const boot =
    '<p id="pc-boot" style="font-family:sans-serif;padding:32px 16px;text-align:center;color:#5f6b77">Carico il portale…</p>' +
    '<script>window.__K=' + JSON.stringify(k) + ';window.__APRI=' + JSON.stringify(apri) + ';(' + function (base) {
      function errore(m) {
        var d = document.getElementById('pc-boot') || document.body.appendChild(document.createElement('p'));
        d.style.cssText = 'font-family:monospace;padding:16px;color:#A8432B;white-space:pre-wrap';
        d.textContent = 'Errore: ' + m;
      }
      window.addEventListener('error', function (e) { errore(e.message + ' (' + e.lineno + ':' + e.colno + ')'); });
      fetch(base + 'portale/app.html?v=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.text(); })
        .then(function (t) {
          var doc = new DOMParser().parseFromString(t, 'text/html');
          doc.head.querySelectorAll('style,link').forEach(function (n) { document.head.appendChild(n); });
          var script = [];
          [].slice.call(doc.body.childNodes).forEach(function (n) {
            if (n.tagName === 'SCRIPT') script.push(n); else document.body.appendChild(n);
          });
          var b = document.getElementById('pc-boot'); if (b) b.remove();
          script.forEach(function (s) { var x = document.createElement('script'); x.textContent = s.textContent; document.body.appendChild(x); });
        })
        .catch(function (e) { errore('avvio: ' + e.message); });
    }.toString() + ')(' + JSON.stringify(REPO) + ')</script>';
  return HtmlService.createHtmlOutput(boot)
    .setTitle('Portale della congregazione')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ───────────────────────── Velocità: letture una volta sola ─────────────────────────
 * Ogni chiamata dal portale è un'esecuzione a sé. Dentro un'esecuzione ogni scheda si legge una volta sola (MEMO_);
 * tra un'esecuzione e l'altra i codici di accesso stanno nella cache dello script (6 ore), che si svuota appena
 * cambia qualcosa in Accessi. La cache vive sui server di Google, legata a questo script: nessuno la vede. */
const MEMO_ = {};
function valori_(nome) {
  if (!MEMO_[nome]) {
    const sh = SpreadsheetApp.getActive().getSheetByName(nome);
    MEMO_[nome] = sh && sh.getLastRow() > 0 ? sh.getDataRange().getValues() : [];
  }
  return MEMO_[nome];
}
function dimentica_(nome) { delete MEMO_[nome]; if (nome === FOGLIO) { delete MEMO_.persone; delete MEMO_.sondaggi; } if (nome === 'Sondaggi') delete MEMO_.sondaggi; if (nome === 'Accessi') try { CacheService.getScriptCache().remove('accessi'); } catch (e) {} }

/* ───────────────────────── Accessi ───────────────────────── */

function mappaAccessi_() {
  const c = CacheService.getScriptCache();
  const t = c.get('accessi');
  if (t) return JSON.parse(t);
  const m = {};
  valori_('Accessi').slice(1).forEach((r, i) => {
    if (r[0] && r[2] && r[4] === true) m[String(r[2])] = [String(r[0]), String(r[1]), String(r[3] || ''), i + 2];
  });
  try { c.put('accessi', JSON.stringify(m), 21600); } catch (e) {}
  return m;
}

/** Chi sta usando il portale: { id, nome, ambiti:[…], tutto } oppure null. */
function utente_(k) {
  k = String(k || '').trim();
  if (k.length < 12) return null;
  const x = mappaAccessi_()[k];
  if (!x) return null;
  const a = x[2].split(',').map((y) => y.trim()).filter(Boolean);
  const tutto = a.indexOf('tutto') >= 0;
  return { id: x[0], nome: x[1], ambiti: tutto ? ['tutto'].concat(AMBITI) : a, tutto: tutto, riga: x[3] };
}
function haAmbito_(io, a) { return io.tutto || io.ambiti.indexOf(a) >= 0; }
function richiedi_(k, serveTutto) {
  const io = utente_(k);
  if (!io) throw new Error('Link non valido o disattivato.');
  if (serveTutto && !io.tutto) throw new Error('Non hai il permesso per questa operazione.');
  return io;
}
function nuovoCodice_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20);
}

/* ───────────────────────── Struttura della scheda Fratelli ───────────────────────── */

function coloreSezione_(sez) {
  const s = String(sez).toLowerCase();
  if (s.indexOf('tesori') >= 0) return '#2E6E7C';
  if (s.indexOf('efficaci') >= 0 || s.indexOf('comitive') >= 0) return '#A86F00';
  if (s.indexOf('vita cristiana') >= 0) return '#A8432B';
  if (s.indexOf('reparti') >= 0 && s.indexOf('infra') >= 0) return '#A8432B';
  if (s.indexOf('fine settimana') >= 0) return '#521F46';
  if (s.indexOf('apertura') >= 0 || s.indexOf('chiusura') >= 0) return '#5B5B5B';
  if (s.indexOf('note') >= 0) return '#7A7A7A';
  return '#3E4A59';
}
function ambitoSezione_(sez) {
  const s = String(sez).toLowerCase();
  if (s.indexOf('reparti') >= 0) return 'reparti';
  if (s.indexOf('comitive') >= 0) return 'comitive';
  if (s.indexOf('fine settimana') >= 0) return 'fs';
  if (s.indexOf('apertura') >= 0 || s.indexOf('tesori') >= 0 || s.indexOf('efficaci') >= 0 ||
      s.indexOf('vita cristiana') >= 0 || s.indexOf('chiusura') >= 0) return 'inf';
  return 'tutto';
}

/** Le colonne della scheda: titolo, sezione, colore, regola di sblocco, ambito, tipo. */
function struttura_(sh) {
  const tutto = valori_(FOGLIO);
  const nc = tutto.length ? tutto[0].length : sh.getLastColumn();
  const testa = tutto.slice(RIGA_SEZIONI - 1, RIGA_SEZIONI + 2);
  const col = [];
  let sez = '';
  for (let c = 1; c <= nc; c++) {
    if (testa[0][c - 1]) sez = String(testa[0][c - 1]);
    const titolo = String(testa[1][c - 1] || '').trim();
    if (!titolo) continue;
    let ambito = ambitoSezione_(sez), tipo = 'testo', regola = String(testa[2][c - 1] || '').trim();
    const ruoli = /^RUOLI/i.test(sez);
    if (ruoli) { ambito = 'tutto'; tipo = 'lista'; regola = regola || 'fratelli'; }
    else if (c === C.reparti) { ambito = 'reparti'; tipo = 'check'; regola = 'tutti'; }
    else if (c === C.oem) { ambito = 'oem'; tipo = 'check'; regola = 'tutti'; }
    else if (c >= PRIMA_ABIL && sez.toUpperCase() !== 'NOTE') tipo = 'check';
    else if (c === C.sigla) tipo = 'calc';
    else if (LISTE[c]) tipo = 'lista';
    if (c === C.id) tipo = 'calc';
    col.push({ c: c, titolo: titolo, sezione: c < PRIMA_ABIL ? 'ANAGRAFICA' : sez, colore: coloreSezione_(c < PRIMA_ABIL ? '' : sez),
      regola: tipo === 'check' || ruoli ? (regola || 'tutti') : '', ambito: ambito, tipo: tipo, opzioni: ruoli ? RUOLI_REPARTO_ : LISTE[c] || null, ruolo: ruoli,
      riservata: c === C.tel || sez.toUpperCase() === 'NOTE' });
  }
  return col;
}

function abilitato_(regola, sesso, nomina, servizio) {
  const anziano = nomina === 'Anziano';
  const nominato = anziano || nomina === 'Servitore di ministero';
  const fratello = sesso === 'Uomo';
  switch (String(regola).trim()) {
    case 'anziani': return anziano;
    case 'nominati': return nominato;
    case 'fratelli': return fratello;
    case 'fratelli battezzati': return fratello && servizio !== 'NB';
    default: return true;
  }
}
function sigla_(ruolo, servizio) {
  const s = servizio && servizio !== 'P' ? servizio : '';
  if (ruolo && s) return ruolo + ' – ' + s;
  return ruolo || s;
}

/* ───────────────────────── Dati per la pagina ───────────────────────── */

/** Tutto quello che serve alla pagina, filtrato per chi la apre. */
function portale(k) {
  const io = richiedi_(k);
  segnaAccesso_(io);
  const out = { io: { id: io.id, nome: io.nome, ambiti: io.ambiti, tutto: io.tutto }, nomiAmbiti: NOMI_AMBITI };
  try { out.io.wa = waQualcosa_(waVede_(io)); } catch (e) { out.io.wa = false; }
  out.sondaggi = sondaggiPer_(io.id);
  if (!io.ambiti.length) return out; // solo sondaggio
  const sh = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
  const col = struttura_(sh).filter((x) => io.tutto || !x.riservata);
  out.colonne = col;
  out.fratelli = leggiFratelli_(sh, col, io.tutto);
  if (io.tutto) out.link = ScriptApp.getService().getUrl();
  return out;
}

function rigaOggetto_(riga, r, col) {
  const v = {};
  col.forEach((x) => { const val = r[x.c - 1]; v[x.c] = x.tipo === 'check' ? val === true : (val === null ? '' : String(val)); });
  return { riga: riga, id: String(r[C.id - 1]), v: v };
}
function leggiFratelli_(sh, col, tutto) {
  const dati = valori_(FOGLIO).slice(RIGA_DATI - 1);
  if (!dati.length) return [];
  const out = [];
  dati.forEach((r, i) => {
    if (!r[C.nome - 1]) return;
    if (!tutto && r[C.stato - 1] !== 'Attivo') return;
    out.push(rigaOggetto_(RIGA_DATI + i, r, col));
  });
  return out;
}

/**
 * Salva una o più modifiche: [{ id, c, valore }].
 * Controlla ambito e sblocchi; aggiorna la sigla; scrive nel Registro. Ritorna le righe aggiornate.
 */
function salva(k, modifiche) {
  const io = richiedi_(k);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
    const colTutte = struttura_(sh);
    const perC = {}; colTutte.forEach((x) => { perC[x.c] = x; });
    const nc = sh.getLastColumn();
    const toccate = {};
    const registro = [], errori = [];
    (modifiche || []).forEach((m) => { try {
      const x = perC[Number(m.c)];
      if (!x) throw new Error('Colonna sconosciuta.');
      if (x.tipo === 'calc') throw new Error('«' + x.titolo + '» si calcola da sola.');
      if (!io.tutto && (x.ambito === 'tutto' || io.ambiti.indexOf(x.ambito) < 0)) throw new Error('Non puoi modificare «' + etichetta_(x) + '».');
      const riga = rigaDi_(sh, m.id);
      if (!riga) throw new Error('Persona non trovata.');
      const r = sh.getRange(riga, 1, 1, nc).getValues()[0];
      let val = m.valore;
      if (x.tipo === 'check') {
        val = val === true;
        if (val && !abilitato_(x.regola, r[C.sesso - 1], r[C.nomina - 1], r[C.servizio - 1]))
          throw new Error('«' + etichetta_(x) + '» è solo per ' + x.regola + '.');
      } else if (x.tipo === 'lista') {
        val = String(val || '');
        if (x.opzioni.indexOf(val) < 0) throw new Error('Valore non ammesso per «' + x.titolo + '».');
        if (x.ruolo && val && !abilitato_(x.regola, r[C.sesso - 1], r[C.nomina - 1], r[C.servizio - 1])) throw new Error('I ruoli nei reparti sono solo per ' + x.regola + '.');
        if (x.c === C.ruolo && val === 'SDG' && r[C.nomina - 1] !== 'Servitore di ministero') throw new Error('SDG è solo per i servitori di ministero.');
        if (x.c === C.ruolo && val === 'ASS' && r[C.nomina - 1] === 'Nessuna') throw new Error('ASS è solo per anziani e servitori.');
      } else {
        val = String(val || '').trim();
        if (x.c === C.nome && !val) throw new Error('Il nome non può essere vuoto.');
      }
      const prima = r[x.c - 1];
      if (String(prima) === String(val)) return;
      sh.getRange(riga, x.c).setValue(val);
      const t = toccate[riga] || (toccate[riga] = { base: false, nomina: false });
      if ([C.sesso, C.nomina, C.servizio, C.ruolo].indexOf(x.c) >= 0) t.base = true;
      if (x.c === C.nomina) t.nomina = true;
      registro.push([new Date(), io.id, io.nome, 'modifica', r[C.nome - 1] + ' · ' + etichetta_(x) + ': ' + mostra_(prima) + ' → ' + mostra_(val)]);
    } catch (err) { errori.push(err.message); } });
    // Sigla, spunte non più ammesse e colori servono solo se cambiano sesso, nomina, servizio o ruolo
    Object.keys(toccate).forEach((riga) => { if (toccate[riga].base) sistemaRiga_(sh, Number(riga), colTutte, registro, io, toccate[riga].nomina); });
    if (registro.length) { const reg = scheda_('Registro'); reg.getRange(reg.getLastRow() + 1, 1, registro.length, 5).setValues(registro); }
    const col = colTutte.filter((x) => io.tutto || !x.riservata);
    const righe = {};
    (modifiche || []).forEach((m) => { const r = rigaDi_(sh, m.id); if (r) righe[r] = true; });
    return { righe: Object.keys(righe).map((r) => rigaOggetto_(Number(r), sh.getRange(Number(r), 1, 1, nc).getValues()[0], col)), errori: errori };
  } finally {
    lock.releaseLock();
  }
}
function etichetta_(x) {
  if (x.c < PRIMA_ABIL) return x.titolo;
  const s = x.sezione.replace(/^INFRASETTIMANALE · /, '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1) + ' · ' + x.titolo;
}
function mostra_(v) { return v === true ? 'sì' : v === false || v === '' || v === null ? '—' : String(v); }

/** Dopo una modifica: sigla, spunte non più ammesse, comitive di congregazione per i nominati, colori. */
function sistemaRiga_(sh, riga, col, registro, io, nominaCambiata) {
  const nc = sh.getLastColumn();
  const r = sh.getRange(riga, 1, 1, nc).getValues()[0];
  const s = sigla_(r[C.ruolo - 1], r[C.servizio - 1]);
  if (r[C.sigla - 1] !== s) sh.getRange(riga, C.sigla).setValue(s);
  const nominato = r[C.nomina - 1] === 'Anziano' || r[C.nomina - 1] === 'Servitore di ministero';
  col.forEach((x) => {
    if (x.tipo !== 'check' || x.c < PRIMA_ABIL) return;
    const v = r[x.c - 1] === true;
    if (v && !abilitato_(x.regola, r[C.sesso - 1], r[C.nomina - 1], r[C.servizio - 1])) {
      sh.getRange(riga, x.c).setValue(false);
      registro.push([new Date(), io.id, io.nome, 'tolta', r[C.nome - 1] + ' · ' + etichetta_(x) + ' (solo ' + x.regola + ')']);
    }
    if (nominaCambiata && nominato && !v && /congregazione/i.test(x.titolo) && /comitive/i.test(x.sezione)) sh.getRange(riga, x.c).setValue(true);
  });
  coloraRiga_(sh, riga, col);
}

function coloraRiga_(sh, riga, col) {
  const nc = sh.getLastColumn();
  const r = sh.getRange(riga, 1, 1, nc).getValues()[0];
  const abil = col.filter((x) => x.tipo === 'check' && x.c >= PRIMA_ABIL);
  if (!abil.length) return;
  const da = abil[0].c, a = abil[abil.length - 1].c;
  const sfondi = [], testi = [];
  for (let c = da; c <= a; c++) {
    const x = abil.find((y) => y.c === c);
    const ok = !x || !r[C.nome - 1] || abilitato_(x.regola, r[C.sesso - 1], r[C.nomina - 1], r[C.servizio - 1]);
    sfondi.push(ok ? null : GRIGIO);
    testi.push(ok ? (x ? x.colore : '#222222') : GRIGIO);
  }
  const rg = sh.getRange(riga, da, 1, a - da + 1);
  rg.setBackgrounds([sfondi]);
  rg.setFontColors([testi]);
}

function rigaDi_(sh, id) {
  const n = sh.getLastRow() - RIGA_DATI + 1;
  if (n < 1) return 0;
  const ids = sh.getRange(RIGA_DATI, C.id, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return RIGA_DATI + i;
  return 0;
}

/** Nuova persona (solo Luca): scrive la riga in ordine alfabetico e le dà un codice. */
function aggiungi(k, d) {
  const io = richiedi_(k, true);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
    const cognome = String(d.cognome || '').trim(), nome = String(d.nome || '').trim();
    if (!cognome || !nome) throw new Error('Servono nome e cognome.');
    ['sesso', 'gruppo'].forEach((f) => { if (!d[f]) throw new Error('Manca ' + f + '.'); });
    const nr = sh.getLastRow() - RIGA_DATI + 1;
    const vals = nr > 0 ? sh.getRange(RIGA_DATI, 1, nr, 2).getValues() : [];
    let max = 0;
    vals.forEach((v) => { const m = /^F(\d+)$/.exec(String(v[0])); if (m) max = Math.max(max, Number(m[1])); });
    const id = 'F' + String(max + 1).padStart(3, '0');
    const cn = cognome + ' ' + nome;
    let pos = RIGA_DATI + vals.length;
    for (let i = 0; i < vals.length; i++) if (String(vals[i][1]).localeCompare(cn, 'it') > 0) { pos = RIGA_DATI + i; break; }
    sh.insertRowBefore(pos);
    const riga = new Array(sh.getLastColumn()).fill('');
    riga[C.id - 1] = id; riga[C.nome - 1] = cn; riga[C.n - 1] = nome; riga[C.cognome - 1] = cognome;
    riga[C.sesso - 1] = d.sesso; riga[C.gruppo - 1] = d.gruppo; riga[C.nomina - 1] = d.nomina || 'Nessuna';
    riga[C.servizio - 1] = d.servizio || 'P'; riga[C.stato - 1] = 'Attivo';
    const col = struttura_(sh);
    col.forEach((x) => { if (x.tipo === 'check') riga[x.c - 1] = false; });
    sh.getRange(pos, 1, 1, riga.length).setValues([riga]);
    const reg = [[new Date(), io.id, io.nome, 'nuovo', cn + ' (' + id + ')']];
    sistemaRiga_(sh, pos, col, reg, io, true);
    const acc = scheda_('Accessi');
    acc.appendRow([id, cn, nuovoCodice_(), '', true, '', '']);
    dimentica_('Accessi'); dimentica_(FOGLIO);
    scheda_('Registro').getRange(scheda_('Registro').getLastRow() + 1, 1, reg.length, 5).setValues(reg);
    return portale(k);
  } finally {
    lock.releaseLock();
  }
}

/* ───────────────────────── Pagina Accessi (solo Luca) ───────────────────────── */

function accessi(k) {
  richiedi_(k, true);
  const sh = scheda_('Accessi');
  const n = sh.getLastRow();
  const righe = n > 1 ? sh.getRange(2, 1, n - 1, 7).getValues() : [];
  return {
    link: ScriptApp.getService().getUrl(),
    persone: righe.filter((r) => r[0]).map((r) => ({
      id: String(r[0]), nome: String(r[1]), codice: String(r[2]),
      ambiti: String(r[3] || '').split(',').map((x) => x.trim()).filter(Boolean),
      attivo: r[4] === true, ultimo: r[5] ? Utilities.formatDate(new Date(r[5]), 'Europe/Rome', 'dd/MM/yyyy HH:mm') : '',
    })),
  };
}

/** Cambia ambiti, attivo o codice di una persona: { id, ambiti?, attivo?, rigenera? }. */
function impostaAccesso(k, d) {
  const io = richiedi_(k, true);
  const sh = scheda_('Accessi');
  const n = sh.getLastRow();
  const ids = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  const i = ids.findIndex((r) => String(r[0]) === String(d.id));
  if (i < 0) throw new Error('Persona non trovata in Accessi.');
  const riga = i + 2, nome = ids[i][1];
  const reg = [];
  if (d.ambiti) {
    if (String(d.id) === io.id && d.ambiti.indexOf('tutto') < 0) throw new Error('Non puoi togliere «Tutto» a te stesso.');
    const a = d.ambiti.filter((x) => x === 'tutto' || AMBITI.indexOf(x) >= 0);
    sh.getRange(riga, 4).setValue(a.join(', '));
    reg.push('ambiti: ' + (a.map((x) => NOMI_AMBITI[x]).join(', ') || 'nessuno'));
  }
  if (typeof d.attivo === 'boolean') {
    if (String(d.id) === io.id && !d.attivo) throw new Error('Non puoi disattivare te stesso.');
    sh.getRange(riga, 5).setValue(d.attivo);
    reg.push(d.attivo ? 'link attivato' : 'link disattivato');
  }
  if (d.rigenera) { sh.getRange(riga, 3).setValue(nuovoCodice_()); reg.push('nuovo codice (il vecchio link non funziona più)'); }
  if (reg.length) scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'accessi', nome + ' · ' + reg.join(' · ')]);
  dimentica_('Accessi');
  return accessi(k);
}

function registro(k, quanti) {
  richiedi_(k, true);
  const sh = scheda_('Registro');
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const m = Math.min(n, quanti || 300);
  return sh.getRange(sh.getLastRow() - m + 1, 1, m, 5).getValues().reverse().map((r) => ({
    quando: Utilities.formatDate(new Date(r[0]), 'Europe/Rome', 'dd/MM/yyyy HH:mm'), chi: String(r[2]), azione: String(r[3]), cosa: String(r[4]),
  }));
}

/** Un accesso al giorno per persona finisce nel Registro; «Ultimo accesso» si aggiorna sempre. */
function segnaAccesso_(io) {
  const c = CacheService.getScriptCache(), ck = 'visto:' + io.id;
  if (c.get(ck)) return; // al massimo una scrittura ogni 20 minuti per persona
  try { c.put(ck, '1', 1200); } catch (e) {}
  const sh = scheda_('Accessi');
  const ora = new Date();
  const prima = sh.getRange(io.riga, 6).getValue();
  sh.getRange(io.riga, 6).setValue(ora);
  const giorno = (d) => Utilities.formatDate(new Date(d), 'Europe/Rome', 'yyyyMMdd');
  if (!prima || giorno(prima) !== giorno(ora)) scheda_('Registro').appendRow([ora, io.id, io.nome, 'accesso', '']);
}


/**
 * Le funzioni di servizio (impostazione, sblocchi, backup, il mio link) partono solo dall'editor, dal menu del Foglio
 * o dal backup automatico, cioè dal tuo account. Chi usa il portale con un link, anche valido, non può avviarle.
 */
function soloProprietario_() {
  const chi = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const io = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!chi || chi !== io) throw new Error('Operazione riservata al proprietario del Foglio.');
}

/* ───────────────────────── Schede, impostazione, backup ───────────────────────── */

const INTESTAZIONI_ = {
  Impostazioni: ['Chiave', 'Valore (non modificare a mano)'],
  Sondaggi: ['ID', 'Titolo', 'Dati (non modificare a mano)', 'Stato', 'Creato'],
  Risposte: ['Sondaggio', 'ID', 'Nome', 'Risposta (non modificare a mano)', 'Prima risposta', 'Ultima modifica', 'Dopo la scadenza'],
  Accessi: ['ID', 'Nome', 'Codice (segreto)', 'Ambiti', 'Attivo', 'Ultimo accesso', 'Note'],
  Registro: ['Quando', 'ID', 'Chi', 'Azione', 'Cosa'],
};
function scheda_(nome) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0 && INTESTAZIONI_[nome]) {
    sh.appendRow(INTESTAZIONI_[nome]);
    sh.getRange(1, 1, 1, INTESTAZIONI_[nome].length).setFontWeight('bold').setBackground('#F6F5F2').setFontFamily('Fira Sans');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Da eseguire una volta dall'editor (e di nuovo senza problemi: non duplica niente). */
function impostazione() {
  soloProprietario_();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(FOGLIO);
  if (!sh) throw new Error('Manca la scheda «' + FOGLIO + '».');
  // La sigla la scrive lo script (niente formula: si può ordinare e inserire righe senza romperla)
  const nr = sh.getLastRow() - RIGA_DATI + 1;
  if (nr > 0) {
    const v = sh.getRange(RIGA_DATI, 1, nr, C.sigla).getValues();
    sh.getRange(RIGA_DATI, C.sigla, nr, 1).clearContent();
    sh.getRange(RIGA_DATI, C.sigla, nr, 1).setValues(v.map((r) => [r[C.nome - 1] ? sigla_(r[C.ruolo - 1], r[C.servizio - 1]) : '']));
  }
  if (String(sh.getRange(RIGA_TITOLI, C.oem).getValue()) !== 'OEM') sh.getRange(RIGA_TITOLI, C.oem).setValue('OEM');
  // Accessi: una riga per persona, con codice; Luca (Masullo Luca) con «tutto»
  const acc = scheda_('Accessi');
  const gia = {};
  if (acc.getLastRow() > 1) acc.getRange(2, 1, acc.getLastRow() - 1, 1).getValues().forEach((r) => { gia[String(r[0])] = true; });
  const nuove = [];
  if (nr > 0) sh.getRange(RIGA_DATI, 1, nr, C.nome).getValues().forEach((r) => {
    if (!r[0] || gia[String(r[0])]) return;
    const luca = String(r[C.nome - 1]) === 'Masullo Luca';
    nuove.push([String(r[0]), String(r[C.nome - 1]), nuovoCodice_(), luca ? 'tutto' : '', true, '', '']);
  });
  if (nuove.length) acc.getRange(acc.getLastRow() + 1, 1, nuove.length, 7).setValues(nuove);
  dimentica_('Accessi');
  acc.getRange(2, 5, Math.max(acc.getLastRow() - 1, 1), 1).insertCheckboxes();
  scheda_('Registro');
  aggiornaSblocchi();
  // Backup settimanale (domenica notte), installato una volta sola
  if (!ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'backupSettimanale')) {
    ScriptApp.newTrigger('backupSettimanale').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  }
  scheda_('Registro').appendRow([new Date(), '', 'Script', 'impostazione', 'Accessi: ' + nuove.length + ' codici nuovi']);
}

/** Copia del Foglio in «Congregazione – backup»; tiene le ultime 8. */
function backupSettimanale() {
  soloProprietario_();
  const ss = SpreadsheetApp.getActive();
  const nomeCartella = 'Congregazione – backup';
  const it = DriveApp.getFoldersByName(nomeCartella);
  const cartella = it.hasNext() ? it.next() : DriveApp.createFolder(nomeCartella);
  const data = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' · backup ' + data, cartella);
  const copie = [];
  const f = cartella.getFiles();
  while (f.hasNext()) copie.push(f.next());
  copie.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(8).forEach((x) => x.setTrashed(true));
}

/* ───────────────────────── Uso diretto del Foglio (solo Luca) ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Congregazione')
    .addItem('Il mio link al portale', 'mioLink')
    .addItem('Aggiorna sblocchi', 'aggiornaSblocchi')
    .addItem('Backup adesso', 'backupSettimanale')
    .addToUi();
}

function mioLink() {
  soloProprietario_();
  const url = ScriptApp.getService().getUrl();
  const acc = scheda_('Accessi');
  const r = acc.getLastRow() > 1 ? acc.getRange(2, 1, acc.getLastRow() - 1, 4).getValues().find((x) => /tutto/.test(String(x[3]))) : null;
  const ui = SpreadsheetApp.getUi();
  if (!url) return ui.alert('Prima fai il deployment come applicazione web (vedi le istruzioni in cima al codice).');
  if (!r) return ui.alert('Nessuno ha l\'ambito «tutto» nella scheda Accessi.');
  ui.alert('Il tuo link (non darlo a nessuno):\n\n' + url + '?k=' + r[2]);
}

/** Ricolora tutte le righe e toglie le spunte non ammesse. */
function aggiornaSblocchi() {
  soloProprietario_();
  const sh = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
  const col = struttura_(sh);
  const abil = col.filter((x) => x.tipo === 'check' && x.c >= PRIMA_ABIL);
  const n = sh.getLastRow() - RIGA_DATI + 1;
  if (n < 1 || !abil.length) return;
  const da = abil[0].c, a = abil[abil.length - 1].c;
  const dati = sh.getRange(RIGA_DATI, 1, n, a).getValues();
  const sfondi = [], testi = [], spunte = [], sigle = [];
  let tolte = 0;
  dati.forEach((r) => {
    const s = [], t = [], k = [];
    for (let c = da; c <= a; c++) {
      const x = abil.find((y) => y.c === c);
      const ok = !x || !r[C.nome - 1] || abilitato_(x.regola, r[C.sesso - 1], r[C.nomina - 1], r[C.servizio - 1]);
      s.push(ok ? null : GRIGIO);
      t.push(ok ? (x ? x.colore : '#222222') : GRIGIO);
      let v = r[c - 1] === true;
      if (!ok && v) { v = false; tolte++; }
      k.push(v);
    }
    sfondi.push(s); testi.push(t); spunte.push(k);
    sigle.push([r[C.nome - 1] ? sigla_(r[C.ruolo - 1], r[C.servizio - 1]) : '']);
  });
  const rg = sh.getRange(RIGA_DATI, da, n, a - da + 1);
  rg.setValues(spunte); rg.setBackgrounds(sfondi); rg.setFontColors(testi);
  sh.getRange(RIGA_DATI, C.sigla, n, 1).setValues(sigle);
  try { SpreadsheetApp.getActive().toast(tolte ? 'Tolte ' + tolte + ' spunte non ammesse.' : 'Sblocchi aggiornati.', 'Congregazione', 5); } catch (e) {}
}

/** Modifiche fatte a mano nel Foglio: stessi blocchi del portale, e finiscono nel Registro. */
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== FOGLIO) return;
  const r0 = e.range.getRow(), nr = e.range.getNumRows();
  if (r0 + nr - 1 < RIGA_DATI) return;
  const col = struttura_(sh);
  const reg = [];
  const io = { id: '', nome: 'Foglio (a mano)' };
  const c0 = e.range.getColumn(), nominaCambiata = c0 <= C.nomina && c0 + e.range.getNumColumns() - 1 >= C.nomina;
  for (let riga = Math.max(r0, RIGA_DATI); riga <= r0 + nr - 1; riga++) {
    if (!sh.getRange(riga, C.nome).getValue()) continue;
    sistemaRiga_(sh, riga, col, reg, io, nominaCambiata);
  }
  if (reg.length) {
    scheda_('Registro').getRange(scheda_('Registro').getLastRow() + 1, 1, reg.length, 5).setValues(reg);
    try { SpreadsheetApp.getActive().toast(reg.map((x) => x[4]).slice(0, 3).join('\n'), 'Spunta non ammessa', 6); } catch (err) {}
  }
}


/* ═════════════════════════ Calendario e sondaggio delle disponibilità ═════════════════════════ */

const GIORNI_ = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
const MESI_ = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const MESI_LUNGHI_ = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const CALENDARIO_BASE_ = {
  periodi: [
    { dal: '2026-11-30', infra: { g: 2, ora: '19:30' }, fs: { g: 6, ora: '19:30' } },
    { dal: '2027-01-04', infra: { g: 3, ora: '19:30' }, fs: { g: 0, ora: '' } },
  ],
  speciali: [{ lunedi: '2026-12-28', nome: 'Assemblea di circoscrizione', luogo: 'Sala delle assemblee di Forchia', adunanze: false, comitive: true }],
  comitive: [
    { g: 3, ora: '17:45', luogo: 'Casa Egidio' },
    { g: 4, ora: '9:30', luogo: 'Sala del Regno' },
    { g: 5, ora: '17:00', luogo: 'Casa Caruso' },
    { g: 6, ora: '9:30', luogo: 'Sala del Regno' },
  ],
};

function leggiImpostazione_(chiave, base) {
  scheda_('Impostazioni');
  for (const r of valori_('Impostazioni').slice(1)) if (String(r[0]) === chiave && r[1]) return JSON.parse(String(r[1]));
  return base;
}
function scriviImpostazione_(chiave, valore) {
  const sh = scheda_('Impostazioni');
  const n = sh.getLastRow();
  const txt = JSON.stringify(valore);
  if (txt.length > 49000) throw new Error('Dati troppo grandi per una cella (' + chiave + ').');
  dimentica_('Impostazioni');
  if (n > 1) {
    const k = sh.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < k.length; i++) if (String(k[i][0]) === chiave) { sh.getRange(i + 2, 2).setValue(txt); return; }
  }
  sh.appendRow([chiave, txt]);
}

/* Date come testo AAAA-MM-GG, calcolate in UTC: niente sorprese con l'ora legale. */
function d_(s) { const [a, m, g] = String(s).split('-').map(Number); return new Date(Date.UTC(a, m - 1, g)); }
function s_(d) { return d.toISOString().slice(0, 10); }
function piu_(s, n) { const d = d_(s); d.setUTCDate(d.getUTCDate() + n); return s_(d); }
function breve_(s) { const d = d_(s); return GIORNI_[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MESI_[d.getUTCMonth()]; }
function lunediDel_(mese) { // tutti i lunedì del mese AAAA-MM
  const out = [];
  let d = d_(mese + '-01');
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  while (s_(d).slice(0, 7) === mese) { out.push(s_(d)); d.setUTCDate(d.getUTCDate() + 7); }
  return out;
}
function lunediDi_(data) { const d = d_(data); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return s_(d); }
function pad_(ora) { return String(ora || '').padStart(5, '0'); }
function periodo_(cal, data) {
  let p = cal.periodi[0];
  cal.periodi.slice().sort((a, b) => (a.dal < b.dal ? -1 : 1)).forEach((x) => { if (x.dal <= data) p = x; });
  return p;
}
function nomeMese_(mese) { return MESI_LUNGHI_[Number(mese.slice(5, 7)) - 1] + ' ' + mese.slice(0, 4); }

/** Le settimane di un mese con adunanze e comitive (le settimane appartengono al mese del loro lunedì). */
function settimane_(cal, mese) {
  return lunediDel_(mese).map((lun) => {
    const sp = (cal.speciali || []).find((x) => x.lunedi === lun) || null;
    const p = periodo_(cal, lun);
    const off = (g) => (g + 6) % 7;
    const adunanze = [];
    if (!sp || sp.adunanze !== false) {
      adunanze.push({ k: lun + '-INFRA', tipo: 'inf', data: piu_(lun, off(p.infra.g)), ora: p.infra.ora });
      adunanze.push({ k: lun + '-FINE', tipo: 'fs', data: piu_(lun, off(p.fs.g)), ora: p.fs.ora });
    }
    const comitive = [];
    if (!sp || sp.comitive !== false) (cal.comitive || []).forEach((c) => {
      const data = piu_(lun, off(c.g));
      comitive.push({ k: data + '|' + c.ora, data: data, ora: c.ora, luogo: c.luogo });
    });
    // Variazioni: adunanze spostate, comitive annullate (restano grigie con il motivo) o aggiunte
    (cal.variazioni || []).forEach((v) => {
      if (!v.data || lunediDi_(v.data) !== lun) return;
      if (v.tipo === 'spostata') {
        const a = adunanze.find((x) => x.tipo === v.adunanza);
        if (a) { a.data = v.data; if (v.ora) a.ora = v.ora; a.spostata = true; a.motivo = v.motivo || ''; a.creata = v.creata || ''; }
      } else if (v.tipo === 'annullata') {
        comitive.forEach((c) => { if (c.data === v.data && (!v.ora || c.ora === v.ora)) { c.annullata = true; c.motivo = v.motivo || ''; c.creata = v.creata || ''; } });
      } else if (v.tipo === 'aggiunta' && v.ora) {
        const k = v.data + '|' + v.ora;
        const gia = comitive.find((c) => c.k === k);
        if (gia) { gia.annullata = false; gia.luogo = v.luogo || gia.luogo; }
        else comitive.push({ k: k, data: v.data, ora: v.ora, luogo: v.luogo || '', aggiunta: true, motivo: v.motivo || '', creata: v.creata || '' });
      }
    });
    comitive.sort((a, b) => (a.data + pad_(a.ora) < b.data + pad_(b.ora) ? -1 : 1));
    adunanze.sort((a, b) => (a.data < b.data ? -1 : 1));
    adunanze.forEach((a) => { a.etichetta = breve_(a.data); });
    comitive.forEach((c) => { c.etichetta = breve_(c.data); });
    return { lunedi: lun, dal: lun, al: piu_(lun, 6), speciale: sp, adunanze: adunanze, comitive: comitive };
  });
}

/* ── chi riceve cosa ── */
function persone_() {
  if (MEMO_.persone) return MEMO_.persone;
  return MEMO_.persone = valori_(FOGLIO).slice(RIGA_DATI - 1).filter((r) => r[C.nome - 1] && r[C.stato - 1] === 'Attivo').map((r) => ({
    id: String(r[C.id - 1]), nome: String(r[C.nome - 1]), n: String(r[C.n - 1] || ''), tel: String(r[C.tel - 1] || ''),
    nominato: r[C.nomina - 1] === 'Anziano' || r[C.nomina - 1] === 'Servitore di ministero', reparti: r[C.reparti - 1] === true, oem: r[C.oem - 1] === true,
    cognome: String(r[C.cognome - 1] || ''), alias: String(r[C.alias - 1] || ''), gruppo: String(r[C.gruppo - 1] || ''), sesso: String(r[C.sesso - 1] || ''),
    servizio: String(r[C.servizio - 1] || ''), nucleo: String(r[C.nucleo - 1] || ''), riga: r,
  }));
}
/** I tre sondaggi, ognuno con il suo link e il colore delle cose a cui è destinato. */
const TIPI_SONDAGGIO_ = {
  adunanze: { nome: 'Adunanze · parti e reparti', colore: '#A8432B' },
  comitive: { nome: 'Comitive', colore: '#A86F00' },
  oem: { nome: 'Opera pubblica · espositori', colore: '#2F7F8C' },
  misto: { nome: 'Adunanze e comitive', colore: '#A8432B' },
};
/** Il tipo di un sondaggio (i primi, creati prima della divisione, sono «misto»). */
function tipoSondaggio_(d) { return d.tipo || (d.comitive || (d.mesiComitive || []).length ? 'misto' : 'adunanze'); }
function mesiComitive_(d) { return (d.mesiComitive || []).concat(d.comitive && !(d.mesiComitive || []).length ? [d.comitive] : []); }
/** Chi conduce le comitive: la spunta in anagrafica (sezione Comitive); se la colonna non c'è, i nominati. */
function conduceComitive_(p) { const col = colonnaComitive_(); return col ? p.riga[col.c - 1] === true : p.nominato; }
/** Le sezioni che una persona deve compilare in un sondaggio. */
function sezioniPer_(p, d) {
  const sez = { mesi: [], comitive: [], oem: '' };
  const tipo = tipoSondaggio_(d);
  if (tipo === 'oem') { if (p.oem) sez.oem = d.mese; return sez; }
  if (tipo === 'comitive') { if (conduceComitive_(p)) sez.comitive = mesiComitive_(d); return sez; }
  if (p.nominato) { sez.mesi = (d.mesiNominati || []).slice(); if (tipo === 'misto') sez.comitive = mesiComitive_(d); }
  else if (p.reparti) sez.mesi = (d.mesiReparti || []).slice();
  return sez;
}
function previsti_(d) { return persone_().filter((p) => haSezioni_(sezioniPer_(p, d))); }
function haSezioni_(z) { return !!(z.mesi.length || z.comitive.length || z.oem); }
/** Le sezioni di un sondaggio in parole («Nominati · dicembre e gennaio»). */
function sezioniTesto_(d) {
  const t = tipoSondaggio_(d), m = (x) => x.map(nomeMese_).join(' e '), out = [];
  if (t === 'oem') return ['Opera pubblica · ' + nomeMese_(d.mese)];
  if ((d.mesiNominati || []).length) out.push('Nominati · ' + m(d.mesiNominati));
  if ((d.mesiReparti || []).length) out.push('Fratelli in turnazione · ' + m(d.mesiReparti));
  if (mesiComitive_(d).length) out.push('Comitive · ' + m(mesiComitive_(d)));
  return out;
}

/* ── opera pubblica con gli espositori: postazioni e fasce (le stesse del programma espositori) ── */
const POSTAZIONI_BASE_ = [
  { id: 'sd', nome: 'San Donato', colore: '#2F7F8C', sfondo: '#E6F0F2', fasce: [{ g: 1, ora: '9:00–10:30' }, { g: 1, ora: '17:00–18:30' }, { g: 4, ora: '17:00–18:30' }, { g: 5, ora: '9:00–10:30' }] },
  { id: 'it', nome: 'Italsider', colore: '#2E75B5', sfondo: '#EAF2FA', fasce: [{ g: 2, ora: '9:00–10:30' }, { g: 3, ora: '9:00–10:30' }] },
  { id: 'so', nome: 'Soccavo', colore: '#A8432B', sfondo: '#F7ECE8', fasce: [{ g: 1, ora: '9:00–10:30' }, { g: 1, ora: '17:00–18:30' }, { g: 2, ora: '9:00–10:30' }, { g: 3, ora: '9:00–10:30' }, { g: 4, ora: '17:00–18:30' }, { g: 5, ora: '9:00–10:30' }] },
  { id: 'pv', nome: 'Piazza Vittoria', colore: '#6B2A5C', sfondo: '#F3ECF1', fasce: [{ g: 0, ora: '17:00–19:00' }] },
];
function turniOem_(lun) {
  const post = leggiImpostazione_('postazioni', POSTAZIONI_BASE_);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const data = piu_(lun, i), g = d_(data).getUTCDay();
    post.forEach((p) => p.fasce.forEach((f) => { if (f.g === g) out.push({ k: data + '|' + p.id + '|' + f.ora, data: data, ora: f.ora, postazione: p.nome, colore: p.colore, sfondo: p.sfondo, etichetta: breve_(data) }); }));
  }
  const ord = (t) => t.data + String(t.ora).replace(/^(\d):/, '0$1:');
  return out.sort((a, b) => (ord(a) < ord(b) ? -1 : ord(a) > ord(b) ? 1 : a.postazione < b.postazione ? -1 : 1));
}

/* ── archivio dei sondaggi ── */
function sondaggi_() {
  scheda_('Sondaggi');
  if (MEMO_.sondaggi) return MEMO_.sondaggi;
  return MEMO_.sondaggi = valori_('Sondaggi').slice(1).map((r, i) => {
    if (!r[0]) return null;
    const dati = JSON.parse(String(r[2]));
    // «Tutti i previsti»: i destinatari seguono l'anagrafica (chi spunti dopo entra da solo), tranne chi hai escluso tu
    if (dati.auto) { const fuori = dati.esclusi || []; dati.destinatari = previsti_(dati).map((p) => p.id).filter((id) => fuori.indexOf(id) < 0); }
    return { id: String(r[0]), titolo: String(r[1]), dati: dati, stato: String(r[3]), riga: i + 2 };
  }).filter(Boolean);
}
function salvaSondaggio_(s) { scheda_('Sondaggi').getRange(s.riga, 2, 1, 3).setValues([[s.titolo, JSON.stringify(s.dati), s.stato]]); dimentica_('Sondaggi'); delete MEMO_.sondaggi; }
function risposte_(sid) {
  scheda_('Risposte');
  const out = {};
  valori_('Risposte').slice(1).forEach((r, i) => {
    if (String(r[0]) === sid) out[String(r[1])] = { r: JSON.parse(String(r[3] || '{}')), prima: r[4], ultima: r[5], tardi: r[6] === true, riga: i + 2 };
  });
  return out;
}
function iso_(d) { return d ? Utilities.formatDate(new Date(d), 'Europe/Rome', "yyyy-MM-dd'T'HH:mm:ss") : ''; }
function oggi_() { return Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd'); }

/** I sondaggi aperti che riguardano questa persona (per la pagina iniziale). */
function sondaggiPer_(id) {
  const tutte = persone_(); const p = tutte.find((x) => x.id === id);
  if (!p) return [];
  return sondaggi_().filter((s) => s.stato === 'aperto' && s.dati.destinatari.indexOf(id) >= 0).map((s) => {
    const z = sezioniPer_(p, s.dati);
    if (!haSezioni_(z)) return null;
    const r = risposte_(s.id)[id];
    const t = tipoSondaggio_(s.dati);
    return { id: s.id, titolo: s.titolo, scadenza: s.dati.scadenza, risposto: !!r, colore: TIPI_SONDAGGIO_[t].colore, nomeTipo: TIPI_SONDAGGIO_[t].nome };
  }).filter(Boolean);
}

/** Il modulo da compilare: settimane, adunanze, comitive e la risposta già data. perConto: Luca compila per un altro. */
function modulo(k, sid, perConto) {
  const io = richiedi_(k);
  const chi = perConto ? (richiedi_(k, true), String(perConto)) : io.id;
  const s = sondaggi_().find((x) => x.id === sid);
  if (!s) throw new Error('Sondaggio non trovato.');
  if (!perConto && (s.stato !== 'aperto' || s.dati.destinatari.indexOf(chi) < 0)) throw new Error('Questo sondaggio non è aperto per te.');
  const p = persone_().find((x) => x.id === chi);
  if (!p) throw new Error('Persona non trovata.');
  const z = sezioniPer_(p, s.dati);
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const mesi = z.mesi.slice();
  z.comitive.forEach((m) => { if (mesi.indexOf(m) < 0) mesi.push(m); });
  if (z.oem && mesi.indexOf(z.oem) < 0) mesi.push(z.oem);
  mesi.sort();
  const sett = [];
  mesi.forEach((m) => settimane_(cal, m).forEach((w) => {
    w.mese = m;
    if (z.mesi.indexOf(m) < 0) w.adunanze = [];
    if (z.comitive.indexOf(m) < 0) w.comitive = [];
    w.turni = z.oem === m ? turniOem_(w.lunedi) : [];
    if (w.adunanze.length || w.comitive.length || w.turni.length || (w.speciale && !z.oem)) sett.push(w);
  }));
  const r = risposte_(sid)[chi];
  const quando = r ? iso_(r.ultima) : '';
  if (r) sett.forEach((w) => { w.comitive.forEach((c) => { if (c.creata && c.creata > quando) c.nuova = true; }); w.adunanze.forEach((a) => { if (a.creata && a.creata > quando) a.nuova = true; }); });
  return {
    id: s.id, titolo: s.titolo, tipo: s.dati.tipo || '', genere: tipoSondaggio_(s.dati), colore: TIPI_SONDAGGIO_[tipoSondaggio_(s.dati)].colore, nomeTipo: TIPI_SONDAGGIO_[tipoSondaggio_(s.dati)].nome, scadenza: s.dati.scadenza, scadenzaTesto: breve_(s.dati.scadenza), chiuso: s.dati.scadenza < oggi_(),
    persona: { id: p.id, nome: p.n || p.nome }, periodo: z.mesi.map(nomeMese_).join(' e '), comitive: z.comitive.map(nomeMese_).join(' e '), oem: z.oem ? nomeMese_(z.oem) : '',
    settimane: sett, risposta: r ? r.r : null,
  };
}

/** Salva la risposta: { assenze:[chiavi], comitive:[chiavi] }. */
function rispondi(k, sid, risposta, perConto) {
  const io = richiedi_(k);
  const chi = perConto ? (richiedi_(k, true), String(perConto)) : io.id;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const m = modulo(k, sid, perConto);
    const valide = {}; m.settimane.forEach((w) => { w.adunanze.forEach((a) => { valide[a.k] = 'a'; }); w.comitive.forEach((c) => { if (!c.annullata) valide[c.k] = 'c'; }); (w.turni || []).forEach((t) => { valide[t.k] = 't'; }); });
    const pulita = {
      assenze: (risposta.assenze || []).filter((x) => valide[x] === 'a'),
      comitive: (risposta.comitive || []).filter((x) => valide[x] === 'c'),
      turni: (risposta.turni || []).filter((x) => valide[x] === 't'),
      note: String(risposta.note || '').slice(0, 300),
    };
    const sh = scheda_('Risposte');
    const prima = risposte_(sid)[chi];
    const ora = new Date();
    const tardi = !perConto && m.scadenza < oggi_();
    const nome = persone_().find((x) => x.id === chi).nome;
    if (prima) sh.getRange(prima.riga, 4, 1, 4).setValues([[JSON.stringify(pulita), prima.prima, ora, tardi || prima.tardi]]);
    else sh.appendRow([sid, chi, nome, JSON.stringify(pulita), ora, ora, tardi]);
    dimentica_('Risposte');
    scheda_('Registro').appendRow([ora, io.id, io.nome, perConto ? 'risposta per conto' : 'risposta', nome + ' · ' + sid + ' · assenze ' + pulita.assenze.length + ', comitive ' + pulita.comitive.length + (pulita.turni.length ? ', turni OEM ' + pulita.turni.length : '') + (tardi ? ' · DOPO LA SCADENZA' : '')]);
    return { ok: true, assenze: pulita.assenze.length, comitive: pulita.comitive.length, turni: pulita.turni.length, tardi: tardi };
  } finally { lock.releaseLock(); }
}

/* ── gestione (solo Luca) ── */
function calendario(k) { richiedi_(k, true); return leggiImpostazione_('calendario', CALENDARIO_BASE_); }
function salvaCalendario(k, cal) {
  const io = richiedi_(k, true);
  if (!cal || !cal.periodi || !cal.periodi.length) throw new Error('Serve almeno un periodo con gli orari delle adunanze.');
  const adesso = Utilities.formatDate(new Date(), 'Europe/Rome', "yyyy-MM-dd'T'HH:mm:ss");
  cal.variazioni = (cal.variazioni || []).filter((v) => v && v.data && v.tipo);
  cal.variazioni.forEach((v) => { if (!v.creata) v.creata = adesso; });
  scriviImpostazione_('calendario', cal);
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'calendario', 'aggiornato']);
  return cal;
}
function anteprima(k, mese) { richiedi_(k, true); return settimane_(leggiImpostazione_('calendario', CALENDARIO_BASE_), mese); }

/** Elenco dei sondaggi con i conteggi. */
function sondaggiGestione(k) {
  richiedi_(k, true);
  return sondaggi_().map((s) => {
    const r = risposte_(s.id), t = tipoSondaggio_(s.dati);
    return { id: s.id, titolo: s.titolo, stato: s.stato, dati: s.dati, genere: t, colore: TIPI_SONDAGGIO_[t].colore, nomeTipo: TIPI_SONDAGGIO_[t].nome, sezioni: sezioniTesto_(s.dati),
      mesiComitive: mesiComitive_(s.dati), destinatari: s.dati.destinatari.length, risposte: Object.keys(r).filter((x) => s.dati.destinatari.indexOf(x) >= 0).length,
      conservate: conservate_(s, r) };
  }).reverse();
}
/** Le chiavi valide per ogni mese (adunanze, comitive, turni OEM), per capire quali risposte stanno fuori dalle sezioni. */
function chiaviMese_(cal, m, cache) {
  if (cache[m]) return cache[m];
  const out = { a: {}, c: {}, t: {} };
  settimane_(cal, m).forEach((w) => { w.adunanze.forEach((a) => { out.a[a.k] = 1; }); w.comitive.forEach((c) => { out.c[c.k] = 1; }); turniOem_(w.lunedi).forEach((t) => { out.t[t.k] = 1; }); });
  return cache[m] = out;
}
/** Di una risposta, quello che sta fuori dalle sezioni attuali della persona (conservato ma non usato). */
function fuoriSezioni_(p, d, x, cal, cache) {
  const z = p ? sezioniPer_(p, d) : { mesi: [], comitive: [], oem: '' };
  const dentro = (k, tipo, mesi) => mesi.some((m) => chiaviMese_(cal, m, cache)[tipo][k]);
  return {
    assenze: (x.assenze || []).filter((k) => !dentro(k, 'a', z.mesi)),
    comitive: (x.comitive || []).filter((k) => !dentro(k, 'c', z.comitive)),
    turni: (x.turni || []).filter((k) => !dentro(k, 't', z.oem ? [z.oem] : [])),
  };
}
function conservate_(s, r) {
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_), cache = {}, pers = {};
  persone_().forEach((p) => { pers[p.id] = p; });
  let n = 0;
  Object.keys(r).forEach((id) => { const f = fuoriSezioni_(pers[id], s.dati, r[id].r, cal, cache); if (f.assenze.length || f.comitive.length || f.turni.length) n++; });
  return n;
}
/** Solo Luca: cancella le risposte che stanno fuori dalle sezioni attuali del sondaggio. */
function eliminaRisposteFuori_(s) {
  const r = risposte_(s.id), cal = leggiImpostazione_('calendario', CALENDARIO_BASE_), cache = {}, pers = {};
  persone_().forEach((p) => { pers[p.id] = p; });
  const sh = scheda_('Risposte');
  let n = 0;
  Object.keys(r).forEach((id) => {
    const x = r[id].r, f = fuoriSezioni_(pers[id], s.dati, x, cal, cache);
    if (!f.assenze.length && !f.comitive.length && !f.turni.length) return;
    const via = (a, b) => (a || []).filter((k) => b.indexOf(k) < 0);
    const nuova = { assenze: via(x.assenze, f.assenze), comitive: via(x.comitive, f.comitive), turni: via(x.turni, f.turni), note: x.note || '' };
    sh.getRange(r[id].riga, 4).setValue(JSON.stringify(nuova));
    n++;
  });
  dimentica_('Risposte');
  return n;
}
/** Nuovo sondaggio: { titolo, mesiNominati, mesiReparti, comitive, scadenza, soloQuesti:[id] }. */
function creaSondaggio(k, d) {
  const io = richiedi_(k, true);
  if (!d.scadenza) throw new Error('Manca la scadenza.');
  let dati;
  const mesiOk = (x) => (x || []).filter((m) => /^\d{4}-\d{2}$/.test(m)).filter((m, i, a) => a.indexOf(m) === i).sort();
  if (d.tipo === 'oem') {
    if (!d.mese) throw new Error('Scegli il mese dell\'opera pubblica.');
    dati = { tipo: 'oem', mese: d.mese, mesiNominati: [], mesiReparti: [], scadenza: d.scadenza, inviati: {} };
  } else if (d.tipo === 'comitive') {
    if (!mesiOk(d.mesiComitive).length) throw new Error('Scegli almeno un mese di comitive.');
    dati = { tipo: 'comitive', mesiComitive: mesiOk(d.mesiComitive), mesiNominati: [], mesiReparti: [], scadenza: d.scadenza, inviati: {} };
  } else {
    if (!mesiOk(d.mesiNominati).length && !mesiOk(d.mesiReparti).length) throw new Error('Scegli almeno una sezione.');
    dati = { tipo: 'adunanze', mesiNominati: mesiOk(d.mesiNominati), mesiReparti: mesiOk(d.mesiReparti), scadenza: d.scadenza, inviati: {} };
  }
  dati.auto = !(d.soloQuesti && d.soloQuesti.length);
  dati.esclusi = [];
  dati.destinatari = (d.soloQuesti && d.soloQuesti.length ? previsti_(dati).filter((p) => d.soloQuesti.indexOf(p.id) >= 0) : previsti_(dati)).map((p) => p.id);
  const base = 'S' + Utilities.formatDate(new Date(), 'Europe/Rome', 'yyMMddHHmm');
  let id = base, n = 1;
  while (sondaggi_().some((x) => x.id === id)) id = base + String.fromCharCode(97 + n++);
  scheda_('Sondaggi').appendRow([id, d.titolo || 'Disponibilità', JSON.stringify(dati), 'aperto', new Date()]);
  dimentica_('Sondaggi'); delete MEMO_.sondaggi;
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'sondaggio', 'creato ' + id + ' · ' + (d.titolo || '') + ' · ' + dati.destinatari.length + ' destinatari']);
  return sondaggiGestione(k);
}
/** Modifica: { scadenza?, stato?, aggiungi:[id], togli:[id], inviato:id }. */
function impostaSondaggio(k, sid, d) {
  const io = richiedi_(k, true);
  const s = sondaggi_().find((x) => x.id === sid);
  if (!s) throw new Error('Sondaggio non trovato.');
  if (d.scadenza) s.dati.scadenza = d.scadenza;
  if (d.stato) { if (['aperto', 'chiuso', 'archiviato'].indexOf(d.stato) < 0) throw new Error('Stato non valido'); s.stato = d.stato; }
  if (d.sezioni) {
    const mesiOk = (x) => (x || []).filter((m) => /^\d{4}-\d{2}$/.test(m)).filter((m, i, a) => a.indexOf(m) === i).sort();
    if (!s.dati.tipo) s.dati.tipo = tipoSondaggio_(s.dati); // il tipo resta quello di partenza anche se togli una sezione
    const t = s.dati.tipo, z = d.sezioni;
    if (t === 'oem') { if (!/^\d{4}-\d{2}$/.test(z.mese || '')) throw new Error('Scegli il mese.'); s.dati.mese = z.mese; }
    else {
      if (t !== 'comitive') { s.dati.mesiNominati = mesiOk(z.mesiNominati); s.dati.mesiReparti = mesiOk(z.mesiReparti); }
      if (t !== 'adunanze') { s.dati.mesiComitive = mesiOk(z.mesiComitive); delete s.dati.comitive; }
      if (!s.dati.mesiNominati.length && !s.dati.mesiReparti.length && !(s.dati.mesiComitive || []).length) throw new Error('Lascia almeno una sezione.');
    }
    if (s.dati.auto) s.dati.destinatari = previsti_(s.dati).map((p) => p.id).filter((id) => (s.dati.esclusi || []).indexOf(id) < 0);
  }
  if (d.titolo) s.titolo = d.titolo;
  (d.aggiungi || []).forEach((x) => { if (s.dati.destinatari.indexOf(x) < 0) s.dati.destinatari.push(x); });
  if (d.togli) s.dati.destinatari = s.dati.destinatari.filter((x) => d.togli.indexOf(x) < 0);
  if (s.dati.auto) {
    s.dati.esclusi = (s.dati.esclusi || []).filter((x) => (d.aggiungi || []).indexOf(x) < 0).concat((d.togli || []).filter((x) => (s.dati.esclusi || []).indexOf(x) < 0));
  }
  if (d.inviato) { s.dati.inviati = s.dati.inviati || {}; s.dati.inviati[d.inviato] = (s.dati.inviati[d.inviato] || []).concat([oggi_()]); }
  if (d.avvisato) { s.dati.avvisati = s.dati.avvisati || {}; s.dati.avvisati[d.avvisato] = iso_(new Date()); }
  salvaSondaggio_(s);
  let tolte = 0;
  if (d.sezioni && d.eliminaRisposte) tolte = eliminaRisposteFuori_(s);
  if (!d.inviato && !d.avvisato) scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'sondaggio', sid + ' · ' + JSON.stringify(d) + (tolte ? ' · risposte cancellate a ' + tolte + ' persone' : '')]);
  return d.lista ? sondaggiGestione(k) : invio(k, sid);
}
/** Solo Luca: elimina un sondaggio e tutte le sue risposte (per conservarle, meglio «Archivia»). */
function eliminaSondaggio(k, sid) {
  const io = richiedi_(k, true);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = sondaggi_().find((x) => x.id === sid);
    if (!s) throw new Error('Sondaggio non trovato.');
    const r = risposte_(sid), righe = Object.keys(r).map((x) => r[x].riga).sort((a, b) => b - a);
    const sr = scheda_('Risposte'); righe.forEach((n) => sr.deleteRow(n));
    scheda_('Sondaggi').deleteRow(s.riga);
    dimentica_('Risposte'); dimentica_('Sondaggi'); delete MEMO_.sondaggi;
    scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'sondaggio', 'eliminato ' + sid + ' · ' + s.titolo + ' · ' + righe.length + ' risposte']);
  } finally { lock.releaseLock(); }
  return sondaggiGestione(k);
}
/** Pagina Invio: destinatari (anche quelli previsti ma esclusi), stato, link e telefono. */
function invio(k, sid) {
  richiedi_(k, true);
  const s = sondaggi_().find((x) => x.id === sid);
  if (!s) throw new Error('Sondaggio non trovato.');
  const acc = scheda_('Accessi'); const na = acc.getLastRow();
  const codici = {}; if (na > 1) acc.getRange(2, 1, na - 1, 5).getValues().forEach((r) => { if (r[4] === true) codici[String(r[0])] = String(r[2]); });
  const r = risposte_(sid);
  const url = ScriptApp.getService().getUrl();
  const prev = previsti_(s.dati);
  const varz = (leggiImpostazione_('calendario', CALENDARIO_BASE_).variazioni || []);
  const ultimaVar = (z) => varz.filter((v) => {
    const m = String(v.data).slice(0, 7);
    return v.creata && (v.tipo === 'spostata' ? z.mesi.indexOf(m) >= 0 : z.comitive.indexOf(m) >= 0);
  }).map((v) => v.creata).sort().pop() || '';
  const persone = prev.map((p) => {
    const z = sezioniPer_(p, s.dati);
    const x = r[p.id];
    const uv = x ? ultimaVar(z) : '';
    return {
      id: p.id, nome: p.nome, n: p.n, tel: p.tel, incluso: s.dati.destinatari.indexOf(p.id) >= 0, link: codici[p.id] ? url + '?k=' + codici[p.id] + '&s=' + s.id : '',
      sezioni: (z.mesi.length ? ['Adunanze: ' + z.mesi.map(nomeMese_).join(', ')] : []).concat(z.comitive.length ? ['Comitive: ' + z.comitive.map(nomeMese_).join(', ')] : []).concat(z.oem ? ['Opera pubblica: ' + nomeMese_(z.oem)] : []),
      inviato: (s.dati.inviati || {})[p.id] || [], risposto: !!x, tardi: x ? x.tardi : false,
      quando: x ? Utilities.formatDate(new Date(x.ultima), 'Europe/Rome', 'dd/MM HH:mm') : '',
      assenze: x ? x.r.assenze.length : 0, comitive: x ? x.r.comitive.length : 0, turni: x ? (x.r.turni || []).length : 0,
      avvisare: !!(uv && uv > iso_(x.ultima)) && !((s.dati.avvisati || {})[p.id] >= uv),
    };
  });
  return { id: s.id, titolo: s.titolo, tipo: s.dati.tipo || '', colore: TIPI_SONDAGGIO_[tipoSondaggio_(s.dati)].colore, stato: s.stato, scadenza: s.dati.scadenza, scadenzaTesto: breve_(s.dati.scadenza), persone: persone };
}
/** Risultati: per ogni adunanza chi non c'è, per ogni comitiva chi può condurre. */
function risultati(k, sid) {
  richiedi_(k, true);
  const s = sondaggi_().find((x) => x.id === sid);
  if (!s) throw new Error('Sondaggio non trovato.');
  const r = risposte_(sid);
  const nomi = {}; persone_().forEach((p) => { nomi[p.id] = p.nome; });
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const mesi = {}; (s.dati.mesiNominati || []).concat(s.dati.mesiReparti || []).concat(mesiComitive_(s.dati)).forEach((m) => { mesi[m] = true; }); if (s.dati.mese) mesi[s.dati.mese] = true;
  const adMesi = (s.dati.mesiNominati || []).concat(s.dati.mesiReparti || []);
  const assenti = {}, offerte = {}, turni = {};
  Object.keys(r).forEach((id) => {
    r[id].r.assenze.forEach((x) => { (assenti[x] = assenti[x] || []).push(nomi[id] || id); });
    r[id].r.comitive.forEach((x) => { (offerte[x] = offerte[x] || []).push(nomi[id] || id); });
    (r[id].r.turni || []).forEach((x) => { (turni[x] = turni[x] || []).push(nomi[id] || id); });
  });
  const sett = [];
  Object.keys(mesi).sort().forEach((m) => settimane_(cal, m).forEach((w) => {
    if (s.dati.tipo === 'oem') { w.adunanze = []; w.comitive = []; w.turni = turniOem_(w.lunedi); w.turni.forEach((t) => { t.offerte = turni[t.k] || []; }); sett.push(w); return; }
    if (adMesi.indexOf(m) < 0) w.adunanze = [];
    w.adunanze.forEach((a) => { a.assenti = assenti[a.k] || []; });
    w.comitive = mesiComitive_(s.dati).indexOf(m) >= 0 ? w.comitive : [];
    w.comitive.forEach((c) => { c.offerte = offerte[c.k] || []; });
    w.turni = [];
    sett.push(w);
  }));
  return { id: s.id, titolo: s.titolo, tipo: s.dati.tipo || '', colore: TIPI_SONDAGGIO_[tipoSondaggio_(s.dati)].colore, settimane: sett, risposte: Object.keys(r).length, destinatari: s.dati.destinatari.length };
}


/* ═════════════════════════ Turnazione reparti ═════════════════════════
 * La proposta si calcola nella pagina (stesso motore e stesse regole dell'artefatto di dicembre e di Congregation Manager).
 * Qui il server prepara i dati: abilitazioni dall'anagrafica, assenze dal sondaggio, parti dal Foglio «Programmi adunanze»,
 * storico dei mesi prima; e salva la turnazione del mese nella scheda Impostazioni (chiave reparti:AAAA-MM). */

const INCARICHI_COL_ = {
  'Coordinatore uscieri': 'USC_COORD', 'Ingresso': 'USC_ING', 'Auditorium': 'USC_AUD', 'Parcheggio': 'USC_PAR',
  'Podio': 'AV_POD', 'Microfonisti': 'AV_MIC', 'Mixer': 'AV_MIX', 'PC': 'AV_PC', 'Letteratura': 'LET', 'Territori': 'TER',
  'Coordinatore pulizie': 'PUL_COORD', 'Referente pulizie': 'PUL_REF',
};

function richiediAmbito_(k, ambito) {
  const io = richiedi_(k);
  if (!haAmbito_(io, ambito)) throw new Error('Non hai il permesso per questa sezione.');
  return io;
}
function meseDopo_(mese, n) { const d = d_(mese + '-01'); d.setUTCMonth(d.getUTCMonth() + n); return s_(d).slice(0, 7); }
function prossimoMese_() { return meseDopo_(oggi_().slice(0, 7), 1); }

/** Turni in forma compatta: «2026-12-07|I|USC_COORD|1|F046» (I infrasettimanale, F fine settimana, S tutta la settimana). */
function scompatta_(t) {
  if (Array.isArray(t)) return t;
  return String(t || '').split(';').filter(Boolean).map((x) => {
    const [s, T, inc, pos, p] = x.split('|');
    return { settimana_id: s, adunanza_id: T === 'S' ? null : s + (T === 'I' ? '-INFRA' : '-FINE'), incarico_id: inc, posizione: Number(pos), persona_id: p };
  });
}
function compatta_(turni) {
  return (turni || []).filter((t) => t && t.persona_id && t.settimana_id && t.incarico_id).map((t) =>
    [t.settimana_id, !t.adunanza_id ? 'S' : /INFRA$/.test(t.adunanza_id) ? 'I' : 'F', t.incarico_id, Number(t.posizione) || 1, t.persona_id].join('|')).join(';');
}

function sigla_p_(p) { return (p.n ? p.n.charAt(0) + '. ' : '') + String(p.cognome || p.nome).toUpperCase(); }
function sigle_(lista) {
  const out = {}, conta = {};
  lista.forEach((p) => { const s = sigla_p_(p); conta[s] = (conta[s] || 0) + 1; });
  lista.forEach((p) => { const s = sigla_p_(p); out[p.id] = conta[s] > 1 ? (p.n + ' ' + p.cognome).toUpperCase() : s; });
  return out;
}

/** Abilitazioni ai reparti dall'anagrafica: solo chi è «in turnazione». */
function abilitazioniReparti_() {
  const col = struttura_(SpreadsheetApp.getActive().getSheetByName(FOGLIO)).filter((x) => x.tipo === 'check' && /^REPARTI/i.test(x.sezione) && INCARICHI_COL_[x.titolo]);
  const out = [], visti = {};
  persone_().filter((p) => p.reparti).forEach((p) => col.forEach((x) => {
    if (p.riga[x.c - 1] !== true) return;
    const inc = INCARICHI_COL_[x.titolo];
    const ad = /^PUL_/.test(inc) ? 'TUTTE' : /fine/i.test(x.sezione) ? 'FINE' : 'INFRA';
    const k = p.id + '|' + inc + '|' + ad;
    if (!visti[k]) { visti[k] = true; out.push({ persona_id: p.id, incarico_id: inc, adunanze: ad }); }
  }));
  return out;
}

/** Le adunanze del mese per la turnazione (anche quelle che non si tengono, segnate «nessuna»). */
function adunanzeReparti_(cal, sett, nessuna) {
  const out = [];
  sett.forEach((w) => {
    const p = periodo_(cal, w.lunedi), off = (g) => (g + 6) % 7;
    const base = [
      { tipo: 'INFRA', data: piu_(w.lunedi, off(p.infra.g)), ora: p.infra.ora },
      { tipo: 'FINE', data: piu_(w.lunedi, off(p.fs.g)), ora: p.fs.ora },
    ];
    base.forEach((b) => {
      const vera = w.adunanze.find((a) => (a.tipo === 'inf' ? 'INFRA' : 'FINE') === b.tipo);
      const id = w.lunedi + '-' + b.tipo;
      out.push({ id: id, settimana_id: w.lunedi, tipo: b.tipo, data: vera ? vera.data : b.data, ora: vera ? vera.ora : b.ora,
        spostata: !!(vera && vera.spostata), nessuna: !vera || !!(nessuna || {})[id] });
    });
  });
  return out;
}

/** Le risposte ai sondaggi che coprono questo mese: per ogni persona l'ultima risposta. */
function risposteDelMese_(mese, campo) {
  const out = {}, previsti = {};
  const pers = {}; persone_().forEach((p) => { pers[p.id] = p; });
  sondaggi_().filter((s) => s.dati.tipo !== 'oem').forEach((s) => {
    const r = risposte_(s.id);
    s.dati.destinatari.forEach((id) => {
      const p = pers[id]; if (!p) return;
      const z = sezioniPer_(p, s.dati);
      const copre = campo === 'comitive' ? z.comitive.indexOf(mese) >= 0 : z.mesi.indexOf(mese) >= 0;
      if (!copre) return;
      previsti[id] = true;
      const x = r[id];
      if (!x) return;
      const q = iso_(x.ultima);
      if (!out[id] || out[id].quando < q) out[id] = { quando: q, r: x.r, sondaggio: s.titolo };
    });
  });
  return { risposte: out, previsti: previsti };
}

/* ── parti delle adunanze lette dal Foglio «Programmi adunanze» ── */
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function chiaveNome_(s) { return norm_(s).split(' ').filter(Boolean).sort().join(' '); }
function indiceNomi_() {
  const m = {};
  persone_().forEach((p) => {
    [p.n + ' ' + p.cognome].concat(String(p.alias || '').split(/[,;]/)).forEach((x) => {
      const k = chiaveNome_(x);
      if (k) { m[k] = m[k] || []; if (m[k].indexOf(p.id) < 0) m[k].push(p.id); }
    });
  });
  return m;
}
/** Le righe della guida che impegnano durante l'adunanza (regola di Luca). Dalla guida su GitHub, tenuta in cache 6 ore. */
function partiEsclusive_(mese) {
  const c = CacheService.getScriptCache(), key = 'guida:' + mese;
  const t = c.get(key);
  if (t) return JSON.parse(t);
  let g;
  try {
    const r = UrlFetchApp.fetch(REPO + 'dati/' + mese + '.json', { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return [];
    g = JSON.parse(r.getContentText());
  } catch (e) { return []; }
  const out = [];
  (g.settimane || []).forEach((w) => (w.carte || []).forEach((ca) => {
    const ad = String(ca.id).replace(/-inf$/, '-INFRA').replace(/-fs$/, '-FINE');
    (ca.sezioni || []).forEach((z) => (z.righe || []).forEach((r) => {
      if (!r.campi) return;
      const sez = String(z.titolo || '');
      const add = (campo, nome) => out.push({ riga: r.id, campo: campo, ad: ad, codice: nome });
      if (r.ruolo === 'Presidente') add('chi', 'Presidente');
      else if (ca.tipo === 'INFRA' && /tesori/i.test(sez) && r.ruolo !== 'Stud.') add('chi', 'Tesori · ' + r.titolo);
      else if (ca.tipo === 'INFRA' && /vita cristiana/i.test(sez) && r.tipo !== 'cantico') {
        if (r.ruolo === 'Cond.') { add('chi', 'Studio biblico · conduttore'); if (r.campi.indexOf('chi2') >= 0) add('chi2', 'Studio biblico · lettore'); }
        else add('chi', 'Vita cristiana · ' + r.titolo);
      } else if (ca.tipo === 'FINE' && /torre/i.test(sez) && /conduttore|lettore/i.test(String(r.titolo))) add('chi', 'Torre di Guardia · ' + String(r.titolo).toLowerCase());
    }));
  }));
  try { c.put(key, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}
function partiProgrammi_(mese) {
  const id = leggiImpostazione_('foglioProgrammi', '');
  if (!id) return { parti: [], ignote: [], errore: 'Manca il collegamento al Foglio «Programmi adunanze».' };
  let val = {};
  try {
    const sh = SpreadsheetApp.openById(id).getSheetByName('Programma');
    if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach((r) => { if (r[0]) val[String(r[0])] = String(r[1] || ''); });
  } catch (e) { return { parti: [], ignote: [], errore: 'Non riesco ad aprire il Foglio «Programmi adunanze» (' + e.message + ').' }; }
  const idx = indiceNomi_();
  const parti = [], ignote = [];
  partiEsclusive_(mese).forEach((x) => {
    const nome = String(val[x.riga + ':' + x.campo] || '').trim();
    if (!nome) return;
    const ids = idx[chiaveNome_(nome)];
    if (ids && ids.length === 1) parti.push({ adunanza_id: x.ad, assegnata_id: ids[0], effettiva_id: null, codice: x.codice });
    else ignote.push({ adunanza_id: x.ad, nome: nome, codice: x.codice, doppi: ids || [] });
  });
  return { parti: parti, ignote: ignote, errore: '' };
}

/** Tutto quello che serve alla pagina della turnazione di un mese. */
function reparti(k, mese) {
  richiediAmbito_(k, 'reparti');
  mese = /^\d{4}-\d{2}$/.test(mese || '') ? mese : prossimoMese_();
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const sett = settimane_(cal, mese);
  const stato = leggiImpostazione_('reparti:' + mese, null) || {};
  stato.turni = scompatta_(stato.turni);
  ['assenze', 'gruppi', 'generali', 'nessuna', 'eventi', 'togli'].forEach((x) => { stato[x] = stato[x] || {}; });
  stato.periodi = stato.periodi || [];
  sett.forEach((w) => {
    if (w.speciale && !stato.eventi[w.lunedi] && !stato.eventiTolti) stato.eventi[w.lunedi] = { tipo: w.speciale.nome, luogo: w.speciale.luogo || '', orario: '', tema: '', nota: '' };
    if (w.speciale && w.speciale.adunanze === false) { stato.nessuna[w.lunedi + '-INFRA'] = true; stato.nessuna[w.lunedi + '-FINE'] = true; }
  });
  const adunanze = adunanzeReparti_(cal, sett, stato.nessuna);
  const pInc = abilitazioniReparti_();
  const inTurno = {}; pInc.forEach((x) => { inTurno[x.persona_id] = true; });

  // Assenze dal sondaggio (chiave adunanza = lunedì-INFRA / lunedì-FINE, la stessa della turnazione)
  const rd = risposteDelMese_(mese, 'adunanze');
  const sondaggio = {}, risposto = {}, mancano = [];
  Object.keys(rd.risposte).forEach((id) => { risposto[id] = rd.risposte[id].quando; rd.risposte[id].r.assenze.forEach((a) => { if (adunanze.some((x) => x.id === a)) sondaggio[id + '|' + a] = true; }); });
  Object.keys(rd.previsti).forEach((id) => { if (inTurno[id] && !risposto[id]) mancano.push(id); });

  // Storico: i mesi prima salvati nel portale, più quello importato dall'artefatto
  const primo = sett.length ? sett[0].lunedi : mese + '-01';
  let storico = [], adPrima = [];
  const imp = leggiImpostazione_('reparti:storico', null);
  if (imp) {
    storico = scompatta_(imp.t).filter((t) => t.settimana_id < primo);
    adPrima = String(imp.a || '').split(';').filter(Boolean).map((x) => { const [id, data] = x.split('|'); return { id: id, settimana_id: id.slice(0, 10), tipo: /INFRA$/.test(id) ? 'INFRA' : 'FINE', data: data, nessuna: false }; });
  }
  for (let i = 3; i >= 1; i--) {
    const m = meseDopo_(mese, -i);
    const x = leggiImpostazione_('reparti:' + m, null);
    if (!x) continue;
    const t = scompatta_(x.turni);
    const sw = {}; t.forEach((y) => { sw[y.settimana_id] = true; });
    storico = storico.filter((y) => !sw[y.settimana_id]).concat(t);
    adunanzeReparti_(cal, settimane_(cal, m), x.nessuna || {}).forEach((a) => { if (!adPrima.some((b) => b.id === a.id)) adPrima.push(a); });
  }
  const prima = piu_(primo, -7);
  const settimanaPrima = storico.some((t) => t.settimana_id === prima) ? { id: prima, lunedi: prima } : null;

  const pr = partiProgrammi_(mese);
  const servono = {}; Object.keys(inTurno).forEach((id) => { servono[id] = true; });
  stato.turni.forEach((t) => { servono[t.persona_id] = true; });
  Object.keys(stato.generali).forEach((s) => { const g = stato.generali[s]; if (g.coord) servono[g.coord] = true; if (g.ref) servono[g.ref] = true; });
  const lista = persone_().filter((p) => servono[p.id]);
  const sg = sigle_(lista);
  return {
    mese: mese, nomeMese: nomeMese_(mese), oggi: oggi_(),
    settimane: sett.map((w) => ({ id: w.lunedi, lunedi: w.lunedi })),
    adunanze: adunanze,
    orari: { infra: orarioTesto_(cal, sett, 'infra'), fs: orarioTesto_(cal, sett, 'fs') },
    persone: lista.map((p) => ({ id: p.id, sigla: sg[p.id], nome: p.n, cognome: p.cognome, gruppo: p.gruppo })),
    pInc: pInc, sondaggio: sondaggio, risposto: risposto, mancano: mancano,
    parti: pr.parti, partiIgnote: pr.ignote, partiErrore: pr.errore,
    storico: storico, settimanaPrima: settimanaPrima, adunanzePrima: settimanaPrima ? adPrima.filter((a) => a.settimana_id === prima) : [],
    gruppiPulizie: LISTE[8], stato: stato,
  };
}
function orarioTesto_(cal, sett, q) {
  const G = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const p = periodo_(cal, sett.length ? sett[0].lunedi : oggi_());
  return G[p[q].g] + (p[q].ora ? ' ' + p[q].ora : '');
}

/** Salva la turnazione del mese (la pagina manda tutto lo stato, che resta piccolo). */
function salvaReparti(k, mese, stato) {
  const io = richiediAmbito_(k, 'reparti');
  if (!/^\d{4}-\d{2}$/.test(mese || '')) throw new Error('Mese non valido.');
  const ids = {}; persone_().forEach((p) => { ids[p.id] = true; });
  const pulito = {
    turni: compatta_((stato.turni || []).filter((t) => ids[t.persona_id])),
    assenze: stato.assenze || {}, periodi: (stato.periodi || []).filter((x) => x && ids[x.persona_id] && x.dal),
    gruppi: stato.gruppi || {}, generali: stato.generali || {}, nessuna: stato.nessuna || {}, eventi: stato.eventi || {},
    togli: stato.togli || {}, eventiTolti: !!stato.eventiTolti, importato: stato.importato || '', compatto: 1,
  };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { scriviImpostazione_('reparti:' + mese, pulito); } finally { lock.releaseLock(); }
  registroUnaVolta_(io, 'reparti', 'turnazione reparti di ' + nomeMese_(mese) + ' modificata');
  return { ok: true, quando: Utilities.formatDate(new Date(), 'Europe/Rome', 'HH:mm') };
}
/** Nel Registro una riga per persona e argomento ogni ora, non una a ogni salvataggio. */
function registroUnaVolta_(io, azione, cosa) {
  const c = CacheService.getScriptCache(), ck = 'reg:' + io.id + ':' + cosa;
  if (c.get(ck)) return;
  try { c.put(ck, '1', 3600); } catch (e) {}
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, azione, cosa]);
}

/** Collega un nome scritto nei programmi a una persona dell'anagrafica («Altri modi di scrivere»). Solo Luca. */
function aggiungiAlias(k, id, testo) {
  const io = richiedi_(k, true);
  testo = String(testo || '').trim();
  if (!testo) throw new Error('Nome vuoto.');
  const sh = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
  const riga = rigaDi_(sh, id);
  if (!riga) throw new Error('Persona non trovata.');
  const prima = String(sh.getRange(riga, C.alias).getValue() || '');
  const lista = prima.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  if (lista.map(chiaveNome_).indexOf(chiaveNome_(testo)) < 0) lista.push(testo);
  sh.getRange(riga, C.alias).setValue(lista.join(', '));
  dimentica_(FOGLIO);
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'modifica', sh.getRange(riga, C.nome).getValue() + ' · Altri modi di scrivere: ' + lista.join(', ')]);
  return true;
}


/* ═════════════════════════ Programma comitive ═════════════════════════ */

function colonnaComitive_() {
  return struttura_(SpreadsheetApp.getActive().getSheetByName(FOGLIO)).find((x) => x.tipo === 'check' && /comitive/i.test(x.sezione) && /congregazione/i.test(x.titolo));
}
function comitive(k, mese) {
  richiediAmbito_(k, 'comitive');
  mese = /^\d{4}-\d{2}$/.test(mese || '') ? mese : prossimoMese_();
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const sett = settimane_(cal, mese);
  const colC = colonnaComitive_();
  const rd = risposteDelMese_(mese, 'comitive');
  const offerte = {}, risposto = {};
  Object.keys(rd.risposte).forEach((id) => { risposto[id] = rd.risposte[id].quando; (rd.risposte[id].r.comitive || []).forEach((c) => { (offerte[c] = offerte[c] || []).push(id); }); });
  const abil = persone_().filter((p) => colC ? p.riga[colC.c - 1] === true : p.nominato);
  const serve = {}; abil.forEach((p) => { serve[p.id] = true; }); Object.keys(offerte).forEach((c) => offerte[c].forEach((id) => { serve[id] = true; }));
  const stato = leggiImpostazione_('comitive:' + mese, null) || {};
  ['assegnati', 'nascoste', 'note', 'domeniche'].forEach((x) => { stato[x] = stato[x] || {}; });
  Object.keys(stato.assegnati).forEach((c) => { if (stato.assegnati[c]) serve[stato.assegnati[c]] = true; });
  const storico = {};
  for (let i = 1; i <= 2; i++) {
    const x = leggiImpostazione_('comitive:' + meseDopo_(mese, -i), null);
    if (x && x.assegnati) Object.keys(x.assegnati).forEach((c) => { const id = x.assegnati[c]; if (id) storico[id] = (storico[id] || 0) + 1; });
  }
  const lista = persone_().filter((p) => serve[p.id]);
  const sg = sigle_(lista);
  return {
    mese: mese, nomeMese: nomeMese_(mese),
    settimane: sett.map((w) => ({ lunedi: w.lunedi, dal: w.dal, al: w.al, speciale: w.speciale, comitive: w.comitive, domenica: w.al,
      adunanze: w.adunanze.map((a) => ({ tipo: a.tipo, data: a.data, ora: a.ora, spostata: !!a.spostata })) })),
    conduttori: lista.map((p) => ({ id: p.id, sigla: sg[p.id], nome: p.n, cognome: p.cognome, gruppo: p.gruppo, abilitato: !!(colC ? p.riga[colC.c - 1] === true : p.nominato) })),
    offerte: offerte, risposto: risposto, previsti: Object.keys(rd.previsti), storico: storico, stato: stato,
    sedi: (cal.comitive || []).map((c) => c.luogo).filter((x, i, a) => x && a.indexOf(x) === i),
  };
}
function salvaComitive(k, mese, stato) {
  const io = richiediAmbito_(k, 'comitive');
  if (!/^\d{4}-\d{2}$/.test(mese || '')) throw new Error('Mese non valido.');
  const ids = {}; persone_().forEach((p) => { ids[p.id] = true; });
  const ass = {}; Object.keys(stato.assegnati || {}).forEach((c) => { if (ids[stato.assegnati[c]]) ass[c] = stato.assegnati[c]; });
  const pulito = { assegnati: ass, nascoste: stato.nascoste || {}, note: stato.note || {}, domeniche: stato.domeniche || {} };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { scriviImpostazione_('comitive:' + mese, pulito); } finally { lock.releaseLock(); }
  registroUnaVolta_(io, 'comitive', 'programma comitive di ' + nomeMese_(mese) + ' modificato');
  return { ok: true, quando: Utilities.formatDate(new Date(), 'Europe/Rome', 'HH:mm') };
}

/** Da eseguire una volta dall'editor dopo questo aggiornamento: chiede a Google i permessi nuovi
 *  (leggere il Foglio «Programmi adunanze» e la guida su GitHub). Non modifica niente. */
function autorizza() {
  soloProprietario_();
  const id = leggiImpostazione_('foglioProgrammi', '');
  if (id) SpreadsheetApp.openById(id).getName();
  const ide = leggiImpostazione_('foglioEspositori', '');
  if (ide) SpreadsheetApp.openById(ide).getName();
  UrlFetchApp.fetch(REPO + 'README.md', { muteHttpExceptions: true });
  DriveApp.getRootFolder().getName();
  PropertiesService.getUserProperties().getProperty('TELEGRAM_CHAT');
  return 'Permessi a posto.';
}


/* ═════════════════════════ Programmi adunanze dentro il portale ═════════════════════════
 * La pagina è quella di sempre (dist/app.js su GitHub), aperta dentro il portale. I dati restano nel Foglio
 * «Programmi adunanze – dati» (chiave foglioProgrammi in Impostazioni): il portale lo apre come Luca, quindi il Foglio
 * non va più condiviso con chi compila. Chi ha l'ambito «inf» compila l'infrasettimanale, «fs» il fine settimana. */

function foglioProgrammi_() {
  const id = leggiImpostazione_('foglioProgrammi', '');
  if (!id) throw new Error('Manca il collegamento al Foglio «Programmi adunanze».');
  return SpreadsheetApp.openById(id);
}
function ruoloProgrammi_(io) {
  if (io.tutto) return 'tutto';
  const i = io.ambiti.indexOf('inf') >= 0, f = io.ambiti.indexOf('fs') >= 0;
  if (i && f) return 'tutto';
  if (i) return 'inf';
  if (f) return 'fs';
  throw new Error('Non hai il permesso per i programmi delle adunanze.');
}
function coppie_(sh) {
  const out = {};
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach((r) => { if (r[0]) out[String(r[0])] = String(r[1]); });
  return out;
}
/** Podio di ogni adunanza («2026-12-08|INFRA» → nome), dalla Turnazione reparti del portale. */
function podioPortale_() {
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const nomi = {}; persone_().forEach((p) => { nomi[p.id] = (p.n + ' ' + p.cognome).trim(); });
  const out = {};
  [-1, 0, 1, 2].forEach((n) => {
    const m = meseDopo_(oggi_().slice(0, 7), n);
    const x = leggiImpostazione_('reparti:' + m, null);
    if (!x) return;
    const ads = adunanzeReparti_(cal, settimane_(cal, m), x.nessuna || {});
    scompatta_(x.turni).forEach((t) => {
      if (t.incarico_id !== 'AV_POD' || !t.adunanza_id) return;
      const a = ads.find((y) => y.id === t.adunanza_id);
      if (a && nomi[t.persona_id]) { out[a.data + '|' + a.tipo] = nomi[t.persona_id]; out[t.adunanza_id] = nomi[t.persona_id]; }
    });
  });
  return out;
}
/** Il podio anche con le date scritte nel programma (se il giorno di un'adunanza è cambiato solo lì). */
function podioPerProgramma_(valori) {
  const pod = podioPortale_();
  Object.keys(valori).forEach((k) => {
    const m = /^(\d{4}-\d{2}-\d{2})-(inf|fs):quando$/.exec(k);
    if (!m) return;
    const id = m[1] + (m[2] === 'inf' ? '-INFRA' : '-FINE'), data = String(valori[k]).slice(0, 10);
    if (pod[id] && !pod[data + '|' + (m[2] === 'inf' ? 'INFRA' : 'FINE')]) pod[data + '|' + (m[2] === 'inf' ? 'INFRA' : 'FINE')] = pod[id];
  });
  Object.keys(pod).forEach((x) => { if (x.indexOf('|') < 0) delete pod[x]; });
  return pod;
}
function pa_stato(k) {
  const io = richiedi_(k);
  const ruolo = ruoloProgrammi_(io);
  const ss = foglioProgrammi_();
  const valori = coppie_(ss.getSheetByName('Programma'));
  const p = persone_().find((x) => x.id === io.id) || {};
  const conReparti = !!(io.tutto || p.nominato);
  return { email: io.nome, ruolo: ruolo, impostazioni: coppie_(ss.getSheetByName('Impostazioni')), valori: valori, podio: podioPerProgramma_(valori),
    conReparti: conReparti, reparti: conReparti ? repartiPerProgramma_(false) : {}, senzaWA: true };
}
function pa_salva(k, chiave, valore) {
  const io = richiedi_(k);
  const ruolo = ruoloProgrammi_(io);
  chiave = String(chiave);
  const fine = /-fs[-:]/.test(chiave);
  const ok = ruolo === 'tutto' || (ruolo === 'fs' && fine) || (ruolo === 'inf' && !fine && /-inf[-:]/.test(chiave));
  if (!ok) throw new Error('Non puoi modificare questa parte');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = foglioProgrammi_().getSheetByName('Programma');
    const trovata = sh.getRange('A:A').createTextFinder(chiave).matchEntireCell(true).findNext();
    if (!valore) { if (trovata) sh.deleteRow(trovata.getRow()); }
    else if (trovata) sh.getRange(trovata.getRow(), 2, 1, 3).setValues([[valore, io.nome, new Date()]]);
    else sh.appendRow([chiave, valore, io.nome, new Date()]);
  } finally { lock.releaseLock(); }
  if (!/^diag/.test(chiave)) registroUnaVolta_(io, 'programmi', 'programma ' + (fine ? 'del fine settimana' : 'infrasettimanale') + ' modificato');
  return true;
}
function cartellaProgrammi_(chiave, nome) {
  const ss = foglioProgrammi_(), imp = ss.getSheetByName('Impostazioni');
  const v = coppie_(imp)[chiave];
  if (v) return DriveApp.getFolderById(v);
  const file = DriveApp.getFileById(ss.getId());
  const padre = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
  const c = padre.createFolder(nome);
  imp.appendRow([chiave, c.getId(), 'Cartella (non cambiare)']);
  return c;
}
function pa_caricaFoto(k, base64, nome) {
  ruoloProgrammi_(richiedi_(k));
  return cartellaProgrammi_('cartellaFoto', 'Programmi adunanze – foto').createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'image/jpeg', nome || 'programma.jpg')).getId();
}
function pa_caricaImmagine(k, base64, nome) {
  ruoloProgrammi_(richiedi_(k));
  return cartellaProgrammi_('cartellaImmagini', 'Programmi adunanze – immagini WhatsApp').createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', nome || 'immagine.png')).getId();
}
function pa_foto(k, id) {
  richiedi_(k);
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes());
}

/* ── Invii su Telegram (solo Luca): le immagini confermate di presidente e audio/video, qualche giorno prima ──
 * Le chiavi stanno nelle proprietà utente del proprietario: le legge solo lo script, mai la pagina. */
function riservate(k) {
  richiedi_(k, true);
  const p = PropertiesService.getUserProperties().getProperties();
  const m = (x) => (p[x] ? '••••' + String(p[x]).slice(-4) : '');
  return { TELEGRAM_TOKEN: m('TELEGRAM_TOKEN'), TELEGRAM_CHAT: m('TELEGRAM_CHAT'), ANTICIPO_GIORNI: p.ANTICIPO_GIORNI || '3', ORA_INVIO: p.ORA_INVIO || '19:00',
    attivo: ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'inviiWhatsApp') };
}
function salvaRiservate(k, d) {
  const io = richiedi_(k, true);
  const p = PropertiesService.getUserProperties();
  ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT', 'ANTICIPO_GIORNI', 'ORA_INVIO'].forEach((x) => { if (d[x]) p.setProperty(x, String(d[x]).trim()); });
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'riservate', 'impostazioni Telegram aggiornate']);
  return riservate(k);
}
function attivaInvii(k, acceso) {
  const io = richiedi_(k, true);
  ScriptApp.getProjectTriggers().forEach((t) => { if (t.getHandlerFunction() === 'inviiWhatsApp') ScriptApp.deleteTrigger(t); });
  if (acceso !== false) ScriptApp.newTrigger('inviiWhatsApp').timeBased().everyMinutes(15).create();
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'riservate', acceso !== false ? 'invii Telegram attivati' : 'invii Telegram spenti']);
  return riservate(k);
}
function provaTelegram(k) {
  richiedi_(k, true);
  const p = PropertiesService.getUserProperties();
  telegram_('sendMessage', { chat_id: p.getProperty('TELEGRAM_CHAT'), text: '✅ Portale della congregazione collegato. Podio letto per ' + Object.keys(podioPortale_()).filter((x) => x.indexOf('|') > 0).length + ' adunanze.' });
  return 'Messaggio inviato.';
}
function telegram_(metodo, payload) {
  const token = PropertiesService.getUserProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) throw new Error('Token Telegram non impostato');
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + metodo, { method: 'post', payload: payload, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('Telegram: ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}
function dataRoma_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/.exec(s || '');
  return m ? Utilities.parseDate(m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5], 'Europe/Rome', 'yyyy-MM-dd HH:mm') : null;
}
/** Ogni 15 minuti (attivatore): per ogni adunanza, dal momento dell'invio fino all'inizio, manda le immagini confermate;
 *  se vengono confermate di nuovo dopo l'invio le rimanda con «Aggiornamento»; se non sono confermate, un avviso. */
function inviiWhatsApp(e) {
  if (!e || typeof e !== 'object' || !e.triggerUid) return; // parte solo dall'attivatore, non dalla pagina
  const p = PropertiesService.getUserProperties();
  if (!p.getProperty('TELEGRAM_TOKEN') || !p.getProperty('TELEGRAM_CHAT')) return;
  const chat = p.getProperty('TELEGRAM_CHAT'), giorni = Number(p.getProperty('ANTICIPO_GIORNI') || 3), ora = (p.getProperty('ORA_INVIO') || '19:00').split(':');
  const val = coppie_(foglioProgrammi_().getSheetByName('Programma'));
  const adesso = new Date();
  Object.keys(val).forEach((k) => {
    if (!/:quando$/.test(k)) return;
    const carta = k.slice(0, -':quando'.length), inizio = dataRoma_(val[k]);
    if (!inizio) return;
    const statoK = 'inviato:' + carta;
    if (inizio <= adesso) { p.deleteProperty(statoK); return; }
    const giorno = Utilities.formatDate(new Date(inizio.getTime() - giorni * 86400000), 'Europe/Rome', 'yyyy-MM-dd');
    if (adesso < dataRoma_(giorno + ' ' + ora[0] + ':' + (ora[1] || '00'))) return;
    const nomeAd = (/-inf$/.test(carta) ? 'Adunanza infrasettimanale' : 'Adunanza del fine settimana') + ' · ' + Utilities.formatDate(inizio, 'Europe/Rome', 'dd/MM HH:mm');
    let conf = null; try { conf = JSON.parse(val[carta + ':wa'] || 'null'); } catch (e) { /* valore rovinato */ }
    const stato = p.getProperty(statoK) || '';
    if (!conf) {
      if (stato !== 'avviso') { telegram_('sendMessage', { chat_id: chat, text: '⚠️ ' + nomeAd + ': le immagini per il presidente e per le prove dell’Audio/Video non sono ancora confermate da chi compila il programma.' }); p.setProperty(statoK, 'avviso'); }
      return;
    }
    const firma = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, conf.firma || ''));
    if (stato === firma) return;
    const agg = stato && stato !== 'avviso' ? '🔄 Aggiornamento · ' : '';
    [[conf.png && conf.png.pres, 'Presidente'], [conf.png && conf.png.av, 'Audio/Video · prove']].forEach(([id, chi]) => {
      if (id) telegram_('sendPhoto', { chat_id: chat, caption: agg + chi + ' · ' + nomeAd, photo: DriveApp.getFileById(id).getBlob() });
    });
    p.setProperty(statoK, firma);
  });
  inviiReparti_(p, chat, giorni, ora, adesso);
}


/* ═════════════════════════ Programma espositori (OEM) dentro il portale ═════════════════════════
 * Pagina di sempre (espositori/app.html), dati nel Foglio «Programma espositori – dati» (chiave foglioEspositori).
 * Chi ha l'ambito «oem» compila; Luca può tutto. Stesso controllo di versione: nessuno sovrascrive il lavoro dell'altro. */
const OEM_INTESTAZIONI_ = {
  Mesi: ['Mese', 'Dati (non modificare a mano)', 'Versione', 'Modificato da', 'Quando'],
  Carrelli: ['Sala|Mese', 'Dati (non modificare a mano)', 'Versione', 'Modificato da', 'Quando'],
  Catalogo: ['Id', 'Dati (non modificare a mano)', 'Nome', 'Tipo', 'Modificato da', 'Quando'],
};
function foglioEspositori_() {
  const id = leggiImpostazione_('foglioEspositori', '');
  if (!id) throw new Error('Manca il collegamento al Foglio «Programma espositori».');
  return SpreadsheetApp.openById(id);
}
function oemScheda_(ss, nome) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0 && OEM_INTESTAZIONI_[nome]) { sh.appendRow(OEM_INTESTAZIONI_[nome]); sh.setFrozenRows(1); }
  return sh;
}
function ruoloOem_(io) { if (io.tutto) return 'tutto'; if (io.ambiti.indexOf('oem') >= 0) return 'compila'; throw new Error('Non hai il permesso per il programma espositori.'); }
function oemScrittore_(k) { const io = richiedi_(k); ruoloOem_(io); return io; }
function oemChiave_(ss, k) { return Object.prototype.toString.call(k) === '[object Date]' ? Utilities.formatDate(k, ss.getSpreadsheetTimeZone(), 'yyyy-MM') : String(k).trim(); }
function oemRiga_(ss, sh, chiave) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = col.length - 1; i >= 0; i--) if (col[i][0] !== '' && oemChiave_(ss, col[i][0]) === chiave) return i + 2;
  return 0;
}
function oemScrivi_(sh, r, riga) { if (!r) r = sh.getLastRow() + 1; sh.getRange(r, 1).setNumberFormat('@'); sh.getRange(r, 1, 1, riga.length).setValues([riga]); }
function oem_stato(k) {
  const io = richiedi_(k), ruolo = ruoloOem_(io), ss = foglioEspositori_();
  const leggi = (nome) => { const sh = oemScheda_(ss, nome), out = {}; if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach((r) => { if (r[0]) out[oemChiave_(ss, r[0])] = { dati: String(r[1]), rev: Number(r[2]) || 0 }; }); return out; };
  const shk = oemScheda_(ss, 'Catalogo'), catalogo = [];
  if (shk.getLastRow() > 1) shk.getRange(2, 1, shk.getLastRow() - 1, 2).getValues().forEach((r) => { if (r[0]) catalogo.push(String(r[1])); });
  return { email: io.nome, ruolo: ruolo, mesi: leggi('Mesi'), carrelli: leggi('Carrelli'), catalogo: catalogo };
}
function oemVersione_(k, scheda, chiave, dati, rev, cosa) {
  const io = oemScrittore_(k);
  JSON.parse(dati);
  if (String(dati).length > 49000) throw new Error('Dati troppo grandi');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = foglioEspositori_(), sh = oemScheda_(ss, scheda), r = oemRiga_(ss, sh, String(chiave));
    const attuale = r ? Number(sh.getRange(r, 3).getValue()) || 0 : 0;
    if (Number(rev) !== attuale) return { ok: false, rev: attuale, dati: r ? String(sh.getRange(r, 2).getValue()) : null };
    oemScrivi_(sh, r, [String(chiave), dati, attuale + 1, io.nome, new Date()]);
    registroUnaVolta_(io, 'espositori', cosa);
    return { ok: true, rev: attuale + 1 };
  } finally { lock.releaseLock(); }
}
function oem_salvaMese(k, mese, dati, rev) {
  if (!/^\d{4}-\d{2}$/.test(String(mese))) throw new Error('Mese non valido');
  return oemVersione_(k, 'Mesi', mese, dati, rev, 'programma espositori di ' + nomeMese_(String(mese)) + ' modificato');
}
function oem_salvaCarrelli(k, chiave, dati, rev) {
  if (!/^[a-z]+\|\d{4}-\d{2}$/.test(String(chiave))) throw new Error('Chiave non valida');
  return oemVersione_(k, 'Carrelli', chiave, dati, rev, 'allestimento carrelli modificato');
}
function oem_eliminaMese(k, mese) {
  richiedi_(k, true);
  const ss = foglioEspositori_(), sh = oemScheda_(ss, 'Mesi');
  let r; while ((r = oemRiga_(ss, sh, String(mese)))) sh.deleteRow(r);
  return true;
}
function oem_salvaCatalogo(k, voce) {
  const io = oemScrittore_(k), v = JSON.parse(voce);
  if (!v.id || !/^[\w-]+$/.test(v.id)) throw new Error('Voce non valida');
  if (voce.length > 49000) throw new Error('Immagine troppo grande');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { const ss = foglioEspositori_(), sh = oemScheda_(ss, 'Catalogo'); oemScrivi_(sh, oemRiga_(ss, sh, v.id), [v.id, voce, v.nome || '', v.tipo || '', io.nome, new Date()]); }
  finally { lock.releaseLock(); }
  return true;
}
function oem_eliminaCatalogo(k, id) {
  oemScrittore_(k);
  const ss = foglioEspositori_(), sh = oemScheda_(ss, 'Catalogo'), r = oemRiga_(ss, sh, String(id));
  if (r) sh.deleteRow(r);
  return true;
}
const JW_ = /^https:\/\/([a-z0-9-]+\.)*(jw\.org|jw-cdn\.org)\//i;
function oem_jwPagina(k, url) {
  oemScrittore_(k);
  url = String(url || '').trim();
  if (!JW_.test(url)) throw new Error('Incolla un link di jw.org');
  const r = UrlFetchApp.fetch(url, { followRedirects: true, muteHttpExceptions: true, headers: { 'Accept-Language': 'it' } });
  if (r.getResponseCode() >= 400) throw new Error('jw.org ha risposto ' + r.getResponseCode());
  const html = r.getContentText();
  const meta = (x) => { const m = html.match(new RegExp('<meta[^>]+(?:property|name)="' + x + '"[^>]+content="([^"]*)"', 'i')); return m ? m[1] : ''; };
  const dec = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const titolo = dec(meta('og:title') || ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '')).replace(/\s*\|\s*JW\.ORG.*$/i, '').trim();
  const viste = {}, immagini = [];
  const og = meta('og:image');
  if (og) { viste[og] = 1; immagini.push(dec(og)); }
  (html.match(/https:\/\/[a-z0-9.-]*jw-cdn\.org\/img\/[^"'\s)]+?\.(?:jpg|jpeg|png)/gi) || []).forEach((u) => { u = dec(u); if (!viste[u] && immagini.length < 30) { viste[u] = 1; immagini.push(u); } });
  return { titolo: titolo, immagini: immagini };
}
function oem_jwImmagine(k, url) {
  oemScrittore_(k);
  if (!JW_.test(String(url))) throw new Error('Immagine non di jw.org');
  const r = UrlFetchApp.fetch(String(url), { followRedirects: true, muteHttpExceptions: true });
  if (r.getResponseCode() >= 400) throw new Error('Immagine non disponibile');
  const b = r.getBlob();
  return 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes());
}


/* ═════════════════════════ Pubblicazione e bacheca ═════════════════════════
 * In bacheca va solo ciò che chi compila ha pubblicato: «Pubblica» fa una copia del mese così com'è in quel momento.
 * Copie in Impostazioni (pub:reparti:AAAA-MM, pub:comitive:…, pub:programmi-inf:…, pub:programmi-fs:…);
 * gli espositori, più grandi, nella scheda «Pubblicati» del loro Foglio. */

const PUB_TIPI_ = { reparti: 'reparti', comitive: 'comitive', 'programmi-inf': 'inf', 'programmi-fs': 'fs', espositori: 'oem' };
function lunediMese_(mese) { return lunediDel_(mese); }
function snapshotProgrammi_(mese, quale) {
  const val = coppie_(foglioProgrammi_().getSheetByName('Programma'));
  const lun = lunediMese_(mese), suf = quale === 'inf' ? '-inf' : '-fs';
  const out = {};
  Object.keys(val).forEach((k) => {
    if (/:wa$/.test(k) || /^diag/.test(k)) return;
    if (k.indexOf('regola-' + (quale === 'inf' ? 'inf' : 'fs') + ':') === 0) { out[k] = val[k]; return; }
    if (lun.some((l) => k.indexOf(l + suf) === 0)) out[k] = val[k];
  });
  return out;
}
function pubblica(k, tipo, mese) {
  const io = richiedi_(k);
  if (!PUB_TIPI_[tipo] || !/^\d{4}-\d{2}$/.test(mese || '')) throw new Error('Pubblicazione non valida.');
  if (!haAmbito_(io, PUB_TIPI_[tipo])) throw new Error('Non hai il permesso di pubblicare questo programma.');
  const quando = iso_(new Date());
  let dati;
  if (tipo === 'reparti' || tipo === 'comitive') {
    dati = leggiImpostazione_(tipo + ':' + mese, null);
    if (!dati) throw new Error('Non c\'è ancora niente da pubblicare per ' + nomeMese_(mese) + '.');
  } else if (tipo === 'espositori') {
    const ss = foglioEspositori_(), sh = oemScheda_(ss, 'Mesi'), r = oemRiga_(ss, sh, mese);
    if (!r) throw new Error('Il programma espositori di ' + nomeMese_(mese) + ' non c\'è ancora.');
    const pub = ss.getSheetByName('Pubblicati') || ss.insertSheet('Pubblicati');
    if (pub.getLastRow() === 0) pub.appendRow(['Mese', 'Dati pubblicati (non modificare a mano)', 'Pubblicato', 'Da']);
    oemScrivi_(pub, oemRiga_(ss, pub, mese), [mese, String(sh.getRange(r, 2).getValue()), new Date(), io.nome]);
    dati = { foglio: true };
  } else dati = snapshotProgrammi_(mese, PUB_TIPI_[tipo]);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { scriviImpostazione_('pub:' + tipo + ':' + mese, { quando: quando, chi: io.nome, dati: dati }); } finally { lock.releaseLock(); }
  scheda_('Registro').appendRow([new Date(), io.id, io.nome, 'pubblicato', tipo + ' · ' + nomeMese_(mese)]);
  return statoPubblicazione(k, tipo, mese);
}
/** Pubblicato quando e da chi, e se dopo è cambiato qualcosa. */
function statoPubblicazione(k, tipo, mese) {
  const io = richiedi_(k);
  if (!PUB_TIPI_[tipo] || !haAmbito_(io, PUB_TIPI_[tipo])) throw new Error('Non hai il permesso.');
  const p = leggiImpostazione_('pub:' + tipo + ':' + mese, null);
  if (!p) return { pubblicato: false };
  let cambiato = false;
  try {
    if (tipo === 'reparti' || tipo === 'comitive') cambiato = JSON.stringify(leggiImpostazione_(tipo + ':' + mese, null)) !== JSON.stringify(p.dati);
    else if (tipo !== 'espositori') cambiato = JSON.stringify(snapshotProgrammi_(mese, PUB_TIPI_[tipo])) !== JSON.stringify(p.dati);
  } catch (e) { /* Foglio non raggiungibile */ }
  return { pubblicato: true, quando: p.quando, chi: p.chi, cambiato: cambiato };
}

/** Le righe della guida con un nome da scrivere, con un'etichetta leggibile (per «I miei impegni»). */
function righeGuida_(mese) {
  const c = CacheService.getScriptCache(), key = 'righe:' + mese, t = c.get(key);
  if (t) return JSON.parse(t);
  let g;
  try { const r = UrlFetchApp.fetch(REPO + 'dati/' + mese + '.json', { muteHttpExceptions: true }); if (r.getResponseCode() !== 200) return []; g = JSON.parse(r.getContentText()); } catch (e) { return []; }
  const out = [];
  (g.settimane || []).forEach((w) => (w.carte || []).forEach((ca) => (ca.sezioni || []).forEach((z) => (z.righe || []).forEach((r) => {
    (r.campi || []).forEach((campo) => {
      if (campo !== 'chi' && campo !== 'chi2') return;
      const ruolo = campo === 'chi2' ? ({ 'Ass.': 'assistente', 'Lett.': 'lettore' }[r.ruolo2] || '') : ({ 'Stud.': 'studente', 'Cond.': 'conduttore' }[r.ruolo] || '');
      const base = r.ruolo === 'Presidente' ? 'Presidente' : r.tipo === 'cantico' ? 'Preghiera' : String(r.titolo || r.ruolo || z.titolo);
      out.push({ k: r.id + ':' + campo, carta: ca.id, tipo: ca.tipo, testo: base + (ruolo ? ' (' + ruolo + ')' : ''), sezione: String(z.titolo || '') });
    });
  }))));
  try { c.put(key, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}

/** Il foglio dei reparti pubblicato, con quello che serve per disegnarlo. */
function repartiPubblicati_(mese) {
  const p = leggiImpostazione_('pub:reparti:' + mese, null);
  if (!p) return null;
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const sett = settimane_(cal, mese);
  const st = p.dati;
  st.turni = scompatta_(st.turni);
  ['gruppi', 'generali', 'nessuna', 'eventi'].forEach((x) => { st[x] = st[x] || {}; });
  sett.forEach((w) => { if (w.speciale && w.speciale.adunanze === false) { st.nessuna[w.lunedi + '-INFRA'] = true; st.nessuna[w.lunedi + '-FINE'] = true; } });
  const servono = {}; st.turni.forEach((t) => { servono[t.persona_id] = true; });
  Object.keys(st.generali).forEach((s) => { const g = st.generali[s]; if (g.coord) servono[g.coord] = true; if (g.ref) servono[g.ref] = true; });
  const lista = persone_().filter((x) => servono[x.id]), sg = sigle_(lista);
  return { mese: mese, quando: p.quando, settimane: sett.map((w) => ({ id: w.lunedi, lunedi: w.lunedi })), adunanze: adunanzeReparti_(cal, sett, st.nessuna),
    orari: { infra: orarioTesto_(cal, sett, 'infra'), fs: orarioTesto_(cal, sett, 'fs') },
    persone: lista.map((x) => ({ id: x.id, sigla: sg[x.id], nome: x.n, cognome: x.cognome, gruppo: x.gruppo })), stato: st };
}
function comitivePubblicate_(mese) {
  const p = leggiImpostazione_('pub:comitive:' + mese, null);
  if (!p) return null;
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const sett = settimane_(cal, mese), st = p.dati;
  ['assegnati', 'nascoste', 'note', 'domeniche'].forEach((x) => { st[x] = st[x] || {}; });
  const servono = {}; Object.keys(st.assegnati).forEach((c) => { servono[st.assegnati[c]] = true; });
  const lista = persone_().filter((x) => servono[x.id]), sg = sigle_(lista);
  return { mese: mese, nomeMese: nomeMese_(mese), quando: p.quando,
    settimane: sett.map((w) => ({ lunedi: w.lunedi, dal: w.dal, al: w.al, speciale: w.speciale, comitive: w.comitive, domenica: w.al })),
    conduttori: lista.map((x) => ({ id: x.id, sigla: sg[x.id], nome: x.n, cognome: x.cognome, abilitato: true })), offerte: {}, risposto: {}, previsti: [], storico: {}, stato: st };
}

/** La bacheca di una persona per un mese: solo programmi pubblicati, ognuno secondo le sue abilitazioni. */
function bacheca(k, mese) {
  const io = richiedi_(k);
  segnaAccesso_(io);
  mese = /^\d{4}-\d{2}$/.test(mese || '') ? mese : oggi_().slice(0, 7);
  const p = persone_().find((x) => x.id === io.id) || { nominato: false, reparti: false, oem: false, n: '', cognome: '' };
  const tutto = io.tutto;
  const out = { mese: mese, nomeMese: nomeMese_(mese), oggi: oggi_(), io: { id: io.id, nominato: p.nominato || tutto, reparti: p.reparti || tutto, oem: p.oem || tutto }, impegni: [] };
  const pin = leggiImpostazione_('pub:programmi-inf:' + mese, null), pfs = leggiImpostazione_('pub:programmi-fs:' + mese, null);
  out.programmi = { inf: pin ? pin.quando : '', fs: pfs ? pfs.quando : '' };
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const ads = adunanzeReparti_(cal, settimane_(cal, mese), {});
  const dataDi = (carta) => { const id = String(carta).replace(/-inf$/, '-INFRA').replace(/-fs$/, '-FINE'); const a = ads.find((x) => x.id === id); return a ? a.data : String(carta).slice(0, 10); };
  // le mie parti, dai programmi pubblicati
  const idx = indiceNomi_();
  const mie = (nome) => { const ids = idx[chiaveNome_(nome)]; return ids && ids.length === 1 && ids[0] === io.id; };
  const val = Object.assign({}, pin ? pin.dati : {}, pfs ? pfs.dati : {});
  righeGuida_(mese).forEach((r) => { if (val[r.k] && mie(val[r.k])) out.impegni.push({ data: dataDi(r.carta), tipo: r.tipo === 'INFRA' ? 'inf' : 'fs', testo: r.testo }); });
  // reparti
  const rp = repartiPubblicati_(mese);
  if (rp) {
    const nomeInc = { USC_COORD: 'Coordinatore uscieri', USC_ING: 'Usciere all\'ingresso', USC_AUD: 'Usciere in auditorium', USC_PAR: 'Usciere al parcheggio', AV_POD: 'Podio', AV_MIC: 'Microfonista', AV_MIX: 'Mixer', AV_PC: 'PC', LET: 'Letteratura', TER: 'Territori', PUL_COORD: 'Coordinatore pulizie', PUL_REF: 'Referente pulizie' };
    rp.stato.turni.filter((t) => t.persona_id === io.id).forEach((t) => {
      const a = rp.adunanze.find((x) => x.id === t.adunanza_id);
      out.impegni.push({ data: a ? a.data : t.settimana_id, tipo: 'rep', testo: nomeInc[t.incarico_id] + (a ? '' : ' · settimana del ' + t.settimana_id.slice(8) + '/' + t.settimana_id.slice(5, 7)) });
    });
    Object.keys(rp.stato.generali).forEach((s) => { const g = rp.stato.generali[s]; if (g.attiva && (g.coord === io.id || g.ref === io.id)) out.impegni.push({ data: g.data, tipo: 'rep', testo: 'Pulizia generale · ' + (g.coord === io.id ? 'coordinatore' : 'referente') }); });
    if (out.io.reparti || rp.stato.turni.some((t) => t.persona_id === io.id)) out.reparti = rp;
  }
  // comitive
  const cm = comitivePubblicate_(mese);
  if (cm) {
    cm.settimane.forEach((w) => w.comitive.forEach((c) => { if (!c.annullata && !cm.stato.nascoste[c.k] && cm.stato.assegnati[c.k] === io.id) out.impegni.push({ data: c.data, tipo: 'com', testo: 'Comitiva ' + c.ora + ' · ' + c.luogo }); }));
    out.comitive = cm;
    out.versioniComitive = out.io.nominato ? ['generale', 'personale', 'tabella'] : ['tabella'];
  }
  // espositori
  if (out.io.oem) {
    try {
      const ss = foglioEspositori_(), pub = ss.getSheetByName('Pubblicati');
      const r = pub ? oemRiga_(ss, pub, mese) : 0;
      if (r) {
        out.espositori = { quando: iso_(pub.getRange(r, 3).getValue()) };
        const X = JSON.parse(String(pub.getRange(r, 2).getValue()));
        const posti = {}; (X.postazioni || []).forEach((x) => { posti[x.id] = x.nome; });
        Object.keys(X.turni || {}).forEach((kk) => { if ((X.turni[kk] || []).some(mie)) { const [d, pid, ora] = kk.split('|'); out.impegni.push({ data: d, tipo: 'oem', testo: 'Espositori · ' + (posti[pid] || pid) + ' · ' + ora }); } });
      }
    } catch (e) { /* Foglio espositori non raggiungibile */ }
  }
  out.impegni.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  out.mieiPub = { reparti: !!rp, comitive: !!cm };
  return out;
}

/** Programmi pubblicati per la bacheca (la pagina dei programmi in sola lettura). */
function pa_bacheca(k) {
  const io = richiedi_(k);
  const p = persone_().find((x) => x.id === io.id) || {};
  const ss = foglioProgrammi_();
  const valori = {};
  valori_('Impostazioni').slice(1).forEach((r) => { if (/^pub:programmi-(inf|fs):/.test(String(r[0])) && r[1]) Object.assign(valori, JSON.parse(String(r[1])).dati || {}); });
  return { email: io.nome, ruolo: 'legge', impostazioni: coppie_(ss.getSheetByName('Impostazioni')), valori: valori, podio: {}, bacheca: true, conReparti: !!(p.nominato || io.tutto), reparti: (p.nominato || io.tutto) ? repartiPerProgramma_(true) : {} };
}
/** Espositori pubblicati per la bacheca. */
function oem_bacheca(k) {
  const io = richiedi_(k);
  const p = persone_().find((x) => x.id === io.id) || {};
  if (!p.oem && !io.tutto) throw new Error('Il programma espositori lo vedono gli abilitati all\'opera pubblica.');
  const ss = foglioEspositori_(), pub = ss.getSheetByName('Pubblicati'), mesi = {};
  if (pub && pub.getLastRow() > 1) pub.getRange(2, 1, pub.getLastRow() - 1, 2).getValues().forEach((r) => { if (r[0]) mesi[oemChiave_(ss, r[0])] = { dati: String(r[1]), rev: 0 }; });
  return { email: io.nome, ruolo: 'legge', mesi: mesi, carrelli: {}, catalogo: [] };
}

/** I reparti di ogni adunanza nella forma delle schede «Reparti» del programma (vista «Adunanze e reparti»).
 *  pubblicati = true: solo le turnazioni pubblicate (bacheca); altrimenti quelle in lavorazione (chi compila). */
function repartiPerProgramma_(pubblicati) {
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const out = {};
  const ET = { USC_COORD: 'Coordinatore', USC_ING: 'Ingresso', USC_AUD: 'Auditorium', USC_PAR: 'Parcheggio', AV_POD: 'Podio', AV_MIC: 'Mic.', AV_MIX: 'Mixer', AV_PC: 'PC', LET: 'Letteratura', TER: 'Territori' };
  const SEZ = [['Uscieri', ['USC_COORD', 'USC_ING', 'USC_AUD', 'USC_PAR']], ['Letteratura e territori', ['LET', 'TER']], ['Audio/Video', ['AV_POD', 'AV_MIC', 'AV_MIX', 'AV_PC']]];
  const POSTI = { USC_AUD: 2, USC_PAR: 2, AV_MIC: 2 };
  const tutti = persone_(), sg = sigle_(tutti);
  [-1, 0, 1, 2, 3].forEach((n) => {
    const m = meseDopo_(oggi_().slice(0, 7), n);
    const x = pubblicati ? (leggiImpostazione_('pub:reparti:' + m, null) || {}).dati : leggiImpostazione_('reparti:' + m, null);
    if (!x) return;
    const turni = scompatta_(x.turni);
    settimane_(cal, m).forEach((w) => {
      const chi = (inc, pos, ad) => { const t = turni.find((y) => y.settimana_id === w.lunedi && y.incarico_id === inc && y.posizione === pos && y.adunanza_id === ad); return t ? sg[t.persona_id] || '' : ''; };
      const sett = {};
      ['INFRA', 'FINE'].forEach((tipo) => {
        const ad = w.lunedi + '-' + tipo;
        if (!turni.some((y) => y.adunanza_id === ad)) return;
        sett[tipo] = SEZ.map(([titolo, incs]) => ({ titolo: titolo, righe: [].concat.apply([], incs.map((inc) => {
          const np = POSTI[inc] || 1, r = [];
          for (let p = 1; p <= np; p++) r.push([ET[inc] + (inc === 'AV_MIC' ? ' ' + p + (p === 1 ? ' (sx)' : ' (dx)') : ''), chi(inc, p, ad)]);
          return r;
        })) }));
      });
      if (!Object.keys(sett).length) return;
      sett.pulizie = { gruppo: (x.gruppi || {})[w.lunedi] || '', righe: [['Coordinatore', chi('PUL_COORD', 1, null)], ['Referente', chi('PUL_REF', 1, null)]] };
      out[w.lunedi] = sett;
    });
  });
  return out;
}

/* ═════════════════════════ Pronto per WhatsApp ═════════════════════════
 * Settimana per settimana, le immagini da mandare nei gruppi:
 * - Presidente e «Audio/Video · prove» di ogni adunanza: le conferma chi compila quel programma (inf / fs);
 * - Reparti (Audio/Video, Uscieri, Letteratura e territori, Pulizie): confermate da sole quando Luca pubblica la turnazione.
 * Chi vede cosa: il presidente tutti i nominati; le prove chi compila e chi coordina l'Audio/Video;
 * ogni reparto chi lo coordina o lo assiste (colonne «RUOLI NEI REPARTI»). Luca vede tutto. */
const WA_REPARTI_ = { av: 'Audio/Video', usc: 'Uscieri', let: 'Letteratura e territori', pul: 'Pulizie' };
function ruoliReparto_(p) {
  const out = {};
  if (!p || !p.riga) return out;
  struttura_(SpreadsheetApp.getActive().getSheetByName(FOGLIO)).filter((x) => x.ruolo).forEach((x) => { const v = String(p.riga[x.c - 1] || ''); if (v) out[x.titolo] = v; });
  return out;
}
function waVede_(io) {
  const p = persone_().find((x) => x.id === io.id) || {};
  let comp = null; try { comp = ruoloProgrammi_(io); } catch (e) { /* non compila */ }
  const r = ruoliReparto_(p), tutto = !!io.tutto;
  const coordAv = !!r['Audio/Video'];
  const rep = {}; Object.keys(WA_REPARTI_).forEach((k) => { rep[k] = tutto || !!r[WA_REPARTI_[k]]; });
  return { comp: comp, pres: tutto || !!p.nominato || !!comp,
    prove: { INFRA: tutto || comp === 'inf' || comp === 'tutto' || coordAv, FINE: tutto || comp === 'fs' || comp === 'tutto' || coordAv },
    rep: rep, luca: tutto };
}
function waQualcosa_(v) { return v.pres || v.prove.INFRA || v.prove.FINE || Object.keys(v.rep).some((k) => v.rep[k]); }
/** Le turnazioni pubblicate, settimana per settimana, con i nomi interi (per le immagini). */
function repartiWA_(vede) {
  const cal = leggiImpostazione_('calendario', CALENDARIO_BASE_);
  const nomi = {}; persone_().forEach((p) => { nomi[p.id] = { v: (p.n + ' ' + p.cognome).trim(), nome: p.n, cognome: p.cognome }; });
  const out = {};
  const SEZ = { usc: [['USC_COORD', 'Coordinatore', 1], ['USC_ING', 'Ingresso', 1], ['USC_AUD', 'Auditorium', 2], ['USC_PAR', 'Parcheggio', 2]],
    av: [['AV_POD', 'Podio', 1], ['AV_MIC', 'Microfono', 2], ['AV_MIX', 'Mixer', 1], ['AV_PC', 'PC', 1]], let: [['LET', 'Letteratura', 1], ['TER', 'Territori', 1]] };
  [-1, 0, 1, 2].forEach((n) => {
    const m = meseDopo_(oggi_().slice(0, 7), n);
    const pub = leggiImpostazione_('pub:reparti:' + m, null);
    if (!pub || !pub.dati) return;
    const x = pub.dati, turni = scompatta_(x.turni), sett = settimane_(cal, m);
    const ads = adunanzeReparti_(cal, sett, x.nessuna || {});
    sett.forEach((w) => {
      if (out[w.lunedi] || w.lunedi < piu_(oggi_(), -6)) return;
      const chi = (inc, pos, ad) => { const t = turni.find((y) => y.settimana_id === w.lunedi && y.incarico_id === inc && y.posizione === pos && y.adunanza_id === ad); return t && nomi[t.persona_id] ? nomi[t.persona_id] : null; };
      const s = { lunedi: w.lunedi, al: piu_(w.lunedi, 6), adunanze: [], pubblicato: pub.quando };
      ads.filter((a) => a.settimana_id === w.lunedi && !a.nessuna).forEach((a) => {
        const ad = { tipo: a.tipo, data: a.data, ora: a.ora };
        Object.keys(SEZ).forEach((k) => {
          if (!vede.rep[k]) return;
          ad[k] = [];
          SEZ[k].forEach(([inc, et, np]) => { for (let p = 1; p <= np; p++) ad[k].push([np > 1 ? et + ' ' + p + (inc === 'AV_MIC' ? (p === 1 ? ' (sx)' : ' (dx)') : '') : et, chi(inc, p, a.id)]); });
        });
        s.adunanze.push(ad);
      });
      if (vede.rep.pul) {
        const g = (x.generali || {})[w.lunedi];
        s.pul = { gruppo: (x.gruppi || {})[w.lunedi] || '', coord: chi('PUL_COORD', 1, null), ref: chi('PUL_REF', 1, null),
          generale: g && g.attiva ? { gruppo: g.gruppo || '', coord: g.coord && nomi[g.coord] || null, ref: g.ref && nomi[g.ref] || null } : null };
      }
      out[w.lunedi] = s;
    });
  });
  return out;
}
function confermeRepartiWA_() {
  const out = {};
  valori_('Impostazioni').slice(1).forEach((r) => { const m = /^wa:reparti:(\d{4}-\d{2}-\d{2})$/.exec(String(r[0])); if (m && r[1]) try { out[m[1]] = JSON.parse(String(r[1])); } catch (e) { /* rovinato */ } });
  return out;
}
/** Tutto quello che serve a «Pronto per WhatsApp», filtrato per chi lo apre. */
function wa_stato(k) {
  const io = richiedi_(k);
  const v = waVede_(io);
  if (!waQualcosa_(v)) throw new Error('Non ci sono immagini WhatsApp per te.');
  const ss = foglioProgrammi_();
  const vuole = v.pres || v.prove.INFRA || v.prove.FINE;
  const valori = vuole ? coppie_(ss.getSheetByName('Programma')) : {};
  return { email: io.nome, ruolo: v.comp || 'legge', impostazioni: coppie_(ss.getSheetByName('Impostazioni')), valori: valori, podio: vuole ? podioPerProgramma_(valori) : {},
    senzaWA: true, wa: { vede: v, reparti: repartiWA_(v), conferme: v.luca ? confermeRepartiWA_() : {}, cong: leggiImpostazione_('nomeCongregazione', 'Napoli Pianura Trencia') } };
}
/** Solo Luca: le immagini dei reparti di una settimana, appena generate (confermate in automatico). */
function wa_confermaReparti(k, lunedi, rec) {
  const io = richiedi_(k, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(lunedi))) throw new Error('Settimana non valida');
  scriviImpostazione_('wa:reparti:' + lunedi, { firma: String(rec.firma || ''), quando: String(rec.quando || ''), il: new Date().toISOString(), da: io.nome, png: rec.png || {} });
  registroUnaVolta_(io, 'whatsapp', 'immagini dei reparti generate');
  return true;
}
/** Telegram: le immagini dei reparti di ogni settimana, con lo stesso anticipo, prima della prima adunanza della settimana. */
function inviiReparti_(p, chat, giorni, ora, adesso) {
  const conf = confermeRepartiWA_();
  Object.keys(conf).forEach((lun) => {
    const c = conf[lun], inizio = dataRoma_(c.quando), statoK = 'inviato:rep:' + lun;
    if (!inizio) return;
    if (inizio <= adesso) { p.deleteProperty(statoK); return; }
    const giorno = Utilities.formatDate(new Date(inizio.getTime() - giorni * 86400000), 'Europe/Rome', 'yyyy-MM-dd');
    if (adesso < dataRoma_(giorno + ' ' + ora[0] + ':' + (ora[1] || '00'))) return;
    const firma = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, c.firma || ''));
    const stato = p.getProperty(statoK) || '';
    if (stato === firma) return;
    const agg = stato ? '🔄 Aggiornamento · ' : '';
    const sett = 'settimana dal ' + Utilities.formatDate(dataRoma_(lun + ' 12:00'), 'Europe/Rome', 'dd/MM');
    Object.keys(WA_REPARTI_).forEach((x) => { const id = (c.png || {})[x]; if (id) telegram_('sendPhoto', { chat_id: chat, caption: agg + 'Reparto ' + WA_REPARTI_[x] + ' · ' + sett, photo: DriveApp.getFileById(id).getBlob() }); });
    p.setProperty(statoK, firma);
  });
}
