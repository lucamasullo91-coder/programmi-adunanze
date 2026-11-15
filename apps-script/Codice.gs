/**
 * Programmi adunanze — da incollare UNA VOLTA nell'editor Apps Script del Foglio Google
 * «Programmi adunanze – dati» (Estensioni → Apps Script). La pagina e i dati della guida arrivano da GitHub:
 * gli aggiornamenti non richiedono di toccare questo codice.
 *
 * Primo avvio: nell'editor scegli la funzione «impostazione» e premi Esegui (crea le schede del Foglio).
 * Poi Esegui il deployment → Nuovo deployment → Applicazione web:
 *   Esegui come: Utente che accede all'applicazione web · Chi ha accesso: Chiunque abbia un account Google.
 * Immagini WhatsApp e invii su Telegram: il proprietario apre l'indirizzo della pagina con «?riservate» in fondo
 * (…/exec?riservate), scrive le chiavi e preme «Attiva invii automatici».
 */
const REPO = 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/';
const RUOLI = { 'infrasettimanale': 'inf', 'fine settimana': 'fs', 'tutto': 'tutto' };

function doGet(e) {
  const io = utente_();
  if (e && e.parameter && 'riservate' in e.parameter) return paginaRiservata_(io);
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
  return { email: io.email, ruolo: io.ruolo, impostazioni: impostazioni_(), valori: valori, podio: podioSalvato_() };
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

/** Immagine WhatsApp confermata (PNG): va nella cartella delle immagini, accanto al Foglio. Torna l'id del file. */
function caricaImmagine(base64, nome) {
  const io = utente_();
  if (!io.ruolo) throw new Error('Non autorizzato');
  const f = cartellaImmagini_().createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', nome || 'immagine.png'));
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

function cartellaImmagini_() {
  const imp = impostazioni_();
  if (imp.cartellaImmagini) return DriveApp.getFolderById(imp.cartellaImmagini);
  const file = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  const padre = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
  const c = padre.createFolder('Programmi adunanze – immagini WhatsApp');
  SpreadsheetApp.getActive().getSheetByName('Impostazioni').appendRow(['cartellaImmagini', c.getId(), 'Cartella delle immagini WhatsApp (non cambiare)']);
  return c;
}

/* ───────────── Parte riservata al proprietario del Foglio ─────────────
 * Le chiavi (Telegram, collegamento al podio) stanno nelle proprietà UTENTE del proprietario: solo le sue esecuzioni
 * (la pagina aperta da lui e i suoi attivatori a tempo) le possono leggere; chi compila non le vede né nel Foglio né
 * nell'editor. Si impostano dalla pagina «…/exec?riservate», che si apre solo al proprietario. */

function proprietario_() {
  try {
    return SpreadsheetApp.getActive().getOwner().getEmail().toLowerCase();
  } catch (e) {
    return '';
  }
}

function paginaRiservata_(io) {
  if (!io.email || io.email !== proprietario_()) return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:32px">Pagina non disponibile.</p>');
  const p = PropertiesService.getUserProperties().getProperties();
  const val = (k) => (p[k] ? '••••' + String(p[k]).slice(-4) : '');
  const campo = (k, et, aiuto) =>
    '<label>' + et + '<input name="' + k + '" placeholder="' + (val(k) || 'non impostato') + '" autocomplete="off"><small>' + aiuto + '</small></label>';
  const html =
    '<style>body{font-family:"Fira Sans",system-ui,sans-serif;max-width:560px;margin:auto;padding:20px;color:#1E2326}h2{color:#A8432B}' +
    'label{display:grid;gap:4px;margin:14px 0;font-weight:600;font-size:14px}input{height:40px;border:1px solid #D5D9DE;border-radius:8px;padding:0 10px;font:inherit;font-weight:400}' +
    'small{font-weight:400;color:#5F6B77}button{height:40px;padding:0 16px;border-radius:9px;border:0;background:#A8432B;color:#fff;font:inherit;font-weight:600;margin:6px 6px 0 0}' +
    'button.sec{background:#fff;color:#1E2326;border:1px solid #D5D9DE}#esito{margin-top:14px;white-space:pre-wrap;font-size:14px}</style>' +
    '<h2>Impostazioni riservate</h2><p>Solo tu vedi questa pagina. Lascia vuoto un campo per non cambiarlo.</p><form id="f">' +
    campo('TELEGRAM_TOKEN', 'Token del bot Telegram', 'Lo stesso bot del brief (BotFather).') +
    campo('TELEGRAM_CHAT', 'Chat Telegram', 'L’id del gruppo delle notifiche (es. -100…).') +
    campo('CM_URL', 'Indirizzo di Congregation Manager (Supabase)', 'https://xxxx.supabase.co') +
    campo('CM_CHIAVE', 'Chiave pubblica (anon / publishable)', 'Da Supabase → Project Settings → API.') +
    campo('CM_PONTE', 'Chiave del podio', 'La stessa scritta in Congregation Manager → Impostazioni (ponte:chiave).') +
    campo('ANTICIPO_GIORNI', 'Giorni prima dell’adunanza', 'Predefinito 3.') +
    campo('ORA_INVIO', 'Ora dell’invio', 'Predefinita 19:00.') +
    '<button>Salva</button></form><button class="sec" id="att">Attiva invii automatici</button><button class="sec" id="prova">Prova: aggiorna podio e manda un messaggio</button><div id="esito"></div>' +
    '<script>var es=document.getElementById("esito");function ok(m){es.textContent=m}function ko(e){es.textContent="Errore: "+e.message}' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();var d={};new FormData(this).forEach(function(v,k){if(v.trim())d[k]=v.trim()});google.script.run.withSuccessHandler(ok).withFailureHandler(ko).salvaRiservate(d)};' +
    'document.getElementById("att").onclick=function(){google.script.run.withSuccessHandler(ok).withFailureHandler(ko).attivaInvii()};' +
    'document.getElementById("prova").onclick=function(){google.script.run.withSuccessHandler(ok).withFailureHandler(ko).provaInvii()};</script>';
  return HtmlService.createHtmlOutput(html).setTitle('Impostazioni riservate').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function soloProprietario_() {
  const io = utente_();
  if (!io.email || io.email !== proprietario_()) throw new Error('Riservato al proprietario');
}

function salvaRiservate(d) {
  soloProprietario_();
  const ok = ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT', 'CM_URL', 'CM_CHIAVE', 'CM_PONTE', 'ANTICIPO_GIORNI', 'ORA_INVIO'];
  const p = PropertiesService.getUserProperties();
  for (const k of ok) if (d[k]) p.setProperty(k, String(d[k]).replace(/\/+$/, ''));
  return 'Salvato.';
}

/** Crea (una sola volta) gli attivatori a tempo: podio ogni ora, invii ogni 15 minuti. Girano come il proprietario. */
function attivaInvii() {
  soloProprietario_();
  for (const t of ScriptApp.getProjectTriggers())
    if (['aggiornaPodio', 'inviiWhatsApp'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('aggiornaPodio').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('inviiWhatsApp').timeBased().everyMinutes(15).create();
  aggiornaPodio();
  return 'Invii automatici attivi: podio ogni ora, controllo degli invii ogni 15 minuti.';
}

function provaInvii() {
  soloProprietario_();
  const n = aggiornaPodio();
  const p = PropertiesService.getUserProperties();
  telegram_('sendMessage', { chat_id: p.getProperty('TELEGRAM_CHAT'), text: '✅ Programmi adunanze collegato. Podio letto per ' + n + ' adunanze.' });
  return 'Fatto: podio letto per ' + n + ' adunanze e messaggio inviato.';
}

/* Podio: letto dalla turnazione dei reparti e tenuto nella cache dello script (6 ore, rinnovata ogni ora). */
function podioSalvato_() {
  try {
    return JSON.parse(CacheService.getScriptCache().get('podio') || '{}');
  } catch (e) {
    return {};
  }
}

function aggiornaPodio() {
  const p = PropertiesService.getUserProperties();
  const url = p.getProperty('CM_URL');
  const chiave = p.getProperty('CM_CHIAVE');
  if (!url || !chiave || !p.getProperty('CM_PONTE')) return 0;
  const g = (d) => Utilities.formatDate(d, 'Europe/Rome', 'yyyy-MM-dd');
  const oggi = new Date();
  const r = UrlFetchApp.fetch(url + '/rest/v1/rpc/ponte_podio', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: chiave, Authorization: 'Bearer ' + chiave },
    payload: JSON.stringify({ p_chiave: p.getProperty('CM_PONTE'), p_da: g(new Date(oggi.getTime() - 86400000)), p_a: g(new Date(oggi.getTime() + 75 * 86400000)) }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error('Podio: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  const out = {};
  for (const x of JSON.parse(r.getContentText())) out[x.data + '|' + x.tipo] = x.nome;
  CacheService.getScriptCache().put('podio', JSON.stringify(out), 21600);
  return Object.keys(out).length;
}

function telegram_(metodo, payload) {
  const token = PropertiesService.getUserProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) throw new Error('Token Telegram non impostato');
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + metodo, { method: 'post', payload: payload, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('Telegram: ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}

/** "2026-11-03 19:30" (ora italiana) → Date. */
function dataRoma_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/.exec(s || '');
  if (!m) return null;
  return Utilities.parseDate(m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5], 'Europe/Rome', 'yyyy-MM-dd HH:mm');
}

/**
 * Ogni 15 minuti (come il proprietario): per ogni adunanza, dal momento dell'invio (N giorni prima, all'ora scelta)
 * fino all'inizio dell'adunanza, manda su Telegram le immagini confermate. Se dopo l'invio vengono confermate di nuovo
 * (una modifica), le manda ancora con «Aggiornamento». Se all'ora dell'invio non sono confermate, manda un avviso.
 */
function inviiWhatsApp() {
  const p = PropertiesService.getUserProperties();
  if (!p.getProperty('TELEGRAM_TOKEN') || !p.getProperty('TELEGRAM_CHAT')) return;
  const chat = p.getProperty('TELEGRAM_CHAT');
  const giorni = Number(p.getProperty('ANTICIPO_GIORNI') || 3);
  const ora = (p.getProperty('ORA_INVIO') || '19:00').split(':');
  const sh = SpreadsheetApp.getActive().getSheetByName('Programma');
  if (sh.getLastRow() < 2) return;
  const val = {};
  for (const [k, v] of sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()) if (k) val[String(k)] = String(v);
  const adesso = new Date();
  for (const k of Object.keys(val)) {
    if (!/:quando$/.test(k)) continue;
    const carta = k.slice(0, -':quando'.length);
    const inizio = dataRoma_(val[k]);
    if (!inizio) continue;
    if (inizio <= adesso) {
      p.deleteProperty('inviato:' + carta); // meeting already held
      continue;
    }
    const giorno = Utilities.formatDate(new Date(inizio.getTime() - giorni * 86400000), 'Europe/Rome', 'yyyy-MM-dd');
    const invio = dataRoma_(giorno + ' ' + ora[0] + ':' + (ora[1] || '00'));
    if (adesso < invio) continue;
    const infra = /-inf$/.test(carta);
    const nomeAd = (infra ? 'Adunanza infrasettimanale' : 'Adunanza del fine settimana') + ' · ' +
      Utilities.formatDate(inizio, 'Europe/Rome', 'dd/MM HH:mm');
    let conf = null;
    try {
      conf = JSON.parse(val[carta + ':wa'] || 'null');
    } catch (e) { /* valore rovinato */ }
    const statoK = 'inviato:' + carta;
    const stato = p.getProperty(statoK) || '';
    if (!conf) {
      if (stato !== 'avviso') {
        telegram_('sendMessage', { chat_id: chat, text: '⚠️ ' + nomeAd + ': le immagini per il presidente e per l’Audio/Video non sono ancora confermate da chi compila il programma.' });
        p.setProperty(statoK, 'avviso');
      }
      continue;
    }
    const firma = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, conf.firma || ''));
    if (stato === firma) continue;
    const agg = stato && stato !== 'avviso' ? '🔄 Aggiornamento · ' : '';
    for (const [id, chi] of [[conf.png && conf.png.pres, 'Presidente'], [conf.png && conf.png.av, 'Reparto Audio/Video']]) {
      if (!id) continue;
      telegram_('sendPhoto', { chat_id: chat, caption: agg + chi + ' · ' + nomeAd, photo: DriveApp.getFileById(id).getBlob() });
    }
    p.setProperty(statoK, firma);
  }
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
