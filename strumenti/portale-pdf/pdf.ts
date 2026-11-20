// PDF del portale (turnazione reparti, comitive…): ogni foglio A4 diventa un'immagine JPEG e poi una pagina PDF,
// come nei Programmi adunanze. Niente stampa del browser: niente link a piè di pagina, stesso risultato su PC, iPad e telefono.
// Si costruisce con: npx esbuild strumenti/portale-pdf/pdf.ts --bundle --minify --format=iife --outfile=portale/pdf.js
import { toJpeg } from "../../src/vendor/html-to-image/index.js";
import { jpegDaDataUrl, pdfDaJpeg, scarica, zip } from "../../src/pdfzip";

const FIRA = "Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400";
let cssFont: Promise<string> | null = null;
/** Le regole @font-face di Fira Sans con i file dentro (solo caratteri latini): senza, l'immagine userebbe Arial. */
function caratteri(): Promise<string> {
  if (!cssFont)
    cssFont = (async () => {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${FIRA}&display=swap`)).text();
        const out: string[] = [];
        for (const b of css.split("@font-face").slice(1).map((x) => "@font-face" + x)) {
          if (/unicode-range/.test(b) && !/U\+0000-00FF/i.test(b)) continue;
          const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
          if (!url) continue;
          const u8 = new Uint8Array(await (await fetch(url)).arrayBuffer());
          let bin = "";
          for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
          out.push(b.replace(url, `data:font/woff2;base64,${btoa(bin)}`));
        }
        return out.join("\n");
      } catch {
        return "";
      }
    })();
  return cssFont;
}

const webkit = () => /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|Android/.test(navigator.userAgent);

/** Un foglio (elemento) → JPEG. Safari disegna vuote le immagini le prime volte: con foto si ripete. */
async function foto(el: HTMLElement): Promise<string> {
  await document.fonts.ready;
  const fontEmbedCSS = await caratteri();
  const opz = { pixelRatio: 2.5, quality: 0.92, backgroundColor: "#fff", cacheBust: false, ...(fontEmbedCSS ? { fontEmbedCSS } : {}) };
  const img = [...el.querySelectorAll("img")];
  await Promise.all(img.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined))));
  const prove = img.length ? (webkit() ? 3 : 1) : 0;
  for (let k = 0; k < prove; k++) await toJpeg(el, opz);
  return toJpeg(el, opz);
}

async function pdfDi(fogli: HTMLElement[], titolo: string): Promise<Uint8Array> {
  const jpg: string[] = [];
  for (const f of fogli) jpg.push(await foto(f));
  return pdfDaJpeg(jpg.map(jpegDaDataUrl), titolo);
}

/* ── consegna: riquadro «Invia… / Scarica», come in Congregation Manager ──
   Su iPhone e iPad la condivisione si apre solo se parte subito da un tocco: per questo il PDF si prepara prima
   e il pulsante «Invia…» lo condivide all'istante (WhatsApp, Mail…), senza scaricarlo. */
type Nav = Navigator & { canShare?: (d: { files: File[] }) => boolean };
const puoCondividere = (f: File) => { try { return !!(navigator as Nav).canShare?.({ files: [f] }); } catch { return false; } };

/** true = inviato; false = annullato da chi usa il telefono; altrimenti il messaggio d'errore. */
async function condividi(f: File): Promise<true | false | string> {
  try { await navigator.share({ files: [f] }); return true; }
  catch (e) {
    const n = (e as Error)?.name;
    if (n === "AbortError") return false;
    if (n === "NotAllowedError") return "Qui l'invio non è permesso dal browser: usa «Scarica».";
    return "Invio non riuscito: usa «Scarica».";
  }
}

const CSS = `.pdfp-velo{position:fixed;inset:0;z-index:99999;background:rgba(31,38,48,.45);display:flex;align-items:flex-end;justify-content:center;font-family:"Fira Sans","Segoe UI",system-ui,sans-serif}
@media(min-width:640px){.pdfp-velo{align-items:center}}
.pdfp{background:#fff;color:#1F2630;width:100%;max-width:440px;max-height:86vh;display:flex;flex-direction:column;border-radius:14px 14px 0 0;box-shadow:0 18px 40px -12px rgba(0,0,0,.45);padding:18px 18px calc(16px + env(safe-area-inset-bottom))}
@media(min-width:640px){.pdfp{border-radius:12px}}
.pdfp h3{margin:0 0 2px;font-size:17px;font-weight:700}.pdfp .f{font-size:13px;color:#4D5A68;margin:0 0 14px;word-break:break-word}
.pdfp .az{display:flex;gap:8px}.pdfp button{font:inherit;font-weight:600;font-size:15px;border-radius:9px;padding:11px 14px;border:1px solid #D9D6D0;background:#fff;color:#1F2630;cursor:pointer}
.pdfp .az button{flex:1}.pdfp button.inv{background:#1F8A4C;border-color:#1F8A4C;color:#fff}.pdfp button.ch{display:block;width:100%;margin-top:10px;background:#F4F3EF;border-color:#F4F3EF;font-weight:500}
.pdfp .msg{font-size:13px;color:#A8432B;margin:10px 0 0;min-height:0}.pdfp .msg:empty{display:none}
.pdfp ul{list-style:none;margin:0 0 4px;padding:0;overflow:auto;flex:1;border-top:1px solid #E5E2DC}
.pdfp li{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #E5E2DC}.pdfp li b{flex:1;font-weight:500;font-size:15px}
.pdfp li button{padding:8px 12px;font-size:14px}.pdfp li.ok b{color:#1F8A4C}.pdfp li.ok b::after{content:" ✓"}.pdfp li.ok button.inv{background:#fff;color:#1F8A4C}
.pdfp .zip{margin-top:10px}`;
function riquadro(html: string): { el: HTMLElement; chiudi: () => void } {
  if (!document.getElementById("pdfp-css")) { const st = document.createElement("style"); st.id = "pdfp-css"; st.textContent = CSS; document.head.appendChild(st); }
  const velo = document.createElement("div");
  velo.className = "pdfp-velo";
  velo.innerHTML = '<div class="pdfp" role="dialog" aria-modal="true">' + html + '<button class="ch" data-p="chiudi">Chiudi</button></div>';
  const chiudi = () => velo.remove();
  velo.addEventListener("click", (e) => { if (e.target === velo || (e.target as HTMLElement).closest('[data-p="chiudi"]')) chiudi(); });
  document.body.appendChild(velo);
  return { el: velo.querySelector(".pdfp") as HTMLElement, chiudi };
}
const escH = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** PDF pronto: «Invia…» (se il dispositivo sa condividere file) e «Scarica». Senza condivisione si scarica subito, come prima. */
function consegna(nome: string, dati: Uint8Array, tipo: string): void {
  const file = new File([dati as BlobPart], nome, { type: tipo });
  if (!puoCondividere(file)) return scarica(nome, dati, tipo);
  const r = riquadro('<h3>PDF pronto</h3><p class="f">' + escH(nome) + '</p><div class="az"><button class="inv" data-p="invia">Invia…</button><button data-p="scarica">Scarica</button></div><p class="msg"></p>');
  r.el.addEventListener("click", async (e) => {
    const b = (e.target as HTMLElement).closest("[data-p]") as HTMLElement | null;
    if (!b) return;
    if (b.dataset.p === "scarica") { scarica(nome, dati, tipo); return r.chiudi(); }
    if (b.dataset.p === "invia") {
      const esito = await condividi(file);
      if (esito === true) r.chiudi();
      else if (esito) (r.el.querySelector(".msg") as HTMLElement).textContent = esito;
    }
  });
}

const pulito = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

(window as unknown as { PdfPortale: unknown }).PdfPortale = {
  /** Un PDF con i fogli dati (uno per pagina). */
  async salva(fogli: HTMLElement[], nome: string) {
    nome = pulito(nome);
    consegna(nome + ".pdf", await pdfDi(fogli, nome), "application/pdf");
  },
  /** Il PDF come dati, senza consegnarlo (per WhatsApp e simili). */
  async dati(fogli: HTMLElement[], nome: string) { return pdfDi(fogli, pulito(nome)); },
  /** Più PDF in un file ZIP: [{ nome, fogli }]. avanzamento(i, n) per mostrare a che punto è. */
  async zip(lista: { nome: string; fogli: HTMLElement[] }[], nomeZip: string, avanzamento?: (i: number, n: number) => void) {
    const file: { nome: string; dati: Uint8Array }[] = [];
    for (let i = 0; i < lista.length; i++) {
      avanzamento?.(i + 1, lista.length);
      const n = pulito(lista[i]!.nome);
      file.push({ nome: n + ".pdf", dati: await pdfDi(lista[i]!.fogli, n) });
    }
    scarica(pulito(nomeZip) + ".zip", zip(file), "application/zip");
  },
  /** I PDF personali uno per uno: prima li prepara tutti, poi un pulsante «Invia» per ciascuno (spunta verde a invio fatto),
   *  più «Scarica tutti (ZIP)». lista: [{ etichetta, nome, fogli }]. */
  async sequenza(lista: { etichetta: string; nome: string; fogli: HTMLElement[] }[], titolo: string, nomeZip: string, avanzamento?: (i: number, n: number) => void) {
    const pronti: { etichetta: string; file: File; dati: Uint8Array }[] = [];
    for (let i = 0; i < lista.length; i++) {
      avanzamento?.(i + 1, lista.length);
      const n = pulito(lista[i]!.nome), dati = await pdfDi(lista[i]!.fogli, n);
      pronti.push({ etichetta: lista[i]!.etichetta, dati, file: new File([dati as BlobPart], n + ".pdf", { type: "application/pdf" }) });
    }
    const invio = pronti.length > 0 && puoCondividere(pronti[0]!.file);
    const r = riquadro('<h3>' + escH(titolo) + '</h3><p class="f">' + pronti.length + ' PDF pronti. ' + (invio ? 'Tocca «Invia» accanto a ogni fratello e scegli WhatsApp: la spunta verde ti dice a chi l\'hai già mandato.' : 'Su questo dispositivo l\'invio diretto non c\'è: scarica i PDF.') + '</p><ul>' +
      pronti.map((p, i) => '<li data-i="' + i + '"><b>' + escH(p.etichetta) + '</b>' + (invio ? '<button class="inv" data-p="invia">Invia</button>' : '') + '<button data-p="scarica">Scarica</button></li>').join("") +
      '</ul><p class="msg"></p><button class="zip" data-p="zip">Scarica tutti (ZIP)</button>');
    r.el.addEventListener("click", async (e) => {
      const b = (e.target as HTMLElement).closest("[data-p]") as HTMLElement | null;
      if (!b) return;
      if (b.dataset.p === "zip") return scarica(pulito(nomeZip) + ".zip", zip(pronti.map((p) => ({ nome: p.file.name, dati: p.dati }))), "application/zip");
      const li = b.closest("li") as HTMLElement | null;
      if (!li) return;
      const p = pronti[+li.dataset.i!]!;
      if (b.dataset.p === "scarica") return scarica(p.file.name, p.dati, "application/pdf");
      if (b.dataset.p === "invia") {
        const esito = await condividi(p.file), msg = r.el.querySelector(".msg") as HTMLElement;
        msg.textContent = typeof esito === "string" ? esito : "";
        if (esito === true) { li.classList.add("ok"); b.textContent = "Di nuovo"; }
      }
    });
  },
};
