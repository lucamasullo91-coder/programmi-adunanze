/* Programma delle comitive di congregazione nel portale.
 * Le offerte arrivano dal sondaggio («Posso condurre»); la proposta qui: chi ha dato una sola disponibilità entra sempre,
 * gli altri in proporzione alle loro offerte rispetto alle comitive del mese. Tre versioni del foglio A4:
 * generale per i nominati, personale per ogni conduttore, tabella informazioni (senza i conduttori della domenica). */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const G = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const GB = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const C = { mese: '', d: null, st: null, tab: 'programma', versione: 'generale', coda: null, salvo: '', carico: false, pers: null, motivi: {} };
  S.com = C;

  const zn = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const intervallo = (lun) => {
    const t = zn(lun), f = new Date(Date.UTC(t.y, t.m - 1, t.d + 6)), fm = f.getUTCMonth() + 1;
    return t.m === fm ? t.d + '–' + f.getUTCDate() + ' ' + MESI[t.m - 1] : t.d + ' ' + MESI[t.m - 1] + ' – ' + f.getUTCDate() + ' ' + MESI[fm - 1];
  };
  const lungo = (s) => { const t = zn(s); return G[t.dow] + ' ' + t.d + ' ' + MESI[t.m - 1]; };
  const meseDopo = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
  const nomeMese = (m) => MESI[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  const persona = (id) => C.pers && C.pers.get(id);
  const sigla = (id) => (id ? (persona(id) || {}).sigla || '?' : '');
  const nomeIntero = (id) => { const p = persona(id); return p ? p.nome + ' ' + p.cognome : ''; };

  /* comitive del mese che contano (non annullate, non nascoste) */
  const tutte = () => C.d.settimane.flatMap((w) => w.comitive.map((c) => Object.assign({ lunedi: w.lunedi }, c)));
  const attive = () => tutte().filter((c) => !c.annullata && !C.st.nascoste[c.k]);
  const offerte = (k) => (C.d.offerte[k] || []).slice();

  function carica(mese) {
    C.carico = true; C.d = null;
    P.srv('comitive', mese || '').then((d) => {
      C.d = d; C.mese = d.mese; C.st = d.stato; C.pers = new Map(d.conduttori.map((p) => [p.id, p])); C.carico = false; C.motivi = {};
      if (S.vista === 'comitive') P.disegna();
    }).catch((e) => { C.carico = false; P.toast(e.message, true); });
  }
  function cambiato() { C.salvo = 'Da salvare'; pill(); clearTimeout(C.coda); C.coda = setTimeout(salva, 1200); }
  function salva() {
    C.salvo = 'Salvo…'; pill();
    P.srv('salvaComitive', C.mese, C.st).then((r) => { C.salvo = 'Salvato ' + r.quando; pill(); }).catch((e) => { C.salvo = 'Non salvato'; pill(); P.toast(e.message, true); });
  }
  function pill() { const el = document.getElementById('cmSalvo'); if (el) { el.textContent = C.salvo; el.className = 'rp-salvo' + (/Non/.test(C.salvo) ? ' err' : /Salvato/.test(C.salvo) ? ' ok' : ''); } }
  window.addEventListener('beforeunload', (e) => { if (C.salvo === 'Da salvare' || C.salvo === 'Salvo…') { e.preventDefault(); e.returnValue = ''; } });

  /* ── equità: quote e proposta ── */
  function quote() {
    const lista = attive(), n = new Map();
    lista.forEach((c) => offerte(c.k).forEach((id) => n.set(id, (n.get(id) || 0) + 1)));
    const conOfferte = lista.filter((c) => offerte(c.k).length).length;
    const tot = [...n.values()].reduce((a, b) => a + b, 0) || 1;
    const q = new Map();
    n.forEach((v, id) => q.set(id, Math.min(v, conOfferte * v / tot)));
    return { n, q };
  }
  function assegnate() { const a = new Map(); attive().forEach((c) => { const id = C.st.assegnati[c.k]; if (id) a.set(id, (a.get(id) || 0) + 1); }); return a; }
  function proponi(modo) {
    const lista = attive(), { n, q } = quote(), mot = {};
    const ass = {};
    if (modo === 'vuoti') lista.forEach((c) => { if (C.st.assegnati[c.k]) ass[c.k] = C.st.assegnati[c.k]; });
    const conta = () => { const a = new Map(); Object.values(ass).forEach((id) => a.set(id, (a.get(id) || 0) + 1)); return a; };
    const stor = C.d.storico || {};
    const avvisi = [];
    // 1. chi ha dato una sola disponibilità entra sempre
    const singoli = [...n.entries()].filter(([, v]) => v === 1).map(([id]) => id)
      .sort((a, b) => (stor[a] || 0) - (stor[b] || 0) || sigla(a).localeCompare(sigla(b)));
    singoli.forEach((id) => {
      const c = lista.find((x) => offerte(x.k).indexOf(id) >= 0);
      if (!c) return;
      if (ass[c.k] && ass[c.k] !== id) {
        if (n.get(ass[c.k]) === 1) avvisi.push(nomeIntero(id) + ' e ' + nomeIntero(ass[c.k]) + ' hanno dato una sola disponibilità, tutti e due per ' + lungo(c.data) + ' ' + c.ora + ': ne ho messo uno, decidi tu.');
        else { ass[c.k] = id; mot[c.k] = 'unica disponibilità'; }
        return;
      }
      ass[c.k] = id; mot[c.k] = 'unica disponibilità';
    });
    // 2. le altre: prima quelle con meno candidati; vince chi è più lontano dalla sua quota
    const caso = modo === 'altra' ? () => Math.random() * 0.25 : () => 0;
    lista.filter((c) => !ass[c.k]).sort((a, b) => offerte(a.k).length - offerte(b.k).length || a.data.localeCompare(b.data)).forEach((c) => {
      const cand = offerte(c.k);
      if (!cand.length) return;
      const a = conta();
      const voto = (id) => {
        let v = ((a.get(id) || 0) + 1) / (q.get(id) || 0.5);
        if (lista.some((x) => x.lunedi === c.lunedi && ass[x.k] === id)) v += 0.6;           // già nella stessa settimana
        if (lista.some((x) => ass[x.k] === id && Math.abs(zn(x.data).d - zn(c.data).d) === 1)) v += 0.3; // il giorno prima o dopo
        return v + (stor[id] || 0) * 0.03 + caso();
      };
      const best = cand.slice().sort((x, y) => voto(x) - voto(y))[0];
      ass[c.k] = best; mot[c.k] = cand.length === 1 ? 'unico disponibile' : 'equità tra ' + cand.length + ' disponibili';
    });
    // 3. scambi che avvicinano tutti alla propria quota
    const costo = () => { const a = conta(); let s = 0; n.forEach((v, id) => { s += Math.pow((a.get(id) || 0) - q.get(id), 2); }); return s; };
    for (let giro = 0; giro < 6; giro++) {
      let meglio = false;
      lista.forEach((c) => {
        if (!ass[c.k] || mot[c.k] === 'unica disponibilità') return;
        offerte(c.k).forEach((id) => {
          if (id === ass[c.k]) return;
          const prima = costo(), vecchio = ass[c.k];
          ass[c.k] = id;
          if (costo() < prima - 1e-9) { meglio = true; mot[c.k] = 'equità tra ' + offerte(c.k).length + ' disponibili'; } else ass[c.k] = vecchio;
        });
      });
      if (!meglio) break;
    }
    lista.forEach((c) => { if (ass[c.k]) C.st.assegnati[c.k] = ass[c.k]; else delete C.st.assegnati[c.k]; });
    C.motivi = mot; C.avvisi = avvisi;
    cambiato(); rd();
    P.toast('Proposta pronta');
  }

  /* ── stile ── */
  const css = document.createElement('style');
  css.textContent = `
  .cm-wk{border:1px solid var(--rule);border-radius:8px;margin:0 0 12px;overflow:hidden;background:#fff}
  .cm-wk h3{margin:0;padding:8px 12px;background:var(--neu);font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--slate);display:flex;gap:10px;flex-wrap:wrap}
  .cm-r{display:grid;grid-template-columns:150px 1fr;gap:6px 10px;padding:8px 12px;border-top:1px solid #EFEDE8;align-items:center}
  @media(min-width:860px){.cm-r{grid-template-columns:200px 1fr 260px}}
  .cm-r .q b{display:block;color:#A86F00;font-size:14px}.cm-r .q span{font-size:12px;color:var(--slate)}
  .cm-r select,.cm-r input{width:100%;border:1px solid var(--rule);border-radius:6px;padding:6px 8px;background:#fff;font-weight:600}
  .cm-r small{display:block;font-size:11px;color:var(--muted);margin-top:2px}.cm-r small.w{color:#B3261E;font-weight:600}
  .cm-r.off{background:#F4F3EF}.cm-r.off .q b{color:#9AA3AD}.cm-r.nasc{opacity:.55}
  .cm-r .az{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cm-r.dom .q b{color:#4D5A68}
  .fa4 .pgm.cm h1{color:#A86F00}
  .fa4 .cm-orari{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:10px}
  .fa4 .cm-orari div{background:#FBF1DC;border-left:3px solid #A86F00;border-radius:3px;padding:5px 8px}
  .fa4 .cm-orari span{display:block;font-size:7.6px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#A86F00}
  .fa4 .cm-orari b{font-size:11.5px;font-weight:600;color:#4D5A68}
  .fa4 table.cm-t{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:2px}
  .fa4 table.cm-t td{border-bottom:1px solid #ECE2CC;padding:4px 6px;vertical-align:middle}
  .fa4 table.cm-t td.dq{width:62px;text-align:center;background:#FBF1DC;border-bottom:2px solid #fff}
  .fa4 table.cm-t td.dq small{display:block;font-size:7.5px;font-weight:700;letter-spacing:.12em;color:#A86F00}
  .fa4 table.cm-t td.dq b{display:block;font-size:17px;line-height:1;color:#7A5200}
  .fa4 table.cm-t td.ora{width:58px;font-weight:700;color:#4D5A68}
  .fa4 table.cm-t td.luogo{color:#4D5A68}
  .fa4 table.cm-t td.chi{text-align:right;font-weight:700;text-transform:uppercase;white-space:nowrap;font-size:11px}
  .fa4 table.cm-t tr.off td{color:#9AA3AD}.fa4 table.cm-t tr.off td.dq{background:#EEECE7}.fa4 table.cm-t tr.off td.dq small,.fa4 table.cm-t tr.off td.dq b{color:#9AA3AD}
  .fa4 table.cm-t tr.off td.chi{font-weight:600;text-transform:none;font-style:italic}
  .fa4 table.cm-t tr.dom td.dq{background:#ECEEF1}.fa4 table.cm-t tr.dom td.dq small,.fa4 table.cm-t tr.dom td.dq b{color:#4D5A68}
  .fa4 .cm-mio{flex:0 1 300px;min-width:230px;border-left:3px solid #A86F00;background:#FBF1DC;border-radius:3px;padding:8px 11px;align-self:start}
  .fa4 .cm-mio span{display:block;font-size:8.6px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#A86F00}
  .fa4 .cm-mio b.nm{display:block;font-size:13px;margin:2px 0 6px;color:#1F2630}
  .fa4 .cm-mio div{font-size:10.5px;line-height:1.55}.fa4 .cm-mio div b{color:#7A5200}`;
  document.head.appendChild(css);

  /* ── vista ── */
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };
  P.viste.comitive = function () {
    const h0 = P.testata('Comitive', C.d ? esc(C.d.nomeMese) : '', 'home');
    if (!C.d) { if (!C.carico) carica(C.mese); return h0 + '<p class="nota">Carico le offerte del sondaggio…</p>'; }
    const oggi = new Date().toISOString().slice(0, 7);
    const mesi = [-1, 0, 1, 2].map((n) => meseDopo(oggi, n)); if (mesi.indexOf(C.mese) < 0) mesi.push(C.mese);
    let h = h0 + '<div class="rp-bar"><select data-cm="mese">' + mesi.map((m) => '<option value="' + m + '"' + (m === C.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select><span class="rp-salvo" id="cmSalvo">' + esc(C.salvo) + '</span></div>';
    h += '<div class="rp-tabs">' + [['programma', 'Programma'], ['foglio', 'Foglio A4']].map((t) => '<button data-cm="tab" data-v="' + t[0] + '" class="' + (C.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
    return h + (C.tab === 'foglio' ? vistaFoglio() : vistaProgramma());
  };
  function vistaProgramma() {
    const { n, q } = quote(), a = assegnate();
    const risp = C.d.previsti.filter((id) => C.d.risposto[id]).length;
    let h = '<p class="rp-aiuto">Le offerte arrivano dal sondaggio. <b>Proponi</b>: chi ha dato una sola disponibilità entra sempre; per gli altri vale l\'equità, cioè la parte di comitive che tocca a ciascuno in proporzione a quante ne ha offerte rispetto alle comitive del mese. Puoi cambiare ogni conduttore, anche con chi non si è offerto. Le comitive annullate (Calendario → Variazioni) restano grigie con il motivo; «Nascondi» toglie una comitiva dal programma senza cancellarla.</p>';
    h += '<p class="nota">Hanno risposto <b>' + risp + '</b> nominati su ' + C.d.previsti.length + '.' + (C.d.previsti.length - risp ? ' Mancano: ' + C.d.previsti.filter((id) => !C.d.risposto[id]).map((id) => esc(sigla(id))).join(', ') + '.' : '') + '</p>';
    h += '<div class="rp-bar"><button class="btn" data-cm="proponi" data-v="tutto" style="background:#A86F00;border-color:#A86F00">Proponi</button><button class="btn soft" data-cm="proponi" data-v="vuoti">Completa i vuoti</button><button class="btn soft" data-cm="proponi" data-v="altra">Un\'altra proposta</button><button class="btn soft" data-cm="svuota">Svuota</button></div>';
    const scoperte = attive().filter((c) => !offerte(c.k).length && !C.st.assegnati[c.k]);
    const fuori = [...n.keys()].filter((id) => !a.get(id));
    const av = (C.avvisi || []).concat(scoperte.length ? ['Nessuno si è offerto per: ' + scoperte.map((c) => lungo(c.data) + ' ' + c.ora).join(' · ')] : [])
      .concat(fuori.length ? ['Si sono offerti ma non hanno comitive: ' + fuori.map(sigla).join(', ')] : []);
    if (av.length) h += '<details class="rp-rev" open><summary>Da rivedere (' + av.length + ')</summary><ul>' + av.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></details>';
    const abil = C.d.conduttori.filter((p) => p.abilitato).sort((x, y) => x.cognome.localeCompare(y.cognome, 'it'));
    C.d.settimane.forEach((w, i) => {
      h += '<section class="cm-wk"><h3><b>' + (i + 1) + 'ª settimana</b><span>' + intervallo(w.lunedi) + '</span>' + (w.speciale ? '<span style="color:#521F46">' + esc(w.speciale.nome) + '</span>' : '') + '</h3>';
      w.comitive.forEach((c) => {
        if (c.annullata) { h += '<div class="cm-r off"><div class="q"><b>' + esc(lungo(c.data)) + '</b><span>' + esc(c.ora + ' · ' + c.luogo) + '</span></div><div><i>Non si tiene' + (c.motivo ? ': ' + esc(c.motivo) : '') + '</i></div></div>'; return; }
        const off = offerte(c.k), chi = C.st.assegnati[c.k] || '', nasc = !!C.st.nascoste[c.k];
        const opz = '<option value="">—</option><optgroup label="Si sono offerti">' + off.map((id) => '<option value="' + id + '"' + (chi === id ? ' selected' : '') + '>' + esc(sigla(id)) + '  (' + (n.get(id) || 0) + ((n.get(id) || 0) === 1 ? ' offerta · ' : ' offerte · ') + (a.get(id) || 0) + ((a.get(id) || 0) === 1 ? ' assegnata)' : ' assegnate)') + '</option>').join('') + '</optgroup>' +
          '<optgroup label="Non si sono offerti">' + abil.filter((p) => off.indexOf(p.id) < 0).map((p) => '<option value="' + p.id + '"' + (chi === p.id ? ' selected' : '') + '>' + esc(p.sigla) + '</option>').join('') + '</optgroup>';
        const mot = C.motivi[c.k];
        const info = chi ? (off.indexOf(chi) < 0 ? '<small class="w">⚠ non si è offerto per questa comitiva</small>' : '<small>' + (mot ? esc(mot) + ' · ' : '') + 'quota ' + (q.get(chi) || 0).toFixed(1) + ', assegnate ' + (a.get(chi) || 0) + '</small>') : '<small' + (off.length ? '' : ' class="w"') + '>' + (off.length ? off.length + ' disponibili' : 'nessuna offerta') + '</small>';
        h += '<div class="cm-r' + (nasc ? ' nasc' : '') + '"><div class="q"><b>' + esc(lungo(c.data)) + (c.aggiunta ? ' · in più' : '') + '</b><span>' + esc(c.ora + ' · ' + c.luogo) + '</span></div>' +
          '<div><select data-cm="chi" data-k="' + esc(c.k) + '"' + (nasc ? ' disabled' : '') + '>' + opz + '</select>' + info + '</div>' +
          '<div class="az"><input data-cm="nota" data-k="' + esc(c.k) + '" value="' + esc(C.st.note[c.k] || '') + '" placeholder="Nota (facoltativa)" style="flex:1"><label style="font-size:12px;white-space:nowrap"><input type="checkbox" data-cm="nascondi" data-k="' + esc(c.k) + '"' + (nasc ? ' checked' : '') + ' style="width:auto"> nascondi</label></div></div>';
      });
      const dm = C.st.domeniche[w.domenica] || {};
      h += '<div class="cm-r dom"><div class="q"><b>' + esc(lungo(w.domenica)) + '</b><span>Comitive di gruppo</span></div><div><input data-cm="dom" data-k="' + w.domenica + '" data-v="gruppi" value="' + esc(dm.gruppi || '') + '" placeholder="Gruppi (es. Agnello e Sodano · Muto e Ciotola)"></div>' +
        '<div class="az"><input data-cm="dom" data-k="' + w.domenica + '" data-v="conduttore" value="' + esc(dm.conduttore || '') + '" placeholder="Conduttori (facoltativo)"></div></div>';
      h += '</section>';
    });
    // equità
    const righe = [...new Set([...n.keys(), ...a.keys()])].sort((x, y) => sigla(x).localeCompare(sigla(y)));
    h += '<details class="rp-rev" style="background:#fff;border-color:var(--rule)"><summary style="color:var(--slate)">Equità del mese</summary><div class="rp-tw" style="max-height:none;margin-top:6px"><table class="rp-eq"><thead><tr><th>Conduttore</th><th>Offerte</th><th>Quota</th><th>Assegnate</th><th>Nei 2 mesi prima</th></tr></thead><tbody>' +
      righe.map((id) => { const as = a.get(id) || 0, qq = q.get(id) || 0, cl = as >= qq + 1.5 ? 'su' : as <= qq - 1.5 ? 'giu' : '';
        return '<tr><td>' + esc(sigla(id)) + '</td><td>' + (n.get(id) || 0) + '</td><td>' + qq.toFixed(1) + '</td><td class="' + cl + '">' + as + '</td><td>' + ((C.d.storico || {})[id] || 0) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    return h;
  }

  /* ── foglio A4 ── */
  function vistaFoglio() {
    const conds = [...new Set(Object.values(C.st.assegnati))].filter(Boolean).sort((x, y) => sigla(x).localeCompare(sigla(y)));
    let h = '<div class="rp-bar"><select data-cm="versione"><option value="generale"' + (C.versione === 'generale' ? ' selected' : '') + '>Generale · per i nominati</option><option value="tabella"' + (C.versione === 'tabella' ? ' selected' : '') + '>Tabella informazioni · senza conduttori della domenica</option>' +
      conds.map((id) => '<option value="p:' + id + '"' + (C.versione === 'p:' + id ? ' selected' : '') + '>Personale · ' + esc(nomeIntero(id)) + '</option>').join('') + '</select><button class="btn" data-cm="stampa" style="background:#A86F00;border-color:#A86F00">Stampa / Salva PDF</button></div>' +
      '<p class="rp-aiuto">Nella finestra di stampa scegli «Salva come PDF», A4, margini «Nessuno», grafica di sfondo attiva. Le comitive nascoste non compaiono; quelle annullate restano grigie con il motivo.</p>';
    return h + '<div class="rp-anteprima fa4"><div class="pgm-fit" id="cmFit"><div class="pgm-scale" id="cmScale">' + foglio() + '</div></div></div>';
  }
  function foglio() {
    const v = C.versione, me = v.slice(0, 2) === 'p:' ? v.slice(2) : '', tab = v === 'tabella';
    const mk = (id) => (id ? (id === me ? '<mark>' + esc(sigla(id)) + '</mark>' : esc(sigla(id))) : '');
    const base = [...new Map(tutte().filter((c) => !c.aggiunta).map((c) => [zn(c.data).dow + '|' + c.ora, c])).values()].sort((a, b) => ((zn(a.data).dow + 6) % 7) - ((zn(b.data).dow + 6) % 7));
    let h = '<article class="pgm cm pgm-print"><header class="pgm-head"><div class="left"><div class="cong">Napoli Pianura Trencia</div><div class="gold"></div><h1>Programma comitive</h1><div class="mese">' + nomeMese(C.mese).toUpperCase() + '</div>' +
      '<div class="cm-orari">' + base.map((c) => '<div><span>' + G[zn(c.data).dow] + ' · ' + esc(c.ora) + '</span><b>' + esc(c.luogo) + '</b></div>').join('') + '</div></div>';
    if (me) {
      const mie = attive().filter((c) => C.st.assegnati[c.k] === me);
      h += '<div class="cm-mio"><span>Le mie comitive · ' + mie.length + '</span><b class="nm">' + esc(nomeIntero(me)) + '</b>' + mie.map((c) => '<div><b>' + esc(GB[zn(c.data).dow] + ' ' + zn(c.data).d) + '</b> · ' + esc(c.ora) + ' · ' + esc(c.luogo) + '</div>').join('') + '</div>';
    }
    h += '</header>';
    C.d.settimane.forEach((w, i) => {
      const righe = w.comitive.filter((c) => !C.st.nascoste[c.k]).map((c) => {
        const t = zn(c.data), off = !!c.annullata;
        return '<tr class="' + (off ? 'off' : '') + '"><td class="dq"><small>' + GB[t.dow] + '</small><b>' + t.d + '</b></td><td class="ora">' + esc(c.ora) + '</td><td class="luogo">' + esc(c.luogo) + (C.st.note[c.k] ? ' · ' + esc(C.st.note[c.k]) : '') + '</td><td class="chi">' + (off ? esc(c.motivo || 'Non si tiene') : mk(C.st.assegnati[c.k])) + '</td></tr>';
      });
      const dm = C.st.domeniche[w.domenica] || {};
      if (dm.gruppi || dm.conduttore) {
        const t = zn(w.domenica);
        righe.push('<tr class="dom"><td class="dq"><small>' + GB[t.dow] + '</small><b>' + t.d + '</b></td><td class="ora">Gruppi</td><td class="luogo">' + esc(dm.gruppi || '') + '</td><td class="chi">' + (tab ? '' : esc(dm.conduttore || '')) + '</td></tr>');
      }
      if (!righe.length && !w.speciale) return;
      h += '<section class="pgm-week"><h2><b>' + (i + 1) + 'ª settimana</b><i>|</i><span>' + intervallo(w.lunedi) + '</span>' + (w.speciale ? '<i>|</i><span>' + esc(w.speciale.nome) + '</span>' : '') + '</h2><table class="cm-t"><tbody>' + righe.join('') + '</tbody></table></section>';
    });
    return h + '<footer class="pgm-foot"><span><b>Programma comitive</b><span>' + P.cap(nomeMese(C.mese)) + '</span></span><span class="code">cmpgm' + C.mese.slice(2, 4) + C.mese.slice(5, 7) + (tab ? '-T' : me ? '-P' : '-G') + '</span></footer></article>';
  }
  function adatta() {
    const fit = document.getElementById('cmFit'), sc = document.getElementById('cmScale');
    if (!fit || !sc) return;
    const k = Math.min(1, fit.clientWidth / 794);
    sc.style.transform = 'scale(' + k + ')'; fit.style.height = (sc.scrollHeight * k) + 'px';
  }
  new MutationObserver(() => { if (S.vista === 'comitive' && C.tab === 'foglio') requestAnimationFrame(adatta); }).observe(P.app, { childList: true });
  window.addEventListener('resize', () => { if (S.vista === 'comitive' && C.tab === 'foglio') adatta(); });

  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'comitive') return;
    const u = e.target.closest('[data-cm]');
    if (!u || u.tagName === 'SELECT' || (u.tagName === 'INPUT' && u.type !== 'checkbox')) return;
    const k = u.dataset.cm, v = u.dataset.v;
    if (k === 'tab') { C.tab = v; window.scrollTo(0, 0); return P.disegna(); }
    if (k === 'proponi') { if (v === 'tutto' && Object.keys(C.st.assegnati).length && !confirm('Rifaccio tutto il programma del mese?')) return; return proponi(v); }
    if (k === 'svuota') { if (!confirm('Tolgo tutti i conduttori del mese?')) return; C.st.assegnati = {}; C.motivi = {}; cambiato(); return rd(); }
    if (k === 'nascondi') { if (u.checked) C.st.nascoste[u.dataset.k] = true; else delete C.st.nascoste[u.dataset.k]; cambiato(); return rd(); }
    if (k === 'stampa') { adatta(); return window.print(); }
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'comitive') return;
    const u = e.target.closest('[data-cm]');
    if (!u) return;
    const k = u.dataset.cm;
    if (k === 'mese') { if (C.salvo === 'Da salvare') { clearTimeout(C.coda); salva(); } C.mese = u.value; C.salvo = ''; C.avvisi = []; return carica(u.value); }
    if (k === 'chi') { if (u.value) C.st.assegnati[u.dataset.k] = u.value; else delete C.st.assegnati[u.dataset.k]; delete C.motivi[u.dataset.k]; cambiato(); return rd(); }
    if (k === 'nota') { if (u.value.trim()) C.st.note[u.dataset.k] = u.value.trim(); else delete C.st.note[u.dataset.k]; return cambiato(); }
    if (k === 'dom') { const d = C.st.domeniche[u.dataset.k] || (C.st.domeniche[u.dataset.k] = {}); d[u.dataset.v] = u.value.trim(); return cambiato(); }
    if (k === 'versione') { C.versione = u.value; return P.disegna(); }
  });
})();
