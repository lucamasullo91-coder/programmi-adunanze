/**
 * Programmi adunanze — da incollare UNA VOLTA nell'editor Apps Script del Foglio Google
 * «Programmi adunanze – dati» (Estensioni → Apps Script). La pagina e i dati della guida arrivano da GitHub:
 * gli aggiornamenti non richiedono di toccare questo codice.
 *
 * Primo avvio: nell'editor scegli la funzione «impostazione» e premi Esegui (crea le schede del Foglio).
 * Poi Esegui il deployment → Nuovo deployment → Applicazione web:
 *   Esegui come: Utente che accede all'applicazione web · Chi ha accesso: Chiunque abbia un account Google.
 */
const REPO = 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/';
const RUOLI = { 'infrasettimanale': 'inf', 'fine settimana': 'fs', 'tutto': 'tutto' };

function doGet() {
  const io = utente_();
  if (!io.ruolo) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:32px;max-width:520px;margin:auto;line-height:1.5">' +
        '<h2 style="color:#A8432B">Programmi adunanze</h2><p>Questo account (' + (io.email || 'sconosciuto') +
        ') non è autorizzato. Chiedi a chi gestisce i programmi di aggiungerti.</p></div>'
    ).setTitle('Programmi adunanze');
  }
  // Pagina leggera: scarica il programma da GitHub nel browser e lo avvia; se qualcosa va storto lo scrive.
  const boot =
    '<div id="root"><p id="pa-boot" style="font-family:sans-serif;padding:32px 16px;text-align:center;color:#5f6b77">Carico il programma…</p></div>' +
    '<script>window.__CONF=' + JSON.stringify({ base: REPO }) + ';(' + function (base) {
      function errore(m) {
        var d = document.getElementById('pa-boot');
        if (!d) { d = document.createElement('p'); document.body.appendChild(d); }
        d.style.cssText = 'font-family:monospace;padding:16px;color:#A8432B;white-space:pre-wrap';
        d.textContent = 'Errore: ' + m;
        try { google.script.run.salva('diag-tutto:' + Date.now(), String(m).slice(0, 500)); } catch (e) {}
      }
      window.addEventListener('error', function (e) { errore(e.message + ' (' + e.lineno + ':' + e.colno + ')'); });
      fetch(base + 'dist/app.js?v=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.text(); })
        .then(function (t) {
          var s = document.createElement('script');
          s.textContent = t;
          document.body.appendChild(s);
          setTimeout(function () {
            if (window.__paAvviata) return;
            try { (new Function(t))(); } catch (e) { errore('avvio: ' + e.message); }
            setTimeout(function () { if (!window.__paAvviata) errore('il programma non è partito'); }, 4000);
          }, 1500);
        })
        .catch(function (e) { errore('download: ' + e.message); });
    }.toString() + ')(' + JSON.stringify(REPO) + ')</script>';
  return HtmlService.createHtmlOutput(
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Fira+Sans+Extra+Condensed:wght@400;500;600;700;800&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap">' + boot
  )
    .setTitle('Programmi adunanze')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Chi sta usando la pagina e cosa può compilare (scheda «Accessi»; il proprietario del Foglio può tutto). */
function utente_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const ss = SpreadsheetApp.getActive();
  let ruolo = '';
  try {
    if (email && ss.getOwner() && ss.getOwner().getEmail().toLowerCase() === email) ruolo = 'tutto';
  } catch (e) { /* proprietario non leggibile */ }
  const sh = ss.getSheetByName('Accessi');
  if (!ruolo && sh && sh.getLastRow() > 1) {
    for (const [e, r] of sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()) {
      if (String(e).trim().toLowerCase() === email) ruolo = RUOLI[String(r).trim().toLowerCase()] || '';
    }
  }
  return { email: email, ruolo: ruolo };
}

function impostazioni_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Impostazioni');
  const out = {};
  if (sh && sh.getLastRow() > 1)
    for (const [k, v] of sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()) if (k) out[String(k)] = String(v);
  return out;
}

/** Tutto quello che serve alla pagina all'apertura. */
function stato() {
  const io = utente_();
  if (!io.ruolo) throw new Error('Non autorizzato');
  const sh = SpreadsheetApp.getActive().getSheetByName('Programma');
  const valori = {};
  if (sh.getLastRow() > 1)
    for (const [k, v] of sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()) if (k) valori[String(k)] = String(v);
  return { email: io.email, ruolo: io.ruolo, impostazioni: impostazioni_(), valori: valori };
}

/** Salva un nome, una data o un evento. Le chiavi dell'infrasettimanale contengono «-inf», quelle del fine settimana «-fs». */
function salva(chiave, valore) {
  const io = utente_();
  chiave = String(chiave);
  const fine = /-fs[-:]/.test(chiave);
  const ok = io.ruolo === 'tutto' || (io.ruolo === 'fs' && fine) || (io.ruolo === 'inf' && !fine && /-inf[-:]/.test(chiave));
  if (!ok) throw new Error('Non puoi modificare questa parte');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Programma');
    const trovata = sh.getRange('A:A').createTextFinder(chiave).matchEntireCell(true).findNext();
    if (!valore) {
      if (trovata) sh.deleteRow(trovata.getRow());
    } else if (trovata) {
      sh.getRange(trovata.getRow(), 2, 1, 3).setValues([[valore, io.email, new Date()]]);
    } else {
      sh.appendRow([chiave, valore, io.email, new Date()]);
    }
  } finally {
    lock.releaseLock();
  }
  return true;
}

/** Foto del programma di un'assemblea o di un congresso: va nella cartella delle foto, accanto al Foglio. */
function caricaFoto(base64, nome) {
  const io = utente_();
  if (!io.ruolo) throw new Error('Non autorizzato');
  const f = cartellaFoto_().createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'image/jpeg', nome || 'programma.jpg'));
  return f.getId();
}

function foto(id) {
  if (!utente_().ruolo) throw new Error('Non autorizzato');
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes());
}

function cartellaFoto_() {
  const imp = impostazioni_();
  if (imp.cartellaFoto) return DriveApp.getFolderById(imp.cartellaFoto);
  const file = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  const padre = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
  const c = padre.createFolder('Programmi adunanze – foto');
  const sh = SpreadsheetApp.getActive().getSheetByName('Impostazioni');
  sh.appendRow(['cartellaFoto', c.getId(), 'Cartella delle foto dei programmi (non cambiare)']);
  return c;
}

/** Da eseguire una volta dall'editor: crea le schede del Foglio. */
function impostazione() {
  const ss = SpreadsheetApp.getActive();
  const scheda = (nome, intest, righe) => {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    if (sh.getLastRow() === 0) {
      sh.appendRow(intest);
      for (const r of righe || []) sh.appendRow(r);
      sh.getRange(1, 1, 1, intest.length).setFontWeight('bold').setBackground('#F6F5F2');
      sh.setFrozenRows(1);
    }
    return sh;
  };
  const acc = scheda('Accessi', ['Email (Gmail)', 'Compila', 'Nome'], []);
  acc.getRange('B2:B100').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['infrasettimanale', 'fine settimana', 'tutto'], true).build()
  );
  scheda('Impostazioni', ['Chiave', 'Valore', 'Descrizione'], [
    ['cong', 'Napoli Pianura Trencia', 'Nome della congregazione in alto'],
    ['sorv', 'P. Guerrazzi', 'Sorvegliante dell’adunanza Vita e ministero (piè di pagina)'],
    ['condTG', 'P. Muto', 'Conduttore della Torre di Guardia (piè di pagina)'],
  ]);
  scheda('Programma', ['Chiave', 'Valore', 'Modificato da', 'Quando'], []);
  const s1 = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  cartellaFoto_();
}
