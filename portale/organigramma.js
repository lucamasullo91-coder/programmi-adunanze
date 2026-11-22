/* Ruoli e gruppi (solo Luca): Reparti, Ruoli degli anziani, Gruppi di servizio, Organigramma, Chi vede cosa.
 * Una sola fonte: i ruoli sono le celle dell'anagrafica (sezioni «RUOLI NEI REPARTI» e «RUOLI DEGLI ANZIANI»);
 * qui si guardano per compito invece che per persona e si salvano con salva(), come in anagrafica.
 * Il comitato di servizio non si compila: sono gli incaricati di coordinatore, segretario e sorvegliante del servizio.
 * I due fogli A4 (Gruppi di servizio, Organigramma) servono anche alla bacheca: P.fogli.gruppi / P.fogli.organigramma. */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const CC = { nome: 2, n: 3, cognome: 4, sesso: 6, gruppo: 8, nomina: 9, ruolo: 11, sigla: 12, stato: 14 };
  const COMITATO = ['Coordinatore del corpo degli anziani', 'Segretario', 'Sorvegliante del servizio'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const COL_REP = { 'Audio/Video': '#521F46', 'Uscieri': '#4D5A68', 'Letteratura e territori': '#A86F00', 'Pulizie': '#2E75B5' };
  const O = { tab: 'reparti', st: null, carico: false, perm: null, come: null, lavoro: false };

  const css = document.createElement('style');
  css.textContent = `
  .og-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
  .og-tabs button{border:1px solid var(--rule);background:#fff;border-radius:999px;padding:7px 13px;font:inherit;font-size:13.5px;font-weight:600;color:var(--slate);cursor:pointer}
  .og-tabs button.on{background:var(--slate);border-color:var(--slate);color:#fff}
  .og-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
  .og-c{background:#fff;border:1px solid var(--rule);border-top:4px solid var(--c,#4D5A68);border-radius:8px;padding:12px 14px;display:grid;gap:10px;align-content:start}
  .og-c h3{margin:0;font-size:15px;color:var(--c,#4D5A68)}
  .og-r{display:grid;gap:5px}
  .og-r>span{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--slate)}
  .og-r select{width:100%;border:1px solid var(--rule);border-radius:6px;padding:8px;font:inherit;font-size:15px;background:#fff}
  .og-chips{display:flex;flex-wrap:wrap;gap:6px}
  .og-chip{display:inline-flex;align-items:center;gap:6px;background:#F4F3EF;border:1px solid #DDD8CC;border-radius:999px;padding:4px 6px 4px 11px;font-size:13.5px}
  .og-chip button{border:0;background:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:1;color:var(--slate)}
  .og-cs{background:#F7ECE8;border:1px solid #E7CFC6;border-radius:8px;padding:12px 14px;margin-bottom:14px}
  .og-cs h3{margin:0 0 8px;font-size:15px;color:#A8432B}
  .og-cs div{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
  .og-cs p{margin:0;font-size:12px;color:var(--slate)} .og-cs p b{display:block;font-size:15px;color:var(--ink)}
  .og-v{background:#fff;border:1px solid var(--rule);border-radius:8px;margin-bottom:8px}
  .og-v summary{list-style:none;cursor:pointer;padding:10px 12px;display:grid;gap:3px}
  .og-v summary::-webkit-details-marker{display:none}
  .og-v summary b{font-size:14.5px}
  .og-v summary small{font-size:12.5px;color:var(--slate);line-height:1.35}
  .og-v summary em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2E75B5}
  .og-v.si summary{border-left:4px solid #1F8A4C} .og-v.no summary{border-left:4px solid #C9C4BA}
  .og-v .in{padding:4px 12px 12px;display:grid;gap:10px}
  .og-v fieldset{border:0;padding:0;margin:0;display:grid;gap:4px}
  .og-v legend{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--slate);margin-bottom:2px}
  .og-v label{display:flex;gap:9px;align-items:center;font-size:14px;padding:3px 0}
  .og-v label input{width:19px;height:19px;flex:none}
  .og-g{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--slate);margin:16px 2px 8px}
  .og-come{background:#EAF2FA;border:1px solid #CFE0F1;border-radius:8px;padding:10px 12px;margin:0 0 12px;display:grid;gap:8px}
  .og-come select{border:1px solid #CFE0F1;border-radius:6px;padding:8px;font:inherit;font-size:15px;background:#fff}
  .og-come p{margin:0;font-size:13px;color:#235C90}
  .og-sticky{position:sticky;bottom:0;background:var(--paper,#F6F5F2);padding:8px 0;display:flex;gap:8px;border-top:1px solid var(--rule);margin-top:10px}
  /* fogli A4 */
  .fa4 .og-sheet .og-ico{width:20px;height:20px;flex:none}
  .fa4 .og-gs .pgm-head h1{color:#A86F00}
  .fa4 .og-gs .pgm-head{border-color:#A86F00}
  .fa4 .og-num{display:grid;grid-template-columns:repeat(3,auto);gap:6px;align-self:end}
  .fa4 .og-num>div{background:#F7EFDF;border-left:3px solid #A86F00;border-radius:3px;padding:4px 10px 5px;min-width:96px}
  .fa4 .og-num b{display:block;font-size:17px;font-weight:800;color:#1F2630;line-height:1.1}
  .fa4 .og-num span{display:block;font-size:7.6px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#A86F00;white-space:nowrap}
  .fa4 .og-gr{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px;align-content:start}
  .fa4 .og-box{border:1px solid var(--rule);border-radius:4px;overflow:hidden;background:#fff}
  .fa4 .og-band{background:var(--bc,#A86F00);color:#fff;padding:5px 10px 6px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
  .fa4 .og-band small{display:block;font-size:7.8px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.9}
  .fa4 .og-band b{display:block;font-size:15px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;line-height:1.1}
  .fa4 .og-band em{font-style:normal;font-size:8.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.95;white-space:nowrap;padding-bottom:1px}
  .fa4 .og-li{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:0 9px;height:var(--rh,17px);font-size:calc(var(--rh,17px) * .58);border-bottom:1px solid #EFE7D6;white-space:nowrap}
  .fa4 .og-li:last-child{border-bottom:0}
  .fa4 .og-li span{overflow:hidden;text-overflow:ellipsis}
  .fa4 .og-li u{text-decoration:none;display:inline-block;min-width:1.6em;color:#A86F00;font-weight:700;font-size:.85em}
  .fa4 .og-li.capo{font-weight:800;background:#F7EFDF}
  .fa4 .og-li.ass{font-weight:700;background:#FBF6EC}
  .fa4 .og-li i{font-style:normal;font-size:.82em;font-weight:700;letter-spacing:.04em;color:#A86F00;border:1px solid #E6D3AE;border-radius:3px;padding:0 4px;line-height:1.35;flex:none}
  .fa4 .og-agg{margin:auto 0 4px;text-align:right;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3ad}
  .fa4 .og-agg+.pgm-foot{margin-top:0}
  .fa4 .og-sez{margin:16px 0 8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--slate);border-bottom:1.5px solid var(--slate);padding-bottom:4px}
  .fa4 .og-ruoli{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .fa4 .og-ruolo{border:1px solid var(--rule);border-top:0;border-radius:4px;overflow:hidden;background:var(--rb)}
  .fa4 .og-rt{display:flex;align-items:center;gap:8px;background:var(--rc);color:#fff;padding:7px 10px;min-height:40px}
  .fa4 .og-rt b{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.2}
  .fa4 .og-ico.img{width:24px;height:24px;border-radius:4px;border:1.5px solid rgba(255,255,255,.85)}
  .fa4 .og-n{font-size:12px;font-weight:800;text-transform:uppercase;padding:2px 0;line-height:1.25}
  .fa4 .og-inc{padding:7px 10px 6px}
  .fa4 .og-inc .og-n{font-size:13.5px;color:var(--rc)}
  .fa4 .og-ass{padding:5px 10px 8px;border-top:1px dashed rgba(0,0,0,.14)}
  .fa4 .og-ass small,.fa4 .og-capo small,.fa4 .og-cs3 small,.fa4 .og-el small{display:block;font-size:7.6px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--slate);margin-bottom:2px}
  .fa4 .og-ass .og-n{font-size:11px;font-weight:600}
  .fa4 .og-cs3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .fa4 .og-cs3>div{background:var(--rb);border-left:4px solid var(--rc);border-radius:3px;padding:7px 10px}
  .fa4 .og-cs3 small{color:var(--rc)}
  .fa4 .og-rp{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:start}
  .fa4 .og-rep .og-capo{padding:6px 10px;background:#F4F3EF;border-bottom:1px solid #fff}
  .fa4 .og-rep .og-capo .og-n{color:var(--bc)}
  .fa4 .og-rp{align-items:stretch}
  .fa4 .og-rep{display:flex;flex-direction:column}
  .fa4 .og-rep .og-band{height:40px;align-items:center}
  .fa4 .og-rep .og-band b{font-size:12px;white-space:nowrap;letter-spacing:.01em}
  .fa4 .og-rep .og-band b.lungo{font-size:10.5px}
  .fa4 .og-rep .og-ass{flex:1}
  .fa4 .og-el{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fa4 .og-el>div{background:#F4F3EF;border-radius:3px;padding:7px 10px}
  .fa4 .og-el .og-n{font-size:10.5px;font-weight:600;padding:1px 0}
  .fa4 .og-el .cols{columns:2;column-gap:12px}
  .fa4 .og-vuoto{color:#9aa3ad;font-weight:400}`;
  document.head.appendChild(css);

  /* ── i fratelli dall'anagrafica già caricata (S.dati) ── */
  const attivi = () => S.dati.fratelli.filter((f) => f.v[CC.nome] && (!f.v[CC.stato] || f.v[CC.stato] === 'Attivo'));
  const nomeF = (f) => ((f.v[CC.n] || '') + ' ' + (f.v[CC.cognome] || '')).trim() || f.v[CC.nome];
  const perCognome = (a, b) => ((a.v[CC.cognome] || '') + ' ' + (a.v[CC.n] || '')).localeCompare((b.v[CC.cognome] || '') + ' ' + (b.v[CC.n] || ''), 'it');
  const colRuoli = (tipo) => (S.dati.colonne || []).filter((x) => x.ruolo && x.tipoRuolo === tipo);
  const eCoord = (v) => v === 'Coordinatore del reparto' || v === 'Coordinatore';
  const chiHa = (x, test) => attivi().filter((f) => test(f.v[x.c] || '')).sort(perCognome);
  const ammessi = (x, valore) => attivi().filter((f) => {
    const nomina = f.v[CC.nomina], uomo = f.v[CC.sesso] === 'Uomo';
    if (!uomo) return false;
    if (x.tipoRuolo === 'reparto' && valore === 'Sorvegliante') return nomina === 'Anziano';
    if (x.tipoRuolo === 'anziani' && valore === 'Incaricato') return /gestione/i.test(x.titolo) ? nomina === 'Anziano' || nomina === 'Servitore di ministero' : nomina === 'Anziano';
    return true;
  }).sort(perCognome);

  function salvaRuoli(mod) {
    if (!mod.length) return;
    O.lavoro = true;
    P.srv('salva', mod).then((ris) => {
      (ris.righe || []).forEach((n) => { S.dati.fratelli = S.dati.fratelli.map((f) => (f.id === n.id ? n : f)); });
      if (ris.errori && ris.errori.length) P.toast(ris.errori.join(' · '), true); else P.toast('Salvato');
      O.st = null; O.lavoro = false; rd();
    }).catch((e) => { O.lavoro = false; P.toast(e.message, true); rd(); });
  }
  /** Un solo titolare: chi lo era perde il ruolo, il nuovo lo prende. */
  function unico(x, valore, test, id) {
    const mod = chiHa(x, test).filter((f) => f.id !== id).map((f) => ({ id: f.id, c: x.c, valore: '' }));
    if (id) mod.push({ id: id, c: x.c, valore: valore });
    salvaRuoli(mod);
  }
  const rd = () => { const y = window.scrollY; P.disegna(); window.scrollTo(0, y); };

  /* ── scheda di un compito (reparto o ruolo degli anziani) ── */
  function scheda(x) {
    const rep = x.tipoRuolo === 'reparto';
    const sel = (etichetta, valore, test) => {
      const ora = chiHa(x, test);
      const altri = ora.length > 1 ? ' (' + ora.map(nomeF).join(', ') + ')' : '';
      return '<label class="og-r"><span>' + etichetta + altri + '</span><select data-og="unico" data-c="' + x.c + '" data-val="' + esc(valore) + '">' +
        '<option value="">— nessuno —</option>' + ammessi(x, valore).map((f) => '<option value="' + esc(f.id) + '"' + (ora[0] && ora[0].id === f.id ? ' selected' : '') + '>' + esc(nomeF(f)) + '</option>').join('') + '</select></label>';
    };
    const ass = chiHa(x, (v) => v === 'Assistente');
    const scelti = {}; ass.forEach((f) => { scelti[f.id] = 1; });
    let h = '<div class="og-c" style="--c:' + (COL_REP[x.titolo] || (rep ? '#4D5A68' : '#A8432B')) + '"><h3>' + esc(x.titolo) + '</h3>';
    if (rep) h += sel('Sorvegliante del reparto', 'Sorvegliante', (v) => v === 'Sorvegliante') + sel('Coordinatore', 'Coordinatore del reparto', eCoord);
    else h += sel('Incaricato', 'Incaricato', (v) => v === 'Incaricato');
    h += '<div class="og-r"><span>Assistenti</span><div class="og-chips">' + (ass.length ? ass.map((f) => '<span class="og-chip">' + esc(nomeF(f)) + '<button data-og="togli" data-c="' + x.c + '" data-id="' + esc(f.id) + '" aria-label="Togli ' + esc(nomeF(f)) + '">×</button></span>').join('') : '<span style="font-size:13px;color:var(--slate)">Nessuno</span>') + '</div>' +
      '<select data-og="aggiungi" data-c="' + x.c + '"><option value="">+ Aggiungi un assistente…</option>' + ammessi(x, 'Assistente').filter((f) => !scelti[f.id]).map((f) => '<option value="' + esc(f.id) + '">' + esc(nomeF(f)) + (f.v[x.c] ? ' (ora: ' + esc(f.v[x.c]) + ')' : '') + '</option>').join('') + '</select></div>';
    return h + '</div>';
  }

  /* ── fogli A4 (anche per la bacheca) ── */
  P.fogli = P.fogli || {};
  const ASSETS = (window.__BASE || 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/portale/').replace(/portale\/$/, '') + 'src/assets/';
  const quando = (iso) => { const d = iso ? new Date(iso) : new Date(); return MESI[d.getMonth()] + ' ' + d.getFullYear(); };
  // icone a linee (si colorano col testo) e immagini della guida
  const SVG = {
    persone: '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.3c1.8.8 3 2.9 3 5.7"/>',
    foglio: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>',
    chiave: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M14.5 8.5l2 2"/>',
    dialogo: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    torre: '<path d="M8 21V9h8v12M6 21h12M8 9l-1-3h10l-1 3M9 6V4h2v2M13 6V4h2v2M11 21v-4h2v4M10.5 12h3"/>',
  };
  const ico = (id, col) => {
    const img = { ministero: 'ministero.png', tesori: 'tesori.png', vita: 'vita.png' }[id];
    if (img) return '<img class="og-ico img" src="' + ASSETS + img + '" alt="">';
    return '<svg class="og-ico" viewBox="0 0 24 24" fill="none" stroke="' + (col || '#fff') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (SVG[id] || '') + '</svg>';
  };
  // colore e icona di ogni compito degli anziani (colori delle sezioni della guida e della Torre di Guardia)
  const COMPITO = {
    'Coordinatore del corpo degli anziani': { c: '#A8432B', bg: '#F7ECE8', i: 'persone' },
    'Segretario': { c: '#4E8A63', bg: '#EAF3ED', i: 'foglio' },
    'Sorvegliante del servizio': { c: '#A86F00', bg: '#F7EFDF', i: 'ministero' },
    "Sorvegliante dell'adunanza Vita e ministero": { c: '#2E6E7C', bg: '#E6F0F2', i: 'tesori' },
    'Conduttore della Torre di Guardia': { c: '#16325C', bg: '#E8EDF4', i: 'torre' },
    'Comitato di gestione': { c: '#4D5A68', bg: '#EEF0F2', i: 'chiave' },
    'Consigliere': { c: '#6E5A9E', bg: '#F0EDF6', i: 'dialogo' },
  };
  // sigla del foglio, come nelle pubblicazioni: fsg11.26 (field service groups, mese.anno)
  const codice = (s, iso) => { const d = iso ? new Date(iso) : new Date(); return s + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getFullYear()).slice(2); };
  const stileCompito = (t) => COMPITO[t] || { c: '#4D5A68', bg: '#EEF0F2', i: 'persone' };
  const nomi1 = (a) => (a && a.length ? a.map((x) => '<div class="og-n">' + esc(x) + '</div>').join('') : '<div class="og-n og-vuoto">—</div>');

  P.fogli.gruppi = function (d) {
    const gg = d.gruppi || [], k = d.numeri || {};
    const max = Math.max(1, ...gg.map((g) => g.membri.length));
    const righeCol = Math.ceil(gg.length / 3) || 1;
    const rh = Math.max(11, Math.min(19, Math.floor((830 / righeCol - 48) / max)));
    const num = (v, t) => '<div><b>' + (v == null ? '—' : v) + '</b><span>' + t + '</span></div>';
    let h = '<article class="pgm pgm-print og-sheet og-gs"><header class="pgm-head"><div class="left"><div class="cong">' + esc(d.cong || 'Napoli Pianura Trencia') + '</div><div class="gold"></div><h1>Gruppi di servizio</h1></div>' +
      '<div class="og-num">' + num(k.proclamatori, 'Proclamatori') + num(k.anziani, 'Anziani') + num(k.servitori, 'Servitori') + num(k.pr, 'Pionieri regolari') + num(k.pa, 'Pionieri ausiliari') + num(k.nb, 'Non battezzati') + '</div></header>' +
      '<div class="og-gr" style="--rh:' + rh + 'px">';
    gg.forEach((g) => {
      h += '<section class="og-box"><div class="og-band"><div><small>Gruppo</small><b>' + esc(g.titolo) + '</b></div><em>' + g.membri.length + (g.membri.length === 1 ? ' proclamatore' : ' proclamatori') + '</em></div>' +
        g.membri.map((m, i) => '<div class="og-li' + (m.capo ? ' capo' : m.ass ? ' ass' : '') + '"><span><u>' + (i + 1) + '</u>' + esc(m.nome) + '</span>' + (m.sigla ? '<i>' + esc(m.sigla) + '</i>' : '') + '</div>').join('') + '</section>';
    });
    return h + '</div><p class="og-agg">Aggiornato a ' + esc(quando(d.quando)) + '</p><footer class="pgm-foot"><span><b>Gruppi di servizio</b>' + gg.length + ' gruppi</span><span>SGS sorvegliante · SDG servitore · ASS assistente · PR pioniere regolare · PA ausiliario · NB non battezzato</span><span class="code">' + esc(codice('fsg', d.quando)) + '</span></footer></article>';
  };
  P.fogli.organigramma = function (d) {
    let h = '<article class="pgm pgm-print og-sheet og-org"><header class="pgm-head"><div class="left"><div class="cong">' + esc(d.cong || 'Napoli Pianura Trencia') + '</div><div class="gold"></div><h1>Organigramma</h1><div class="mese">Della congregazione</div></div></header>';
    h += '<div class="og-sez">Ruoli degli anziani</div><div class="og-ruoli">' + (d.anziani || []).map((x) => {
      const s = stileCompito(x.compito);
      return '<section class="og-ruolo" style="--rc:' + s.c + ';--rb:' + s.bg + '"><div class="og-rt">' + ico(s.i) + '<b>' + esc(x.compito) + '</b></div><div class="og-inc">' + nomi1(x.incaricati) + '</div>' +
        (x.assistenti.length ? '<div class="og-ass"><small>Assistenti</small>' + nomi1(x.assistenti) + '</div>' : '') + '</section>';
    }).join('') + '</div>';
    h += '<div class="og-sez">Comitato di servizio</div><div class="og-cs3">' + (d.comitato || []).map((x) => {
      const s = stileCompito(x.compito);
      return '<div style="--rc:' + s.c + ';--rb:' + s.bg + '"><small>' + esc(x.compito) + '</small>' + nomi1(x.chi) + '</div>';
    }).join('') + '</div>';
    h += '<div class="og-sez">Reparti</div><div class="og-rp">' + (d.reparti || []).map((r) => {
      const c = COL_REP[r.reparto] || '#4D5A68';
      return '<section class="og-box og-rep" style="--bc:' + c + '"><div class="og-band"><div><small>Reparto</small><b' + (r.reparto.length > 16 ? ' class="lungo"' : '') + '>' + esc(r.reparto) + '</b></div></div>' +
        '<div class="og-capo"><small>Sorvegliante</small>' + nomi1(r.sorveglianti) + '</div><div class="og-capo"><small>Coordinatore</small>' + nomi1(r.coordinatori) + '</div>' +
        '<div class="og-ass"><small>Assistenti</small>' + nomi1(r.assistenti) + '</div></section>';
    }).join('') + '</div>';
    if (d.mostraElenchi && d.elenchi) h += '<div class="og-sez">Anziani e servitori di ministero</div><div class="og-el">' +
      [['Anziani', d.elenchi.anziani], ['Servitori di ministero', d.elenchi.servitori]].map((x) => '<div><small>' + x[0] + ' · ' + x[1].length + '</small><div class="cols">' + nomi1(x[1]) + '</div></div>').join('') + '</div>';
    return h + '<footer class="pgm-foot"><span><b>Organigramma</b>Ruoli degli anziani, comitato di servizio e reparti</span><span class="code">' + esc(d.cong || '') + '</span></footer></article>';
  };
  const anteprima = (html) => '<div class="rp-anteprima fa4"><div class="pgm-fit" data-ogfit="1"><div class="pgm-scale">' + html + '</div></div></div>';
  function adatta() {
    P.app.querySelectorAll('[data-ogfit]').forEach((fit) => {
      const sc = fit.firstElementChild; if (!sc) return;
      const k = Math.min(1, fit.clientWidth / 794);
      sc.style.transform = 'scale(' + k + ')'; fit.style.height = (sc.scrollHeight * k) + 'px';
    });
  }

  /* ── chi vede cosa ── */
  function scelti(v) { return O.perm[v.k] || v.d; }
  function vistaPermessi() {
    const st = O.st, nomeR = {};
    st.catalogo.forEach((g) => g.r.forEach((r) => { nomeR[r[0]] = r[1]; }));
    let h = '<p class="rp-aiuto">Tocca una voce per scegliere i ruoli che la vedono. Tu vedi sempre tutto; chi compila un programma vede sempre le immagini da confermare. Le modifiche valgono dopo «Salva».</p><div class="og-come"><p><b>Guarda come…</b> Scegli una persona: in verde le cose che vede con i suoi ruoli e con questa tabella (già salvata).</p><select data-og="come"><option value="">— nessuno —</option>' +
      st.persone.map((p) => '<option value="' + esc(p.id) + '"' + (O.come && O.come.id === p.id ? ' selected' : '') + '>' + esc(p.nome) + '</option>').join('') + '</select>' +
      (O.come && O.come.r ? '<p>' + (O.come.r.tutto ? 'Vede tutto (accesso completo).' : 'Ruoli: ' + O.come.r.ruoli.map((k) => nomeR[k] || k).join(' · ')) + '</p>' : '') + '</div>';
    let g0 = '';
    st.voci.forEach((v) => {
      if (v.g !== g0) { g0 = v.g; h += '<div class="og-g">' + esc(g0) + '</div>'; }
      const sc = scelti(v), pers = !!O.perm[v.k];
      const vede = O.come && O.come.r ? (O.come.r.voci.indexOf(v.k) >= 0 ? ' si' : ' no') : '';
      h += '<details class="og-v' + vede + '"' + (O.apri === v.k ? ' open' : '') + ' data-voce="' + esc(v.k) + '"><summary><b>' + esc(v.n) + '</b><small>' + (sc.length ? sc.map((k) => esc(nomeR[k] || k)).join(' · ') : 'Solo tu') + '</small>' + (pers ? '<em>Scelto da te</em>' : '') + '</summary><div class="in">' +
        st.catalogo.map((g) => '<fieldset><legend>' + esc(g.t) + '</legend>' + g.r.map((r) => '<label><input type="checkbox" data-og="perm" data-v="' + esc(v.k) + '" data-r="' + esc(r[0]) + '"' + (sc.indexOf(r[0]) >= 0 ? ' checked' : '') + '>' + esc(r[1]) + '</label>').join('') + '</fieldset>').join('') +
        (pers ? '<button class="btn soft small" data-og="ripristina" data-v="' + esc(v.k) + '">Torna com\'era prima</button>' : '') + '</div></details>';
    });
    return h + '<div class="og-sticky"><button class="btn" data-og="salvaPerm">Salva chi vede cosa</button></div>';
  }

  P.viste.organigramma = function () {
    const h0 = P.testata('Ruoli e gruppi', 'Reparti, anziani, gruppi di servizio, chi vede cosa', 'home');
    if (!S.dati || !S.dati.io || !S.dati.io.tutto) return h0 + '<p class="nota">Questa pagina è solo per chi gestisce il portale.</p>';
    if (!O.st) {
      if (!O.carico) { O.carico = true; P.srv('og_stato').then((st) => { O.st = st; O.carico = false; if (!O.perm) { O.perm = {}; st.voci.forEach((v) => { if (v.scelti) O.perm[v.k] = v.scelti.slice(); }); } if (S.vista === 'organigramma') rd(); }).catch((e) => { O.carico = false; P.toast(e.message, true); }); }
      return h0 + '<p class="nota">Carico…</p>';
    }
    const T = [['reparti', 'Reparti'], ['anziani', 'Ruoli degli anziani'], ['gruppi', 'Gruppi di servizio'], ['org', 'Organigramma'], ['permessi', 'Chi vede cosa']];
    let h = h0 + '<div class="og-tabs">' + T.map((t) => '<button data-og="tab" data-t="' + t[0] + '" class="' + (O.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
    if (O.tab === 'reparti') {
      const cc = colRuoli('reparto');
      h += '<p class="rp-aiuto">Sono le colonne «Ruoli nei reparti» dell\'anagrafica: quello che cambi qui cambia anche lì. Il sorvegliante del reparto è un anziano.</p>';
      h += cc.length ? '<div class="og-grid">' + cc.map(scheda).join('') + '</div>' : '<p class="nota">Nell\'anagrafica non ci sono colonne «Ruoli nei reparti».</p>';
    } else if (O.tab === 'anziani') {
      const cc = colRuoli('anziani');
      if (!cc.length) return h + '<p class="rp-aiuto">In anagrafica manca ancora la sezione «Ruoli degli anziani». La creo in fondo alla scheda Fratelli, con una colonna per compito: coordinatore del corpo degli anziani, segretario, sorvegliante del servizio, sorvegliante dell\'adunanza Vita e ministero, conduttore della Torre di Guardia, comitato di gestione, consigliere.</p><button class="btn" data-og="prepara">Crea la sezione in anagrafica</button>';
      const cs = COMITATO.map((t) => { const x = cc.find((y) => y.titolo === t); return [t, x ? chiHa(x, (v) => v === 'Incaricato').map(nomeF) : []]; });
      h += '<div class="og-cs"><h3>Comitato di servizio</h3><div>' + cs.map((x) => '<p>' + esc(x[0]) + '<b>' + (x[1].length ? esc(x[1].join(', ')) : '—') + '</b></p>').join('') + '</div><p style="margin-top:8px">Si forma da solo con gli incaricati di questi tre compiti.</p></div>';
      h += '<p class="rp-aiuto">Sono le colonne «Ruoli degli anziani» dell\'anagrafica. L\'incaricato è un anziano (il comitato di gestione può avere anche servitori di ministero); gli assistenti possono essere anche servitori.</p><div class="og-grid">' + cc.map(scheda).join('') + '</div>';
    } else if (O.tab === 'gruppi' || O.tab === 'org') {
      const g = O.tab === 'gruppi', q = g ? 'gruppi' : 'organigramma', pub = O.st.pub[g ? 'gruppi' : 'org'];
      h += '<div class="rp-bar"><button class="btn" data-og="pdf">Prepara PDF</button><button class="btn soft" data-og="pubblica" data-q="' + q + '">Pubblica in bacheca</button><span class="nota" style="align-self:center">' + (pub ? 'Pubblicato il ' + pub.slice(8, 10) + '/' + pub.slice(5, 7) : 'Non pubblicato') + '</span></div>' +
        (g ? '' : '<label class="pa-check" style="display:flex;gap:9px;align-items:center;margin:0 0 8px;font-size:14px"><input type="checkbox" data-og="elenchi"' + (O.st.org.mostraElenchi ? ' checked' : '') + ' style="width:19px;height:19px">Mostra in fondo l\'elenco di anziani e servitori di ministero</label>') +
        '<p class="rp-aiuto">' + (g ? 'Dall\'anagrafica: gruppo, ruolo nel gruppo e sigla. Gruppi in ordine alfabetico; in ogni gruppo prima chi lo guida, poi l\'assistente, poi gli altri per cognome.' : 'Dai ruoli degli anziani e dei reparti. ' + (O.st.org.pronto ? '' : 'Manca la sezione «Ruoli degli anziani»: creala dalla scheda «Ruoli degli anziani».')) + ' In bacheca va la versione pubblicata.</p>' +
        anteprima(g ? P.fogli.gruppi(O.st.gruppi) : P.fogli.organigramma(O.st.org));
    } else h += vistaPermessi();
    return h;
  };

  new MutationObserver(() => { if (S.vista === 'organigramma') requestAnimationFrame(adatta); }).observe(P.app, { childList: true });
  window.addEventListener('resize', () => { if (S.vista === 'organigramma') adatta(); });

  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'organigramma') return;
    const u = e.target.closest('[data-og]');
    if (!u || u.tagName === 'SELECT' || u.tagName === 'INPUT') return;
    const k = u.dataset.og;
    if (k === 'tab') { O.tab = u.dataset.t; return rd(); }
    if (k === 'togli') return salvaRuoli([{ id: u.dataset.id, c: Number(u.dataset.c), valore: '' }]);
    if (k === 'prepara') {
      u.disabled = true;
      return P.srv('og_prepara').then((d) => { S.dati = d; O.st = null; P.toast('Sezione creata in anagrafica'); rd(); }).catch((x) => { u.disabled = false; P.toast(x.message, true); });
    }
    if (k === 'pdf') {
      const el = P.app.querySelector('.fa4 .pgm-print');
      if (!el) return;
      P.toast('Preparo il PDF…');
      return (window.PdfPortale ? Promise.resolve() : P.carica('pdf.js')).then(() => window.PdfPortale.salva([el], (O.tab === 'gruppi' ? 'Gruppi di servizio' : 'Organigramma della congregazione') + ' ' + quando()))
        .catch((x) => P.toast('PDF non riuscito: ' + x.message, true));
    }
    if (k === 'pubblica') {
      if (!confirm('Pubblico in bacheca questo foglio così com\'è adesso?')) return;
      u.disabled = true;
      return P.srv('og_pubblica', u.dataset.q).then((q) => { O.st.pub[u.dataset.q === 'gruppi' ? 'gruppi' : 'org'] = q; P.toast('Pubblicato in bacheca'); rd(); }).catch((x) => { u.disabled = false; P.toast(x.message, true); });
    }
    if (k === 'ripristina') { delete O.perm[u.dataset.v]; O.apri = u.dataset.v; return rd(); }
    if (k === 'salvaPerm') {
      u.disabled = true;
      return P.srv('og_salvaPermessi', O.perm).then(() => { P.toast('Chi vede cosa salvato'); O.st.voci.forEach((v) => { v.scelti = O.perm[v.k] || null; }); if (O.come) return guarda(O.come.id); rd(); })
        .catch((x) => { u.disabled = false; P.toast(x.message, true); });
    }
  });
  function guarda(id) {
    if (!id) { O.come = null; return rd(); }
    O.come = { id: id };
    P.srv('og_guardaCome', id).then((r) => { if (O.come && O.come.id === id) { O.come.r = r; rd(); } }).catch((x) => P.toast(x.message, true));
    rd();
  }
  P.app.addEventListener('change', (e) => {
    if (S.vista !== 'organigramma') return;
    const u = e.target.closest('[data-og]');
    if (!u) return;
    const k = u.dataset.og;
    if (k === 'unico') {
      const x = S.dati.colonne.find((y) => y.c === Number(u.dataset.c)), val = u.dataset.val;
      const test = val === 'Coordinatore del reparto' ? eCoord : (v) => v === val;
      return unico(x, val, test, u.value);
    }
    if (k === 'aggiungi' && u.value) return salvaRuoli([{ id: u.value, c: Number(u.dataset.c), valore: 'Assistente' }]);
    if (k === 'come') return guarda(u.value);
    if (k === 'elenchi') return P.srv('og_opzione', 'org:elenchi', u.checked).then((org) => { O.st.org = org; rd(); }).catch((x) => P.toast(x.message, true));
    if (k === 'perm') {
      const v = O.st.voci.find((y) => y.k === u.dataset.v);
      const lista = scelti(v).slice(), r = u.dataset.r, i = lista.indexOf(r);
      if (u.checked && i < 0) lista.push(r); if (!u.checked && i >= 0) lista.splice(i, 1);
      O.perm[v.k] = lista; O.apri = v.k;
      return rd();
    }
  });
})();
