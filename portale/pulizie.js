/* Programma pulizie della Sala, anno teocratico (settembre–agosto), come in Congregation Manager:
 * una riga per settimana con gruppo, coordinatore, referente, pulizia generale (gruppo, data, coordinatore, referente) e note.
 * Ogni riga si salva da sola. I gruppi si scrivono (anche i nomi che avevano allora, per lo storico);
 * le persone si scelgono dall'anagrafica o si scrivono a mano (chi non c'è più). Foglio A4 e pubblicazione in bacheca. */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const U = { anno: 0, d: null, carico: false, pub: null, scrivi: {} };
  const dm = (iso) => iso.slice(8) + '/' + iso.slice(5, 7);
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const piu = (s, n) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const dow = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

  const css = document.createElement('style');
  css.textContent = `
  .pu-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
  .pu-anno{display:flex;align-items:center;gap:4px;font-weight:800;font-size:16px;color:#A86F00}
  .pu-anno button{border:1px solid var(--rule);background:#fff;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:16px}
  .pu-lay{display:grid;gap:14px}
  @media(min-width:1180px){.pu-lay{grid-template-columns:minmax(0,1fr) 250px}}
  .pu-t{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff}
  .pu-t th{background:#FBF1DC;color:#7A5200;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;text-align:left;padding:6px;border-bottom:2px solid #A86F00;position:sticky;top:0;z-index:1}
  .pu-t td{padding:3px 4px;border-bottom:1px solid #EFEBE2;vertical-align:middle;white-space:nowrap;border-right:0}
  .pu-t tr.m td{border-top:2px solid #A86F00}
  .pu-t tr.pass td{background:#FAF9F6}.pu-t tr.pass td:not(:first-child){opacity:.75}
  .pu-t td.me{font-weight:800;color:#A86F00;text-transform:uppercase;font-size:11.5px}
  .pu-t td.c{text-align:center;color:var(--slate)}
  .pu-t input,.pu-t select{width:100%;min-width:92px;border:1px solid var(--rule);border-radius:5px;padding:4px 5px;background:#fff;font:inherit;font-size:12.5px}
  .pu-t input[type=date]{min-width:118px}
  .pu-t .sp{font-weight:700;color:#521F46}
  .pu-wrap{overflow:auto;max-height:78vh;border:1px solid var(--rule);border-radius:8px}
  .pu-side{display:grid;gap:10px;align-content:start}
  .pu-side section{background:#fff;border:1px solid var(--rule);border-radius:8px;padding:8px 10px}
  .pu-side h4{margin:0 0 6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#A86F00}
  .pu-side table{width:100%;font-size:12.5px;border-collapse:collapse}.pu-side td{padding:2px 0;border:0;white-space:nowrap}.pu-side td.n{text-align:right;font-weight:700}
  @media(max-width:820px){
    .pu-wrap{max-height:none;border:0;overflow:visible}
    .pu-t thead{display:none}
    .pu-t,.pu-t tbody{display:block}
    .pu-t tr{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px;padding:10px;border:1px solid var(--rule);border-radius:10px;margin:0 0 10px;background:#fff}
    .pu-t tr.m{border-top:4px solid #A86F00}
    .pu-t tr.m td{border-top:0}
    .pu-t td{display:block;border:0;padding:0;white-space:normal}
    .pu-t td[data-l]:before{content:attr(data-l);display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--slate);margin-bottom:2px}
    .pu-t td.me,.pu-t td.c{display:none}
    .pu-t td.dal{grid-column:1/-1;font-weight:800;font-size:15px;color:#7A5200}
    .pu-t td.g2{border-top:1px dashed var(--rule);padding-top:6px}
    .pu-t td.nota,.pu-t td.sp{grid-column:1/-1}
  }
  .pu4 .pgm-fit{width:100%;overflow:hidden;margin:0 auto;max-width:794px}.pu4 .pgm-scale{transform-origin:top left;width:794px}
  .pu4{--ink2:#1F2630;--slate:#4D5A68;--gold:#F2C66D;--rule:#D9D6D0;--mgold:#A86F00}
  .pu4 .pgm.pul{width:794px;min-height:1123px;background:#fff;color:var(--ink2);font-family:"Fira Sans","Segoe UI",system-ui,sans-serif;padding:26px 36px 16px;display:flex;flex-direction:column;margin:0 auto;box-sizing:border-box}
  .pu4 .pgm.pul *{box-sizing:border-box}
  .pu4 .ph{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--slate);padding-bottom:10px}
  .pu4 .ph .cong{font-size:10px;font-weight:600;letter-spacing:.32em;color:var(--slate);text-transform:uppercase}
  .pu4 .ph .gold{width:116px;height:3px;background:var(--gold);border-radius:2px;margin:6px 0 7px}
  .pu4 .ph .kick{font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--mgold)}
  .pu4 .ph h1{margin:0;font-weight:800;font-size:32px;line-height:1;color:var(--mgold);text-transform:uppercase}
  .pu4 .ph .anno{font-weight:700;font-size:13px;letter-spacing:.12em;color:var(--slate);text-transform:uppercase;text-align:right}
  .pu4 table{width:100%;border-collapse:collapse;margin-top:10px;font-size:9.6px;table-layout:fixed}
  .pu4 th{font-size:7.6px;letter-spacing:.1em;text-transform:uppercase;color:#7A5200;background:#FBF1DC;text-align:left;padding:4px 5px;border:0;position:static}
  .pu4 th.gen{background:#EAF2FA;color:#235C90}
  .pu4 td{padding:2.4px 5px;border:0;border-bottom:1px solid #EEE9DE;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;height:auto;text-align:left;background:transparent}
  .pu4 td.mese{font-weight:800;color:var(--mgold);text-transform:uppercase;font-size:8.6px;letter-spacing:.06em}
  .pu4 tr.m td{border-top:1.5px solid var(--mgold)}
  .pu4 td.g{font-weight:800;text-transform:uppercase}
  .pu4 td.p{text-transform:uppercase;font-weight:600}
  .pu4 td.gen{background:#F6F9FD;color:#235C90}
  .pu4 td.sp{font-weight:700;color:#521F46;text-transform:uppercase;font-size:8.6px;letter-spacing:.04em}
  .pu4 td.n{color:var(--slate);font-style:italic}
  .pu4 .pf{margin-top:auto;border-top:1px solid var(--slate);padding-top:7px;display:flex;justify-content:space-between;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate)}
  .pu4 .pf b{font-weight:600}
  .rp-anteprima.pu4{background:#EDEBE6;border-radius:8px;padding:12px;overflow:hidden}
  @media print{.pu4 .pgm-print,.pu4 .pgm-print *{visibility:visible}.pu4 .pgm-fit{height:auto!important;overflow:visible;max-width:none}.pu4 .pgm-scale{transform:none!important}
    .pu4 .pgm-print{position:absolute;left:0;top:0;width:210mm;min-height:297mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;
  document.head.appendChild(css);

  function carica(anno) {
    U.carico = true; U.d = null; U.pub = null;
    P.srv('pulizie', anno || '').then((d) => { U.d = d; U.anno = d.anno; U.carico = false; if (S.vista === 'pulizie') P.disegna(); }).catch((e) => { U.carico = false; P.toast(e.message, true); });
  }
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };
  const nomePers = (D, v, sigla) => {
    if (!v) return '';
    if (String(v).indexOf('txt:') === 0) return String(v).slice(4);
    const p = (D.fratelli || []).find((x) => x.id === v) || (D.nomi || {})[v];
    if (!p) return '?';
    return sigla ? (p.nome ? p.nome.charAt(0) + '. ' : '') + p.cognome : p.nome + ' ' + p.cognome;
  };
  function selPersona(lun, campo, v, tipo) {
    const D = U.d, txt = v && String(v).indexOf('txt:') === 0;
    const prima = D.fratelli.filter((p) => p[tipo]), altri = D.fratelli.filter((p) => !p[tipo]);
    const o = (p) => '<option value="' + p.id + '"' + (v === p.id ? ' selected' : '') + '>' + esc(p.cognome + ' ' + p.nome) + '</option>';
    if (txt || U.scrivi[lun + campo]) return '<input data-pu="txt" data-l="' + lun + '" data-c="' + campo + '" value="' + esc(txt ? v.slice(4) : '') + '" placeholder="Nome e cognome">';
    return '<select data-pu="p" data-l="' + lun + '" data-c="' + campo + '"><option value="">—</option><optgroup label="' + (tipo === 'coord' ? 'Abilitati coordinatore' : 'Abilitati referente') + '">' + prima.map(o).join('') + '</optgroup>' +
      '<optgroup label="Altri fratelli">' + altri.map(o).join('') + '</optgroup><optgroup label="Storico"><option value="@scrivi">Scrivo io il nome…</option></optgroup></select>';
  }
  function pubblicazione() {
    if (!U.pub) { U.pub = { carico: true }; P.srv('statoPubblicazione', 'pulizie', U.anno + '-09').then((x) => { U.pub = x; rd(); }).catch(() => { U.pub = { pubblicato: false }; }); }
    const x = U.pub;
    if (x.carico) return '';
    return '<span class="rp-pub">' + (x.pubblicato ? (x.cambiato ? '<b style="color:#9A6A00">Modificato dopo la pubblicazione del ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7)) + '</b>' : 'Pubblicato il ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7))) : 'Non ancora in bacheca') +
      ' <button class="btn small" data-pu="pubblica" style="background:#A86F00;border-color:#A86F00">' + (x.pubblicato ? 'Pubblica di nuovo' : 'Pubblica in bacheca') + '</button></span>';
  }

  P.viste.pulizie = function () {
    const h0 = P.testata('Programma pulizie', U.d ? 'Anno teocratico ' + U.d.anno + '/' + (U.d.anno + 1) : '', 'home');
    if (!U.d) { if (!U.carico) carica(U.anno); return h0 + '<p class="nota">Carico…</p>'; }
    const D = U.d;
    let h = h0 + '<div class="pu-bar"><span class="pu-anno"><button data-pu="anno" data-v="-1" aria-label="Anno prima">‹</button>' + D.anno + '/' + (D.anno + 1) + '<button data-pu="anno" data-v="1" aria-label="Anno dopo">›</button></span>' +
      '<button class="btn soft" data-pu="ruota">Gruppi a turno nelle settimane vuote</button><button class="btn soft" data-pu="foglio">' + (U.foglio ? 'Torna al programma' : 'Foglio A4') + '</button>' + pubblicazione() + '<span class="rp-salvo" id="puSalvo"></span></div>' +
      '<datalist id="puGruppi">' + D.gruppi.map((g) => '<option value="' + esc(g) + '">').join('') + '</datalist>' +
      '<p class="rp-aiuto">Una riga per settimana, da settembre ad agosto. Ogni cambio si salva da solo e vale anche per la Turnazione reparti, i fogli, la bacheca e le immagini WhatsApp. Per lo storico puoi scrivere il nome che il gruppo aveva allora e, con «Scrivo io il nome…», anche chi oggi non è più in anagrafica.</p>';
    if (U.foglio) return h + '<div class="rp-bar"><button class="btn" data-pu="stampa" style="background:#A86F00;border-color:#A86F00">Stampa / Salva PDF</button></div><div class="rp-anteprima pu4"><div class="pgm-fit" id="puFit"><div class="pgm-scale" id="puScale">' + P.fogli.pulizie(D) + '</div></div></div>';
    let mp = -1;
    h += '<div class="pu-lay"><div class="pu-wrap"><table class="pu-t"><thead><tr><th>Mese</th><th>Sett.</th><th>Dal – al</th><th>Pulizia post adunanze</th><th>Coordinatore</th><th>Referente</th><th>Pulizia generale</th><th>Data</th><th>Coord. generale</th><th>Ref. generale</th><th>Note</th></tr></thead><tbody>';
    D.settimane.forEach((w) => {
      const l = w.lunedi, m = +l.slice(5, 7) - 1, nuovo = m !== mp; mp = m;
      const n = D.settimane.filter((x) => +x.lunedi.slice(5, 7) - 1 === m && x.lunedi <= l).length;
      const e = D.righe[l] || {}, pass = piu(l, 6) < D.oggi;
      h += '<tr class="' + (nuovo ? 'm ' : '') + (pass ? 'pass' : '') + '"><td class="me">' + (nuovo ? cap(MESI[m]) : '') + '</td><td class="c">' + n + '</td><td class="dal">' + dm(l) + ' – ' + dm(w.al) + (w.speciale ? ' <span class="sp">' + esc(w.speciale.nome) + '</span>' : '') + '</td>' +
        '<td data-l="Gruppo"><input list="puGruppi" data-pu="f" data-l="' + l + '" data-c="g" value="' + esc(e.g || '') + '" placeholder="—"></td>' +
        '<td data-l="Coordinatore">' + selPersona(l, 'c', e.c, 'coord') + '</td><td data-l="Referente">' + selPersona(l, 'r', e.r, 'ref') + '</td>' +
        '<td data-l="Pulizia generale · gruppo" class="g2"><input list="puGruppi" data-pu="f" data-l="' + l + '" data-c="gg" value="' + esc(e.gg || '') + '" placeholder="—"></td>' +
        '<td data-l="Data"><input type="date" min="' + l + '" max="' + w.al + '" data-pu="f" data-l="' + l + '" data-c="gd" value="' + esc(e.gd || '') + '"></td>' +
        '<td data-l="Coord. generale">' + selPersona(l, 'gc', e.gc, 'coord') + '</td><td data-l="Ref. generale">' + selPersona(l, 'gr', e.gr, 'ref') + '</td>' +
        '<td data-l="Note" class="nota"><input data-pu="f" data-l="' + l + '" data-c="n" value="' + esc(e.n || '') + '" placeholder=""></td></tr>';
    });
    h += '</tbody></table></div>';
    // conteggi come nel foglio di CM («N° turnazioni in un anno»)
    const g = {}, co = {}, re = {}, cg = {};
    Object.keys(D.righe).forEach((l) => { const e = D.righe[l];
      if (e.g) (g[e.g] = g[e.g] || { p: 0, q: 0 }).p++; if (e.gg) (g[e.gg] = g[e.gg] || { p: 0, q: 0 }).q++;
      if (e.c) co[e.c] = (co[e.c] || 0) + 1; if (e.r) re[e.r] = (re[e.r] || 0) + 1; if (e.gc) cg[e.gc] = (cg[e.gc] || 0) + 1; });
    const elenco = (o) => { const k = Object.keys(o).sort((a, b) => o[b] - o[a]); return k.length ? '<table>' + k.map((id) => '<tr><td>' + esc(nomePers(D, id, true)) + '</td><td class="n">' + o[id] + '</td></tr>').join('') + '</table>' : '<p class="nota" style="margin:0">Nessuno.</p>'; };
    h += '<div class="pu-side"><section><h4>Turnazioni ' + D.anno + '/' + (D.anno + 1) + '</h4><table><tr><td></td><td class="n" title="Dopo le adunanze">Post</td><td class="n" title="Pulizia generale">Gen.</td></tr>' +
      Object.keys(g).sort((a, b) => a.localeCompare(b, 'it')).map((x) => '<tr><td>' + esc(x) + '</td><td class="n">' + g[x].p + '</td><td class="n">' + g[x].q + '</td></tr>').join('') + '</table></section>' +
      '<section><h4>Coordinatori</h4>' + elenco(co) + (Object.keys(cg).length ? '<h4 style="margin-top:8px">Pulizia generale</h4>' + elenco(cg) : '') + '</section><section><h4>Referenti</h4>' + elenco(re) + '</section></div></div>';
    return h;
  };

  /* ── foglio A4 ── */
  P.fogli = P.fogli || {};
  P.fogli.pulizie = function (D) {
    let mp = -1;
    const righe = D.settimane.map((w) => {
      const l = w.lunedi, m = +l.slice(5, 7) - 1, nuovo = m !== mp; mp = m;
      const e = D.righe[l] || {};
      const gen = e.gg || e.gd || e.gc ? [e.gg, e.gd ? GG[dow(e.gd)] + ' ' + +e.gd.slice(8) : '', nomePers(D, e.gc, true)].filter(Boolean).join(' · ') : '';
      const vuota = !e.g && !e.c && !e.r && !gen;
      return '<tr class="' + (nuovo ? 'm' : '') + '"><td class="mese">' + (nuovo ? MESI[m] : '') + '</td><td>' + dm(l) + ' – ' + dm(w.al) + '</td>' +
        (vuota && w.speciale ? '<td colspan="4" class="sp">' + esc(w.speciale.nome) + '</td>' :
          '<td class="g">' + esc(e.g || '') + '</td><td class="p">' + esc(nomePers(D, e.c, true)) + '</td><td class="p">' + esc(nomePers(D, e.r, true)) + '</td><td class="gen">' + esc(gen) + '</td>') +
        '<td class="n">' + esc(e.n || (w.speciale && !vuota ? w.speciale.nome : '')) + '</td></tr>';
    }).join('');
    return '<article class="pgm pul pgm-print"><header class="ph"><div><div class="cong">' + esc(D.cong || 'Napoli Pianura Trencia') + '</div><div class="gold"></div><div class="kick">Programma</div><h1>Pulizie della Sala</h1></div>' +
      '<div class="anno">Anno teocratico<br>' + D.anno + '/' + (D.anno + 1) + '</div></header>' +
      '<table><colgroup><col style="width:62px"><col style="width:78px"><col style="width:92px"><col style="width:104px"><col style="width:104px"><col><col style="width:96px"></colgroup>' +
      '<thead><tr><th>Mese</th><th>Settimana</th><th>Gruppo</th><th>Coordinatore</th><th>Referente</th><th class="gen">Pulizia generale</th><th>Note</th></tr></thead><tbody>' + righe + '</tbody></table>' +
      '<footer class="pf"><span><b>Programma pulizie</b> · dopo le adunanze e pulizia generale</span><span>pulpgm' + String(D.anno).slice(2) + String(D.anno + 1).slice(2) + '</span></footer></article>';
  };
  function adatta() {
    document.querySelectorAll('.pu4 .pgm-fit').forEach((fit) => {
      const sc = fit.firstElementChild; if (!sc) return;
      const k = Math.min(1, fit.clientWidth / 794);
      sc.style.transform = 'scale(' + k + ')'; fit.style.height = sc.scrollHeight * k + 'px';
    });
  }
  new MutationObserver(() => requestAnimationFrame(adatta)).observe(P.app, { childList: true, subtree: true });
  window.addEventListener('resize', adatta);

  /* ── salvataggio di una riga ── */
  function salva(l) {
    const el = document.getElementById('puSalvo');
    if (el) { el.textContent = 'Salvo…'; el.className = 'rp-salvo'; }
    return P.srv('salvaPulizia', U.anno, l, U.d.righe[l] || {}).then((r) => {
      if (Object.keys(r).length) U.d.righe[l] = r; else delete U.d.righe[l];
      if (U.pub && U.pub.pubblicato) U.pub.cambiato = true;
      const e2 = document.getElementById('puSalvo'); if (e2) { e2.textContent = 'Salvato'; e2.className = 'rp-salvo ok'; }
    }).catch((e) => { const e2 = document.getElementById('puSalvo'); if (e2) { e2.textContent = 'Non salvato'; e2.className = 'rp-salvo err'; } P.toast(e.message, true); });
  }
  function imposta(l, c, v) { const e = U.d.righe[l] = Object.assign({}, U.d.righe[l] || {}); if (v) e[c] = v; else delete e[c]; return salva(l); }
  /** Gruppi a turno nelle settimane vuote: dopo l'ultimo gruppo inserito, il successivo (salta le settimane speciali). */
  function ruota() {
    const D = U.d, gruppi = D.gruppi;
    if (!gruppi.length) return P.toast('In anagrafica non ci sono gruppi', true);
    let ultimo = -1, lista = [];
    D.settimane.forEach((w) => {
      const e = D.righe[w.lunedi] || {};
      if (e.g) { const i = gruppi.indexOf(e.g); if (i >= 0) ultimo = i; return; }
      if (w.speciale && w.speciale.adunanze === false) return;
      if (/tutti/i.test(e.n || '')) return;
      if (piu(w.lunedi, 6) < D.oggi) return;
      lista.push(w.lunedi);
    });
    if (!lista.length) return P.toast('Tutte le settimane hanno già un gruppo');
    if (!confirm('Metto i gruppi a turno in ' + lista.length + ' settimane vuote, continuando dopo l\'ultimo inserito?')) return;
    let p = Promise.resolve();
    lista.forEach((l) => { ultimo = (ultimo + 1) % gruppi.length; const g = gruppi[ultimo]; p = p.then(() => imposta(l, 'g', g)); });
    return p.then(() => { rd(); P.toast('Gruppo assegnato a ' + lista.length + ' settimane'); });
  }

  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'pulizie') return;
    const u = e.target.closest('[data-pu]');
    if (!u || u.tagName === 'SELECT' || u.tagName === 'INPUT') return;
    const k = u.dataset.pu;
    if (k === 'anno') { U.anno += Number(u.dataset.v); U.d = null; return P.disegna(); }
    if (k === 'ruota') return ruota();
    if (k === 'foglio') { U.foglio = !U.foglio; return P.disegna(); }
    if (k === 'stampa') { adatta(); return window.print(); }
    if (k === 'pubblica') {
      if (!confirm('Pubblico in bacheca il programma pulizie ' + U.anno + '/' + (U.anno + 1) + ' così com\'è adesso?')) return;
      u.disabled = true;
      return P.srv('pubblica', 'pulizie', U.anno + '-09').then((x) => { U.pub = x; P.toast('Pubblicato in bacheca'); rd(); }).catch((err) => { u.disabled = false; P.toast(err.message, true); });
    }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'pulizie') return;
    const u = e.target.closest('[data-pu]');
    if (!u) return;
    const k = u.dataset.pu, l = u.dataset.l, c = u.dataset.c;
    if (k === 'f') return imposta(l, c, u.value.trim());
    if (k === 'txt') return imposta(l, c, u.value.trim() ? 'txt:' + u.value.trim() : '').then(() => { delete U.scrivi[l + c]; });
    if (k === 'p') { if (u.value === '@scrivi') { U.scrivi[l + c] = true; return rd(); } return imposta(l, c, u.value); }
  });
})();
