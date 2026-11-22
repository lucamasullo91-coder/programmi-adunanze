/* Bacheca: per tutti, con il link personale. Solo programmi pubblicati, ognuno secondo le sue abilitazioni.
 * In cima «I miei impegni»: una scheda per impegno, data per esteso in maiuscolo nel colore della sezione,
 * il dettaglio della parte e il ruolo in sovrimpressione. Sotto la biblioteca dei programmi: una copertina con
 * l'anteprima per ogni programma (e per ogni versione); toccandola si apre il foglio intero, con «Prepara PDF». */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GB = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const GL = ['DOMENICA', 'LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'];
  const B = { mese: '', d: null, carico: false, apri: null };
  const COL = { inf: '#A8432B', fs: '#521F46', rep: '#4D5A68', pul: '#9A7A1E', com: '#A86F00', oem: '#2F7F8C' };
  const TAG = { inf: 'Infrasettimanale', fs: 'Fine settimana', rep: 'Reparti', pul: 'Pulizie', com: 'Comitive', oem: 'Espositori' };
  const meseDopo = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
  const nomeMese = (m) => MESI[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  const dt = (s) => new Date(s + 'T12:00:00Z');

  const css = document.createElement('style');
  css.textContent = `
  .bc-vuoto{color:var(--slate);font-size:14px;padding:6px 0 14px}
  .bc-full .rp-bar{position:sticky;top:0;z-index:5;background:var(--paper,#F6F5F2);padding:6px 0}
  .bc-imps{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin:2px 0 20px}
  .bc-ic{background:#fff;border-radius:12px;padding:14px 16px;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.06);border-left:5px solid var(--c)}
  .bc-ic.pass{opacity:.5}
  .bc-ic .dt{color:var(--c);font-size:16px;font-weight:600;letter-spacing:.04em;margin:0 96px 8px 0;line-height:1.25}
  .bc-ic .dt small{font-size:13px;font-weight:600;margin-left:6px;opacity:.85;letter-spacing:.02em}
  .bc-ic .bd{position:absolute;top:12px;right:12px;background:var(--c);color:#fff;font-size:11px;font-weight:600;letter-spacing:.08em;padding:4px 9px;border-radius:6px;text-transform:uppercase;max-width:110px;text-align:center;line-height:1.2}
  .bc-ic .tt{color:var(--c);font-size:16px;font-weight:600;margin:0;line-height:1.3}
  .bc-ic .s{font-size:14px;color:#55544f;margin:4px 0 0;line-height:1.45}
  .bc-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px 14px;margin-bottom:10px}
  .bc-book{cursor:pointer;display:grid;gap:7px;align-content:start;border:0;background:none;padding:0;font:inherit;text-align:center}
  .bc-book .pg{position:relative;aspect-ratio:1/1.414;overflow:hidden;border-radius:6px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.14);border-top:4px solid var(--c)}
  .bc-book .pg iframe{position:absolute;inset:0;border:0;width:100%;height:100%;pointer-events:none;background:#fff}
  .bc-book .pg .pgm-fit{pointer-events:none}
  .bc-book .pg .vuota{position:absolute;inset:14px 12px;display:grid;gap:7px;align-content:start}
  .bc-book .pg .vuota i{display:block;height:5px;border-radius:2px;background:#E4E2DB}
  .bc-book .pg .vuota i:first-child{height:8px;width:70%;background:var(--c)}
  .bc-book b{font-size:13px;font-weight:600;color:#1F2630;line-height:1.25}
  .bc-book small{display:block;font-size:11.5px;color:var(--slate);font-weight:400;margin-top:2px}
  .bc-book.solo-nom .pg::after{content:"Nominati";position:absolute;top:6px;right:6px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:#1F2630;color:#fff;padding:2px 6px;border-radius:4px}`;
  document.head.appendChild(css);

  function carica() {
    B.carico = true; B.d = null;
    P.srv('bacheca', B.mese).then((d) => { B.d = d; B.mese = d.mese; B.carico = false; if (S.vista === 'bacheca') P.disegna(); })
      .catch((e) => { B.carico = false; P.toast(e.message, true); });
  }
  const quando = (q) => (q ? 'Pubblicato il ' + q.slice(8, 10) + '/' + q.slice(5, 7) : '');
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };

  /* I fogli che la bacheca sa disegnare: tipo → { versioni, foglio(versione), classe } */
  function fogli(d) {
    const out = [];
    if (d.reparti) {
      const mio = d.reparti.stato.turni.some((t) => t.persona_id === d.io.id);
      out.push({ t: 'rep', titolo: 'Turnazione reparti', c: '#4D5A68', q: d.reparti.quando, classe: 'fa4', versioni: (mio ? [['mio', 'Il mio foglio']] : []).concat([['tutti', 'Foglio generale']]),
        foglio: (v) => P.fogli.reparti(d.reparti, v === 'mio' ? d.io.id : '') });
    }
    if (d.pulizie) out.push({ t: 'pul', titolo: 'Programma pulizie', c: '#9A7A1E', q: d.pulizie.quando, classe: 'pu4', versioni: [['anno', 'Anno ' + d.pulizie.anno + '/' + (d.pulizie.anno + 1)]], foglio: () => P.fogli.pulizie(d.pulizie) });
    if (d.comitive) {
      const mie = Object.values(d.comitive.stato.assegnati).indexOf(d.io.id) >= 0 || (d.comitive.foglio.domeniche || []).some((r) => r.conduttore === d.io.id);
      const nomi = { generale: 'Generale', personale: 'Le mie comitive', tabella: 'Tabella informazioni' };
      const vv = d.versioniComitive.filter((v) => v !== 'personale' || mie);
      out.push({ t: 'com', titolo: 'Programma comitive', c: '#A86F00', q: d.comitive.quando, classe: 'cm4', versioni: vv.map((v) => [v, nomi[v]]),
        foglio: (v) => P.fogli.comitive(d.comitive, v === 'personale' ? 'p:' + d.io.id : v) });
    }
    return out;
  }
  const anteprima = (classe, html) => '<div class="rp-anteprima ' + classe + '" style="padding:0;background:none"><div class="pgm-fit" data-fit="1"><div class="pgm-scale">' + html + '</div></div></div>';

  /** Una scheda di «I miei impegni». */
  function scheda(x, d) {
    const g = dt(x.data), c = x.col || COL[x.tipo] || '#4D5A68';
    const giorno = GL[g.getUTCDay()] + ' ' + g.getUTCDate() + ' ' + MESI[g.getUTCMonth()].toUpperCase();
    const data = x.sett ? 'SETTIMANA DAL ' + g.getUTCDate() + ' ' + MESI[g.getUTCMonth()].toUpperCase() : giorno;
    const fine = x.sett ? dt(x.data) : null; if (fine) fine.setUTCDate(fine.getUTCDate() + 6);
    const passato = (x.sett ? fine.toISOString().slice(0, 10) : x.data) < d.oggi;
    return '<div class="bc-ic' + (passato ? ' pass' : '') + '" style="--c:' + c + '">' + (x.ruolo ? '<span class="bd">' + esc(x.ruolo) + '</span>' : '') +
      '<p class="dt">' + esc(data) + (fine ? ' AL ' + fine.getUTCDate() + ' ' + MESI[fine.getUTCMonth()].toUpperCase() : '') + (x.ora ? '<small>' + esc(x.ora) + '</small>' : '') + '</p>' +
      '<p class="tt">' + esc(x.titolo || x.testo) + '</p>' +
      (x.dett ? '<p class="s">' + esc(x.dett) + '</p>' : '') + (x.con ? '<p class="s">' + esc(x.con) + '</p>' : '') + '</div>';
  }

  P.viste.bacheca = function () {
    const h0 = P.testata('Bacheca', B.d ? esc(B.d.nomeMese) : '', 'home');
    if (!B.d) { if (!B.carico) carica(); return h0 + '<p class="nota">Carico la bacheca…</p>'; }
    const d = B.d, F = fogli(d);
    // un foglio aperto per intero
    if (B.apri) {
      const f = F.find((x) => x.t === B.apri.t);
      if (f) {
        const v = B.apri.v || f.versioni[0][0];
        return P.testata(f.titolo, esc(d.nomeMese), 'bacheca') + '<div class="bc-full"><div class="rp-bar"><button class="back" data-bc="chiudi">‹ Bacheca</button>' +
          (f.versioni.length > 1 ? '<select data-bc="ver">' + f.versioni.map((x) => '<option value="' + x[0] + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>' : '') +
          '<button class="btn" data-bc="pdf" style="background:' + f.c + ';border-color:' + f.c + '">Prepara PDF</button></div>' +
          '<p class="rp-aiuto"><b>Prepara PDF</b> crea il file A4 del foglio: poi scegli <b>Invia…</b> (WhatsApp, senza scaricarlo) o <b>Scarica</b>.</p>' +
          '<div class="rp-anteprima ' + f.classe + '"><div class="pgm-fit" data-fit="1"><div class="pgm-scale">' + f.foglio(v) + '</div></div></div></div>';
      }
      B.apri = null;
    }
    let h = h0 + '<div class="rp-bar"><select data-bc="mese">' + [-1, 0, 1, 2].map((n) => meseDopo(d.oggi.slice(0, 7), n)).map((m) => '<option value="' + m + '"' + (m === d.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select></div>';
    h += '<h3 class="t">I miei impegni</h3>';
    if (!d.impegni.length) h += '<p class="bc-vuoto">Nei programmi pubblicati di ' + esc(nomeMese(d.mese)) + ' non hai impegni.</p>';
    else h += '<div class="bc-imps">' + d.impegni.map((x) => scheda(x, d)).join('') + '</div>';
    h += '<h3 class="t">Programmi · ' + esc(P.cap(nomeMese(d.mese))) + '</h3><div class="bc-lib">';
    let n = 0;
    const libro = (attr, c, titolo, sotto, pagina, soloNom) => { n++; return '<button class="bc-book' + (soloNom ? ' solo-nom' : '') + '" style="--c:' + c + '" ' + attr + '><span class="pg">' + pagina + '</span><b>' + esc(titolo) + (sotto ? '<small>' + esc(sotto) + '</small>' : '') + '</b></button>'; };
    if (d.programmi.inf || d.programmi.fs) {
      const pr = [['inf', 'Adunanza infrasettimanale', !!d.programmi.inf, '#A8432B'], ['fs', 'Adunanza del fine settimana', !!d.programmi.fs, '#521F46'],
        ['uni', 'Programma combinato', !!(d.programmi.inf && d.programmi.fs), '#4D5A68']].filter((x) => x[2]);
      if (d.io.nominato) pr.push(['rep', 'Adunanze e reparti', true, '#4D5A68', true]);
      pr.forEach((x) => { h += libro('data-bc="prog" data-v="' + x[0] + '"', x[3], x[1], quando(d.programmi.inf || d.programmi.fs), '<iframe data-anteprima="' + x[0] + '" title="Anteprima: ' + esc(x[1]) + '" tabindex="-1"></iframe>', x[4]); });
    }
    F.forEach((f) => f.versioni.forEach((x) => {
      h += libro('data-bc="apri" data-t="' + f.t + '" data-v="' + x[0] + '"', f.c, f.titolo, (f.versioni.length > 1 ? x[1] + ' · ' : '') + quando(f.q), anteprima(f.classe, f.foglio(x[0])));
    }));
    if (d.espositori) h += libro('data-bc="oem"', '#2F7F8C', 'Programma espositori', quando(d.espositori.quando), '<span class="vuota"><i></i><i></i><i></i><i style="width:60%"></i><i></i><i style="width:75%"></i></span>');
    h += '</div>';
    if (!n) h += '<p class="bc-vuoto">Per ' + esc(nomeMese(d.mese)) + ' non è ancora stato pubblicato niente.</p>';
    return h;
  };

  function adatta() {
    P.app.querySelectorAll('[data-fit]').forEach((fit) => {
      const sc = fit.firstElementChild; if (!sc) return;
      const k = Math.min(1, fit.clientWidth / 794);
      sc.style.transform = 'scale(' + k + ')'; fit.style.height = (sc.scrollHeight * k) + 'px';
    });
    P.app.querySelectorAll('iframe[data-anteprima]:not([data-q])').forEach((fr) => { if (P.anteprimaProgrammi) P.anteprimaProgrammi(fr, fr.dataset.anteprima); });
  }
  new MutationObserver(() => { if (S.vista === 'bacheca') requestAnimationFrame(adatta); }).observe(P.app, { childList: true });
  window.addEventListener('resize', () => { if (S.vista === 'bacheca') adatta(); });

  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'bacheca') return;
    const u = e.target.closest('[data-bc]');
    if (!u || u.tagName === 'SELECT') return;
    const k = u.dataset.bc;
    if (k === 'prog') { S.paVista = u.dataset.v; S.vista = 'bachecaProgrammi'; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'oem') { S.vista = 'bachecaEspositori'; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'apri') { B.apri = { t: u.dataset.t, v: u.dataset.v }; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'chiudi') { B.apri = null; return P.disegna(); }
    if (k === 'pdf') {
      // PDF diretto (niente finestra di stampa: niente link del portale a piè di pagina)
      const el = P.app.querySelector('.bc-full .pgm-print');
      if (!el) return;
      const f = fogli(B.d).find((x) => x.t === B.apri.t), v = f && f.versioni.find((x) => x[0] === (B.apri.v || f.versioni[0][0]));
      P.toast('Preparo il PDF…');
      (window.PdfPortale ? Promise.resolve() : P.carica('pdf.js')).then(() => window.PdfPortale.salva([el], (f ? f.titolo : 'Programma') + ' ' + B.d.nomeMese + (v && f.versioni.length > 1 ? ' – ' + v[1] : '')))
        .catch((e2) => P.toast('PDF non riuscito: ' + e2.message, true));
    }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'bacheca') return;
    const u = e.target.closest('[data-bc]');
    if (!u) return;
    if (u.dataset.bc === 'mese') { B.mese = u.value; B.apri = null; return carica(); }
    if (u.dataset.bc === 'ver') { B.apri.v = u.value; return rd(); }
  });
})();
