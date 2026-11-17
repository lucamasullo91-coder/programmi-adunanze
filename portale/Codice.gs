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
  const boot =
    '<p id="pc-boot" style="font-family:sans-serif;padding:32px 16px;text-align:center;color:#5f6b77">Carico il portale…</p>' +
    '<script>window.__K=' + JSON.stringify(k) + ';(' + function (base) {
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

/* ───────────────────────── Accessi ───────────────────────── */

/** Chi sta usando il portale: { id, nome, ambiti:[…], tutto } oppure null. */
function utente_(k) {
  k = String(k || '').trim();
  if (k.length < 12) return null;
  const sh = scheda_('Accessi');
  const n = sh.getLastRow();
  if (n < 2) return null;
  const righe = sh.getRange(2, 1, n - 1, 6).getValues();
  for (let i = 0; i < righe.length; i++) {
    const [id, nome, codice, ambiti, attivo] = righe[i];
    if (String(codice) === k && attivo === true) {
      const a = String(ambiti || '').split(',').map((x) => x.trim()).filter(Boolean);
      const tutto = a.indexOf('tutto') >= 0;
      return { id: String(id), nome: String(nome), ambiti: tutto ? ['tutto'].concat(AMBITI) : a, tutto: tutto, riga: i + 2 };
    }
  }
  return null;
}
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
  const nc = sh.getLastColumn();
  const testa = sh.getRange(RIGA_SEZIONI, 1, 3, nc).getValues();
  const col = [];
  let sez = '';
  for (let c = 1; c <= nc; c++) {
    if (testa[0][c - 1]) sez = String(testa[0][c - 1]);
    const titolo = String(testa[1][c - 1] || '').trim();
    if (!titolo) continue;
    let ambito = ambitoSezione_(sez), tipo = 'testo', regola = String(testa[2][c - 1] || '').trim();
    if (c === C.reparti) { ambito = 'reparti'; tipo = 'check'; regola = 'tutti'; }
    else if (c === C.oem) { ambito = 'oem'; tipo = 'check'; regola = 'tutti'; }
    else if (c >= PRIMA_ABIL && sez.toUpperCase() !== 'NOTE') tipo = 'check';
    else if (c === C.sigla) tipo = 'calc';
    else if (LISTE[c]) tipo = 'lista';
    if (c === C.id) tipo = 'calc';
    col.push({ c: c, titolo: titolo, sezione: c < PRIMA_ABIL ? 'ANAGRAFICA' : sez, colore: coloreSezione_(c < PRIMA_ABIL ? '' : sez),
      regola: tipo === 'check' ? (regola || 'tutti') : '', ambito: ambito, tipo: tipo, opzioni: LISTE[c] || null,
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
  if (!io.ambiti.length) return out; // solo sondaggio (in arrivo)
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
  const n = sh.getLastRow() - RIGA_DATI + 1;
  if (n < 1) return [];
  const nc = sh.getLastColumn();
  const dati = sh.getRange(RIGA_DATI, 1, n, nc).getValues();
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
