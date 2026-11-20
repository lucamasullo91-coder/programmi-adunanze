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

/** Su telefono e tablet si apre la condivisione (WhatsApp, Mail…); altrimenti si scarica. */
async function consegna(nome: string, dati: Uint8Array, tipo: string): Promise<void> {
  const file = new File([dati as BlobPart], nome, { type: tipo });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (/iPhone|iPad|Android/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nome.replace(/\.\w+$/, "") }); return; } catch { /* scarica */ }
  }
  scarica(nome, dati, tipo);
}

const pulito = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

(window as unknown as { PdfPortale: unknown }).PdfPortale = {
  /** Un PDF con i fogli dati (uno per pagina). */
  async salva(fogli: HTMLElement[], nome: string) {
    nome = pulito(nome);
    await consegna(nome + ".pdf", await pdfDi(fogli, nome), "application/pdf");
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
    await consegna(pulito(nomeZip) + ".zip", zip(file), "application/zip");
  },
};
