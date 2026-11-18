/* Foglio A4 delle comitive: lo stesso di Congregation Manager (src/components/programmi/Foglio.tsx, CartaComitive),
 * stesso markup e stesse classi, con il CSS di CM (foglio-comitive.css, tutto sotto .cm4).
 * Versioni: generale (chi = ''), tabella informazioni (chi = '@sala', senza i conduttori della domenica), personale (chi = id).
 * Impaginazione «schede» o «tabella», margini, caratteri per zona e per riquadro, orario/luogo per comitiva, piè di pagina. */
(function () {
  'use strict';
  const P = window.PC, esc = P.esc;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const MESI3 = MESI.map((m) => m.slice(0, 3));
  const GIORNI = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const GG = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const SALA = '@sala';
  const MARGINI = { standard: { label: 'Standard', pad: '28px 42px 18px' }, stretti: { label: 'Stretti', pad: '18px 24px 12px' }, ampi: { label: 'Ampi', pad: '48px 64px 32px' } };
  const ZONE = [['globale', 'Tutto il foglio'], ['testata', 'Testata e orari'], ['giorni', 'Giorni e settimane'], ['nomi', 'Nomi dei conduttori'], ['orario', 'Orario e luogo'], ['note', 'Note e piè di pagina']];
  const PARTI_PIEDE = [['titolo', 'A sinistra', 'Programma per le adunanze di servizio'], ['sotto', 'Accanto (mese)', '{mese}'], ['centro', 'Al centro', 'Sorv. del servizio {sorvegliante} · Assistenti {assistenti}'], ['codice', 'A destra (codice)', 'codice del foglio']];
  const MIN_SCALA = 0.7, MAX_SCALA = 1.5;

  const day = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const giornoSigla = (iso) => GG[day(iso).dow] || '';
  const ora = (t) => (t ? String(t).slice(0, 5) : '');
  const titolo = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace(/ (Del|Della|Dei|Degli|Delle|Di|Da|E|Al|Alla|In) /g, (m) => m.toLowerCase());
  const settimanaLabel = (lunedi) => {
    const a = day(lunedi), f = new Date(Date.UTC(a.y, a.m - 1, a.d + 6)), b = { d: f.getUTCDate(), m: f.getUTCMonth() + 1 };
    return a.m === b.m ? a.d + '–' + b.d + ' ' + MESI[a.m - 1] : a.d + ' ' + MESI[a.m - 1] + ' – ' + b.d + ' ' + MESI[b.m - 1];
  };
  const codice = (mese, tipo) => 'dspgm' + mese.slice(2, 4) + mese.slice(5, 7) + '-' + tipo;
  const clamp = (n) => Math.min(MAX_SCALA, Math.max(MIN_SCALA, Number.isFinite(n) ? n : 1));

  /* ── layout (lib/layout-comitive.ts) ── */
  function leggiLayout(imp) {
    const l = imp && imp.layout;
    if (!l || typeof l !== 'object') return {};
    return { caratteri: l.caratteri || {}, meta: l.meta || {}, testo: l.testo || {}, riquadri: l.riquadri || {}, predefinito: l.predefinito };
  }
  const scala = (l, z) => Math.round(clamp((l.caratteri || {}).globale || 1) * clamp((l.caratteri || {})[z] || 1) * 1000) / 1000;
  const stileScale = (l) => ['testata', 'giorni', 'nomi', 'orario', 'note'].map((z) => '--z-' + z + ':' + scala(l, z)).join(';');
  function stileRiquadro(l, chiave) {
    const k = chiave ? (l.riquadri || {})[chiave] : undefined;
    if (!k || k === 1) return '';
    const r = clamp(k);
    return ' style="' + ['testata', 'giorni', 'nomi', 'orario', 'note'].map((z) => '--z-' + z + ':' + Math.round(scala(l, z) * r * 1000) / 1000).join(';') + '"';
  }
  function rigaMeta(l, id, o) {
    const modo = (l.meta || {})[id] || 'auto';
    const parti = (a, b) => [a ? (o.ora && 'ore ' + o.ora) : '', b ? o.luogo : ''].filter(Boolean).join(' · ') || null;
    switch (modo) {
      case 'nascondi': return null;
      case 'testo': return (((l.testo || {})[id]) || '').trim() || null;
      case 'ora': return parti(true, false);
      case 'luogo': return parti(false, true);
      case 'ora_luogo': return parti(true, true);
      default: { if (o.standard) return null; const p = l.predefinito || 'ora_luogo'; return parti(p !== 'luogo', p !== 'ora'); }
    }
  }
  /** Le comitive di una settimana sotto le colonne della testata (stesso giorno, ora e luogo; poi stesso giorno). */
  function disponiSettimana(uscite, colonne) {
    const celle = colonne.map(() => []), extra = [], libere = [];
    const ord = uscite.slice().sort((a, b) => (a.data + (a.ora || '')).localeCompare(b.data + (b.ora || '')));
    ord.forEach((u) => {
      const i = colonne.findIndex((o) => day(u.data).dow === o.giorno % 7 && ora(u.ora) === ora(o.ora) && u.luogo_id === o.luogo);
      if (i >= 0 && celle[i].length === 0) celle[i].push(u); else libere.push(u);
    });
    libere.forEach((u) => {
      const stesso = colonne.map((o, i) => [o, i]).filter(([o]) => day(u.data).dow === o.giorno % 7);
      if (!stesso.length) { extra.push(u); return; }
      const vuota = stesso.find(([, i]) => celle[i].length === 0), i = vuota ? vuota[1] : stesso[0][1];
      celle[i].push(u); celle[i].sort((a, b) => (a.ora || '').localeCompare(b.ora || ''));
    });
    return { celle, extra };
  }
  /* ── domeniche (lib/domeniche.ts) ── */
  function formazioni(slots, tutti) {
    const pos = (g) => { const i = tutti.indexOf(g); return i < 0 ? 999 : i; };
    const per = new Map();
    slots.forEach((s) => {
      const g = s.gruppi.slice().sort((a, b) => pos(a) - pos(b));
      const k = g.join(',') + '|' + s.ora + '|' + (s.luogo || '');
      if (!per.has(k)) per.set(k, { chiave: k, gruppi: g, ora: s.ora, luogo: s.luogo, righe: [] });
      per.get(k).righe.push({ data: s.data, conduttore: s.conduttore || '', esterno: s.esterno || '', visita: !!s.visita });
    });
    per.forEach((f) => f.righe.sort((a, b) => a.data.localeCompare(b.data)));
    return [...per.values()].sort((a, b) => b.gruppi.length - a.gruppi.length || pos(a.gruppi[0]) - pos(b.gruppi[0]) || a.ora.localeCompare(b.ora));
  }
  const titoloFormazione = (gruppi, tutti) => (tutti.length > 1 && gruppi.length === tutti.length ? 'Tutti i gruppi' : gruppi.join(' - '));
  const etichettaGruppi = (ids, tutti) => {
    if (tutti.length > 1 && ids.length === tutti.length && tutti.every((g) => ids.indexOf(g) >= 0)) return 'Tutti i gruppi';
    return ids.length === 1 ? 'Gruppo ' + ids[0] : 'Gruppi ' + ids.slice(0, -1).join(', ') + ' e ' + ids[ids.length - 1];
  };
  function coppiaDellaDomenica(gruppi, n) {
    if (gruppi.length <= 2) return gruppi.slice();
    const c = []; for (let i = 0; i < gruppi.length; i += 2) c.push(gruppi.slice(i, i + 2));
    return c[n % c.length];
  }
  /* ── piè di pagina (lib/piede-comitive.ts) ── */
  const visibile = (p, k) => !(p.nascosti || []).includes(k);
  const testoPiede = (p, k, d) => { const t = p[k]; if (!t) return null; return t.replace(/\{mese\}/g, d.mese).replace(/\{sorvegliante\}/g, d.sorvegliante || '').replace(/\{assistenti\}/g, d.assistenti || '').replace(/\s{2,}/g, ' ').trim(); };

  /** Dai dati del portale alla forma del foglio di CM. */
  function modello(D) {
    const st = D.stato || {}, F = D.foglio || {};
    const nasc = st.nascoste || {}, ass = st.assegnati || {};
    const persone = new Map();
    (F.fratelli || []).forEach((p) => persone.set(p.id, { nome: p.nome, cognome: p.cognome }));
    (D.conduttori || []).forEach((p) => persone.set(p.id, { nome: p.nome, cognome: p.cognome }));
    const uscite = [];
    D.settimane.forEach((w) => (w.comitive || []).forEach((c) => {
      if (nasc[c.k]) return;
      uscite.push({ id: c.k, settimana_id: w.lunedi, data: c.data, ora: c.ora, luogo_id: c.luogo, conduttore_id: ass[c.k] || null, annullata: !!c.annullata, nota: c.motivo || '', notaPortale: (st.note || {})[c.k] || '' });
    }));
    const settimane = D.settimane.map((w) => ({ id: w.lunedi, lunedi: w.lunedi, nota: w.speciale ? w.speciale.nome : '' }));
    const slots = (F.domeniche || []).filter((r) => !r.nascosta && (r.gruppi || []).length).map((r) => ({ chiave: r.id, data: r.data, ora: ora(r.ora), luogo: r.luogo, conduttore: r.conduttore, esterno: r.esterno, gruppi: r.gruppi, visita: false }));
    return { st, imp: st.impostazioni || {}, persone, uscite, settimane, colonne: (F.colonne || []).slice().sort((a, b) => a.giorno - b.giorno || ora(a.ora).padStart(5, '0').localeCompare(ora(b.ora).padStart(5, '0'))),
      gruppi: F.gruppi || [], slots, piede: F.piede || {}, cong: F.cong || 'Napoli Pianura Trencia', mese: D.mese };
  }
  /** I fratelli che conducono almeno una comitiva del mese (per le versioni personali). */
  function conduttoriComitive(D) {
    const M = modello(D), ids = new Set();
    M.uscite.forEach((u) => { if (u.conduttore_id && !u.annullata) ids.add(u.conduttore_id); });
    M.slots.forEach((s) => { if (s.conduttore) ids.add(s.conduttore); });
    return [...ids].map((id) => Object.assign({ id }, M.persone.get(id) || { nome: '', cognome: id })).sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome, 'it'));
  }

  /** Il foglio A4: identico a CartaComitive di CM. */
  function carta(D, chi, variante, margini) {
    const M = modello(D), sala = chi === SALA, io = sala ? '' : chi || '';
    const imp = M.imp, piede = M.piede;
    const nomeM = MESI[+M.mese.slice(5, 7) - 1];
    const datiPiede = { mese: titolo(nomeM) + ' ' + M.mese.slice(0, 4), sorvegliante: imp.sorvegliante, assistenti: imp.assistenti };
    const colonne = M.colonne, gruppiIds = M.gruppi;
    const forme = formazioni(M.slots, gruppiIds);
    const domVisita = M.uscite.filter((u) => day(u.data).dow === 0 && !u.annullata);
    const nW = M.settimane.length;
    const nomeDiviso = (id, esterno) => {
      if (id) { const q = M.persone.get(id); if (q) return [q.nome, q.cognome]; }
      const v = String(esterno || '').trim().split(/\s+/).filter(Boolean);
      return v.length > 1 ? [v[0], v.slice(1).join(' ')] : ['', v[0] || ''];
    };
    const nomeIntero = (fn, ln) => (fn ? '<span class="fn">' + esc(fn) + '</span> ' : '') + '<b class="ln">' + esc(ln) + '</b>';
    const mie = io ? M.uscite.filter((u) => u.conduttore_id === io && !u.annullata).map((u) => ({ id: u.id, data: u.data, ora: ora(u.ora), luogo: u.luogo_id }))
      .concat(M.slots.filter((s) => s.conduttore === io).map((s) => ({ id: s.chiave, data: s.data, ora: s.ora, luogo: s.luogo, gruppi: titoloFormazione(s.gruppi, gruppiIds) })))
      .sort((a, b) => (a.data + ora(a.ora).padStart(5, '0')).localeCompare(b.data + ora(b.ora).padStart(5, '0'))) : [];
    const [cf, cl] = nomeDiviso(io);
    const slotStd = (u) => colonne.some((o) => day(u.data).dow === o.giorno % 7 && ora(u.ora) === ora(o.ora) && u.luogo_id === o.luogo);
    const layout = leggiLayout(imp);
    const meta = (u) => rigaMeta(layout, u.id, { ora: ora(u.ora), luogo: titolo(u.luogo_id), standard: slotStd(u) }) || (u.notaPortale && !(layout.meta || {})[u.id] ? u.notaPortale : null);
    const tag = (s) => (s.nota ? '<span class="wslot al-sx"><em class="wtag t-min">' + esc(s.nota) + '</em></span>' : '');
    const nc = Math.max(1, colonne.length);
    let h = '<article class="pgm com a4 lay pgm-print v-' + variante + (sala ? ' sala' : '') + (nW >= 5 ? ' w5' : '') + (nW <= 4 && !io ? ' roomy' : '') + '" style="padding:' + (MARGINI[margini] || MARGINI.standard).pad + ';' + stileScale(layout) + '">';
    h += '<header class="pgm-head"><div class="htop ' + (io ? '' : 'solo') + '" style="--nc:' + Math.max(4, colonne.length) + '"><div class="left">' +
      '<div class="cong">' + esc(M.cong) + '</div><div class="gold"></div><div class="kick">Programma per le</div><h1>Adunanze di servizio</h1><div class="mese">' + nomeM.toUpperCase() + ' ' + M.mese.slice(0, 4) + '</div></div>';
    if (io) {
      h += '<aside class="mioh"><div class="mh"><small>Quando sono in programma</small><span>' + mie.length + ' ' + (mie.length === 1 ? 'comitiva' : 'comitive') + '</span></div>' +
        '<div class="mn"><span class="fn">' + esc(cf) + '</span> <span class="ln">' + esc(cl) + '</span></div><div class="ml ' + (mie.length > 3 ? 'two' : '') + '">' +
        (mie.length ? mie.map((u) => { const d = day(u.data);
          return '<div class="mr ' + (d.dow === 0 ? 'dom' : '') + '"><div class="dq"><small>' + giornoSigla(u.data) + '</small><b>' + d.d + '</b></div><div><b>' + titolo(GIORNI[d.dow === 0 ? 7 : d.dow]) + ' ' + d.d + ' ' + MESI[d.m - 1] + '</b><span>ore ' + esc(u.ora) + (u.luogo ? ' · ' + esc(titolo(u.luogo)) : '') + (u.gruppi ? ' · ' + esc(u.gruppi) : '') + '</span></div></div>';
        }).join('') : '<div class="mr none">Questo mese non sei in programma.</div>') + '</div></aside>';
    }
    h += '</div><div class="orari c4" style="grid-template-columns:repeat(' + nc + ',1fr)">' + colonne.map((o) => '<div class="o n"><span>' + GIORNI[o.giorno] + '</span><b>' + esc(ora(o.ora)) + '</b><i>' + esc(titolo(o.luogo)) + '</i></div>').join('') + '</div></header><div class="body">';
    if (variante === 'tabella') {
      h += '<table class="ctab"><colgroup><col class="cw">' + colonne.map(() => '<col>').join('') + '</colgroup><thead><tr><th></th>' + colonne.map((o) => '<th><b>' + GIORNI[o.giorno] + '</b></th>').join('') + '</tr></thead><tbody>';
      M.settimane.forEach((s, w) => {
        const us = M.uscite.filter((u) => u.settimana_id === s.id);
        if (s.nota) h += '<tr class="nt"><td></td><td colspan="' + colonne.length + '">' + tag(s) + '</td></tr>';
        h += '<tr><th class="wk"><b>' + (w + 1) + 'ª settimana</b><span>' + settimanaLabel(s.lunedi) + '</span></th>' + colonne.map((o) => {
          const u = us.find((q) => day(q.data).dow === o.giorno % 7 && ora(q.ora) === ora(o.ora) && q.luogo_id === o.luogo) || us.find((q) => day(q.data).dow === o.giorno % 7);
          if (!u) return '<td><span class="none">—</span></td>';
          const [fn, ln] = nomeDiviso(u.conduttore_id), me = !!io && u.conduttore_id === io;
          return '<td><div class="cc ' + (me ? 'me' : '') + ' ' + (u.annullata ? 'off' : '') + '"' + stileRiquadro(layout, u.id) + '><div class="dq"><small>' + giornoSigla(u.data) + '</small><b>' + day(u.data).d + '</b></div><div class="who">' +
            (u.annullata ? '<span class="none">' + esc(u.nota || 'Nessuna adunanza') + '</span>' : '<span class="fn">' + esc(fn) + '</span><span class="ln ' + (ln.length >= 10 ? 'long' : '') + '">' + esc(ln) + '</span>') + '</div></div></td>';
        }).join('') + '</tr>';
      });
      h += '</tbody></table>';
    } else {
      M.settimane.forEach((s, w) => {
        const us = M.uscite.filter((u) => u.settimana_id === s.id && day(u.data).dow !== 0);
        const { celle, extra } = disponiSettimana(us, colonne);
        const card = (gruppo) => {
          if (!gruppo.length) return '<div class="sc vuota" aria-hidden="true"></div>';
          const d = day(gruppo[0].data), multi = gruppo.length > 1, tuttiOff = gruppo.every((u) => u.annullata);
          const meMulti = gruppo.some((u) => !!io && u.conduttore_id === io && !u.annullata);
          return '<div class="sc ' + (multi ? 'multi cp' : '') + ' ' + (!multi && meMulti ? 'me' : '') + ' ' + (tuttiOff ? 'off' : '') + '"' + stileRiquadro(layout, gruppo[0].id) + '><div class="bd">' +
            '<div class="dq"><small>' + giornoSigla(gruppo[0].data) + '</small><b>' + d.d + '</b><small>' + MESI3[d.m - 1] + '</small></div><div class="' + (multi ? 'whos' : 'who') + '">' +
            gruppo.map((u) => {
              const [fn, ln] = nomeDiviso(u.conduttore_id), m = meta(u), me = !!io && u.conduttore_id === io && !u.annullata;
              const corpo = u.annullata ? '<span class="none">' + esc(u.nota || 'Nessuna adunanza') + '</span>' : '<span class="nm"><span class="fn">' + esc(fn) + '</span> <span class="ln">' + esc(ln) + '</span></span>';
              return multi ? '<div class="ent ' + (me ? 'me' : '') + '">' + (m ? '<span class="mt">' + esc(m) + '</span>' : '') + corpo + '</div>' : '<div class="one">' + (m ? '<span class="mt">' + esc(m) + '</span>' : '') + corpo + '</div>';
            }).join('') + '</div></div></div>';
        };
        h += '<section class="mwk"><h2><b>' + (w + 1) + 'ª settimana</b><i>|</i><span>' + settimanaLabel(s.lunedi) + '</span>' + tag(s) + '</h2>' +
          '<div class="mrow" style="grid-template-columns:repeat(' + nc + ',minmax(0,1fr))">' + celle.map((g) => card(g)).join('') + '</div>';
        if (extra.length) h += '<div class="mrow xtra" style="grid-template-columns:repeat(' + nc + ',minmax(0,1fr))">' + [...new Set(extra.map((u) => u.data))].map((dt) => card(extra.filter((u) => u.data === dt))).join('') + '</div>';
        h += '</section>';
      });
    }
    const visH = domVisita.map((u) => { const [fn, ln] = nomeDiviso(u.conduttore_id), d = day(u.data);
      return '<span class="dvis ' + (io && u.conduttore_id === io ? 'me' : '') + '"><span class="d"><small>DOM</small><b>' + d.d + '</b><small>' + MESI3[d.m - 1] + '</small></span><span class="t">ore ' + esc(ora(u.ora)) + (u.luogo_id ? ' · ' + esc(titolo(u.luogo_id)) : '') + '</span>' + (u.conduttore_id ? '<span class="n">' + nomeIntero(fn, ln) + '</span>' : '') + '</span>'; }).join('');
    if (forme.length) {
      h += '<section class="mwk dom"><h2><b>Domenica</b><i>|</i><span>Comitive dei gruppi di servizio</span>' + visH + '</h2><div class="dform-row" style="grid-template-columns:repeat(' + Math.min(forme.length, 4) + ',minmax(0,1fr))">' +
        forme.map((f) => '<div class="dform"' + stileRiquadro(layout, f.chiave) + '><div class="hd"><b>' + esc(titoloFormazione(f.gruppi, gruppiIds)) + '</b><span>ore ' + esc(f.ora) + '</span>' + (f.luogo ? '<em>' + esc(titolo(f.luogo)) + '</em>' : '') + '</div><div class="rr">' +
          f.righe.map((r) => {
            const id = sala && !r.visita ? null : r.conduttore, est = sala && !r.visita ? '' : r.esterno;
            const [fn, ln] = nomeDiviso(id, est), d = day(r.data);
            return '<div class="r ' + (r.visita ? 'vis' : '') + ' ' + (io && r.conduttore === io ? 'me' : '') + '"><span class="d"><small>DOM</small><b>' + d.d + '</b><small>' + MESI3[d.m - 1] + '</small></span><span class="n">' + (id || est ? nomeIntero(fn, ln) : sala ? '' : '—') + '</span></div>';
          }).join('') + '</div></div>').join('') + '</div></section>';
    } else if (domVisita.length) {
      h += '<section class="mwk dom"><h2><b>Domenica</b><i>|</i><span>Gruppi di servizio · ' + esc((imp.domeniche || 'tutte le domeniche').toLowerCase()) + '</span>' + visH + '</h2></section>';
    }
    h += '</div><footer class="pgm-foot cfoot"><span>' +
      (visibile(piede, 'titolo') ? '<b>' + esc(testoPiede(piede, 'titolo', datiPiede) || 'Programma per le adunanze di servizio') + '</b>' : '') +
      (visibile(piede, 'sotto') ? '<span>' + esc(testoPiede(piede, 'sotto', datiPiede) || datiPiede.mese) + '</span>' : '') + '</span><span class="sv">' +
      (!visibile(piede, 'centro') ? '' : testoPiede(piede, 'centro', datiPiede) != null ? esc(testoPiede(piede, 'centro', datiPiede)) :
        (imp.sorvegliante ? 'Sorv. del servizio <b>' + esc(imp.sorvegliante) + '</b>' : '') + (imp.assistenti ? '<i>·</i>Assistenti <b>' + esc(imp.assistenti) + '</b>' : '')) + '</span>' +
      (visibile(piede, 'codice') ? '<span class="code">' + esc(testoPiede(piede, 'codice', datiPiede) || codice(M.mese, 'C')) + '</span>' : '') + '</footer></article>';
    return h;
  }

  /** Rimpicciolisce i nomi che non entrano nel loro riquadro (fino al 70%), come useAdattaNomi di CM. */
  function adattaNomi(root) {
    if (!root) return;
    const fai = () => {
      root.querySelectorAll('.sc.multi .mt').forEach((el) => {
        el.style.fontSize = '';
        const base = parseFloat(getComputedStyle(el).fontSize);
        for (let k = 0.96; k >= 0.72 && el.scrollWidth > el.clientWidth + 0.5; k -= 0.04) el.style.fontSize = base * k + 'px';
      });
      root.querySelectorAll('.sc .nm, .dform .r .n').forEach((el) => {
        el.style.fontSize = '';
        const parti = [...el.querySelectorAll('.fn,.ln')];
        parti.forEach((t) => { t.style.fontSize = ''; });
        const base = parti.map((t) => parseFloat(getComputedStyle(t).fontSize));
        const sfora = () => parti.some((t) => t.scrollWidth > t.clientWidth + 0.5) || el.scrollWidth > el.clientWidth + 0.5;
        for (let k = 0.96; k >= 0.7 && sfora(); k -= 0.04) parti.forEach((t, i) => { t.style.fontSize = base[i] * k + 'px'; });
      });
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fai);
    setTimeout(fai, 300);
  }
  /** I riquadri del foglio (per le regolazioni «per riquadro»): una scheda per colonna di ogni settimana, una per formazione della domenica. */
  function riquadri(D) {
    const M = modello(D), out = [];
    M.settimane.forEach((s, w) => {
      const us = M.uscite.filter((u) => u.settimana_id === s.id && day(u.data).dow !== 0);
      const { celle, extra } = disponiSettimana(us, M.colonne);
      const carte = celle.filter((g) => g.length).concat([...new Set(extra.map((u) => u.data))].map((d) => extra.filter((u) => u.data === d)));
      if (carte.length) out.push({ titolo: (w + 1) + 'ª settimana', voci: carte.map((g) => ({ chiave: g[0].id, label: giornoSigla(g[0].data) + ' ' + day(g[0].data).d + (g.length > 1 ? ' · ' + g.length + ' comitive' : ' · ' + ora(g[0].ora)) })) });
    });
    const forme = formazioni(M.slots, M.gruppi);
    if (forme.length) out.push({ titolo: 'Domenica', voci: forme.map((f) => ({ chiave: f.chiave, label: titoloFormazione(f.gruppi, M.gruppi) + ' · ore ' + f.ora })) });
    return out;
  }
  const standard = (D, u) => modello(D).colonne.some((o) => day(u.data).dow === o.giorno % 7 && ora(u.ora) === ora(o.ora) && u.luogo === o.luogo);

  // Ogni foglio comitive che compare nella pagina: nomi adattati ai riquadri, come in CM.
  new MutationObserver(() => {
    P.app.querySelectorAll('.cm4 .pgm.com:not([data-adattato])').forEach((el) => { el.setAttribute('data-adattato', '1'); adattaNomi(el); });
  }).observe(P.app, { childList: true, subtree: true });

  P.fogliCM = { carta, adattaNomi, conduttoriComitive, riquadri, standard, leggiLayout, formazioni, titoloFormazione, etichettaGruppi, coppiaDellaDomenica,
    SALA, MARGINI, ZONE, PARTI_PIEDE, MIN_SCALA, MAX_SCALA, day, ora, giornoSigla, titolo };
})();
