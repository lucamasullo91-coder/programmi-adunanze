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
  const corto = (s) => { const t = zn(s); return GB[t.dow] + ' ' + t.d; };
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
      C.d = d; C.mese = d.mese; C.st = d.stato; C.pub = null; C.pers = new Map(d.conduttori.map((p) => [p.id, p])); C.carico = false; C.motivi = {};
      if (S.vista === 'comitive') P.disegna();
    }).catch((e) => { C.carico = false; P.toast(e.message, true); });
  }
  function cambiato() { C.salvo = 'Da salvare'; pill(); clearTimeout(C.coda); C.coda = setTimeout(salva, 1200); }
  function salva() {
    C.salvo = 'Salvo…'; pill();
    P.srv('salvaComitive', C.mese, C.st).then((r) => { C.salvo = 'Salvato ' + r.quando; pill(); if (C.pub && C.pub.pubblicato && !C.pub.cambiato) { C.pub.cambiato = true; if (S.vista === 'comitive') rd(); } }).catch((e) => { C.salvo = 'Non salvato'; pill(); P.toast(e.message, true); });
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
  .cm-az{display:flex;gap:6px;margin-top:4px}.cm-az .cm-ic{font-size:11.5px;padding:2px 8px}
  .cm-mod{display:grid;gap:8px;padding:10px 12px;margin:0 12px 8px;background:#FBF6EA;border:1px solid #E9D9B0;border-radius:10px}
  .cm-mod .rr{display:flex;gap:6px;flex-wrap:wrap}.cm-mod select,.cm-mod input[type=time],.cm-mod input[list],.cm-mod #cmMotivo{font:inherit;font-size:14px;padding:6px 8px;border:1px solid #D9D6D0;border-radius:8px;background:#fff}
  .cm-schema{margin:8px 0 14px;border:1px solid #E1DDD3;border-radius:12px;padding:8px 12px;background:#fff}.cm-schema summary{font-weight:700;color:#235C90;cursor:pointer}
  .cm-sch-w{overflow-x:auto}.cm-sch{border-collapse:collapse;margin-top:8px;font-size:13px}.cm-sch th,.cm-sch td{padding:4px 6px;text-align:center;border-bottom:1px solid #EFEDE8;white-space:nowrap}
  .cm-sch th.l,.cm-sch td.l{text-align:left;white-space:normal;min-width:160px;font-size:12px}.cm-sch select{font:inherit;font-weight:700;padding:3px 4px;border-radius:6px;border:1px solid #D9D6D0;min-width:62px}
  .cm-r select,.cm-r input{width:100%;border:1px solid var(--rule);border-radius:6px;padding:6px 8px;background:#fff;font-weight:600}
  .cm-r small{display:block;font-size:11px;color:var(--muted);margin-top:2px}.cm-r small.w{color:#B3261E;font-weight:600}
  .cm-r.off{background:#F4F3EF}.cm-r.off .q b{color:#9AA3AD}.cm-r.nasc{opacity:.55}
  .cm-r .az{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cm-r.dom .q b{color:#4D5A68}
  .cm-dom{display:grid;gap:8px;padding:10px 12px;border-top:1px solid #EFEDE8;background:#FAF8F4}
  .cm-dom>p.h{margin:0;font-size:13px;color:var(--slate)}.cm-dom>p.h b{color:#521F46}
  .cm-slot{border:1px solid var(--rule);border-left:4px solid #521F46;border-radius:6px;background:#fff;padding:8px 10px;display:grid;gap:6px}
  .cm-slot.nasc{opacity:.55}
  .cm-slot .gr{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
  .cm-chip{border:1.5px solid #521F46;color:#521F46;background:#fff;border-radius:999px;padding:3px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
  .cm-chip.on{background:#521F46;color:#fff}
  .cm-slot .et{font-size:12px;color:var(--slate);margin-left:4px}
  .cm-ic{margin-left:auto;border:1px solid var(--rule);background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px}
  .cm-ic+.cm-ic{margin-left:0}.cm-ic.x{color:#B3261E}
  .cm-slot .rr{display:grid;grid-template-columns:96px 1fr;gap:6px}
  .cm-slot input,.cm-slot select{border:1px solid var(--rule);border-radius:6px;padding:6px 8px;background:#fff;font:inherit;font-size:13.5px;width:100%}
  .cm-add{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .cm-add select{border:1px solid var(--rule);border-radius:6px;padding:5px 8px;background:#fff;font:inherit;font-size:12.5px}
  .cm-vis{font-size:12px;font-weight:600;color:#A8432B}
  .cm-pan{border:1px solid var(--rule);border-radius:8px;background:#fff;margin:0 0 10px;padding:8px 12px}
  .cm-pan>summary{cursor:pointer;font-weight:700;font-size:13.5px;color:var(--slate)}
  .cm-pan .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:8px}
  .cm-pan label{display:grid;gap:3px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--slate)}
  .cm-pan input[type=text],.cm-pan input:not([type]){border:1px solid var(--rule);border-radius:6px;padding:6px 8px;font:inherit;font-size:13.5px;text-transform:none;letter-spacing:0;font-weight:500}
  .cm-pan .sl{display:grid;grid-template-columns:10rem 1fr 3rem;gap:8px;align-items:center;font-size:13px;text-transform:none;letter-spacing:0;font-weight:500}
  .cm-pan .sl.r{grid-template-columns:minmax(0,9rem) 1fr 3rem auto}
  .cm-pan ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
  .cm-pan li{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;border-bottom:1px solid #F0EEE9;padding:3px 0}
  .cm-pan li b{min-width:92px}.cm-pan li i{font-style:normal;font-size:10px;color:var(--muted);border:1px solid var(--rule);border-radius:4px;padding:0 4px}
  .cm-pan .chip2{border:1px solid var(--rule);background:#fff;border-radius:999px;padding:2px 9px;font:inherit;font-size:12px;cursor:pointer}
  .cm-pan .chip2.on{background:#A86F00;border-color:#A86F00;color:#fff}
  .cm-pan .pp{display:grid;grid-template-columns:9rem 1fr auto;gap:8px;align-items:center;margin-top:6px;font-size:12.5px}
  .cm-pan .pp input[type=text]{border:1px solid var(--rule);border-radius:6px;padding:6px 8px;font:inherit}
  .rp-anteprima.cm4{background:#EDEBE6;border-radius:8px;padding:12px}`;
  document.head.appendChild(css);

  const pref = (k, v) => { try { return localStorage.getItem(k) || v; } catch (e) { return v; } };
  const salvaPref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* niente memoria */ } };
  const chiDi = (v) => (v === 'tabella' ? P.fogliCM.SALA : v && v.slice(0, 2) === 'p:' ? v.slice(2) : '');
  P.fogli = P.fogli || {};
  /** Il foglio A4 (lo stesso di Congregation Manager) per una versione: generale, tabella, p:<id>. */
  P.fogli.comitive = function (dati, versione) {
    return P.fogliCM.carta(dati, chiDi(versione || 'generale'), pref('cm-comitive-variante', 'schede'), pref('cm-margini', 'standard'));
  };
  function pubblicazione() {
    if (!C.pub) { C.pub = { carico: true }; P.srv('statoPubblicazione', 'comitive', C.mese).then((x) => { C.pub = x; rd(); }).catch(() => { C.pub = { pubblicato: false }; }); }
    const x = C.pub;
    if (x.carico) return '';
    return '<span class="rp-pub">' + (x.pubblicato ? (x.cambiato ? '<b style="color:#9A6A00">Modificato dopo la pubblicazione del ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7)) + '</b>' : 'Pubblicato il ' + esc(x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7) + ' alle ' + x.quando.slice(11, 16))) : 'Non ancora in bacheca') +
      ' <button class="btn small" data-cm="pubblica" style="background:#A86F00;border-color:#A86F00">' + (x.pubblicato ? 'Pubblica di nuovo' : 'Pubblica in bacheca') + '</button></span>';
  }

  /* ── vista ── */
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };
  P.viste.comitive = function () {
    const h0 = P.testata('Comitive', C.d ? esc(C.d.nomeMese) : '', 'home');
    if (!C.d) { if (!C.carico) carica(C.mese); return h0 + '<p class="nota">Carico le offerte del sondaggio…</p>'; }
    const oggi = new Date().toISOString().slice(0, 7);
    const mesi = [-1, 0, 1, 2].map((n) => meseDopo(oggi, n)); if (mesi.indexOf(C.mese) < 0) mesi.push(C.mese);
    let h = h0 + '<div class="rp-bar"><select data-cm="mese">' + mesi.map((m) => '<option value="' + m + '"' + (m === C.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select>' + pubblicazione() + '<span class="rp-salvo" id="cmSalvo">' + esc(C.salvo) + '</span></div>';
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
    h += sediDatalist();
    h += schemaDomeniche();
    C.d.settimane.forEach((w, i) => {
      h += '<section class="cm-wk"><h3><b>' + (i + 1) + 'ª settimana</b><span>' + intervallo(w.lunedi) + '</span>' + (w.speciale ? '<span style="color:#521F46">' + esc(w.speciale.nome) + '</span>' : '') + '</h3>';
      w.comitive.forEach((c) => {
        if (c.annullata) { h += '<div class="cm-r off"><div class="q"><b>' + esc(lungo(c.data)) + '</b><span>' + esc(c.ora + ' · ' + c.luogo) + '</span></div><div><i>Non si tiene' + (c.motivo ? ': ' + esc(c.motivo) : '') + '</i></div><div class="az"><button class="btn small soft" data-cm="cRipristina" data-k="' + esc(c.k) + '">Ripristina</button></div></div>'; return; }
        const off = offerte(c.k), chi = C.st.assegnati[c.k] || '', nasc = !!C.st.nascoste[c.k];
        const opz = '<option value="">—</option><optgroup label="Si sono offerti">' + off.map((id) => '<option value="' + id + '"' + (chi === id ? ' selected' : '') + '>' + esc(sigla(id)) + '  (' + (n.get(id) || 0) + ((n.get(id) || 0) === 1 ? ' offerta · ' : ' offerte · ') + (a.get(id) || 0) + ((a.get(id) || 0) === 1 ? ' assegnata)' : ' assegnate)') + '</option>').join('') + '</optgroup>' +
          '<optgroup label="Non si sono offerti">' + abil.filter((p) => off.indexOf(p.id) < 0).map((p) => '<option value="' + p.id + '"' + (chi === p.id ? ' selected' : '') + '>' + esc(p.sigla) + '</option>').join('') + '</optgroup>';
        const mot = C.motivi[c.k];
        const info = chi ? (off.indexOf(chi) < 0 ? '<small class="w">⚠ non si è offerto per questa comitiva</small>' : '<small>' + (mot ? esc(mot) + ' · ' : '') + 'quota ' + (q.get(chi) || 0).toFixed(1) + ', assegnate ' + (a.get(chi) || 0) + '</small>') : '<small' + (off.length ? '' : ' class="w"') + '>' + (off.length ? off.length + ' disponibili' : 'nessuna offerta') + '</small>';
        h += '<div class="cm-r' + (nasc ? ' nasc' : '') + '"><div class="q"><b>' + esc(lungo(c.data)) + (c.aggiunta ? ' · in più' : '') + (c.cambiata ? ' · cambiata' : '') + '</b><span>' + esc(c.ora + ' · ' + c.luogo) + (c.cambiata && c.motivo ? ' · ' + esc(c.motivo) : '') + '</span>' +
          '<span class="cm-az"><button class="cm-ic" data-cm="cMod" data-k="' + esc(c.k) + '">Modifica</button>' + (c.aggiunta ? '<button class="cm-ic" data-cm="cTogli" data-k="' + esc(c.k) + '">Togli</button>' : '<button class="cm-ic" data-cm="cAnnulla" data-k="' + esc(c.k) + '">Non si tiene</button>') + '</span></div>' +
          '<div><select data-cm="chi" data-k="' + esc(c.k) + '"' + (nasc ? ' disabled' : '') + '>' + opz + '</select>' + info + '</div>' +
          '<div class="az"><input data-cm="nota" data-k="' + esc(c.k) + '" value="' + esc(C.st.note[c.k] || '') + '" placeholder="Nota (facoltativa)" style="flex:1"><label style="font-size:12px;white-space:nowrap"><input type="checkbox" data-cm="nascondi" data-k="' + esc(c.k) + '"' + (nasc ? ' checked' : '') + ' style="width:auto"> nascondi</label></div></div>';
        if (C.mod === c.k) h += moduloComitiva(w, c);
      });
      h += '<div class="cm-add" style="padding:6px 12px">' + (C.mod === 'nuova:' + w.lunedi ? moduloComitiva(w, null) : '<button class="btn small soft" data-cm="cNuova" data-v="' + w.lunedi + '">+ Comitiva in più questa settimana</button>') + '</div>';
      h += domenica(w, i, '');
      h += '</section>';
    });
    // equità
    const righe = [...new Set([...n.keys(), ...a.keys()])].sort((x, y) => sigla(x).localeCompare(sigla(y)));
    h += '<details class="rp-rev" style="background:#fff;border-color:var(--rule)"><summary style="color:var(--slate)">Equità del mese</summary><div class="rp-tw" style="max-height:none;margin-top:6px"><table class="rp-eq"><thead><tr><th>Conduttore</th><th>Offerte</th><th>Quota</th><th>Assegnate</th><th>Nei 2 mesi prima</th></tr></thead><tbody>' +
      righe.map((id) => { const as = a.get(id) || 0, qq = q.get(id) || 0, cl = as >= qq + 1.5 ? 'su' : as <= qq - 1.5 ? 'giu' : '';
        return '<tr><td>' + esc(sigla(id)) + '</td><td>' + (n.get(id) || 0) + '</td><td>' + qq.toFixed(1) + '</td><td class="' + cl + '">' + as + '</td><td>' + ((C.d.storico || {})[id] || 0) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    return h;
  }

  /* ── cambiare una comitiva di congregazione: giorno (nella stessa settimana), ora, luogo; si salva nel Calendario ── */
  function moduloComitiva(w, c) {
    const giorni = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.UTC(+w.lunedi.slice(0, 4), +w.lunedi.slice(5, 7) - 1, +w.lunedi.slice(8, 10) + i)); return d.toISOString().slice(0, 10); });
    const data = c ? c.data : giorni[2], ora = c ? c.ora : '', luogo = c ? c.luogo : '';
    return '<div class="cm-mod" data-k="' + esc(c ? c.k : '') + '" data-w="' + w.lunedi + '">' +
      '<b style="color:#A86F00">' + (c ? 'Cambia la comitiva di ' + esc(lungo(c.data)) + ' ' + esc(c.ora) : 'Comitiva in più') + '</b>' +
      '<div class="rr"><select id="cmGiorno">' + giorni.map((g) => '<option value="' + g + '"' + (g === data ? ' selected' : '') + '>' + esc(lungo(g)) + '</option>').join('') + '</select>' +
      '<input type="time" id="cmOra" value="' + esc(String(ora).padStart(5, '0')) + '"><input list="cmSedi" id="cmLuogo" value="' + esc(luogo) + '" placeholder="Luogo"></div>' +
      '<input id="cmMotivo" placeholder="Motivo (facoltativo, es. visita del sorvegliante)">' +
      (c && !c.aggiunta ? '<label style="font-size:13px"><input type="checkbox" id="cmSeguenti"> Anche le settimane seguenti (cambio stabile)</label>' : '') +
      '<div class="rr"><button class="btn small" data-cm="cSalva" style="background:#A86F00;border-color:#A86F00">Salva</button><button class="btn small soft" data-cm="cChiudi">Annulla</button></div></div>';
  }
  function cambioCalendario(chiave, d) {
    P.toast('Salvo nel calendario…');
    return P.srv('cambiaComitiva', C.mese, chiave, d).then((r) => {
      const st = C.st; C.d = r; C.st = st; C.pers = new Map(r.conduttori.map((p) => [p.id, p])); C.mod = null; P.toast('Fatto'); rd();
    }).catch((e) => P.toast(e.message, true));
  }

  /* ── schema delle domeniche del mese: chi sta con chi, a colpo d'occhio ── */
  const COL_DOM = ['#2E75B5', '#A86F00', '#25804B', '#7A4E9C', '#A8432B'];
  function schemaDomeniche() {
    const d = ctxDom();
    if (!d || !d.foglio || !d.foglio.gruppi || !d.foglio.gruppi.length) return '';
    const ids = d.foglio.gruppi, dom = d.settimane.map((w) => w.domenica).filter(Boolean);
    if (!dom.length) return '';
    let h = '<details class="cm-schema" open><summary>Domeniche del mese · chi sta con chi</summary><div class="cm-sch-w"><table class="cm-sch"><thead><tr><th></th>' + ids.map((g) => '<th>' + esc(g) + '</th>').join('') + '<th class="l">Comitive</th></tr></thead><tbody>';
    dom.forEach((data) => {
      const righe = righeDom().filter((r) => r.data === data);
      const lettera = (r) => String.fromCharCode(65 + righe.indexOf(r));
      h += '<tr><th>' + esc(corto(data)) + '</th>' + ids.map((g) => {
        const r = righe.find((x) => x.gruppi.indexOf(g) >= 0), col = r ? COL_DOM[righe.indexOf(r) % COL_DOM.length] : '';
        return '<td><select data-cmd="schema" data-d="' + data + '" data-g="' + esc(g) + '"' + (r ? ' style="background:' + col + ';color:#fff;border-color:' + col + '"' : '') + '><option value="">—</option>' +
          righe.map((x) => '<option value="' + esc(x.id) + '"' + (x === r ? ' selected' : '') + '>' + lettera(x) + '</option>').join('') + '<option value="@nuova">' + (righe.length ? 'da solo' : 'A') + '</option></select></td>';
      }).join('') + '<td class="l">' + (righe.length ? righe.map((x) => '<span style="color:' + COL_DOM[righe.indexOf(x) % COL_DOM.length] + '"><b>' + lettera(x) + '</b> ' + esc([x.ora, x.luogo].filter(Boolean).join(' · ') || 'ora e luogo da scegliere') + '</span>').join('<br>') : '<i>nessuna</i>') + '</td></tr>';
    });
    return h + '</tbody></table></div><p class="nota" style="margin:6px 0 0">Scegli per ogni gruppo la comitiva (A, B…) o «da solo». Gruppi con la stessa lettera stanno insieme. Ora, luogo e conduttore li scegli sotto, domenica per domenica.</p></details>';
  }

  /* ── domeniche dei gruppi (come in Congregation Manager): una riga per comitiva, salvata da sola ── */
  const DOM = { d: null, mese: '', carico: false };
  const ctxDom = () => (S.vista === 'domeniche' ? DOM.d : C.d);
  function righeDom() { const d = ctxDom(); return (d.foglio && d.foglio.domeniche) || []; }
  function salvaDom(riga, togli) {
    const d = ctxDom();
    return P.srv('salvaDomenica', d.mese, riga, !!togli).then((r) => { d.foglio.domeniche = r; if (C.pub && C.pub.pubblicato && S.vista === 'comitive') C.pub.cambiato = true; rd(); }).catch((e) => P.toast(e.message, true));
  }
  function domenica(w, n, mio) {
    const F = P.fogliCM, d = ctxDom(), ids = d.foglio.gruppi, data = w.domenica;
    const qui = righeDom().filter((r) => r.data === data && (!mio || r.gruppi.indexOf(mio) >= 0));
    const tutteQui = righeDom().filter((r) => r.data === data);
    const liberi = ids.filter((g) => !tutteQui.some((r) => r.gruppi.indexOf(g) >= 0));
    const sedi = d.sedi || [];
    const cond = (d.conduttori || []).filter((p) => p.abilitato), condIds = new Set(cond.map((p) => p.id));
    const altri = (d.foglio.fratelli || []).filter((p) => !condIds.has(p.id));
    const vis = ((d.settimane.find((x) => x.domenica === data) || {}).comitive || []).filter((c) => c.data === data);
    let h = '<div class="cm-dom"><p class="h">Domenica <b>' + esc(lungo(data).replace(/^Domenica /, '')) + '</b> · comitive dei gruppi</p>';
    qui.forEach((r, i) => {
      const id = 'r' + r.id;
      h += '<div class="cm-slot' + (r.nascosta ? ' nasc' : '') + '">' + (tutteQui.length > 1 || r.nascosta ? '<small style="color:var(--slate);font-weight:600">' + (tutteQui.length > 1 ? (tutteQui.indexOf(r) + 1) + 'ª comitiva' : '') + (r.nascosta ? ' · nascosta dal foglio' : '') + '</small>' : '') +
        '<div class="gr">' + (mio ? '<span class="cm-chip on">' + esc(mio) + '</span>' : ids.map((g) => '<button class="cm-chip' + (r.gruppi.indexOf(g) >= 0 ? ' on' : '') + '" data-cmd="gruppo" data-id="' + esc(r.id) + '" data-g="' + esc(g) + '">' + esc(g) + '</button>').join('')) +
        '<span class="et">' + esc(F.etichettaGruppi(r.gruppi, ids)) + '</span>' +
        (mio ? '' : '<button class="cm-ic" data-cmd="nascondi" data-id="' + esc(r.id) + '" title="' + (r.nascosta ? 'Rimetti sul foglio' : 'Nascondi dal foglio (resta qui)') + '">' + (r.nascosta ? 'Mostra' : 'Nascondi') + '</button>') +
        (!mio || r.gruppi.join() === mio ? '<button class="cm-ic x" data-cmd="togli" data-id="' + esc(r.id) + '" title="Togli questa comitiva">✕</button>' : '') + '</div>' +
        '<div class="rr"><input type="time" data-cmd="ora" data-id="' + esc(r.id) + '" value="' + esc(String(r.ora).padStart(5, '0')) + '">' +
        '<input list="cmSedi" data-cmd="luogo" data-id="' + esc(r.id) + '" value="' + esc(r.luogo) + '" placeholder="Luogo"></div>' +
        '<select data-cmd="cond" data-id="' + esc(r.id) + '"><option value="">— conduttore da comunicare —</option>' +
        '<optgroup label="Conduttori">' + cond.map((p) => '<option value="' + p.id + '"' + (r.conduttore === p.id ? ' selected' : '') + '>' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</optgroup>' +
        '<optgroup label="Altri fratelli">' + altri.map((p) => '<option value="' + p.id + '"' + (r.conduttore === p.id ? ' selected' : '') + '>' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</optgroup>' +
        '<optgroup label="Altro"><option value="@scrivi"' + (!r.conduttore && r.esterno ? ' selected' : '') + '>Scrivo io il nome (es. sorvegliante di circoscrizione)…</option></optgroup></select>' +
        (!r.conduttore && (r.esterno || C.scrivi === r.id) ? '<input data-cmd="esterno" data-id="' + esc(r.id) + '" value="' + esc(r.esterno || '') + '" placeholder="Nome e cognome">' : '') + '</div>';
    });
    if (mio) {
      if (liberi.indexOf(mio) >= 0) h += '<div class="cm-add"><button class="btn small soft" data-cmd="crea" data-d="' + data + '" data-gs="' + esc(mio) + '">+ Comitiva del gruppo ' + esc(mio) + '</button></div>';
    } else if (liberi.length) {
      const coppia = F.coppiaDellaDomenica(ids, n);
      h += '<div class="cm-add">' + (liberi.length === ids.length ? '<button class="btn small soft" data-cmd="crea" data-d="' + data + '" data-gs="' + esc(ids.join('|')) + '">+ Tutti i gruppi in Sala</button>' : '') +
        (liberi.length === ids.length && ids.length >= 4 ? '<button class="btn small soft" data-cmd="due" data-d="' + data + '">+ Due comitive in Sala: ' + esc(ids[0] + '-' + ids[1]) + ' e ' + esc(ids[2] + '-' + ids[3]) + '</button>' : '') +
        (ids.length > 2 && coppia.every((g) => liberi.indexOf(g) >= 0) ? '<button class="btn small soft" data-cmd="crea" data-d="' + data + '" data-gs="' + esc(coppia.join('|')) + '">+ ' + esc(F.etichettaGruppi(coppia, ids)) + '</button>' : '') +
        '<select data-cmd="uno" data-d="' + data + '"><option value="">+ Un gruppo…</option>' + liberi.map((g) => '<option value="' + esc(g) + '">Gruppo ' + esc(g) + '</option>').join('') + '</select></div>';
    }
    vis.filter((c) => !c.annullata).forEach((c) => { h += '<p class="cm-vis">Comitiva della domenica ore ' + esc(c.ora) + ' (dal calendario): sul foglio va accanto al titolo «Domenica».</p>'; });
    if (!mio && qui.length) h += '<div><button class="btn small soft" data-cmd="ripeti" data-d="' + data + '" title="Copia gruppi, orario e luogo sulle domeniche ancora vuote del mese; i conduttori li scegli tu">↻ Ripeti per il mese</button></div>';
    if (!qui.length && !vis.length) h += '<p class="nota" style="margin:0">Nessuna comitiva inserita: sul foglio questa domenica resta vuota.</p>';
    return h + '</div>';
  }
  const sediDatalist = () => '<datalist id="cmSedi">' + ((ctxDom() || {}).sedi || []).map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>';
  function nuovaRiga(data, gruppi, n) {
    const d = ctxDom(), sedi = d.sedi || [];
    const sala = sedi.find((x) => /sala/i.test(x)) || sedi[0] || 'Sala del Regno';
    return { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), data: data, ora: '09:30', luogo: sala, gruppi: gruppi, n: n || 1, conduttore: '', esterno: '' };
  }
  function trova(id) { return righeDom().find((r) => r.id === id); }
  function azioneDom(u) {
    const c = u.dataset.cmd, r = u.dataset.id ? trova(u.dataset.id) : null, mio = S.vista === 'domeniche' ? DOM.d.gruppo : '';
    if (c === 'gruppo') {
      const g = u.dataset.g, x = Object.assign({}, r, { gruppi: r.gruppi.slice() });
      if (x.gruppi.indexOf(g) >= 0) { x.gruppi = x.gruppi.filter((y) => y !== g); return x.gruppi.length ? salvaDom(x) : salvaDom(r, true); }
      const altrove = righeDom().find((y) => y.data === r.data && y.id !== r.id && y.gruppi.indexOf(g) >= 0);
      x.gruppi.push(g); x.gruppi.sort((a, b) => ctxDom().foglio.gruppi.indexOf(a) - ctxDom().foglio.gruppi.indexOf(b));
      const via = altrove ? (altrove.gruppi.length > 1 ? salvaDom(Object.assign({}, altrove, { gruppi: altrove.gruppi.filter((y) => y !== g) })) : salvaDom(altrove, true)) : Promise.resolve();
      return via.then(() => salvaDom(x));
    }
    if (c === 'nascondi') return salvaDom(Object.assign({}, r, { nascosta: !r.nascosta }));
    if (c === 'togli') { if (!confirm('Tolgo questa comitiva della domenica?')) return; return salvaDom(r, true); }
    if (c === 'crea') return salvaDom(nuovaRiga(u.dataset.d, u.dataset.gs.split('|')));
    if (c === 'due') { const ids = ctxDom().foglio.gruppi; return salvaDom(nuovaRiga(u.dataset.d, ids.slice(0, 2), 1)).then(() => salvaDom(nuovaRiga(u.dataset.d, ids.slice(2, 4), 2))); }
    if (c === 'ripeti') {
      const mod = righeDom().filter((y) => y.data === u.dataset.d);
      const vuote = ctxDom().settimane.map((w) => w.domenica).filter((dd) => dd !== u.dataset.d && !righeDom().some((y) => y.data === dd));
      if (!vuote.length) return P.toast('Nessuna domenica vuota da riempire');
      let p = Promise.resolve();
      vuote.forEach((dd) => mod.forEach((m) => { p = p.then(() => salvaDom(Object.assign(nuovaRiga(dd, m.gruppi.slice(), m.n), { ora: m.ora, luogo: m.luogo }))); }));
      return p.then(() => P.toast('Copiata su ' + vuote.length + (vuote.length === 1 ? ' domenica' : ' domeniche')));
    }
    return mio;
  }
  function cambiaDom(u) {
    const c = u.dataset.cmd, r = u.dataset.id ? trova(u.dataset.id) : null;
    if (c === 'uno') { if (!u.value) return; return salvaDom(nuovaRiga(u.dataset.d, [u.value])); }
    if (c === 'schema') {
      const data = u.dataset.d, g = u.dataset.g, ids = ctxDom().foglio.gruppi, righe = righeDom().filter((y) => y.data === data);
      const ora = righe.find((y) => y.gruppi.indexOf(g) >= 0), dove = u.value === '@nuova' ? null : righe.find((y) => String(y.id) === u.value);
      if (ora && dove && ora.id === dove.id) return;
      const via = ora ? (ora.gruppi.length > 1 ? salvaDom(Object.assign({}, ora, { gruppi: ora.gruppi.filter((y) => y !== g) })) : salvaDom(ora, true)) : Promise.resolve();
      if (!u.value) return via;
      const ordina = (a) => a.sort((x, y) => ids.indexOf(x) - ids.indexOf(y));
      if (dove) return via.then(() => salvaDom(Object.assign({}, dove, { gruppi: ordina(dove.gruppi.concat(g)) })));
      const modello = righe[0];
      return via.then(() => salvaDom(Object.assign(nuovaRiga(data, [g]), modello ? { ora: modello.ora, luogo: '' } : {})));
    }
    if (!r) return;
    if (c === 'ora' && u.value) return salvaDom(Object.assign({}, r, { ora: u.value }));
    if (c === 'luogo') return salvaDom(Object.assign({}, r, { luogo: u.value.trim() }));
    if (c === 'esterno') return salvaDom(Object.assign({}, r, { esterno: u.value.trim(), conduttore: '' }));
    if (c === 'cond') { if (u.value === '@scrivi') { C.scrivi = r.id; return rd(); } return salvaDom(Object.assign({}, r, { conduttore: u.value, esterno: '' })); }
  }
  /** Il sorvegliante o l'assistente di un gruppo: le domeniche del suo gruppo. */
  P.viste.domeniche = function () {
    const h0 = P.testata('Domeniche del gruppo', DOM.d ? esc(DOM.d.nomeMese) : '', 'home');
    if (!DOM.d) {
      if (!DOM.carico) { DOM.carico = true; P.srv('domenicheGruppo', DOM.mese || '').then((d) => { DOM.d = d; DOM.mese = d.mese; DOM.carico = false; P.disegna(); }).catch((e) => { DOM.carico = false; P.toast(e.message, true); }); }
      return h0 + '<p class="nota">Carico…</p>';
    }
    const oggi = new Date().toISOString().slice(0, 7), mesi = [0, 1, 2].map((n) => meseDopo(oggi, n));
    let h = h0 + '<div class="rp-bar"><select data-cmd="meseDom">' + mesi.map((m) => '<option value="' + m + '"' + (m === DOM.mese ? ' selected' : '') + '>' + P.cap(nomeMese(m)) + '</option>').join('') + '</select></div>';
    h += '<p class="rp-aiuto">Qui compili le comitive della domenica del gruppo <b>' + esc(DOM.d.gruppo) + '</b>: orario, luogo e conduttore. Le comitive con altri gruppi le vedi e puoi metterci il conduttore; come si dividono i gruppi lo decide chi cura il programma delle comitive.</p>' + sediDatalist();
    DOM.d.settimane.forEach((w, i) => { h += '<section class="cm-wk"><h3><b>' + (i + 1) + 'ª settimana</b><span>' + intervallo(w.lunedi) + '</span></h3>' + domenica(Object.assign({ comitive: [] }, w), i, DOM.d.gruppo) + '</section>'; });
    return h;
  };
  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'comitive' && S.vista !== 'domeniche') return;
    const u = e.target.closest('[data-cmd]');
    if (!u || u.tagName === 'SELECT' || u.tagName === 'INPUT') return;
    azioneDom(u);
  });
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'comitive' && S.vista !== 'domeniche') return;
    const u = e.target.closest('[data-cmd]');
    if (!u) return;
    if (u.dataset.cmd === 'meseDom') { DOM.mese = u.value; DOM.d = null; return P.disegna(); }
    cambiaDom(u);
  });

  /* ── foglio A4 (come in Congregation Manager) ── */
  function vistaFoglio() {
    const F = P.fogliCM, D = C.d, imp = C.st.impostazioni || (C.st.impostazioni = {});
    const variante = pref('cm-comitive-variante', 'schede'), margini = pref('cm-margini', 'standard');
    const pers = F.conduttoriComitive(D);
    let h = '<div class="rp-bar"><select data-cm="versione"><option value="generale"' + (C.versione === 'generale' ? ' selected' : '') + '>Programma generale · nominati</option><option value="tabella"' + (C.versione === 'tabella' ? ' selected' : '') + '>Tabella informazioni · senza conduttori della domenica</option>' +
      pers.map((p) => '<option value="p:' + p.id + '"' + (C.versione === 'p:' + p.id ? ' selected' : '') + '>Personale · ' + esc(p.cognome + ' ' + p.nome) + '</option>').join('') + '</select>' +
      '<span class="seg">' + [['schede', 'Schede'], ['tabella', 'Tabella']].map((v) => '<button data-cm="variante" data-v="' + v[0] + '" class="' + (variante === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') + '</span>' +
      '<select data-cm="margini">' + Object.keys(F.MARGINI).map((k) => '<option value="' + k + '"' + (margini === k ? ' selected' : '') + '>Margini ' + F.MARGINI[k].label.toLowerCase() + '</option>').join('') + '</select>' +
      '<button class="btn" data-cm="stampa" style="background:#A86F00;border-color:#A86F00">Stampa / Salva PDF</button></div>' +
      '<p class="rp-aiuto">Nella finestra di stampa scegli «Salva come PDF», A4, margini «Nessuno», grafica di sfondo attiva. Le comitive nascoste non compaiono; quelle annullate restano grigie con il motivo.</p>';
    const piede = (D.foglio && D.foglio.piede) || {};
    h += '<details class="cm-pan"><summary>Impostazioni del foglio · sorvegliante, assistenti e piè di pagina</summary><div class="g">' +
      '<label>Sorvegliante del servizio<input data-cm="imp" data-v="sorvegliante" value="' + esc(imp.sorvegliante || '') + '" placeholder="es. P. Guerrazzi"></label>' +
      '<label>Assistenti<input data-cm="imp" data-v="assistenti" value="' + esc(imp.assistenti || '') + '" placeholder="es. L. Masullo, D. Diodati"></label>' +
      '<label>Domeniche (se non ci sono comitive dei gruppi)<input data-cm="imp" data-v="domeniche" value="' + esc(imp.domeniche || '') + '" placeholder="tutte le domeniche"></label></div>' +
      '<p class="nota" style="margin:10px 0 0">Piè di pagina (vale per tutti i mesi). Vuoto = il testo di sempre. Puoi usare {mese}, {sorvegliante}, {assistenti}.</p>' +
      F.PARTI_PIEDE.map((x) => '<div class="pp"><span>' + x[1] + '</span><input type="text" data-cm="piede" data-v="' + x[0] + '" value="' + esc(piede[x[0]] || '') + '" placeholder="' + esc(x[2]) + '"><label style="display:flex;gap:4px;align-items:center;text-transform:none;letter-spacing:0;font-weight:500"><input type="checkbox" data-cm="piedeNo" data-v="' + x[0] + '"' + ((piede.nascosti || []).indexOf(x[0]) >= 0 ? ' checked' : '') + '> nascondi</label></div>').join('') + '</details>';
    // orario e luogo per comitiva
    const L = F.leggiLayout(imp), uscite = [];
    D.settimane.forEach((w) => w.comitive.forEach((c) => { if (!c.annullata && !C.st.nascoste[c.k]) uscite.push(c); }));
    h += '<details class="cm-pan"><summary>Orario e luogo sul foglio</summary><p class="nota" style="margin:6px 0 0">Tocca <b>Orario</b> o <b>Luogo</b> per accenderli o spegnerli in quella comitiva: compaiono sopra il nome. <b>Testo</b> li sostituisce con quello che scrivi. Quelle con «auto» seguono la regola: solo fuori dall\'orario solito.</p>' +
      '<div class="rp-bar" style="margin-top:6px"><button class="btn small soft" data-cm="metaTutte" data-v="ora_luogo">Mostra in tutte</button><button class="btn small soft" data-cm="metaTutte" data-v="ora">Solo orario in tutte</button><button class="btn small soft" data-cm="metaTutte" data-v="nascondi">Nascondi in tutte</button><button class="btn small soft" data-cm="metaTutte" data-v="">Solo fuori orario</button></div><ul>' +
      uscite.map((c) => {
        const modo = (L.meta || {})[c.k] || 'auto', std = F.standard(D, c), pred = L.predefinito || 'ora_luogo';
        const eff = modo === 'auto' ? (std ? 'nascondi' : pred) : modo;
        const o = eff !== 'testo' && (eff === 'ora_luogo' || eff === 'ora'), lu = eff !== 'testo' && (eff === 'ora_luogo' || eff === 'luogo');
        return '<li><b>' + F.giornoSigla(c.data) + ' ' + F.day(c.data).d + ' · ' + esc(c.ora) + '</b>' + (modo === 'auto' ? '<i>auto</i>' : '') +
          '<button class="chip2' + (o ? ' on' : '') + '" data-cm="meta" data-k="' + esc(c.k) + '" data-v="o">Orario</button><button class="chip2' + (lu ? ' on' : '') + '" data-cm="meta" data-k="' + esc(c.k) + '" data-v="l">Luogo</button><button class="chip2' + (eff === 'testo' ? ' on' : '') + '" data-cm="meta" data-k="' + esc(c.k) + '" data-v="t">Testo</button>' +
          (eff === 'testo' ? '<input data-cm="metaTesto" data-k="' + esc(c.k) + '" value="' + esc((L.testo || {})[c.k] || '') + '" placeholder="es. ore 16 · Parco" style="flex:1;min-width:140px;border:1px solid var(--rule);border-radius:6px;padding:4px 6px">' : '') + '</li>';
      }).join('') + '</ul></details>';
    // caratteri
    const car = L.caratteri || {}, riq = L.riquadri || {};
    const sl = (nome, dv, v, cls) => '<label class="sl' + (cls || '') + '"><span>' + esc(nome) + '</span><input type="range" min="' + F.MIN_SCALA + '" max="' + F.MAX_SCALA + '" step="0.05" value="' + v + '" ' + dv + '><span style="text-align:right">' + Math.round(v * 100) + '%</span>' + (cls ? '<button class="chip2" ' + dv.replace('data-cm="riq"', 'data-cm="riq0"') + '>100%</button>' : '') + '</label>';
    h += '<details class="cm-pan"><summary>Caratteri del foglio</summary><div style="display:grid;gap:6px;margin-top:8px">' +
      F.ZONE.map((z) => sl(z[1], 'data-cm="car" data-v="' + z[0] + '"', car[z[0]] || 1)).join('') + '</div>' +
      '<p class="nota" style="margin:10px 0 4px">Per riquadro: ingrandisci o rimpicciolisci solo un riquadro (giorno, nomi e orario al suo interno), sopra le misure generali.</p>' +
      F.riquadri(D).map((g) => '<b style="font-size:12px">' + esc(g.titolo) + '</b><div style="display:grid;gap:4px;margin:2px 0 6px">' + g.voci.map((r) => sl(r.label, 'data-cm="riq" data-k="' + esc(r.chiave) + '"', riq[r.chiave] || 1, ' r')).join('') + '</div>').join('') +
      '<div style="text-align:right"><button class="btn small soft" data-cm="layout0">Ripristina</button></div></details>';
    return h + '<div class="rp-anteprima cm4"><div class="pgm-fit" id="cmFit"><div class="pgm-scale" id="cmScale">' + F.carta(D, chiDi(C.versione), variante, margini) + '</div></div></div>';
  }
  function layout() { const imp = C.st.impostazioni || (C.st.impostazioni = {}); imp.layout = imp.layout || {}; ['caratteri', 'meta', 'testo', 'riquadri'].forEach((x) => { imp.layout[x] = imp.layout[x] || {}; }); return imp.layout; }
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
    if (k === 'cMod') { C.mod = u.dataset.k; return rd(); }
    if (k === 'cNuova') { C.mod = 'nuova:' + v; return rd(); }
    if (k === 'cChiudi') { C.mod = null; return rd(); }
    if (k === 'cAnnulla') { const mot = prompt('Perché non si tiene? (comparirà in grigio sul programma)', ''); if (mot === null) return; return cambioCalendario(u.dataset.k, { azione: 'annulla', motivo: mot }); }
    if (k === 'cRipristina') return cambioCalendario(u.dataset.k, { azione: 'ripristina' });
    if (k === 'cTogli') { if (!confirm('Tolgo questa comitiva in più?')) return; return cambioCalendario(u.dataset.k, { azione: 'togli' }); }
    if (k === 'cSalva') {
      const f = u.closest('.cm-mod'), val = (id) => (document.getElementById(id) || {}).value || '';
      const seg = document.getElementById('cmSeguenti');
      const d = { data: val('cmGiorno'), ora: val('cmOra').replace(/^0(\d):/, '$1:'), luogo: val('cmLuogo').trim(), motivo: val('cmMotivo').trim(), seguenti: !!(seg && seg.checked) };
      if (f.dataset.k) return cambioCalendario(f.dataset.k, Object.assign({ azione: 'cambia' }, d));
      return cambioCalendario('', Object.assign({ azione: 'aggiungi' }, d));
    }
    if (k === 'stampa') { adatta(); return window.print(); }
    if (k === 'variante') { salvaPref('cm-comitive-variante', v); return rd(); }
    if (k === 'meta') {
      const L = layout(), id = u.dataset.k, F = P.fogliCM, c = C.d.settimane.flatMap((w) => w.comitive).find((x) => x.k === id);
      const modo = L.meta[id] || 'auto', eff = modo === 'auto' ? (F.standard(C.d, c) ? 'nascondi' : (L.predefinito || 'ora_luogo')) : modo;
      let o = eff !== 'testo' && (eff === 'ora_luogo' || eff === 'ora'), lu = eff !== 'testo' && (eff === 'ora_luogo' || eff === 'luogo');
      if (v === 't') L.meta[id] = eff === 'testo' ? 'auto' : 'testo';
      else { if (v === 'o') o = !o; else lu = !lu; L.meta[id] = o && lu ? 'ora_luogo' : o ? 'ora' : lu ? 'luogo' : 'nascondi'; }
      if (L.meta[id] === 'auto') delete L.meta[id];
      cambiato(); return rd();
    }
    if (k === 'metaTutte') { const L = layout(); L.meta = {}; if (v) C.d.settimane.forEach((w) => w.comitive.forEach((c) => { if (!c.annullata) L.meta[c.k] = v; })); cambiato(); return rd(); }
    if (k === 'riq0') { delete layout().riquadri[u.dataset.k]; cambiato(); return rd(); }
    if (k === 'layout0') { if (!confirm('Riporto il foglio alle misure normali?')) return; C.st.impostazioni.layout = {}; cambiato(); return rd(); }
    if (k === 'pubblica') {
      if (!confirm('Pubblico in bacheca il programma comitive di ' + nomeMese(C.mese) + ' così com\'è adesso?')) return;
      u.disabled = true;
      const vai = () => P.srv('pubblica', 'comitive', C.mese).then((x) => { C.pub = x; P.toast('Pubblicato in bacheca'); rd(); }).catch((err) => { u.disabled = false; P.toast(err.message, true); });
      if (C.salvo === 'Da salvare' || C.salvo === 'Salvo…') { clearTimeout(C.coda); return P.srv('salvaComitive', C.mese, C.st).then(vai); }
      return vai();
    }
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
    if (k === 'versione') { C.versione = u.value; return rd(); }
    if (k === 'margini') { salvaPref('cm-margini', u.value); return rd(); }
    if (k === 'imp') { (C.st.impostazioni = C.st.impostazioni || {})[u.dataset.v] = u.value.trim(); cambiato(); return rd(); }
    if (k === 'metaTesto') { layout().testo[u.dataset.k] = u.value; cambiato(); return rd(); }
    if (k === 'car' || k === 'riq') { const L = layout(), x = Number(u.value); if (k === 'car') { if (x === 1) delete L.caratteri[u.dataset.v]; else L.caratteri[u.dataset.v] = x; } else { if (x === 1) delete L.riquadri[u.dataset.k]; else L.riquadri[u.dataset.k] = x; } cambiato(); return rd(); }
    if (k === 'piede' || k === 'piedeNo') {
      const pd = Object.assign({ nascosti: [] }, C.d.foglio.piede || {});
      if (k === 'piede') { if (u.value.trim()) pd[u.dataset.v] = u.value.trim(); else delete pd[u.dataset.v]; }
      else pd.nascosti = u.checked ? pd.nascosti.concat([u.dataset.v]) : pd.nascosti.filter((x) => x !== u.dataset.v);
      return P.srv('salvaPiedeComitive', pd).then((r) => { C.d.foglio.piede = r; rd(); P.toast('Piè di pagina salvato'); }).catch((err) => P.toast(err.message, true));
    }
  });
})();
