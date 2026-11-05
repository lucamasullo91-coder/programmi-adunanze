// Minimal writers for the files the app hands out: a PDF made of one JPEG per A4 page, and a ZIP
// (stored, no compression: the PDFs inside are already compressed). No dependencies.

const enc = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** JPEG data URL → bytes and pixel size (read from the SOF marker). */
export function jpegDaDataUrl(url: string): { dati: Uint8Array; w: number; h: number } {
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const dati = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) dati[i] = bin.charCodeAt(i);
  let i = 2;
  while (i < dati.length) {
    if (dati[i] !== 0xff) { i++; continue; }
    const m = dati[i + 1]!;
    const len = (dati[i + 2]! << 8) | dati[i + 3]!;
    if (m >= 0xc0 && m <= 0xc3) return { dati, h: (dati[i + 5]! << 8) | dati[i + 6]!, w: (dati[i + 7]! << 8) | dati[i + 8]! };
    i += 2 + len;
  }
  throw new Error("JPEG non valido");
}

/** A4 PDF, one image per page, full width from the top. */
export function pdfDaJpeg(pagine: { dati: Uint8Array; w: number; h: number }[], titolo = "", formato?: { w: number; h: number }): Uint8Array {
  const W = formato?.w ?? 595.28, H = formato?.h ?? 841.89;
  const parti: Uint8Array[] = [];
  const offset: number[] = [];
  let pos = 0;
  const add = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; parti.push(u); pos += u.length; };
  const obj = (n: number, corpo: (Uint8Array | string)[]) => { offset[n] = pos; add(`${n} 0 obj\n`); corpo.forEach(add); add("\nendobj\n"); };
  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const kids = pagine.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  const nInfo = 3 + pagine.length * 3;
  obj(1, [`<< /Type /Catalog /Pages 2 0 R >>`]);
  obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${pagine.length} >>`]);
  pagine.forEach((p, i) => {
    const n = 3 + i * 3;
    const ph = Math.min(H, (W * p.h) / p.w);
    const pw = (ph * p.w) / p.h;
    const x = (W - pw) / 2;
    const cs = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} ${x.toFixed(2)} ${(H - ph).toFixed(2)} cm /Im0 Do Q`;
    obj(n, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`]);
    obj(n + 1, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.dati.length} >>\nstream\n`, p.dati, "\nendstream"]);
    obj(n + 2, [`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
  });
  const t = titolo.replace(/[()\\]/g, "");
  obj(nInfo, [`<< /Title (${t}) /Producer (Congregation Manager) >>`]);
  const xref = pos;
  const n = nInfo + 1;
  add(`xref\n0 ${n}\n0000000000 65535 f \n`);
  for (let i = 1; i < n; i++) add(`${String(offset[i]).padStart(10, "0")} 00000 n \n`);
  add(`trailer\n<< /Size ${n} /Root 1 0 R /Info ${nInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return concat(parti);
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(d: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** ZIP archive (stored) with UTF-8 file names. */
export function zip(file: { nome: string; dati: Uint8Array }[]): Uint8Array {
  const parti: Uint8Array[] = [];
  const centrale: Uint8Array[] = [];
  let pos = 0;
  const d = new Date();
  const ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of file) {
    const nome = enc.encode(f.nome);
    const crc = crc32(f.dati);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, ora, true); h.setUint16(12, data, true); h.setUint32(14, crc, true);
    h.setUint32(18, f.dati.length, true); h.setUint32(22, f.dati.length, true); h.setUint16(26, nome.length, true); h.setUint16(28, 0, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, ora, true); c.setUint16(14, data, true); c.setUint32(16, crc, true); c.setUint32(20, f.dati.length, true); c.setUint32(24, f.dati.length, true);
    c.setUint16(28, nome.length, true); c.setUint32(42, pos, true);
    parti.push(new Uint8Array(h.buffer), nome, f.dati);
    centrale.push(new Uint8Array(c.buffer), nome);
    pos += 30 + nome.length + f.dati.length;
  }
  const cd = concat(centrale);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, file.length, true); e.setUint16(10, file.length, true);
  e.setUint32(12, cd.length, true); e.setUint32(16, pos, true);
  return concat([...parti, cd, new Uint8Array(e.buffer)]);
}

export function scarica(nome: string, dati: Uint8Array, tipo: string) {
  const url = URL.createObjectURL(new Blob([dati as BlobPart], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Phones and tablets (iPadOS reports itself as a Mac with touch). */
export function telefono(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/**
 * Hands a finished file to the person. On phones the share menu opens with the file attached (Salva su File,
 * WhatsApp, Stampa…): a plain download does nothing in the iPhone web app. Elsewhere the file is downloaded.
 * Returns "tocca" when the browser wants a fresh tap before opening the share menu (the file took too long).
 */
export async function consegna(file: File): Promise<"ok" | "tocca"> {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (telefono() && typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name.replace(/\.[^.]+$/, "") });
      return "ok";
    } catch (e) {
      const n = (e as Error).name;
      if (n === "AbortError") return "ok";
      if (n === "NotAllowedError") return "tocca";
    }
  }
  scarica(file.name, new Uint8Array(await file.arrayBuffer()), file.type);
  return "ok";
}
