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
  const sh = foglio_('Mesi');
  const mesi = {};
  if (sh.getLastRow() > 1)
    for (const [k, d, r] of sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues()) if (k) mesi[String(k)] = { dati: String(d), rev: Number(r) || 0 };
  // Allestimento dei carrelli (una riga per sala e mese) e catalogo di poster e pubblicazioni (una riga per voce).
  const carrelli = {}, catalogo = [];
  const shc = foglio_('Carrelli');
  if (shc.getLastRow() > 1)
    for (const [k, d, r] of shc.getRange(2, 1, shc.getLastRow() - 1, 3).getValues()) if (k) carrelli[String(k)] = { dati: String(d), rev: Number(r) || 0 };
  const shk = foglio_('Catalogo');
  if (shk.getLastRow() > 1)
    for (const [id, d] of shk.getRange(2, 1, shk.getLastRow() - 1, 2).getValues()) if (id) catalogo.push(String(d));
  return { email: io.email, ruolo: io.ruolo, mesi: mesi, carrelli: carrelli, catalogo: catalogo };
}

const INTESTAZIONI_ = {
  Accessi: ['Email (Gmail)', 'Ruolo', 'Nome'],
  Mesi: ['Mese', 'Dati (non modificare a mano)', 'Versione', 'Modificato da', 'Quando'],
  Carrelli: ['Sala|Mese', 'Dati (non modificare a mano)', 'Versione', 'Modificato da', 'Quando'],
  Catalogo: ['Id', 'Dati (non modificare a mano)', 'Nome', 'Tipo', 'Modificato da', 'Quando'],
};
/** The sheet with that name, created with its header row when missing. */
function foglio_(nome) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0 && INTESTAZIONI_[nome]) {
    sh.appendRow(INTESTAZIONI_[nome]);
    sh.getRange(1, 1, 1, INTESTAZIONI_[nome].length).setFontWeight('bold').setBackground('#F6F5F2');
    sh.setFrozenRows(1);
  }
  return sh;
}
function scrittore_() {
  const io = utente_();
  if (io.ruolo !== 'tutto' && io.ruolo !== 'compila') throw new Error('Puoi solo leggere');
  return io;
}

/** Salva l'allestimento di una sala in un mese (chiave «pianura|2026-12»), con lo stesso controllo di versione dei mesi. */
function salvaCarrelli(chiave, dati, rev) {
  const io = scrittore_();
  if (!/^[a-z]+\|\d{4}-\d{2}$/.test(String(chiave))) throw new Error('Chiave non valida');
  JSON.parse(dati);
  if (dati.length > 48000) throw new Error('Allestimento troppo grande');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = foglio_('Carrelli');
    const t = sh.getRange('A:A').createTextFinder(String(chiave)).matchEntireCell(true).findNext();
    const attuale = t ? Number(sh.getRange(t.getRow(), 3).getValue()) || 0 : 0;
    if (Number(rev) !== attuale) return { ok: false, rev: attuale, dati: t ? String(sh.getRange(t.getRow(), 2).getValue()) : null };
    const riga = [String(chiave), dati, attuale + 1, io.email, new Date()];
    if (t) sh.getRange(t.getRow(), 1, 1, 5).setValues([riga]); else sh.appendRow(riga);
    return { ok: true, rev: attuale + 1 };
  } finally {
    lock.releaseLock();
  }
}

/** Aggiunge o aggiorna una voce del catalogo ({id, nome, tipo, img, link}); l'immagine è già rimpicciolita dalla pagina. */
function salvaCatalogo(voce) {
  const io = scrittore_();
  const v = JSON.parse(voce);
  if (!v.id || !/^[\w-]+$/.test(v.id)) throw new Error('Voce non valida');
  if (voce.length > 49000) throw new Error('Immagine troppo grande');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = foglio_('Catalogo');
    const t = sh.getRange('A:A').createTextFinder(v.id).matchEntireCell(true).findNext();
    const riga = [v.id, voce, v.nome || '', v.tipo || '', io.email, new Date()];
    if (t) sh.getRange(t.getRow(), 1, 1, 6).setValues([riga]); else sh.appendRow(riga);
    return true;
  } finally {
    lock.releaseLock();
  }
}
function eliminaCatalogo(id) {
  scrittore_();
  const sh = foglio_('Catalogo');
  const t = sh.getRange('A:A').createTextFinder(String(id)).matchEntireCell(true).findNext();
  if (t) sh.deleteRow(t.getRow());
  return true;
}

const JW_ = /^https:\/\/([a-z0-9-]+\.)*(jw\.org|jw-cdn\.org)\//i;
/** Legge una pagina di jw.org (anche un link condiviso da JW Library): titolo e immagini, per scegliere la copertina. */
function jwPagina(url) {
  scrittore_();
  url = String(url || '').trim();
  if (!JW_.test(url)) throw new Error('Incolla un link di jw.org');
  const r = UrlFetchApp.fetch(url, { followRedirects: true, muteHttpExceptions: true, headers: { 'Accept-Language': 'it' } });
  if (r.getResponseCode() >= 400) throw new Error('jw.org ha risposto ' + r.getResponseCode());
  const html = r.getContentText();
  const meta = (k) => { const m = html.match(new RegExp('<meta[^>]+(?:property|name)="' + k + '"[^>]+content="([^"]*)"', 'i')); return m ? m[1] : ''; };
  const dec = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  let titolo = dec(meta('og:title') || ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '')).replace(/\s*\|\s*JW\.ORG.*$/i, '').trim();
  const viste = {}, immagini = [];
  const og = meta('og:image');
  if (og) { viste[og] = 1; immagini.push(dec(og)); }
  (html.match(/https:\/\/[a-z0-9.-]*jw-cdn\.org\/img\/[^"'\s)]+?\.(?:jpg|jpeg|png)/gi) || []).forEach((u) => {
    u = dec(u);
    if (!viste[u] && immagini.length < 30) { viste[u] = 1; immagini.push(u); }
  });
  return { titolo: titolo, immagini: immagini };
}
/** Scarica un'immagine di jw.org e la restituisce come data URL (la pagina la rimpicciolisce prima di salvarla). */
function jwImmagine(url) {
  scrittore_();
  if (!JW_.test(String(url))) throw new Error('Immagine non di jw.org');
  const r = UrlFetchApp.fetch(String(url), { followRedirects: true, muteHttpExceptions: true });
  if (r.getResponseCode() >= 400) throw new Error('Immagine non disponibile');
  const b = r.getBlob();
  return 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes());
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
  const acc = foglio_('Accessi');
  acc.getRange('B2:B100').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['compila', 'legge', 'tutto'], true).build()
  );
  foglio_('Mesi'); foglio_('Carrelli'); foglio_('Catalogo');
  const s1 = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
}
