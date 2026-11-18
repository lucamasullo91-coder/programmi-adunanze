/* Bacheca: per tutti, con il link personale. Solo programmi pubblicati, ognuno secondo le sue abilitazioni.
 * In cima «I miei impegni» in un elenco compatto (sul telefono si scorre); sotto un riquadro per programma con
 * l'anteprima del foglio e un pulsante per ogni versione: si apre il foglio intero, da stampare o salvare in PDF. */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GB = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const B = { mese: '', d: null, carico: false, apri: null };
  const COL = { inf: '#A8432B', fs: '#521F46', rep: '#4D5A68', pul: '#9A7A1E', com: '#A86F00', oem: '#2F7F8C' };
  const TAG = { inf: 'Infrasettimanale', fs: 'Fine settimana', rep: 'Reparti', pul: 'Pulizie', com: 'Comitive', oem: 'Espositori' };
  const meseDopo = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
  const nomeMese = (m) => MESI[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  const dt = (s) => new Date(s + 'T12:00:00Z');

  const css = document.createElement('style');
  css.textContent = `
  .bc-imp{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:4px 14px;margin:2px 0 18px}
  .bc-r{display:grid;grid-template-columns:62px 6px minmax(0,1fr);gap:8px;align-items:center;padding:6px 2px;border-bottom:1px solid #EEEBE5;min-height:36px}
  .bc-r.pass{opacity:.45}
  .bc-r .d{font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--ink2);white-space:nowrap}
  .bc-r .d small{font-weight:700;color:var(--slate);margin-right:3px;font-size:10.5px;letter-spacing:.08em}
  .bc-r i{align-self:stretch;border-radius:3px;background:var(--c)}
  .bc-r .x{font-size:13.5px;line-height:1.25;min-width:0}
  .bc-r .x em{display:block;font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--c)}
  .bc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
  .bc-c{border:1px solid var(--rule);border-top:4px solid var(--c);border-radius:10px;background:#fff;padding:10px;display:grid;gap:8px;align-content:start}
  .bc-c h3{margin:0;font-size:14.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--c)}
  .bc-c .q{font-size:11.5px;color:var(--slate);margin-top:-6px}
  .bc-prev{height:230px;overflow:hidden;border-radius:6px;background:#EDEBE6;padding:6px;position:relative;cursor:pointer}
  .bc-prev:after{content:"";position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(transparent,#EDEBE6)}
  .bc-prev .pgm-fit{pointer-events:none}
  .bc-prev iframe{border:0;width:100%;height:100%;pointer-events:none;background:#EDEBE6}
  .bc-bt{display:flex;flex-wrap:wrap;gap:6px}
  .bc-bt .btn{flex:1 1 auto;justify-content:center;text-align:center;background:var(--c);border-color:var(--c)}
  .bc-bt .btn.soft{background:#fff;color:var(--c);border-color:var(--c)}
  .bc-vuoto{color:var(--slate);font-size:14px;padding:6px 0 14px}
  .bc-full .rp-bar{position:sticky;top:0;z-index:5;background:var(--paper,#F6F5F2);padding:6px 0}`;
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
          '<button class="btn" data-bc="stampa" style="background:' + f.c + ';border-color:' + f.c + '">Stampa o salva PDF</button></div>' +
          '<p class="rp-aiuto">Per il PDF: nella finestra di stampa scegli «Salva come PDF» (sul telefono: Condividi → Stampa, poi allarga l\'anteprima e condividi il PDF).</p>' +
          '<div class="rp-anteprima ' + f.classe + '"><div class="pgm-fit" data-fit="1"><div class="pgm-scale">' + f.foglio(v) + '</div></div></div></div>';
      }
      B.apri = null;
    }
    let h = h0 + '<div class="rp-bar"><select data-bc="mese">' + [-1, 0, 1, 2].map((n) => meseDopo(d.oggi.slice(0, 7), n)).map((m) => '<option value="' + m + '"' + (m === d.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select></div>';
    h += '<h3 class="t">I miei impegni</h3>';
    if (!d.impegni.length) h += '<p class="bc-vuoto">Nei programmi pubblicati di ' + esc(nomeMese(d.mese)) + ' non hai impegni.</p>';
    else h += '<div class="bc-imp">' + d.impegni.map((x) => {
      const g = dt(x.data);
      return '<div class="bc-r' + (x.data < d.oggi ? ' pass' : '') + '" style="--c:' + (COL[x.tipo] || '#4D5A68') + '"><span class="d"><small>' + GB[g.getUTCDay()] + '</small>' + g.getUTCDate() + ' ' + MESI[g.getUTCMonth()].slice(0, 3) + '</span><i></i><span class="x"><em>' + (TAG[x.tipo] || '') + '</em>' + esc(x.testo) + '</span></div>';
    }).join('') + '</div>';
    h += '<h3 class="t">Programmi del mese</h3><div class="bc-grid">';
    let n = 0;
    if (d.programmi.inf || d.programmi.fs) {
      n++;
      const bt = [['inf', 'Infrasettimanale', !!d.programmi.inf], ['fs', 'Fine settimana', !!d.programmi.fs], ['uni', 'Combinato', d.programmi.inf && d.programmi.fs]].filter((x) => x[2]);
      if (d.io.nominato) bt.push(['rep', 'Adunanze e reparti', true]);
      h += '<div class="bc-c" style="--c:#A8432B"><h3>Programma delle adunanze</h3><div class="q">' + quando(d.programmi.inf || d.programmi.fs) + '</div>' +
        '<div class="bc-prev" data-bc="prog" data-v="' + (bt.find((x) => x[0] === 'uni') ? 'uni' : bt[0][0]) + '"><iframe data-anteprima="' + (bt.find((x) => x[0] === 'uni') ? 'uni' : bt[0][0]) + '" title="Anteprima del programma" tabindex="-1"></iframe></div>' +
        '<div class="bc-bt">' + bt.map((x, i) => '<button class="btn' + (i ? ' soft' : '') + '" data-bc="prog" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>';
    }
    F.forEach((f) => {
      n++;
      h += '<div class="bc-c" style="--c:' + f.c + '"><h3>' + esc(f.titolo) + '</h3><div class="q">' + quando(f.q) + '</div>' +
        '<div class="bc-prev" data-bc="apri" data-t="' + f.t + '" data-v="' + f.versioni[0][0] + '">' + anteprima(f.classe, f.foglio(f.versioni[0][0])) + '</div>' +
        '<div class="bc-bt">' + f.versioni.map((x, i) => '<button class="btn' + (i ? ' soft' : '') + '" data-bc="apri" data-t="' + f.t + '" data-v="' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div></div>';
    });
    if (d.espositori) {
      n++;
      h += '<div class="bc-c" style="--c:#2F7F8C"><h3>Programma espositori</h3><div class="q">' + quando(d.espositori.quando) + '</div><div class="bc-bt"><button class="btn" data-bc="oem">Apri il programma</button></div></div>';
    }
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
    if (k === 'stampa') { adatta(); window.print(); }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'bacheca') return;
    const u = e.target.closest('[data-bc]');
    if (!u) return;
    if (u.dataset.bc === 'mese') { B.mese = u.value; B.apri = null; return carica(); }
    if (u.dataset.bc === 'ver') { B.apri.v = u.value; return rd(); }
  });
})();
