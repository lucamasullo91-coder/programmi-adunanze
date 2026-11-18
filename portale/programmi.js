/* Programmi adunanze dentro il portale: la pagina di sempre (dist/app.js) in un riquadro a tutto schermo.
 * Il riquadro non parla con Google: chiede al portale (postMessage), e il portale chiama il server con il link personale.
 * Così chi compila entra con il suo link, senza account Google e senza Fogli condivisi. */
(function () {
  'use strict';
  const P = window.PC, S = P.S, esc = P.esc;
  const REPO = (window.__BASE || 'https://raw.githubusercontent.com/lucamasullo91-coder/programmi-adunanze/main/portale/').replace(/portale\/$/, '');
  const FN = { stato: 'pa_stato', salva: 'pa_salva', caricaFoto: 'pa_caricaFoto', caricaImmagine: 'pa_caricaImmagine', foto: 'pa_foto' };
  const FN_OEM = { stato: 'oem_stato', salvaMese: 'oem_salvaMese', eliminaMese: 'oem_eliminaMese', salvaCarrelli: 'oem_salvaCarrelli',
    salvaCatalogo: 'oem_salvaCatalogo', eliminaCatalogo: 'oem_eliminaCatalogo', jwPagina: 'oem_jwPagina', jwImmagine: 'oem_jwImmagine' };
  const codice = {};

  const css = document.createElement('style');
  css.textContent = `
  .pa-full{position:fixed;inset:0;z-index:50;background:#F6F5F2;display:flex;flex-direction:column}
  .pa-top{display:flex;align-items:center;gap:10px;padding:7px 10px;background:#fff;border-bottom:2px solid #A8432B;flex:none}
  .pa-top b{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#A8432B}
  .pa-top>span#paSt{margin-left:auto;font-size:12px;color:var(--muted)}
  .pa-pub{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--slate)}
  .pa-pub select{border:1px solid var(--rule);border-radius:6px;padding:4px 6px;background:#fff}
  .pa-pub i{font-style:normal}
  .pa-top{flex-wrap:wrap}
  .pa-full iframe{flex:1;border:0;width:100%;background:#F6F5F2}
  .tg{display:grid;gap:10px;max-width:560px}
  .tg label{display:grid;gap:4px;font-weight:600;font-size:13px}
  .tg input{border:1px solid var(--rule);border-radius:6px;padding:9px 10px;font-weight:400}
  .tg small{font-weight:400;color:var(--slate)}`;
  document.head.appendChild(css);

  function scarica(file) {
    if (codice[file]) return Promise.resolve(codice[file]);
    return fetch(REPO + file + '?v=' + Date.now()).then((r) => { if (!r.ok) throw new Error('GitHub ' + r.status); return r.text(); }).then((t) => (codice[file] = t));
  }
  function ponte() {
    return `(function(){var n=0,att={};
      window.addEventListener('message',function(e){var d=e.data;if(!d||!d.paR)return;var c=att[d.id];if(!c)return;delete att[d.id];d.ok?c[0](d.v):c[1](new Error(d.e));});
      function run(ok,ko){return new Proxy({},{get:function(_,fn){
        if(fn==='withSuccessHandler')return function(f){return run(f,ko)};
        if(fn==='withFailureHandler')return function(f){return run(ok,f)};
        return function(){var id=++n;att[id]=[ok||function(){},ko||function(){}];parent.postMessage({paQ:1,id:id,fn:fn,args:[].slice.call(arguments)},'*');};}});}
      window.google={script:{run:run()}};})();`;
  }
  /** La pagina degli espositori è già un HTML completo: le aggiungo solo il ponte in testa. */
  function paginaOem(html) { return html.replace(/<head>/i, '<head><script>' + ponte() + '<\/script>'); }
  function pagina(js) {
    const ponteP = 'window.__CONF={base:' + JSON.stringify(REPO) + '};' + ponte();
    return '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Fira+Sans+Extra+Condensed:wght@400;500;600;700;800&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap">' +
      '</head><body><div id="root"></div><script>' + ponteP + '<\/script><script>' + js.replace(/<\/script/gi, '<\\/script') + '<\/script></body></html>';
  }
  function monta(quale) {
    const fr = document.getElementById('paFrame'), st = document.getElementById('paSt');
    if (!fr) return;
    const oem = /spositori/.test(quale);
    const file = oem ? 'espositori/app.html' : 'dist/app.js';
    scarica(file).then((t) => { fr.srcdoc = oem ? paginaOem(t) : pagina(t); fr.dataset.q = quale; if (st) st.textContent = ''; }).catch((e) => { if (st) st.textContent = 'Errore: ' + e.message; });
  }
  window.addEventListener('message', (e) => {
    const fr = document.getElementById('paFrame');
    const d = e.data;
    if (!fr || e.source !== fr.contentWindow || !d || !d.paQ) return;
    const q = fr.dataset.q;
    const fn = q === 'bachecaProgrammi' ? (d.fn === 'stato' ? 'pa_bacheca' : d.fn === 'foto' ? 'pa_foto' : null)
      : q === 'bachecaEspositori' ? (d.fn === 'stato' ? 'oem_bacheca' : null)
      : (q === 'espositori' ? FN_OEM : FN)[d.fn];
    const rispondi = (ok, v) => fr.contentWindow.postMessage(ok ? { paR: 1, id: d.id, ok: true, v: v } : { paR: 1, id: d.id, ok: false, e: v }, '*');
    if (!fn) return rispondi(false, 'Funzione non disponibile nel portale: ' + d.fn);
    P.srv.apply(null, [fn].concat(d.args || [])).then((v) => rispondi(true, v)).catch((err) => rispondi(false, err.message));
  });

  /* ── Pubblica in bacheca (nella barra in alto): un mese alla volta ── */
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const meseDopo = (n) => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
  let mesePub = meseDopo(1);
  function barraPub(tipi) {
    const opz = [0, 1, 2, 3].map(meseDopo).map((m) => '<option value="' + m + '"' + (m === mesePub ? ' selected' : '') + '>' + P.cap(MESI[+m.slice(5) - 1]) + ' ' + m.slice(0, 4) + '</option>').join('');
    setTimeout(() => statoPub(tipi), 0);
    return '<span class="pa-pub"><select data-pub-mese>' + opz + '</select>' + tipi.map((t) => '<button class="btn small" data-pub="' + t[0] + '">' + t[1] + '</button>').join('') + '<i id="paPub"></i></span>';
  }
  function statoPub(tipi) {
    const el = document.getElementById('paPub'); if (!el) return;
    el.textContent = '';
    Promise.all(tipi.map((t) => P.srv('statoPubblicazione', t[0], mesePub).then((x) => [t, x]))).then((r) => {
      el.textContent = r.map(([t, x]) => (tipi.length > 1 ? t[2] + ': ' : '') + (x.pubblicato ? (x.cambiato ? 'modificato dopo la pubblicazione' : 'pubblicato il ' + x.quando.slice(8, 10) + '/' + x.quando.slice(5, 7)) : 'non pubblicato')).join(' · ');
    }).catch(() => {});
  }
  function tipiProgrammi() {
    const io = S.dati.io, t = [];
    if (io.tutto || io.ambiti.indexOf('inf') >= 0) t.push(['programmi-inf', 'Pubblica l\'infrasettimanale', 'infrasettimanale']);
    if (io.tutto || io.ambiti.indexOf('fs') >= 0) t.push(['programmi-fs', 'Pubblica il fine settimana', 'fine settimana']);
    return t;
  }
  P.viste.programmi = function () {
    setTimeout(() => monta('programmi'), 0);
    return '<div class="pa-full"><div class="pa-top"><button class="back" data-go="home">‹ Portale</button><b>Programmi adunanze</b>' + barraPub(tipiProgrammi()) + '<span id="paSt">Carico…</span></div><iframe id="paFrame" title="Programmi adunanze"></iframe></div>';
  };
  P.viste.espositori = function () {
    setTimeout(() => monta('espositori'), 0);
    return '<div class="pa-full"><div class="pa-top" style="border-color:#2F7F8C"><button class="back" data-go="home">‹ Portale</button><b style="color:#2F7F8C">Programma espositori</b>' + barraPub([['espositori', 'Pubblica in bacheca', 'espositori']]) + '<span id="paSt">Carico…</span></div><iframe id="paFrame" title="Programma espositori"></iframe></div>';
  };
  P.viste.bachecaProgrammi = function () {
    setTimeout(() => monta('bachecaProgrammi'), 0);
    return '<div class="pa-full"><div class="pa-top"><button class="back" data-go="bacheca">‹ Bacheca</button><b>Programma delle adunanze</b><span id="paSt">Carico…</span></div><iframe id="paFrame" title="Programma delle adunanze"></iframe></div>';
  };
  P.viste.bachecaEspositori = function () {
    setTimeout(() => monta('bachecaEspositori'), 0);
    return '<div class="pa-full"><div class="pa-top" style="border-color:#2F7F8C"><button class="back" data-go="bacheca">‹ Bacheca</button><b style="color:#2F7F8C">Programma espositori</b><span id="paSt">Carico…</span></div><iframe id="paFrame" title="Programma espositori"></iframe></div>';
  };
  P.app.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.matches || !t.matches('[data-pub-mese]')) return;
    mesePub = t.value;
    statoPub(S.vista === 'espositori' ? [['espositori', '', 'espositori']] : tipiProgrammi());
  });
  P.app.addEventListener('click', (e) => {
    const u = e.target.closest('[data-pub]');
    if (!u) return;
    const tipo = u.dataset.pub;
    const nm = MESI[+mesePub.slice(5) - 1] + ' ' + mesePub.slice(0, 4);
    if (!confirm('Pubblico in bacheca ' + (tipo === 'espositori' ? 'il programma espositori' : tipo === 'programmi-inf' ? 'l\'infrasettimanale' : 'il fine settimana') + ' di ' + nm + ' così com\'è adesso?')) return;
    u.disabled = true;
    P.srv('pubblica', tipo, mesePub).then(() => { u.disabled = false; P.toast('Pubblicato in bacheca'); statoPub(S.vista === 'espositori' ? [['espositori', '', 'espositori']] : tipiProgrammi()); })
      .catch((err) => { u.disabled = false; P.toast(err.message, true); });
  });

  /* ── Telegram (solo Luca) ── */
  let T = null;
  P.viste.telegram = function () {
    const h = P.testata('Telegram', 'Invii automatici', 'home');
    if (!T) { P.srv('riservate').then((r) => { T = r; P.disegna(); }).catch((e) => P.toast(e.message, true)); return h + '<p class="nota">Carico…</p>'; }
    return h + '<p class="nota">Qualche giorno prima di ogni adunanza il portale manda nel tuo gruppo Telegram le immagini del presidente e dell\'Audio/Video confermate da chi compila; se non sono confermate, un avviso. Le chiavi le legge solo lo script: non compaiono né nel Foglio né nella pagina.</p>' +
      '<div class="tg"><label>Token del bot<input id="tgTok" placeholder="' + esc(T.TELEGRAM_TOKEN || 'non impostato') + '" autocomplete="off"><small>Lo stesso bot del brief (BotFather). Lascia vuoto per non cambiarlo.</small></label>' +
      '<label>Chat<input id="tgChat" placeholder="' + esc(T.TELEGRAM_CHAT || 'non impostata') + '" autocomplete="off"><small>L\'id del gruppo delle notifiche (es. -100…).</small></label>' +
      '<label>Giorni prima dell\'adunanza<input id="tgG" value="' + esc(T.ANTICIPO_GIORNI) + '"></label>' +
      '<label>Ora dell\'invio<input id="tgO" value="' + esc(T.ORA_INVIO) + '"></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-tg="salva">Salva</button><button class="btn soft" data-tg="prova">Manda un messaggio di prova</button>' +
      '<button class="btn soft" data-tg="' + (T.attivo ? 'spegni' : 'accendi') + '">' + (T.attivo ? 'Spegni gli invii automatici' : 'Attiva gli invii automatici') + '</button></div>' +
      '<p class="nota">Stato: <b>' + (T.attivo ? 'invii automatici attivi (controllo ogni 15 minuti)' : 'invii automatici spenti') + '</b>. Quando li attivi qui, spegni gli attivatori del vecchio script di Programmi adunanze, altrimenti le immagini arrivano due volte.</p></div>';
  };
  P.app.addEventListener('click', (e) => {
    if (S.vista !== 'telegram') return;
    const u = e.target.closest('[data-tg]');
    if (!u) return;
    const a = u.dataset.tg, v = (id) => document.getElementById(id).value.trim();
    const fatto = (r) => { T = r; P.disegna(); P.toast('Fatto'); };
    const ko = (err) => P.toast(err.message, true);
    if (a === 'salva') return P.srv('salvaRiservate', { TELEGRAM_TOKEN: v('tgTok'), TELEGRAM_CHAT: v('tgChat'), ANTICIPO_GIORNI: v('tgG'), ORA_INVIO: v('tgO') }).then(fatto).catch(ko);
    if (a === 'prova') return P.srv('provaTelegram').then((m) => P.toast(m)).catch(ko);
    if (a === 'accendi' || a === 'spegni') return P.srv('attivaInvii', a === 'accendi').then(fatto).catch(ko);
  });
})();
