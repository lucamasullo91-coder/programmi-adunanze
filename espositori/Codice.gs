/**
 * Programma espositori (OEM) — da incollare UNA VOLTA nell'editor Apps Script del Foglio Google
 * «Programma espositori – dati» (Estensioni → Apps Script). La pagina arriva da GitHub
 * (espositori/app.html): gli aggiornamenti non richiedono di toccare questo codice.
 *
 * Primo avvio: nell'editor scegli la funzione «impostazione» e premi Esegui (crea le schede del Foglio).
 * Poi Esegui il deployment → Nuovo deployment → Applicazione web:
 *   Esegui come: Utente che accede all'applicazione web · Chi ha accesso: Chiunque abbia un account Google.
 * Chi può usarla: scheda «Accessi» (email Gmail e ruolo «compila» o «legge»); il proprietario del Foglio può tutto.
 * I nomi delle persone stanno solo in questo Foglio, mai su GitHub.
 */
const REPO = 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/';

function doGet() {
  const io = utente_();
  if (!io.ruolo) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:32px;max-width:520px;margin:auto;line-height:1.5">' +
        '<h2 style="color:#A86F00">Programma espositori</h2><p>Questo account (' + (io.email || 'sconosciuto') +
        ') non è autorizzato. Chiedi a chi gestisce il programma di aggiungerti.</p></div>'
    ).setTitle('Programma espositori');
  }
  // Pagina leggera: scarica la pagina da GitHub e la monta; se qualcosa va storto lo scrive.
  const boot =
    '<p id="oem-boot" style="font-family:sans-serif;padding:32px 16px;text-align:center;color:#5f6b77">Carico il programma…</p>' +
    '<script>(' + function (base) {
      function errore(m) {
        var d = document.getElementById('oem-boot') || document.body.appendChild(document.createElement('p'));
        d.style.cssText = 'font-family:monospace;padding:16px;color:#A8432B;white-space:pre-wrap';
        d.textContent = 'Errore: ' + m;
      }
      window.addEventListener('error', function (e) { errore(e.message + ' (' + e.lineno + ':' + e.colno + ')'); });
      fetch(base + 'espositori/app.html?v=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.text(); })
        .then(function (t) {
          var doc = new DOMParser().parseFromString(t, 'text/html');
          doc.head.querySelectorAll('style,link').forEach(function (n) { document.head.appendChild(n); });
          var script = [];
          [].slice.call(doc.body.childNodes).forEach(function (n) {
            if (n.tagName === 'SCRIPT') script.push(n); else document.body.appendChild(n);
          });
          var boot = document.getElementById('oem-boot'); if (boot) boot.remove();
          // External libraries first (PDF), then the page, in order.
          return script.reduce(function (p, s) {
            return p.then(function () {
              return new Promise(function (ok, ko) {
                var x = document.createElement('script');
                if (s.src) { x.src = s.src; x.onload = ok; x.onerror = function () { ko(new Error('non carico ' + s.src)); }; document.body.appendChild(x); }
                else { x.textContent = s.textContent; document.body.appendChild(x); ok(); }
              });
            });
          }, Promise.resolve());
        })
        .catch(function (e) { errore('avvio: ' + e.message); });
    }.toString() + ')(' + JSON.stringify(REPO) + ')</script>';
  return HtmlService.createHtmlOutput(boot)
    .setTitle('Programma espositori')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Chi sta usando la pagina: «tutto» (proprietario), «compila» o «legge» dalla scheda Accessi. */
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
      const k = String(r).trim().toLowerCase();
      if (String(e).trim().toLowerCase() === email && (k === 'compila' || k === 'legge' || k === 'tutto')) ruolo = k;
    }
  }
  return { email: email, ruolo: ruolo };
}

/** Tutti i mesi salvati: { "2026-12": { dati: "...json...", rev: 3 } }. */
function stato() {
  const io = utente_();
  if (!io.ruolo) throw new Error('Non autorizzato');
  const sh = SpreadsheetApp.getActive().getSheetByName('Mesi');
  const mesi = {};
  if (sh.getLastRow() > 1)
    for (const [k, d, r] of sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues()) if (k) mesi[String(k)] = { dati: String(d), rev: Number(r) || 0 };
  return { email: io.email, ruolo: io.ruolo, mesi: mesi };
}

/**
 * Salva un mese intero. `rev` è la versione letta dalla pagina: se nel frattempo un altro ha salvato,
 * il salvataggio è rifiutato e la pagina ricarica il mese (nessuno sovrascrive il lavoro dell'altro).
 */
function salvaMese(mese, dati, rev) {
  const io = utente_();
  if (io.ruolo !== 'tutto' && io.ruolo !== 'compila') throw new Error('Puoi solo leggere il programma');
  if (!/^\d{4}-\d{2}$/.test(String(mese))) throw new Error('Mese non valido');
  JSON.parse(dati); // must be valid JSON
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Mesi');
    const t = sh.getRange('A:A').createTextFinder(String(mese)).matchEntireCell(true).findNext();
    const attuale = t ? Number(sh.getRange(t.getRow(), 3).getValue()) || 0 : 0;
    if (Number(rev) !== attuale) return { ok: false, rev: attuale, dati: t ? String(sh.getRange(t.getRow(), 2).getValue()) : null };
    const riga = [String(mese), dati, attuale + 1, io.email, new Date()];
    if (t) sh.getRange(t.getRow(), 1, 1, 5).setValues([riga]); else sh.appendRow(riga);
    return { ok: true, rev: attuale + 1 };
  } finally {
    lock.releaseLock();
  }
}

function eliminaMese(mese) {
  if (utente_().ruolo !== 'tutto') throw new Error('Solo il proprietario può eliminare un mese');
  const sh = SpreadsheetApp.getActive().getSheetByName('Mesi');
  const t = sh.getRange('A:A').createTextFinder(String(mese)).matchEntireCell(true).findNext();
  if (t) sh.deleteRow(t.getRow());
  return true;
}

/** Da eseguire una volta dall'editor: crea le schede del Foglio. */
function impostazione() {
  const ss = SpreadsheetApp.getActive();
  const scheda = (nome, intest) => {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    if (sh.getLastRow() === 0) {
      sh.appendRow(intest);
      sh.getRange(1, 1, 1, intest.length).setFontWeight('bold').setBackground('#F6F5F2');
      sh.setFrozenRows(1);
    }
    return sh;
  };
  const acc = scheda('Accessi', ['Email (Gmail)', 'Ruolo', 'Nome']);
  acc.getRange('B2:B100').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['compila', 'legge', 'tutto'], true).build()
  );
  scheda('Mesi', ['Mese', 'Dati (non modificare a mano)', 'Versione', 'Modificato da', 'Quando']);
  const s1 = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
}
