/* Turnazione reparti nel portale.
 * Dati dal server (reparti / salvaReparti), proposta calcolata qui con MotoreReparti (stesse regole dell'artefatto e di CM).
 * Schede: Turni · Assenze e parti · Pulizie · Foglio A4. Nessun nome sta in questo file: arrivano dal Foglio, solo a chi ha l'ambito. */
(function () {
  'use strict';
  /** Le immagini WhatsApp dei reparti (per Telegram): le prepara programmi.js in un riquadro nascosto. */
  function generaWA() {
    if (window.PC.generaWA) return window.PC.generaWA();
    window.PC.carica('programmi.js').then(() => window.PC.generaWA && window.PC.generaWA()).catch(() => {});
  }
  const P = window.PC, M = window.MotoreReparti, S = P.S, esc = P.esc;
  const G = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const GB = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const R = { mese: '', d: null, st: null, tab: 'turni', chi: '', coda: null, salvo: '', carico: false, pers: null, rev: null };
  S.rep = R;

  /* ── date ── */
  const zn = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const lungo = (s) => { const t = zn(s); return (G[t.dow] + ' ' + t.d + ' ' + MESI[t.m - 1]).toUpperCase(); };
  const corto = (s) => { const t = zn(s); return GB[t.dow] + ' ' + t.d; };
  const intervallo = (lun) => {
    const t = zn(lun), f = new Date(Date.UTC(t.y, t.m - 1, t.d + 6)), fm = f.getUTCMonth() + 1;
    return t.m === fm ? t.d + '–' + f.getUTCDate() + ' ' + MESI[t.m - 1] : t.d + ' ' + MESI[t.m - 1] + ' – ' + f.getUTCDate() + ' ' + MESI[fm - 1];
  };
  const meseDopo = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const nomeMese = (m) => MESI[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);

  /* ── persone ── */
  const persona = (id) => R.pers && R.pers.get(id);
  const sigla = (id) => (id ? (persona(id) || {}).sigla || '?' : '');
  const nomeIntero = (id) => { const p = persona(id); return p ? p.nome + ' ' + p.cognome : id; };
  const inTurno = () => {
    const ids = new Set(R.d.pInc.map((x) => x.persona_id));
    return R.d.persone.filter((p) => ids.has(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it'));
  };

  /* ── contesto per il motore ── */
  function ctx(turni) {
    const st = R.st, ad = R.d.adunanze.map((a) => Object.assign({}, a, { nessuna: !!st.nessuna[a.id] }));
    const per = new Map(ad.map((a) => [a.id, a]));
    const ind = [];
    Object.keys(R.d.sondaggio).forEach((k) => {
      if (st.togli[k]) return;
      const [p, a] = k.split('|'), x = per.get(a);
      if (x && !st.assenze[k]) ind.push({ persona_id: p, dal: x.data, al: x.data, tipo: null, fonte: 'sondaggio' });
    });
    Object.keys(st.assenze).forEach((k) => {
      const [p, a] = k.split('|'), x = per.get(a);
      if (x && st.assenze[k]) ind.push({ persona_id: p, dal: x.data, al: x.data, tipo: st.assenze[k] === 'T' ? M.ritardo : null });
    });
    (st.periodi || []).forEach((x) => ind.push({ persona_id: x.persona_id, dal: x.dal, al: x.al || x.dal, tipo: x.tipo === 'T' ? M.ritardo : null }));
    return { adunanze: ad, turni: turni || st.turni, indisponibilita: ind, disponibilita: [], parti: R.d.parti, classi: M.classi, eccezioni: M.eccezioni };
  }
  const adunanzeAttive = () => ctx().adunanze;

  /* ── caricamento e salvataggio ── */
  function carica(mese) {
    R.carico = true; R.d = null;
    P.srv('reparti', mese || '').then((d) => {
      R.d = d; R.mese = d.mese; R.st = d.stato; R.pub = null; R.pers = new Map(d.persone.map((p) => [p.id, p])); R.carico = false; R.rev = null;
      if (S.vista === 'reparti') P.disegna();
    }).catch((e) => { R.carico = false; P.toast(e.message, true); });
  }
  function cambiato() {
    R.rev = null; R.salvo = 'Da salvare'; pill();
    clearTimeout(R.coda);
    R.coda = setTimeout(salva, 1200);
  }
  function salva() {
    R.salvo = 'Salvo…'; pill();
    const mese = R.mese;
    P.srv('salvaReparti', mese, R.st).then((r) => { R.salvo = 'Salvato ' + r.quando; pill(); if (R.pub && R.pub.pubblicato && !R.pub.cambiato) { R.pub.cambiato = true; const y = window.scrollY; if (S.vista === 'reparti') { P.disegna(); window.scrollTo(0, y); } } })
      .catch((e) => { R.salvo = 'Non salvato'; pill(); P.toast(e.message, true); });
  }
  function pill() { const el = document.getElementById('rpSalvo'); if (el) { el.textContent = R.salvo; el.className = 'rp-salvo' + (/Non/.test(R.salvo) ? ' err' : /Salvato/.test(R.salvo) ? ' ok' : ''); } }
  window.addEventListener('beforeunload', (e) => { if (R.salvo === 'Da salvare' || R.salvo === 'Salvo…') { e.preventDefault(); e.returnValue = ''; } });

  /* ── stile della pagina (il foglio A4 usa stampa.css) ── */
  const css = document.createElement('style');
  css.textContent = `
  .rp-wk{border:1px solid var(--rule);border-radius:8px;margin:0 0 14px;overflow:hidden;background:#fff}
  .rp-wk h3{margin:0;padding:8px 12px;background:var(--neu);font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--slate);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .rp-wk h3 em{font-style:normal;font-weight:600;color:#2E6E7C;letter-spacing:.04em}
  .rp-ads{display:grid;grid-template-columns:1fr;gap:0}
  @media(min-width:860px){.rp-ads{grid-template-columns:1fr 1fr}}
  .rp-ad{padding:8px 12px 10px;border-top:1px solid #EFEDE8}
  @media(min-width:860px){.rp-ad+.rp-ad{border-left:1px solid #EFEDE8}}
  .rp-ad .band{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#fff;border-radius:5px;padding:5px 10px;margin-bottom:6px;font-weight:700;letter-spacing:.04em}
  .rp-ad.inf .band{background:#A8432B}.rp-ad.fs .band{background:#521F46}
  .rp-ad .band small{display:block;font-size:9.5px;letter-spacing:.14em;opacity:.9;font-weight:600}
  .rp-ad .band label{font-size:11px;font-weight:600;display:flex;gap:4px;align-items:center;cursor:pointer}
  .rp-ad .none{padding:18px;text-align:center;color:var(--slate);font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-size:12px}
  .rp-sl{display:grid;grid-template-columns:118px 1fr;gap:4px 8px;align-items:center;padding:3px 0}
  .rp-sl .k{font-size:12.5px;color:var(--slate)}
  .rp-sl select{width:100%;border:1px solid var(--rule);border-radius:6px;padding:6px 7px;background:#fff;font-weight:600}
  .rp-sl.bad select{border-color:#B3261E;background:#FCEDEC}
  .rp-sl small{grid-column:2;font-size:11px;color:var(--muted);margin-top:-2px}
  .rp-sl small.w{color:#B3261E;font-weight:600}
  .rp-grp{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--slate);margin:8px 0 2px;border-bottom:1px solid var(--rule);padding-bottom:2px}
  table.rp-t{border-collapse:separate;border-spacing:0;font-size:12.5px;min-width:100%}
  table.rp-t th,table.rp-t td{border-bottom:1px solid #EFEDE8;padding:5px 6px;text-align:center;white-space:nowrap}
  table.rp-t thead th{position:sticky;top:0;background:#fff;z-index:2;font-size:11px;letter-spacing:.04em}
  table.rp-t th.inf{color:#A8432B}table.rp-t th.fs{color:#521F46}
  table.rp-t td.nm,table.rp-t th.nm{position:sticky;left:0;background:#fff;text-align:left;z-index:1;font-weight:600}
  table.rp-t thead th.nm{z-index:3}
  table.rp-t td.c{cursor:pointer;min-width:44px;font-weight:700}
  table.rp-t td.c.S{background:#FCEDEC;color:#B3261E}table.rp-t td.c.A{background:#B3261E;color:#fff}table.rp-t td.c.T{background:#FBF1DC;color:#9A6A00}
  table.rp-t td.c.X{background:#EAF3DE;color:#27500A}table.rp-t td.c.P{color:#2E6E7C}
  .rp-mr{display:inline-block;background:#FCEDEC;color:#B3261E;border-radius:999px;padding:0 6px;font-size:10px;margin-left:4px;font-weight:700}
  .rp-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--slate);margin:6px 0 10px}
  .rp-leg span b{display:inline-block;min-width:22px;text-align:center;border-radius:4px;margin-right:4px;padding:0 4px}
  .rp-f{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
  .rp-f select,.rp-f input{border:1px solid var(--rule);border-radius:6px;padding:6px 8px;background:#fff}
  .rp-lst{display:grid;gap:6px;margin:6px 0 12px}
  .rp-lst .i{border:1px solid var(--rule);border-left:4px solid var(--c,#4D5A68);border-radius:5px;padding:7px 10px;background:#fff;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:13px}
  .rp-pul{display:grid;grid-template-columns:1fr;gap:10px}
  @media(min-width:760px){.rp-pul{grid-template-columns:1fr 1fr}}
  .rp-pul .w{border:1px solid var(--rule);border-radius:8px;padding:10px 12px;background:#fff;display:grid;gap:6px}
  .rp-pul .w h4{margin:0;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--slate)}
  .rp-pul label{display:grid;grid-template-columns:110px 1fr;gap:6px;align-items:center;font-size:12.5px;color:var(--slate)}
  .rp-pul select,.rp-pul input{border:1px solid var(--rule);border-radius:6px;padding:6px 8px;background:#fff;width:100%}`;
  document.head.appendChild(css);

  /* ── vista ── */
  P.viste.reparti = function () {
    const h0 = P.testata('Turnazione reparti', R.d ? esc(R.d.nomeMese) : '', 'home');
    if (!R.d) { if (!R.carico) carica(R.mese); return h0 + '<p class="nota">Carico i dati del mese (anagrafica, sondaggio, programmi)…</p>'; }
    let h = h0;
    const mesi = [-1, 0, 1, 2].map((n) => meseDopo(R.d.oggi.slice(0, 7), n));
    if (mesi.indexOf(R.mese) < 0) mesi.push(R.mese);
    h += '<div class="rp-bar"><select data-rp="mese">' + mesi.map((m) => '<option value="' + m + '"' + (m === R.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select>' +
      pubblicazione() + '<span class="rp-salvo" id="rpSalvo">' + esc(R.salvo) + '</span></div>';
    h += '<div class="rp-tabs">' + [['turni', 'Turni'], ['assenze', 'Assenze e parti'], ['pulizie', 'Pulizie'], ['foglio', 'Foglio A4']].map((t) =>
      '<button data-rp="tab" data-v="' + t[0] + '" class="' + (R.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
    if (R.tab === 'assenze') return h + vistaAssenze();
    if (R.tab === 'pulizie') return h + vistaPulizie();
    if (R.tab === 'foglio') return h + vistaFoglio();
    return h + vistaTurni();
  };

  /* ── scheda Turni ── */
  function posto(inc, pos) { return M.posti.find((x) => x.incarico.id === inc && x.posizione === pos); }
  function turno(sid, inc, pos, ad) { return R.st.turni.find((t) => t.settimana_id === sid && t.incarico_id === inc && t.posizione === pos && t.adunanza_id === ad); }
  function revisione() {
    if (R.rev) return R.rev;
    const c = ctx();
    const prob = M.problemi(c, R.d.settimane, M.posti, R.d.pInc, M.incarichi);
    const mappa = new Map(prob.map((y) => [[y.turno.settimana_id, y.turno.adunanza_id, y.turno.incarico_id, y.turno.posizione].join('|'), y.motivi]));
    const testi = M.revisione({ ctx: c, settimane: R.d.settimane, pInc: R.d.pInc, posti: M.postiProposta, incarichi: M.incarichi, nome: (id) => nomeIntero(id),
      etichetta: (inc) => { const p = M.posti.find((x) => x.incarico.id === inc); return p ? M.etichetta(p).replace(/ \d.*$/, '') : inc; },
      settimanaPrima: R.d.settimanaPrima, precedenti: R.d.storico.filter((t) => R.d.settimanaPrima && t.settimana_id === R.d.settimanaPrima.id) });
    const vuoti = [];
    c.adunanze.filter((a) => !a.nessuna).forEach((a) => M.postiProposta.forEach((p) => { if (!turno(a.settimana_id, p.incarico.id, p.posizione, a.id)) vuoti.push(corto(a.data) + ' · ' + M.etichetta(p)); }));
    return (R.rev = { mappa, testi, vuoti });
  }
  function conteggi() {
    const n = new Map();
    R.st.turni.forEach((t) => { if (t.adunanza_id) n.set(t.persona_id, (n.get(t.persona_id) || 0) + 1); });
    return n;
  }
  function vistaTurni() {
    const c = ctx(), rv = revisione(), n = conteggi();
    let h = '<p class="rp-aiuto"><b>Proponi</b> compone la turnazione con le regole di sempre: abilitazioni dell\'anagrafica, assenze (sondaggio e quelle che segni tu), chi ha una parte che impegna (letta dai programmi), un incarico da fermo + uno di audio/video, stesso coordinatore uscieri per la settimana, niente stesso posto due settimane di fila, equità con ottobre e novembre. Le pulizie le scegli tu nella scheda Pulizie e la proposta le rispetta.</p>';
    h += '<div class="rp-bar"><button class="btn" data-rp="proponi" data-v="tutto">Proponi tutto</button><button class="btn soft" data-rp="proponi" data-v="vuoti">Completa i posti vuoti</button>' +
      '<button class="btn soft" data-rp="proponi" data-v="altra">Un\'altra proposta</button><button class="btn soft" data-rp="svuota">Svuota</button></div>';
    if (R.d.partiErrore) h += '<p class="nota" style="color:#B3261E">' + esc(R.d.partiErrore) + ' Le parti non sono considerate.</p>';
    if (R.d.mancano.length) h += '<p class="nota">Non hanno ancora risposto al sondaggio <b>' + R.d.mancano.length + '</b> fratelli in turnazione: per loro valgono solo le assenze che segni tu. <a href="#" data-rp="tab" data-v="assenze">Vedi chi</a></p>';
    const tot = rv.testi.length + rv.mappa.size + (rv.vuoti.length ? 1 : 0);
    if (tot) {
      h += '<details class="rp-rev"' + (R.aperta ? ' open' : '') + '><summary>Da rivedere (' + tot + ')</summary><ul>' +
        [...rv.mappa.entries()].map(([k, m]) => { const [s, a, inc, pos] = k.split('|'); const ad = c.adunanze.find((x) => x.id === a); const t = turno(s, inc, Number(pos), a || null);
          return '<li><b>' + esc(t ? sigla(t.persona_id) : '') + '</b> · ' + (ad ? corto(ad.data) : 'settimana del ' + s.slice(8)) + ' · ' + esc(M.etichetta(posto(inc, Number(pos)) || { reparto: {}, incarico: { nome: inc, posti: 1 } })) + ': ' + esc(m.join(', ')) + '</li>'; }).join('') +
        rv.testi.map((t) => '<li>' + esc(t.testo.replace(/\.$/, '')) + (t.settimana_id ? ' <span style="color:var(--muted)">(' + intervallo(t.settimana_id) + ')</span>' : '') + '</li>').join('') +
        (rv.vuoti.length ? '<li>Posti vuoti (' + rv.vuoti.length + '): ' + esc(rv.vuoti.slice(0, 12).join(' · ')) + (rv.vuoti.length > 12 ? '…' : '') + '</li>' : '') + '</ul></details>';
    }
    R.d.settimane.forEach((w, i) => {
      const ads = c.adunanze.filter((a) => a.settimana_id === w.id).sort((a, b) => a.data.localeCompare(b.data));
      const ev = R.st.eventi[w.id];
      h += '<section class="rp-wk"><h3><b>' + (i + 1) + 'ª settimana</b><span>' + intervallo(w.lunedi) + '</span>' + (R.st.gruppi[w.id] ? '<em>Pulizie: gruppo ' + esc(R.st.gruppi[w.id]) + '</em>' : '') + (ev ? '<em style="color:#521F46">' + esc(ev.tipo) + '</em>' : '') + '</h3><div class="rp-ads">';
      ads.forEach((a) => {
        const cl = a.tipo === 'INFRA' ? 'inf' : 'fs';
        h += '<div class="rp-ad ' + cl + '"><div class="band"><div><small>' + (a.tipo === 'INFRA' ? 'Adunanza infrasettimanale' : 'Adunanza del fine settimana') + '</small>' + lungo(a.data) + (a.spostata ? ' · spostata' : '') + '</div>' +
          '<label><input type="checkbox" data-rp="nessuna" data-v="' + a.id + '"' + (a.nessuna ? ' checked' : '') + '> non si tiene</label></div>';
        if (a.nessuna) { h += '<div class="none">In questa data non si terrà l\'adunanza</div></div>'; return; }
        let gr = '';
        M.postiProposta.forEach((p) => {
          if (p.reparto.nome !== gr) { gr = p.reparto.nome; h += '<div class="rp-grp">' + esc(p.reparto.codice === 'AUDIO_VIDEO' ? 'Audio/Video' : p.reparto.nome) + '</div>'; }
          const t = turno(w.id, p.incarico.id, p.posizione, a.id);
          const cand = M.candidati(p, a.tipo, R.d.pInc, M.incarichi);
          const motivi = t ? rv.mappa.get([w.id, a.id, p.incarico.id, p.posizione].join('|')) : null;
          const ok = cand.filter((id) => !M.ostacoli(id, a, w, c, t, p.incarico.id).length);
          const opz = cand.map((id) => persona(id)).filter(Boolean).sort((x, y) => x.cognome.localeCompare(y.cognome, 'it')).map((pp) => {
            const ost = M.ostacoli(pp.id, a, w, c, t, p.incarico.id);
            const parte = R.d.parti.find((x) => x.adunanza_id === a.id && x.assegnata_id === pp.id);
            return '<option value="' + pp.id + '"' + (t && t.persona_id === pp.id ? ' selected' : '') + '>' + esc(pp.sigla) + (ost.length ? '  (' + esc(ost[0] === 'ha una parte' && parte ? 'parte: ' + parte.codice : ost[0]) + ')' : parte ? '  (parte: ' + esc(parte.codice) + ')' : '') + '</option>';
          }).join('');
          const altri = R.d.persone.filter((pp) => cand.indexOf(pp.id) < 0 && inTurnoSet().has(pp.id)).sort((x, y) => x.cognome.localeCompare(y.cognome, 'it'))
            .map((pp) => '<option value="' + pp.id + '"' + (t && t.persona_id === pp.id ? ' selected' : '') + '>' + esc(pp.sigla) + '</option>').join('');
          const info = t ? (motivi ? '<small class="w">⚠ ' + esc(motivi.join(', ')) + '</small>' : '<small>' + (n.get(t.persona_id) || 0) + ' turni nel mese · ' + ok.length + ' disponibili per questo posto</small>') : '<small>' + ok.length + ' disponibili</small>';
          h += '<div class="rp-sl' + (motivi ? ' bad' : '') + '"><span class="k">' + esc(M.etichetta(p)) + '</span><select data-rp="turno" data-s="' + w.id + '" data-a="' + a.id + '" data-i="' + p.incarico.id + '" data-p="' + p.posizione + '">' +
            '<option value="">—</option><optgroup label="Abilitati">' + opz + '</optgroup>' + (altri ? '<optgroup label="Non abilitati">' + altri + '</optgroup>' : '') + '</select>' + info + '</div>';
        });
        h += '</div>';
      });
      h += '</div></section>';
    });
    return h + equita();
  }
  let _inTurno = null;
  function inTurnoSet() { if (!_inTurno || _inTurno.d !== R.d) _inTurno = { d: R.d, s: new Set(R.d.pInc.map((x) => x.persona_id)) }; return _inTurno.s; }
  function equita() {
    const c = ctx(), n = conteggi();
    const stor = new Map(); R.d.storico.forEach((t) => { if (t.adunanza_id) stor.set(t.persona_id, (stor.get(t.persona_id) || 0) + 1); });
    const sw = new Set(R.d.storico.map((t) => t.settimana_id));
    const mesiStor = Math.max(1, sw.size / 4.3);
    const righe = inTurno().map((p) => {
      let poss = 0;
      R.d.settimane.forEach((w) => c.adunanze.filter((a) => a.settimana_id === w.id && !a.nessuna).forEach((a) => { if (!M.ostacoli(p.id, a, w, Object.assign({}, c, { turni: [] })).length) poss++; }));
      return { p, mese: n.get(p.id) || 0, poss, media: (stor.get(p.id) || 0) / mesiStor };
    });
    const totT = righe.reduce((a, r) => a + r.mese, 0), totP = righe.reduce((a, r) => a + r.poss, 0) || 1;
    return '<details class="rp-rev" style="background:#fff;border-color:var(--rule)"><summary style="color:var(--slate)">Equità del mese</summary><p class="rp-aiuto" style="margin:6px 0">«Atteso» è la parte di turni che tocca a ciascuno in proporzione alle adunanze in cui può esserci. In rosso chi ne ha almeno 2 in più, in blu chi ne ha almeno 2 in meno.</p><div class="rp-tw" style="max-height:none"><table class="rp-eq"><thead><tr><th>Fratello</th><th>Turni nel mese</th><th>Atteso</th><th>Può esserci</th><th>Media al mese prima</th></tr></thead><tbody>' +
      righe.map((r) => { const att = totT * r.poss / totP; const cl = r.mese >= att + 2 ? 'su' : r.mese <= att - 2 ? 'giu' : '';
        return '<tr><td>' + esc(r.p.sigla) + '</td><td class="' + cl + '">' + r.mese + '</td><td>' + att.toFixed(1) + '</td><td>' + r.poss + '</td><td>' + r.media.toFixed(1) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }
  function proponi(modo) {
    const tieni = modo === 'vuoti' ? R.st.turni.slice() : R.st.turni.filter((t) => !t.adunanza_id);
    const c = ctx(tieni);
    const prima = R.d.settimanaPrima;
    const z = M.proponi({ settimane: R.d.settimane, ctx: c, posti: M.postiProposta, pInc: R.d.pInc, incarichi: M.incarichi, storico: R.d.storico,
      seme: modo === 'altra' ? Math.floor(Math.random() * 1e6) : 7, precedenti: prima ? R.d.storico.filter((t) => t.settimana_id === prima.id) : [],
      settimanaPrima: prima || undefined, adunanzePrima: R.d.adunanzePrima, evita: modo === 'altra' ? R.st.turni.filter((t) => t.adunanza_id) : undefined,
      miscela: 0.5, recenti: R.d.storico });
    R.st.turni = tieni.concat(z);
    cambiato(); R.aperta = true; const y = window.scrollY; P.disegna(); window.scrollTo(0, y);
    P.toast(z.length ? 'Proposti ' + z.length + ' turni' : 'Nessun posto da riempire');
  }

  /* ── scheda Assenze e parti ── */
  function statoCella(pid, a) {
    const k = pid + '|' + a.id;
    if (R.st.assenze[k]) return R.st.assenze[k];
    const per = (R.st.periodi || []).find((x) => x.persona_id === pid && x.dal <= a.data && (x.al || x.dal) >= a.data);
    if (per) return per.tipo === 'T' ? 'T' : 'A';
    if (R.d.sondaggio[k]) return R.st.togli[k] ? 'X' : 'S';
    return '';
  }
  function vistaAssenze() {
    const ads = adunanzeAttive().filter((a) => !a.nessuna);
    const pers = inTurno(), manca = new Set(R.d.mancano);
    let h = '<p class="rp-aiuto">Le assenze del sondaggio arrivano da sole. Tocca una casella per segnare tu un\'assenza (A) o un ritardo (R, conta solo per gli incarichi durante l\'adunanza); tocca una casella del sondaggio per correggerla. Per chi sarà via qualche giorno usa «Assente dal… al…»: le adunanze di quel periodo si calcolano da sole.</p>';
    h += '<div class="rp-leg"><span><b style="background:#FCEDEC;color:#B3261E">S</b>dal sondaggio</span><span><b style="background:#B3261E;color:#fff">A</b>assente (segnato da te)</span><span><b style="background:#FBF1DC;color:#9A6A00">R</b>ritardo</span><span><b style="background:#EAF3DE;color:#27500A">✓</b>sondaggio corretto: c\'è</span><span><b style="color:#2E6E7C">P</b>ha una parte</span><span><b class="rp-mr" style="margin:0">?</b>non ha risposto</span></div>';
    h += '<div class="rp-f"><b>Assente dal</b><select data-rp="perP"><option value="">Fratello…</option>' + pers.map((p) => '<option value="' + p.id + '">' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</select>' +
      '<input type="date" data-rp="perDal"> al <input type="date" data-rp="perAl"><select data-rp="perT"><option value="A">assente</option><option value="T">in ritardo</option></select><button class="btn small" data-rp="perOk">Aggiungi</button></div>';
    if ((R.st.periodi || []).length) h += '<div class="rp-lst">' + R.st.periodi.map((x, i) => '<div class="i" style="--c:#B3261E"><b>' + esc(nomeIntero(x.persona_id)) + '</b> ' + (x.tipo === 'T' ? 'in ritardo' : 'assente') + ' dal ' + esc(x.dal.split('-').reverse().join('/')) + ' al ' + esc((x.al || x.dal).split('-').reverse().join('/')) +
      ' · ' + ads.filter((a) => a.data >= x.dal && a.data <= (x.al || x.dal)).length + ' adunanze <button class="btn small soft" data-rp="perRm" data-v="' + i + '">Togli</button></div>').join('') + '</div>';
    h += '<div class="rp-tw"><table class="rp-t"><thead><tr><th class="nm">Fratello</th>' + ads.map((a) => '<th class="' + (a.tipo === 'INFRA' ? 'inf' : 'fs') + '">' + corto(a.data) + '</th>').join('') + '</tr></thead><tbody>' +
      pers.map((p) => '<tr><td class="nm">' + esc(p.sigla) + (manca.has(p.id) ? '<span class="rp-mr" title="Non ha risposto al sondaggio">?</span>' : '') + '</td>' + ads.map((a) => {
        const s = statoCella(p.id, a), parte = R.d.parti.some((x) => x.adunanza_id === a.id && x.assegnata_id === p.id);
        return '<td class="c ' + (s || (parte ? 'P' : '')) + '" data-rp="cella" data-p="' + p.id + '" data-a="' + a.id + '">' + ({ S: 'S', A: 'A', T: 'R', X: '✓' }[s] || (parte ? 'P' : '')) + '</td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div>';
    // parti
    h += '<h3 class="t">Parti che impegnano durante l\'adunanza</h3><p class="rp-aiuto">Lette dal Foglio «Programmi adunanze»: presidente, discorso dei Tesori, Gemme, parti di Vita cristiana, conduttore e lettore dello studio biblico e della Torre di Guardia. Chi le ha non fa uscieri e audio/video in quell\'adunanza; letteratura, territori e pulizie sì.</p>';
    if (R.d.partiIgnote.length) {
      h += '<div class="rp-lst">' + R.d.partiIgnote.map((x, i) => '<div class="i" style="--c:#A86F00">Nel programma c\'è <b>«' + esc(x.nome) + '»</b> (' + esc(x.codice) + ', ' + corto(adunanzeAttive().find((a) => a.id === x.adunanza_id) ? adunanzeAttive().find((a) => a.id === x.adunanza_id).data : x.adunanza_id.slice(0, 10)) + ') ma non lo trovo in anagrafica.' +
        (S.dati.io.tutto ? ' È <select data-rp="aliasP" data-v="' + i + '"><option value="">scegli…</option>' + sospetti(x.nome).map((p) => '<option value="' + p.id + '">' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</select> <button class="btn small" data-rp="aliasOk" data-v="' + i + '">Collega</button>' : ' Chiedi a chi gestisce l\'anagrafica di aggiungerlo in «Altri modi di scrivere».') + '</div>').join('') + '</div>';
    }
    const perAd = {}; R.d.parti.forEach((x) => { (perAd[x.adunanza_id] = perAd[x.adunanza_id] || []).push(x); });
    h += '<div class="rp-lst">' + adunanzeAttive().filter((a) => perAd[a.id]).map((a) => '<div class="i" style="--c:' + (a.tipo === 'INFRA' ? '#A8432B' : '#521F46') + '"><b>' + corto(a.data) + '</b> ' + perAd[a.id].map((x) => esc(sigla(x.assegnata_id)) + ' <span style="color:var(--muted)">' + esc(x.codice) + '</span>').join(' · ') + '</div>').join('') + '</div>';
    if (!R.d.parti.length && !R.d.partiErrore) h += '<p class="nota">Nel programma di questo mese non ci sono ancora nomi.</p>';
    return h;
  }
  function sospetti(nome) {
    const t = nome.toLowerCase().split(/\s+/);
    const tutti = S.dati.fratelli ? S.dati.fratelli.map((f) => ({ id: f.id, nome: f.v[3] || '', cognome: f.v[4] || '' })) : R.d.persone;
    const prima = tutti.filter((p) => t.indexOf(String(p.cognome).toLowerCase()) >= 0);
    const resto = tutti.filter((p) => prima.indexOf(p) < 0).sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome, 'it'));
    return prima.concat(resto);
  }

  /* ── scheda Pulizie ── */
  function vistaPulizie() {
    {
      // Le pulizie si compilano nel Programma pulizie: qui si vedono soltanto
      const nm = (id) => (id ? esc(sigla(id)) : '<span style="color:var(--muted)">—</span>');
      let h = '<div class="rp-bar"><button class="btn" data-mod="pulizie" style="background:#A86F00;border-color:#A86F00">Apri il Programma pulizie</button></div>' +
        '<p class="rp-aiuto">Gruppo, coordinatore, referente e pulizia generale si scrivono nel <b>Programma pulizie</b> (anno teocratico): qui li vedi, e la proposta dei turni ne tiene conto.</p><div class="rp-pul">';
      R.d.settimane.forEach((w, i) => {
        const co = turno(w.id, 'PUL_COORD', 1, null), re = turno(w.id, 'PUL_REF', 1, null), gen = R.st.generali[w.id] || {};
        h += '<div class="w"><h4>' + (i + 1) + 'ª settimana · ' + intervallo(w.lunedi) + '</h4><div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:13px">' +
          '<span>Gruppo</span><b>' + esc(R.st.gruppi[w.id] || '—') + '</b><span>Coordinatore</span><b>' + nm(co && co.persona_id) + '</b><span>Referente</span><b>' + nm(re && re.persona_id) + '</b>' +
          (gen.attiva ? '<span style="color:#235C90">Pulizia generale</span><b style="color:#235C90">' + esc([gen.gruppo, gen.data ? corto(gen.data) : ''].filter(Boolean).join(' · ')) + '</b><span>Coord. / ref.</span><b>' + nm(gen.coord) + ' · ' + nm(gen.ref) + '</b>' : '') + '</div></div>';
      });
      return h + '</div>' + vistaEventi();
    }
  }
  function vistaEventi() {
    let h = '<h3 class="t">Settimane con un evento</h3><p class="rp-aiuto">Nel foglio la settimana dell\'evento (assemblea, congresso) ha il suo riquadro. Arrivano dal Calendario; qui puoi completare tema e orario.</p><div class="rp-pul">';
    R.d.settimane.filter((w) => R.st.eventi[w.id]).forEach((w) => {
      const ev = R.st.eventi[w.id];
      h += '<div class="w"><h4>' + intervallo(w.lunedi) + '</h4>' + ['tipo', 'tema', 'luogo', 'orario', 'nota'].map((f) => '<label>' + P.cap(f) + '<input data-rp="ev" data-s="' + w.id + '" data-v="' + f + '" value="' + esc(ev[f] || '') + '"></label>').join('') +
        '<button class="btn small soft" data-rp="evRm" data-s="' + w.id + '">Togli l\'evento</button></div>';
    });
    return h + '</div>';
  }

  /* ── scheda Foglio A4 (stessa grafica dell'artefatto) ── */
  function vistaFoglio() {
    const pers = R.d.persone.slice().sort((a, b) => a.cognome.localeCompare(b.cognome, 'it'));
    let h = '<div class="rp-bar"><select data-rp="chi"><option value="">Foglio generale</option>' + pers.filter((p) => R.st.turni.some((t) => t.persona_id === p.id) || Object.values(R.st.generali).some((g) => g.coord === p.id || g.ref === p.id)).map((p) => '<option value="' + p.id + '"' + (R.chi === p.id ? ' selected' : '') + '>Personale · ' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</select>' +
      '<button class="btn" data-rp="stampa">Stampa / Salva PDF</button></div><p class="rp-aiuto">Nella finestra di stampa scegli «Salva come PDF», formato A4, margini «Nessuno», con la grafica di sfondo attiva. La versione personale evidenzia i turni del fratello e ha il riquadro «I miei turni».</p>';
    return h + '<div class="rp-anteprima fa4"><div class="pgm-fit" id="rpFit"><div class="pgm-scale" id="rpScale">' + foglio(R.chi) + '</div></div></div>';
  }
  function foglio(chi) {
    const ads = adunanzeAttive();
    const mk = (id) => (id ? (id === chi ? '<mark>' + esc(sigla(id)) + '</mark>' : esc(sigla(id))) : '');
    const gen = Object.entries(R.st.generali).filter(([, g]) => g.attiva).sort((a, b) => String(a[1].data).localeCompare(String(b[1].data)));
    const mese = nomeMese(R.mese).toUpperCase();
    let h = '<article class="pgm pgm-print"><header class="pgm-head"><div class="left"><div class="cong">Napoli Pianura Trencia</div><div class="gold"></div><h1>Turnazione reparti</h1><div class="mese">' + mese + '</div>' +
      '<div class="orari"><div class="o inf"><span>Adunanza infrasettimanale</span><b>' + esc(R.d.orari.infra) + '</b></div><div class="o fs"><span>Adunanza del fine settimana</span><b>' + esc(R.d.orari.fs || 'Orario da definire') + '</b></div></div></div>';
    if (chi) h += lato(chi, gen, ads);
    else if (gen.length) h += '<aside class="promemoria" style="border-left:3px solid #2E75B5;background:#EAF2FA;border-radius:3px;padding:8px 12px;min-width:210px;align-self:start"><small style="display:block;font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#235C90">Promemoria</small><h2 style="margin:2px 0 6px;font-size:15px;color:#235C90;text-transform:uppercase">Pulizia generale</h2>' +
      gen.map(([, g]) => '<div class="pg" style="font-size:10px;line-height:1.5"><b style="display:block;font-size:11.5px">' + lungo(g.data) + '</b><div>Gruppo <b>' + esc(g.gruppo || '—') + '</b></div><div>Coordinatore <b>' + esc(sigla(g.coord) || '—') + '</b></div>' + (g.ref ? '<div>Referente <b>' + esc(sigla(g.ref)) + '</b></div>' : '') + '</div>').join('') + '</aside>';
    h += '</header>';
    R.d.settimane.forEach((w, i) => {
      h += '<section class="pgm-week"><h2><b>' + (i + 1) + 'ª settimana</b><i>|</i><span>' + intervallo(w.lunedi) + '</span></h2><div class="pgm-days">' + giorniSettimana(w, ads, mk) + '</div></section>';
    });
    const code = 'dspgm' + R.mese.slice(2, 4) + R.mese.slice(5, 7) + '-I';
    return h + '<footer class="pgm-foot"><span><b>Turnazione reparti</b><span>' + P.cap(nomeMese(R.mese)) + '</span></span><span class="code">' + code + '</span></footer></article>';
  }
  function giorniSettimana(w, ads, mk) {
    const e = ads.filter((a) => a.settimana_id === w.id).sort((a, b) => a.data.localeCompare(b.data));
    const ev = R.st.eventi[w.id];
    const vuota = (a) => '<div class="pgm-card ' + (a.tipo === 'INFRA' ? 'inf' : 'fs') + '"><div class="band"><div><small>' + (a.tipo === 'INFRA' ? 'Adunanza infrasettimanale' : 'Adunanza del fine settimana') + '</small><b>' + lungo(a.data) + '</b></div></div><div class="none">In questa data non si terrà l\'adunanza</div></div>';
    if (!ev) return e.map((a) => (a.nessuna ? vuota(a) : carta(w, a, mk))).join('');
    const vere = e.filter((a) => !a.nessuna), no = e.filter((a) => a.nessuna);
    const giorni = (no.length ? no : e).map((a) => lungo(a.data)).join(' · ');
    const righe = [['Luogo', ev.luogo], ['Orario', ev.orario]].filter((x) => x[1]);
    const evento = '<div class="pgm-card ev' + (vere.length ? '' : ' intera') + '"><div class="band"><div><small>' + esc(giorni) + '</small><b>' + esc(ev.tipo) + '</b></div></div><div class="ev-bd senza-foto"><div class="ev-info">' +
      (ev.tema ? '<div class="ev-tema">' + esc(ev.tema) + '</div>' : '') + righe.map((r) => '<div class="ev-r"><small>' + r[0] + '</small><span>' + esc(r[1]) + '</span></div>').join('') + (ev.nota ? '<div class="ev-nota">' + esc(ev.nota) + '</div>' : '') + '</div></div></div>';
    let out = '';
    e.filter((a) => !a.nessuna || a === no[0]).forEach((a) => { out += a.nessuna ? evento : carta(w, a, mk); });
    if (!no.length) out += evento;
    return out;
  }
  function carta(w, a, mk) {
    const t = (inc, pos, ad) => { const x = turno(w.id, inc, pos, ad); return x && x.persona_id; };
    const righe = (codici) => {
      const out = [];
      M.reparti.filter((r) => codici.indexOf(r.codice) >= 0).forEach((rep) => M.posti.filter((p) => p.reparto.id === rep.id && p.livello === 'ADUNANZA').forEach((p) => {
        const multi = p.incarico.posti > 1, prima = !multi || rep.codice === 'AUDIO_VIDEO' || p.posizione === 1;
        out.push('<tr>' + (prima ? '<td class="k"' + (multi && rep.codice !== 'AUDIO_VIDEO' ? ' rowspan="' + p.incarico.posti + '"' : '') + '>' + esc(M.etichetta(p)) + '</td>' : '') + '<td class="v">' + mk(t(p.incarico.id, p.posizione, a.id)) + '</td></tr>');
      }));
      return out;
    };
    const fill = (n) => Array.from({ length: Math.max(0, n) }, () => '<tr class="fill"><td class="k"></td><td class="v"></td></tr>').join('');
    const usc = righe(['USCIERI']), av = righe(['AUDIO_VIDEO']), g = R.st.gruppi[w.id];
    const pul = M.posti.filter((p) => p.livello === 'SETTIMANA').map((p) => '<tr><td class="k">' + (p.incarico.codice === 'REFERENTE' ? 'Referente' : 'Coordinatore') + '</td><td class="v">' + mk(t(p.incarico.id, p.posizione, null)) + '</td></tr>').join('');
    return '<div class="pgm-card ' + (a.tipo === 'INFRA' ? 'inf' : 'fs') + '"><div class="band"><div><small>' + (a.tipo === 'INFRA' ? 'Adunanza infrasettimanale' : 'Adunanza del fine settimana') + '</small><b>' + lungo(a.data) + '</b></div></div>' +
      '<div class="cols"><div><h3>Uscieri</h3><table><tbody>' + usc.join('') + fill(av.length - usc.length) + '</tbody></table><h3 class="lt">Letteratura e territori</h3><table><tbody>' + righe(['LETTERATURA', 'TERRITORI']).join('') + '</tbody></table></div>' +
      '<div><h3>Audio/Video</h3><table><tbody>' + av.join('') + fill(usc.length - av.length) + '</tbody></table><h3 class="pul"><span>Pulizie</span>' + (g ? '<em class="gtag">Gruppo ' + esc(g) + '</em>' : '') + '</h3><table><tbody>' + pul + '</tbody></table></div></div></div>';
  }
  function lato(chi, gen, ads) {
    const nomeInc = (inc) => { const x = M.incarichi.find((r) => r.id === inc), rep = M.reparti.find((r) => r.id === x.reparto_id); return rep.codice === 'LETTERATURA' || rep.codice === 'TERRITORI' ? rep.nome : x.nome.replace('Addetto ', ''); };
    let tot = 0;
    const wk = R.d.settimane.map((w, i) => {
      const v = [];
      ads.filter((a) => a.settimana_id === w.id && !a.nessuna).sort((a, b) => a.data.localeCompare(b.data)).forEach((a) => {
        const y = R.st.turni.filter((t) => t.adunanza_id === a.id && t.persona_id === chi).map((t) => nomeInc(t.incarico_id));
        if (y.length) { tot += y.length; v.push('<div class="ln"><b class="' + (a.tipo === 'INFRA' ? 'inf' : 'fs') + '">' + corto(a.data) + '</b><span>' + esc(y.join(', ')) + '</span></div>'); }
      });
      const pu = R.st.turni.filter((t) => t.settimana_id === w.id && !t.adunanza_id && t.persona_id === chi);
      if (pu.length) { tot += pu.length; v.push('<div class="ln"><b class="pu">PUL.</b><span>Pulizie – ' + pu.map((t) => (t.incarico_id === 'PUL_REF' ? 'referente' : 'coordinatore')).join(', ') + '</span></div>'); }
      const g = R.st.generali[w.id];
      if (g && g.attiva && (g.coord === chi || g.ref === chi)) { tot++; v.push('<div class="ln"><b class="pu">' + corto(g.data) + '</b><span>Pulizia generale – ' + (g.coord === chi ? 'coord.' : 'ref.') + '</span></div>'); }
      return '<div class="wk"><small>' + (i + 1) + 'ª settimana</small>' + (v.length ? v.join('') : '<div class="ln none">Nessun turno</div>') + '</div>';
    });
    const c3 = wk.length >= 5;
    return '<div class="side2">' + (gen.length ? '<div class="bx pgen"><span>Promemoria · pulizia generale</span>' + gen.map(([, g]) => '<div class="pgv"><div class="r1"><b class="dt">' + lungo(g.data) + '</b><span class="gr">Gruppo <b>' + esc(g.gruppo || '—') + '</b></span></div><div class="r2"><span>Coordinatore <b>' + esc(sigla(g.coord) || '—') + '</b></span><span>Referente <b>' + esc(sigla(g.ref) || '—') + '</b></span></div></div>').join('') + '</div>' : '') +
      '<div class="bx turni"><div class="th"><span>I miei turni' + (c3 ? '' : '<em> · ' + tot + ' ' + (tot === 1 ? 'incarico' : 'incarichi') + '</em>') + '</span><b class="nm">' + esc(nomeIntero(chi)) + '</b></div><div class="wks ' + (c3 ? 'c3' : '') + '">' + wk.join('') + '</div></div></div>';
  }
  function adatta() {
    const fit = document.getElementById('rpFit'), sc = document.getElementById('rpScale');
    if (!fit || !sc) return;
    const k = Math.min(1, fit.clientWidth / 794);
    sc.style.transform = 'scale(' + k + ')';
    fit.style.height = (sc.scrollHeight * k) + 'px';
  }
  new MutationObserver(() => { if (S.vista === 'reparti' && R.tab === 'foglio') requestAnimationFrame(adatta); }).observe(P.app, { childList: true });
  window.addEventListener('resize', () => { if (S.vista === 'reparti' && R.tab === 'foglio') adatta(); });

  /* Il foglio di un mese pubblicato (bacheca): stessi disegni, con i dati pubblicati. */
  P.fogli = P.fogli || {};
  P.fogli.reparti = function (dati, chi) {
    const prima = { d: R.d, st: R.st, pers: R.pers, mese: R.mese };
    R.d = Object.assign({ sondaggio: {}, parti: [], pInc: [], storico: [] }, dati);
    R.st = Object.assign({ togli: {}, assenze: {}, periodi: [], gruppi: {}, generali: {}, nessuna: {}, eventi: {} }, dati.stato);
    R.pers = new Map(dati.persone.map((p) => [p.id, p])); R.mese = dati.mese;
    try { return foglio(chi || ''); } finally { Object.assign(R, prima); }
  };
  function pubblicazione() {
    if (!R.pub) { R.pub = { carico: true }; P.srv('statoPubblicazione', 'reparti', R.mese).then((x) => { R.pub = x; rd(); }).catch(() => { R.pub = { pubblicato: false }; }); }
    const x = R.pub;
    if (x.carico) return '';
    return '<span class="rp-pub">' + (x.pubblicato ? (x.cambiato ? '<b style="color:#9A6A00">Modificata dopo la pubblicazione del ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7) + ' ' + x.quando.slice(11, 16)) + '</b>' : 'Pubblicata il ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7) + ' alle ' + x.quando.slice(11, 16))) : 'Non ancora in bacheca') +
      ' <button class="btn small" data-rp="pubblica">' + (x.pubblicato ? 'Pubblica di nuovo' : 'Pubblica in bacheca') + '</button></span>';
  }

  /* ridisegna senza perdere il punto della pagina */
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };

  /* ── eventi ── */
  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'reparti') return;
    const u = e.target.closest('[data-rp]');
    if (!u || u.tagName === 'SELECT' || (u.tagName === 'INPUT' && u.type !== 'checkbox')) return;
    const k = u.dataset.rp, v = u.dataset.v;
    if (k === 'tab') { e.preventDefault(); R.tab = v; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'proponi') {
      if (v === 'tutto' && R.st.turni.some((t) => t.adunanza_id) && !confirm('Rifaccio tutti i turni delle adunanze? Le pulizie restano.')) return;
      u.disabled = true; u.textContent = 'Calcolo…';
      return setTimeout(() => proponi(v), 30);
    }
    if (k === 'svuota') { if (!confirm('Tolgo tutti i turni delle adunanze? Le pulizie restano.')) return; R.st.turni = R.st.turni.filter((t) => !t.adunanza_id); cambiato(); return rd(); }
    if (k === 'nessuna') { R.st.nessuna[v] = u.checked; if (u.checked) R.st.turni = R.st.turni.filter((t) => t.adunanza_id !== v); cambiato(); return rd(); }
    if (k === 'cella') {
      const key = u.dataset.p + '|' + u.dataset.a, a = adunanzeAttive().find((x) => x.id === u.dataset.a), s = statoCella(u.dataset.p, a);
      const per = (R.st.periodi || []).find((x) => x.persona_id === u.dataset.p && x.dal <= a.data && (x.al || x.dal) >= a.data);
      if (per && !R.st.assenze[key]) return P.toast('Viene da «Assente dal… al…»: togli o cambia il periodo qui sopra', true);
      if (s === 'S') R.st.togli[key] = true;
      else if (s === 'X') delete R.st.togli[key];
      else if (s === '') R.st.assenze[key] = 'A';
      else if (s === 'A') R.st.assenze[key] = 'T';
      else delete R.st.assenze[key];
      cambiato(); return rd();
    }
    if (k === 'perOk') {
      const q = (n) => P.app.querySelector('[data-rp="' + n + '"]').value;
      const pid = q('perP'), dal = q('perDal'), al = q('perAl') || dal;
      if (!pid || !dal) return P.toast('Scegli il fratello e almeno la data di inizio', true);
      if (al < dal) return P.toast('La data di fine è prima di quella di inizio', true);
      R.st.periodi.push({ persona_id: pid, dal: dal, al: al, tipo: q('perT') });
      cambiato(); rd();
      return P.toast(adunanzeAttive().filter((a) => !a.nessuna && a.data >= dal && a.data <= al).length + ' adunanze segnate');
    }
    if (k === 'perRm') { R.st.periodi.splice(Number(v), 1); cambiato(); return rd(); }
    if (k === 'aliasOk') {
      const x = R.d.partiIgnote[Number(v)], sel = P.app.querySelector('[data-rp="aliasP"][data-v="' + v + '"]');
      if (!sel || !sel.value) return P.toast('Scegli prima il fratello', true);
      u.disabled = true;
      return P.srv('aggiungiAlias', sel.value, x.nome).then(() => { P.toast('Collegato: d\'ora in poi «' + x.nome + '» lo riconosco'); carica(R.mese); }).catch((err) => { u.disabled = false; P.toast(err.message, true); });
    }
    if (k === 'genOn') { const g = R.st.generali[u.dataset.s] || (R.st.generali[u.dataset.s] = {}); g.attiva = u.checked; cambiato(); return rd(); }
    if (k === 'evRm') { if (!confirm('Tolgo il riquadro dell\'evento da questa settimana?')) return; delete R.st.eventi[u.dataset.s]; R.st.eventiTolti = true; cambiato(); return rd(); }
    if (k === 'stampa') { adatta(); return window.print(); }
    if (k === 'pubblica') {
      if (!confirm('Pubblico in bacheca la turnazione di ' + nomeMese(R.mese) + ' così com\'è adesso? I fratelli la vedranno con i loro turni.')) return;
      u.disabled = true;
      const vai = () => P.srv('pubblica', 'reparti', R.mese).then((x) => { R.pub = x; P.toast('Pubblicata in bacheca'); rd(); generaWA(); }).catch((err) => { u.disabled = false; P.toast(err.message, true); });
      if (R.salvo === 'Da salvare' || R.salvo === 'Salvo…') { clearTimeout(R.coda); return P.srv('salvaReparti', R.mese, R.st).then(vai); }
      return vai();
    }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'reparti') return;
    const u = e.target.closest('[data-rp]');
    if (!u) return;
    const k = u.dataset.rp;
    if (k === 'mese') { if (R.salvo === 'Da salvare') { clearTimeout(R.coda); salva(); } R.mese = u.value; R.salvo = ''; return carica(u.value); }
    if (k === 'turno') {
      const s = u.dataset.s, a = u.dataset.a, inc = u.dataset.i, pos = Number(u.dataset.p);
      R.st.turni = R.st.turni.filter((t) => !(t.settimana_id === s && t.adunanza_id === a && t.incarico_id === inc && t.posizione === pos));
      if (u.value) R.st.turni.push({ settimana_id: s, adunanza_id: a, incarico_id: inc, posizione: pos, persona_id: u.value });
      cambiato(); return rd();
    }
    if (k === 'gruppo') { R.st.gruppi[u.dataset.s] = u.value; cambiato(); return rd(); }
    if (k === 'pul') {
      const [s, inc] = u.dataset.s.split('|');
      R.st.turni = R.st.turni.filter((t) => !(t.settimana_id === s && !t.adunanza_id && t.incarico_id === inc));
      if (u.value) R.st.turni.push({ settimana_id: s, adunanza_id: null, incarico_id: inc, posizione: 1, persona_id: u.value });
      cambiato(); return rd();
    }
    if (k === 'gen') { const g = R.st.generali[u.dataset.s] || (R.st.generali[u.dataset.s] = { attiva: true }); g[u.dataset.v] = u.value; cambiato(); return; }
    if (k === 'ev') { R.st.eventi[u.dataset.s][u.dataset.v] = u.value; cambiato(); return; }
    if (k === 'chi') { R.chi = u.value; return rd(); }
  });
})();
