/* Bacheca: per tutti, con il link personale. Solo programmi pubblicati, ognuno secondo le sue abilitazioni.
 * In cima «I miei impegni» (parti, reparti, comitive, espositori); sotto i fogli del mese. */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GB = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const B = { mese: '', d: null, carico: false, rep: 'mio', com: '' };
  const COL = { inf: '#A8432B', fs: '#521F46', rep: '#4D5A68', com: '#A86F00', oem: '#2F7F8C' };
  const TAG = { inf: 'Infrasettimanale', fs: 'Fine settimana', rep: 'Reparti', com: 'Comitiva', oem: 'Espositori' };
  const meseDopo = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
  const nomeMese = (m) => MESI[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  const dt = (s) => new Date(s + 'T12:00:00Z');

  const css = document.createElement('style');
  css.textContent = `
  .bc-imp{display:grid;gap:6px;margin:4px 0 18px}
  .bc-i{display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;border:1px solid var(--rule);border-radius:8px;background:#fff;padding:7px 10px}
  .bc-i.pass{opacity:.5}
  .bc-d{text-align:center;border-radius:6px;background:var(--neu);padding:4px 0}
  .bc-d small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.12em;color:var(--slate)}
  .bc-d b{display:block;font-size:20px;line-height:1;color:var(--ink2)}
  .bc-i .t{display:grid;gap:3px}
  .bc-i .t span{font-size:14px;font-weight:600}
  .bc-i .t em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--c)}
  .bc-sez{border:1px solid var(--rule);border-top:4px solid var(--c);border-radius:8px;background:#fff;padding:12px;margin:0 0 14px}
  .bc-sez h3{margin:0 0 4px;font-size:16px;text-transform:uppercase;letter-spacing:.04em;color:var(--c)}
  .bc-sez .nota{margin:0 0 10px}
  .bc-vuoto{color:var(--slate);font-size:14px;padding:6px 0 14px}`;
  document.head.appendChild(css);

  function carica() {
    B.carico = true; B.d = null;
    P.srv('bacheca', B.mese).then((d) => { B.d = d; B.mese = d.mese; B.carico = false; if (S.vista === 'bacheca') P.disegna(); })
      .catch((e) => { B.carico = false; P.toast(e.message, true); });
  }
  const quando = (q) => (q ? 'Pubblicato il ' + q.slice(8, 10) + '/' + q.slice(5, 7) + ' alle ' + q.slice(11, 16) : '');

  P.viste.bacheca = function () {
    const h0 = P.testata('Bacheca', B.d ? esc(B.d.nomeMese) : '', 'home');
    if (!B.d) { if (!B.carico) carica(); return h0 + '<p class="nota">Carico la bacheca…</p>'; }
    const d = B.d;
    let h = h0 + '<div class="rp-bar"><select data-bc="mese">' + [-1, 0, 1, 2].map((n) => meseDopo(d.oggi.slice(0, 7), n)).map((m) => '<option value="' + m + '"' + (m === d.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select></div>';
    // I miei impegni
    h += '<h3 class="t">I miei impegni</h3>';
    if (!d.impegni.length) h += '<p class="bc-vuoto">Nei programmi pubblicati di ' + esc(nomeMese(d.mese)) + ' non hai impegni.</p>';
    else h += '<div class="bc-imp">' + d.impegni.map((x) => {
      const g = dt(x.data);
      return '<div class="bc-i' + (x.data < d.oggi ? ' pass' : '') + '" style="--c:' + COL[x.tipo] + '"><div class="bc-d"><small>' + GB[g.getUTCDay()] + '</small><b>' + g.getUTCDate() + '</b></div><div class="t"><em>' + TAG[x.tipo] + '</em><span>' + esc(x.testo) + '</span></div></div>';
    }).join('') + '</div>';
    let n = 0;
    // Programma delle adunanze
    if (d.programmi.inf || d.programmi.fs) {
      n++;
      h += '<div class="bc-sez" style="--c:#A8432B"><h3>Programma delle adunanze</h3><p class="nota">' + [d.programmi.inf ? 'Infrasettimanale: ' + quando(d.programmi.inf).toLowerCase() : '', d.programmi.fs ? 'Fine settimana: ' + quando(d.programmi.fs).toLowerCase() : ''].filter(Boolean).join(' · ') +
        '</p><button class="btn" data-bc="prog">Apri il programma</button></div>';
    }
    // Turnazione reparti
    if (d.reparti) {
      n++;
      const mio = d.reparti.stato.turni.some((t) => t.persona_id === d.io.id);
      const chi = mio && B.rep === 'mio' ? d.io.id : '';
      h += '<div class="bc-sez" style="--c:#4D5A68"><h3>Turnazione reparti</h3><p class="nota">' + quando(d.reparti.quando) + '</p>' +
        '<div class="rp-bar">' + (mio ? '<select data-bc="rep"><option value="mio"' + (B.rep === 'mio' ? ' selected' : '') + '>Il mio foglio</option><option value="tutti"' + (B.rep !== 'mio' ? ' selected' : '') + '>Foglio generale</option></select>' : '') +
        '<button class="btn soft" data-bc="stampa" data-v="bcRep">Stampa / Salva PDF</button></div>' +
        '<div class="rp-anteprima fa4"><div class="pgm-fit" data-fit="bcRep"><div class="pgm-scale">' + P.fogli.reparti(d.reparti, chi) + '</div></div></div></div>';
    }
    // Comitive
    if (d.comitive) {
      n++;
      const vv = d.versioniComitive, mie = Object.values(d.comitive.stato.assegnati).indexOf(d.io.id) >= 0;
      const scelte = vv.filter((v) => v !== 'personale' || mie);
      if (!B.com || scelte.indexOf(B.com) < 0) B.com = mie && scelte.indexOf('personale') >= 0 ? 'personale' : scelte[0];
      const nomi = { generale: 'Generale', personale: 'Le mie comitive', tabella: 'Tabella informazioni' };
      h += '<div class="bc-sez" style="--c:#A86F00"><h3>Programma comitive</h3><p class="nota">' + quando(d.comitive.quando) + '</p><div class="rp-bar">' +
        (scelte.length > 1 ? '<select data-bc="com">' + scelte.map((v) => '<option value="' + v + '"' + (v === B.com ? ' selected' : '') + '>' + nomi[v] + '</option>').join('') + '</select>' : '') +
        '<button class="btn soft" data-bc="stampa" data-v="bcCom">Stampa / Salva PDF</button></div>' +
        '<div class="rp-anteprima fa4"><div class="pgm-fit" data-fit="bcCom"><div class="pgm-scale">' + P.fogli.comitive(d.comitive, B.com === 'personale' ? 'p:' + d.io.id : B.com) + '</div></div></div></div>';
    }
    // Espositori
    if (d.espositori) {
      n++;
      h += '<div class="bc-sez" style="--c:#2F7F8C"><h3>Programma espositori</h3><p class="nota">' + quando(d.espositori.quando) + '</p><button class="btn" data-bc="oem" style="background:#2F7F8C;border-color:#2F7F8C">Apri il programma</button></div>';
    }
    if (!n) h += '<p class="bc-vuoto">Per ' + esc(nomeMese(d.mese)) + ' non è ancora stato pubblicato niente.</p>';
    return h;
  };

  function adatta() {
    P.app.querySelectorAll('[data-fit]').forEach((fit) => {
      const sc = fit.firstElementChild;
      const k = Math.min(1, fit.clientWidth / 794);
      sc.style.transform = 'scale(' + k + ')'; fit.style.height = (sc.scrollHeight * k) + 'px';
    });
  }
  new MutationObserver(() => { if (S.vista === 'bacheca') requestAnimationFrame(adatta); }).observe(P.app, { childList: true });
  window.addEventListener('resize', () => { if (S.vista === 'bacheca') adatta(); });

  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'bacheca') return;
    const u = e.target.closest('[data-bc]');
    if (!u || u.tagName === 'SELECT') return;
    const k = u.dataset.bc;
    if (k === 'prog') { S.vista = 'bachecaProgrammi'; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'oem') { S.vista = 'bachecaEspositori'; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'stampa') {
      // stampa solo quel foglio
      P.app.querySelectorAll('.pgm-print').forEach((x) => x.classList.remove('pgm-print'));
      const f = P.app.querySelector('[data-fit="' + u.dataset.v + '"] .pgm');
      if (f) f.classList.add('pgm-print');
      adatta(); window.print();
      P.app.querySelectorAll('.fa4 .pgm').forEach((x) => x.classList.add('pgm-print'));
    }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'bacheca') return;
    const u = e.target.closest('[data-bc]');
    if (!u) return;
    const y = window.scrollY;
    if (u.dataset.bc === 'mese') { B.mese = u.value; return carica(); }
    if (u.dataset.bc === 'rep') B.rep = u.value;
    if (u.dataset.bc === 'com') B.com = u.value;
    P.disegna(); window.scrollTo(0, y);
  });
})();
