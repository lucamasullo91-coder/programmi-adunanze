// Programmi adunanze: the program of the bimester, already set from the meeting workbook and the Watchtower;
// who compiles it writes only the names (and changes a date or puts an assembly in place of a meeting).
// Data are kept by the Google Apps Script the page is served from (google.script.run); without it, in the
// browser for testing, they stay in localStorage.
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import fogliCss from "./fogli.css?inline";
import appCss from "./app.css?inline";
import {
  Pagine,
  Piede,
  Testata,
  aspetto,
  blocchiVista,
  cssCaratteri,
  dimensioniPagina,
  useScala,
} from "./Rendering";
import { normalizza, GIORNI_IT, MESI_IT, TIPO_SPECIALE, cap, type Carta, type Evento, type Foglio, type Riga, type Ritocchi, type RigaSpeciale } from "./tipi";
import { jpegDaDataUrl, pdfDaJpeg, scarica } from "./pdfzip";
import { CSS_IMMAGINE } from "./wa/immagine";
import { CSS_PANNELLO, PannelloWhatsApp } from "./wa/Pannello";
import { CSS_PRONTO, GeneraReparti, ProntoWhatsApp, type StatoWA } from "./wa/Pronto";

// Any error is shown on the page (otherwise a failure inside the Google page is just a blank screen).
const mostraErrore = (m: string) => {
  const d = document.createElement("pre");
  d.style.cssText = "white-space:pre-wrap;margin:16px;padding:12px;border:1px solid #A8432B;color:#A8432B;font:13px monospace;background:#fff";
  d.textContent = "Errore: " + m;
  document.body.appendChild(d);
};
window.addEventListener("error", (e) => mostraErrore(`${e.message} (${e.filename}:${e.lineno})`));
window.addEventListener("unhandledrejection", (e) => mostraErrore(String((e.reason as Error)?.message ?? e.reason)));
for (const c of [fogliCss, appCss, CSS_IMMAGINE, CSS_PANNELLO, CSS_PRONTO]) {
  const st = document.createElement("style");
  st.textContent = c;
  document.head.appendChild(st);
}

type Ruolo = "inf" | "fs" | "tutto" | "legge";
/** Duties of each week from the portal's rotation: lunedì → INFRA/FINE sections and the week's cleaning. */
type RepSett = { INFRA?: { titolo: string; righe: [string, string][] }[]; FINE?: { titolo: string; righe: [string, string][] }[]; pulizie?: { gruppo: string; righe: [string, string][] } };
type Stato = {
  email: string;
  ruolo: Ruolo;
  impostazioni: Record<string, string>;
  valori: Record<string, string>;
  /** Podium of each meeting ("2026-11-03|INFRA" → name), from the rotation of the departments. */
  podio?: Record<string, string>;
  /** Portal: "Adunanze e reparti" view allowed, the duties to put beside each meeting, no WhatsApp images here. */
  conReparti?: boolean;
  reparti?: Record<string, RepSett>;
  senzaWA?: boolean;
  bacheca?: boolean;
  /** Portal: day and time of every meeting from the portal's Calendar ("2027-01-04-fs" → data/ora), the only source. */
  cal?: Record<string, { data?: string; ora?: string; nessuna?: boolean; spostata?: boolean }>;
  /** Bacheca: the months with something published (only these are shown). */
  mesiPubblicati?: Record<string, { inf?: boolean; fs?: boolean }>;
  /** Portal, "Pronto per WhatsApp": what this person may see, the published rotation, the saved department images. */
  wa?: StatoWA;
};
type Bimestre = { id: string; nome: string; mesi: string[] };

const conf = (window as unknown as { __CONF?: { base?: string; genera?: boolean; vista?: string; anteprima?: boolean } }).__CONF ?? {};
const BASE = (conf.base ?? "./").replace(/\/?$/, "/");
const gs = (window as unknown as { google?: { script?: { run: Record<string, unknown> } } }).google
  ?.script?.run;

/** The server (Apps Script) or, for tests, the browser. */
function chiama<T>(fn: string, ...args: unknown[]): Promise<T> {
  if (gs)
    return new Promise((res, rej) => {
      const r = gs as unknown as {
        withSuccessHandler: (f: (v: T) => void) => {
          withFailureHandler: (f: (e: Error) => void) => Record<string, (...a: unknown[]) => void>;
        };
      };
      r.withSuccessHandler(res).withFailureHandler(rej)[fn]!(...args);
    });
  const ls = () => JSON.parse(localStorage.getItem("pa-valori") ?? "{}") as Record<string, string>;
  if (fn === "stato")
    return Promise.resolve({
      email: "prova@locale",
      ruolo: (new URLSearchParams(location.search).get("ruolo") as Ruolo) ?? "tutto",
      impostazioni: { sorv: "P. Guerrazzi", condTG: "P. Muto" },
      valori: ls(),
    } as T);
  if (fn === "salva") {
    const v = ls();
    if (args[1]) v[args[0] as string] = args[1] as string;
    else delete v[args[0] as string];
    localStorage.setItem("pa-valori", JSON.stringify(v));
    return Promise.resolve(true as T);
  }
  if (fn === "caricaImmagine") return Promise.resolve(("img" + Date.now()) as T);
  if (fn === "caricaFoto") {
    const id = "f" + Date.now();
    localStorage.setItem("pa-foto-" + id, args[0] as string);
    return Promise.resolve(id as T);
  }
  if (fn === "foto")
    return Promise.resolve(("data:image/jpeg;base64," + (localStorage.getItem("pa-foto-" + (args[0] as string)) ?? "")) as T);
  return Promise.reject(new Error(fn));
}

const tipoCarta = (id: string): "INFRA" | "FINE" => (/-inf$/.test(id) ? "INFRA" : "FINE");
const puo = (ruolo: Ruolo, cartaId: string) =>
  ruolo !== "legge" && (ruolo === "tutto" || (ruolo === "inf") === (tipoCarta(cartaId) === "INFRA"));
const cartaDi = (id: string) => id.replace(/-r\d+$/, "");

/** Day and time of a meeting, from a given week on: key "regola-inf:2027-01-04" / "regola-fs:…" = {"g":3,"ora":"19:30"}
 *  (g = day of the week, 0 Sunday … 6 Saturday). The latest rule starting on or before the week wins. */
type Regola = { g: number; ora: string };
const lunediDi = (cartaId: string) => cartaId.slice(0, 10);
const tipoBreve = (cartaId: string) => (/-inf$/.test(cartaId) ? "inf" : "fs");
function regolaPer(cartaId: string, valori: Record<string, string>): Regola | null {
  const pre = `regola-${tipoBreve(cartaId)}:`;
  const lun = lunediDi(cartaId);
  let best: [string, Regola] | null = null;
  for (const [k, v] of Object.entries(valori)) {
    if (!k.startsWith(pre)) continue;
    const da = k.slice(pre.length);
    if (da > lun || (best && best[0] >= da)) continue;
    try {
      best = [da, JSON.parse(v) as Regola];
    } catch {
      /* ignore a broken value */
    }
  }
  return best?.[1] ?? null;
}
/** "Mercoledì 6 gennaio" for the week starting on Monday `lun` and day `g`. */
function titoloGiorno(lun: string, g: number) {
  const [y, m, d] = lun.split("-").map(Number) as [number, number, number];
  const x = new Date(Date.UTC(y, m - 1, d + ((g + 6) % 7)));
  return `${cap(GIORNI_IT[x.getUTCDay()]!)} ${x.getUTCDate()} ${MESI_IT[x.getUTCMonth()]}`;
}
const giornoDiTesto = (t: string) => GIORNI_IT.indexOf((t.trim().split(/\s+/)[0] ?? "").toLowerCase());

/** The base month with the values written by who compiles it. */
/** The duty cards (REP_INF / REP_FS) of each week, from the portal's rotation, beside each meeting. */
function conReparti(g: Foglio, rep: Record<string, RepSett>) {
  let n = 0;
  const voce = (r: [string, string]) => ({ id: `rep${++n}`, tipo: "voce", titolo: r[0], chi: r[1] }) as unknown as Riga;
  for (const s of g.settimane) {
    const x = rep[s.id];
    if (!x) continue;
    for (const [tipo, tAd] of [["REP_INF", "INFRA"], ["REP_FS", "FINE"]] as const) {
      const sez = x[tAd];
      if (!sez) continue;
      const ad = s.carte.find((c) => c.tipo === tAd);
      const sezioni: Carta["sezioni"] = sez.map((z) => ({ id: `rep${++n}`, titolo: z.titolo, colore: "@reparti", righe: z.righe.map(voce) }));
      if (tipo === "REP_INF" && x.pulizie)
        sezioni.push({ id: `rep${++n}`, titolo: "Pulizie della settimana", colore: "@reparti", icona: "pulizia", ...(x.pulizie.gruppo ? { valore: x.pulizie.gruppo.toUpperCase() } : {}), righe: x.pulizie.righe.map(voce) } as Carta["sezioni"][number]);
      s.carte = s.carte.filter((c) => c.tipo !== tipo).concat([{ id: `${s.id}-${tipo.toLowerCase()}`, tipo, kicker: "Turnazione reparti", titolo: ad?.titolo ?? "", sezioni }]);
    }
  }
}

/** "Mercoledì 6 gennaio" from an ISO date. */
function titoloData(iso: string) {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const x = new Date(Date.UTC(y, m - 1, d));
  return `${cap(GIORNI_IT[x.getUTCDay()]!)} ${x.getUTCDate()} ${MESI_IT[x.getUTCMonth()]}`;
}
/** Special meeting: the card keeps its day and time (from the Calendar) and gets the program written for it. */
function programmaSpeciale(c: Carta, e: Evento) {
  c.speciale = true;
  c.kicker = undefined;
  c.flag = undefined;
  const righe: Riga[] = [];
  if (e.luogo) righe.push({ id: `${c.id}-sp-luogo`, tipo: "voce", titolo: "Luogo", chi: e.luogo });
  for (const x of e.righe ?? [])
    righe.push({
      id: x.id,
      tipo: "parte",
      titolo: x.titolo,
      min: x.min ?? null,
      mostraMin: !!x.min,
      ...(x.nome ? { chi: "", campi: ["chi"] as ("chi" | "chi2" | "titolo")[] } : {}),
    });
  if (e.nota) righe.push({ id: `${c.id}-sp-nota`, tipo: "testo", titolo: e.nota });
  c.sezioni = [{ id: `${c.id}-sp`, titolo: e.tema || TIPO_SPECIALE, colore: "@generale", icona: "discorso", righe }];
}
/** Titles and minutes changed for one meeting. A section length that matched the old minutes of a changed row follows it. */
function applicaRitocchi(c: Carta, x: Ritocchi) {
  for (const z of c.sezioni) {
    for (const r of z.righe) {
      const v = x.r?.[r.id];
      if (!v) continue;
      if (v.titolo != null && !r.campi?.includes("titolo")) r.titolo = v.titolo;
      if (v.min !== undefined) {
        if (z.durata && r.min != null && z.durata === `(${r.min} min)` && v.min != null) z.durata = `(${v.min} min)`;
        r.min = v.min;
      }
    }
    const s = x.s?.[z.id];
    if (s?.titolo != null) z.titolo = s.titolo;
    if (s?.durata != null) z.durata = s.durata;
  }
}
function applica(f: Foglio, valori: Record<string, string>, foto: Record<string, string>, imp: Record<string, string>, cal?: Stato["cal"]): Foglio {
  const g = structuredClone(f);
  if (g.id >= "2027-01") g.stile = { ...g.stile, strisciaGrigia: true };
  g.sorv = imp["sorv"] ?? "";
  g.condTG = imp["condTG"] ?? "";
  if (imp["cong"]) g.cong = imp["cong"];
  for (const s of g.settimane)
    for (const c of s.carte) {
      const dc = cal?.[c.id];
      if (cal && dc?.data) {
        // the portal's Calendar decides day and time; an empty time stays "to be decided"
        c.titolo = titoloData(dc.data);
        c.ora = dc.ora ?? "";
        c.oraDaDefinire = !dc.ora;
      }
      const reg = c.kicker || (cal && dc?.data) ? null : regolaPer(c.id, valori); // not on special weeks (Memorial)
      if (reg) {
        c.titolo = titoloGiorno(lunediDi(c.id), reg.g);
        if (reg.ora) c.ora = reg.ora;
      }
      if (!(cal && dc?.data)) {
        const d = valori[`${c.id}:data`];
        if (d) c.titolo = d;
        const o = valori[`${c.id}:ora`];
        if (o) c.ora = o;
      }
      const ev = valori[`${c.id}:evento`];
      if (ev)
        try {
          const e = JSON.parse(ev) as Evento & { fotoId?: string };
          if (e.tipo === TIPO_SPECIALE) programmaSpeciale(c, e);
          else {
            c.evento = { ...e, ...(e.fotoId && foto[e.fotoId] ? { foto: foto[e.fotoId] } : {}) };
            c.kicker = e.tipo;
            c.flag = undefined;
          }
        } catch {
          /* ignore a broken value */
        }
      // titles and minutes changed for this meeting only
      const rit = valori[`${c.id}:ritocchi`];
      if (rit && !c.evento)
        try {
          applicaRitocchi(c, JSON.parse(rit) as Ritocchi);
        } catch {
          /* ignore a broken value */
        }
      for (const z of c.sezioni)
        for (const r of z.righe)
          for (const k of r.campi ?? []) {
            const v = valori[`${r.id}:${k}`];
            if (v != null) (r as Record<string, unknown>)[k] = v;
            const prima = k !== "titolo" ? valori[`${r.id}:${k}~prima`] : undefined;
            if (prima) r.prima = { ...r.prima, [k]: prima };
          }
    }
  // Header ("Mercoledì 19:30"): the usual day and time of the month, so the first regular meeting of each kind.
  // A meeting moved for one week only (or replaced by an event, a special meeting) is an exception and never sets the header.
  const carte = g.settimane.flatMap((s) => s.carte);
  const regolare = (c: Carta) => !c.kicker && !c.evento && !cal?.[c.id]?.spostata && !valori[`${c.id}:ora`] && !valori[`${c.id}:data`];
  const prima = (t: "INFRA" | "FINE") =>
    carte.find((c) => c.tipo === t && regolare(c)) ?? carte.find((c) => c.tipo === t && !c.kicker && !c.evento && !cal?.[c.id]?.spostata);
  for (const v of g.viste ?? [])
    for (const q of v.quando ?? []) {
      const c = prima(q.colore === "fine" ? "FINE" : "INFRA");
      if (!c) continue;
      const gi = giornoDiTesto(c.titolo ?? "");
      if (gi >= 0) q.etichetta = cap(GIORNI_IT[gi]!);
      q.ora = c.oraDaDefinire ? "ora da definire" : c.ora ?? "";
    }
  return normalizza(g);
}

const VISTE: [string, string][] = [
  ["inf", "Infrasettimanale"],
  ["fs", "Fine settimana"],
  ["uni", "Combinato"],
];
const TIPI_EVENTO = [
  "Assemblea di circoscrizione",
  "Congresso regionale",
  "Commemorazione",
  TIPO_SPECIALE,
  "Nessuna adunanza",
];

type Modifica =
  | { k: "nome"; chiave: string; etichetta: string; parte: string; valore: string }
  | {
      k: "carta";
      carta: Carta;
      data: string;
      ora: string;
      evento: (Evento & { fotoId?: string }) | null;
      /** The card as the guide has it (titles and minutes to compare and restore). */
      base?: Carta | undefined;
      ritocchi: Ritocchi;
    };

function App() {
  const [stato, setStato] = useState<Stato | null>(null);
  const [errore, setErrore] = useState("");
  const [bimestri, setBimestri] = useState<Bimestre[]>([]);
  const [bim, setBim] = useState("");
  const [base, setBase] = useState<Record<string, Foglio>>({});
  const [vista, setVista] = useState(() => {
    try {
      return conf.vista ?? localStorage.getItem("pa-vista") ?? "inf";
    } catch {
      return "inf";
    }
  });
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [mod, setMod] = useState<Modifica | null>(null);
  const [lavoro, setLavoro] = useState("");
  const [stampa, setStampa] = useState(false);
  const [scelta, setScelta] = useState<{ img: string[]; sel: boolean[] } | null>(null);
  const [wa, setWa] = useState(false);
  const pagine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      chiama<Stato>("stato"),
      fetch(BASE + "dati/indice.json", { cache: "no-store" }).then((r) => r.json() as Promise<{ bimestri: Bimestre[] }>),
    ])
      .then(([s, ind]) => {
        setStato(s);
        // bacheca: only the two-month periods with something published
        const pub = s.mesiPubblicati;
        const bb = pub ? ind.bimestri.filter((b) => b.mesi.some((m) => pub[m])) : ind.bimestri;
        ind.bimestri = bb.length ? bb : ind.bimestri.slice(0, 1);
        setBimestri(ind.bimestri);
        // Open on the current two-month period (or the next one, if today falls before all of them)
        const d = new Date();
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const ora =
          ind.bimestri.find((b) => b.mesi.includes(ym)) ??
          ind.bimestri.find((b) => (b.mesi.at(-1) ?? "") >= ym) ??
          ind.bimestri.at(-1);
        setBim(ora?.id ?? "");
        if (s.ruolo === "fs") setVista((v) => (v === "inf" ? "fs" : v));
        if (s.ruolo === "inf") setVista((v) => (v === "fs" ? "inf" : v));
      })
      .catch((e: Error) => setErrore(e.message || "Errore di caricamento"));
  }, []);
  const mesi = bimestri.find((b) => b.id === bim)?.mesi ?? [];
  useEffect(() => {
    for (const m of mesi)
      if (!base[m])
        fetch(BASE + `dati/${m}.json`, { cache: "no-store" })
          .then((r) => r.json() as Promise<Foglio>)
          .then((f) => setBase((b) => ({ ...b, [m]: f })))
          .catch(() => setErrore(`Non trovo i dati di ${m}`));
  }, [bim]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      if (!conf.anteprima && !conf.vista) localStorage.setItem("pa-vista", vista);
    } catch {
      /* no storage */
    }
  }, [vista]);
  // pictures of the events, fetched once
  useEffect(() => {
    if (!stato) return;
    for (const v of Object.values(stato.valori)) {
      const id = /"fotoId":"([^"]+)"/.exec(v)?.[1];
      if (id && !foto[id])
        chiama<string>("foto", id).then((u) => setFoto((f) => ({ ...f, [id]: u })));
    }
  }, [stato]); // eslint-disable-line react-hooks/exhaustive-deps

  const fogli = useMemo(
    () =>
      stato
        ? mesi.filter((m) => base[m] && (!stato.mesiPubblicati || stato.mesiPubblicati[m])).map((m) => {
            const g = applica(base[m]!, stato.valori, foto, stato.impostazioni, stato.cal);
            if (stato.conReparti && stato.reparti) conReparti(g, stato.reparti);
            return g;
          })
        : [],
    [mesi.join(), base, stato, foto], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const salva = useCallback(async (coppie: [string, string][]) => {
    setStato((s) => {
      if (!s) return s;
      const v = { ...s.valori };
      for (const [k, x] of coppie) {
        if (x) v[k] = x;
        else delete v[k];
      }
      return { ...s, valori: v };
    });
    try {
      for (const [k, x] of coppie) await chiama("salva", k, x);
    } catch (e) {
      alert("Non salvato: " + (e as Error).message);
    }
  }, []);

  const tocca = (e: React.MouseEvent) => {
    if (!stato) return;
    const el = (e.target as HTMLElement).closest("[data-campo]");
    if (!el) return;
    const chiave = el.getAttribute("data-campo")!;
    const [id, k] = chiave.split(":") as [string, string];
    const cartaId = k === "data" ? id : cartaDi(id);
    if (!puo(stato.ruolo, cartaId)) return;
    const carta = fogli.flatMap((f) => f.settimane.flatMap((s) => s.carte)).find((c) => c.id === cartaId);
    if (!carta) return;
    if (k === "data") {
      const ev = stato.valori[`${cartaId}:evento`];
      const rit = stato.valori[`${cartaId}:ritocchi`];
      const base0 = Object.values(base)
        .flatMap((f) => f.settimane.flatMap((s) => s.carte))
        .find((c) => c.id === cartaId);
      let ritocchi: Ritocchi = {};
      try {
        ritocchi = rit ? (JSON.parse(rit) as Ritocchi) : {};
      } catch {
        /* broken value: start again */
      }
      setMod({ k: "carta", carta, data: carta.titolo, ora: carta.ora ?? fogli[0]?.inizio ?? "", evento: ev ? JSON.parse(ev) : null, base: base0, ritocchi });
      return;
    }
    const r = carta.sezioni.flatMap((z) => z.righe).find((x) => x.id === id) as Riga;
    const etichetta =
      k === "chi2"
        ? r.ruolo2 === "Ass." ? "Assistente" : r.ruolo2 === "Lett." ? "Lettore" : (r.ruolo2 ?? "Nome")
        : k === "titolo"
          ? r.tipo === "cantico" ? "Numero del cantico" : "Tema del discorso"
          : r.ruolo === "Stud." ? "Studente" : r.ruolo === "Cond." ? "Conduttore" : r.tipo === "voce" ? r.titolo : (r.ruolo ?? "Nome");
    const parte =
      r.tipo === "voce" ? carta.titolo : r.tipo === "cantico" ? `Cantico ${r.titolo || ""}`.trim() : r.titolo || carta.titolo;
    setMod({ k: "nome", chiave, etichetta, parte, valore: stato.valori[chiave] ?? "" });
  };

  // print: pages at real size, then the browser's dialog (Save as PDF)
  useEffect(() => {
    if (!stampa) return;
    const fine = () => setStampa(false);
    window.addEventListener("afterprint", fine, { once: true });
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [stampa]);

  /** Every A4 page of the view as a JPEG (the same pages you see, no print dialog: no link at the foot of the page). */
  async function immaginiPagine(): Promise<string[]> {
    const box = pagine.current;
    if (!box || !fogli[0]) return [];
    box.classList.add("esporta");
    try {
      const { toJpeg } = await import("./vendor/html-to-image/index.js");
      await document.fonts.ready;
      const fontEmbedCSS = await cssCaratteri([fogli[0].stile.carattere, fogli[0].stile.condensato]);
      const img: string[] = [];
      // Safari (iPhone, iPad, Mac) leaves the pictures blank the first times it draws a page: draw pages with
      // pictures a few times and keep the last one.
      const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|Android/.test(navigator.userAgent);
      const opz = { pixelRatio: 2.5, quality: 0.92, backgroundColor: "#fff", cacheBust: false, ...(fontEmbedCSS ? { fontEmbedCSS } : {}) };
      for (const el of box.querySelectorAll<HTMLElement>(".fg-pages .fg-pg")) {
        const foto = [...el.querySelectorAll("img")];
        await Promise.all(foto.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined))));
        const prove = foto.length ? (webkit ? 3 : 1) : 0;
        for (let k = 0; k < prove; k++) await toJpeg(el, opz);
        img.push(await toJpeg(el, opz));
      }
      return img;
    } finally {
      box.classList.remove("esporta");
    }
  }
  /** The PDF of the given pages: shared on the phone (WhatsApp, Mail…), downloaded elsewhere. */
  async function consegnaPdf(img: string[], pagine?: number[]) {
    const [w, h] = dimensioniPagina(fogli[0]!.stile);
    const base = `Programma ${(VISTE.find((v) => v[0] === vista)?.[1] ?? "Adunanze e reparti").toLowerCase()} ${bimestri.find((b) => b.id === bim)?.nome ?? ""}`.trim();
    const nome = pagine?.length ? `${base} (pag. ${pagine.map((i) => i + 1).join(", ")})` : base;
    const dati = pdfDaJpeg(img.map(jpegDaDataUrl), nome, { w: w * 0.75, h: h * 0.75 });
    const blob = new Blob([dati as BlobPart], { type: "application/pdf" });
    const file = new File([blob], `${nome}.pdf`, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (/iPhone|iPad|Android/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nome });
        return;
      } catch {
        /* fall back to the download */
      }
    }
    scarica(`${nome}.pdf`, dati, "application/pdf");
  }
  async function pdf() {
    setLavoro("Preparo il PDF…");
    try {
      const img = await immaginiPagine();
      if (img.length) await consegnaPdf(img);
    } catch (e) {
      alert("PDF non riuscito: " + (e as Error).message + ". Riprova tra qualche secondo.");
    } finally {
      setLavoro("");
    }
  }
  async function scegliPagine() {
    setLavoro("Preparo le pagine…");
    try {
      const img = await immaginiPagine();
      if (img.length) setScelta({ img, sel: img.map(() => true) });
    } catch (e) {
      alert("Pagine non pronte: " + (e as Error).message + ". Riprova tra qualche secondo.");
    } finally {
      setLavoro("");
    }
  }

  if (errore) return <div className="pa-msg">{errore}</div>;
  if (!stato) return <div className="pa-msg">Carico il programma…</div>;
  if (stato.wa) {
    const wa = stato.wa;
    const confermaReparti = (lun: string, rec: unknown) => chiama<void>("confermaReparti", lun, rec);
    const carica = (b64: string, nome: string) => chiama<string>("caricaImmagine", b64, nome);
    // after "Pubblica" in the rotation: only make the images and say when it is done
    if (conf.genera)
      return (
        <GeneraReparti
          wa={wa}
          carica={carica}
          conferma={confermaReparti}
          fine={(n) => parent.postMessage({ waFatto: 1, n }, "*")}
        />
      );
    return (
      <div className="pa">
        <header className="pa-bar">
          <div className="pa-tit">
            <b>Pronto per WhatsApp</b>
            <span>Le immagini della settimana da mandare nei gruppi</span>
          </div>
          <div className="pa-ctl">
            {bimestri.length > 1 && (
              <select value={bim} onChange={(e) => setBim(e.target.value)} aria-label="Bimestre del programma">
                {bimestri.map((b) => (
                  <option key={b.id} value={b.id}>
                    Programma {b.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="pa-aiuto">
            {wa.vede.comp
              ? "Le immagini delle adunanze le conferma chi compila il programma: controllale e premi Conferma, o Modifica se qualcosa è cambiato. "
              : ""}
            Quelle dei reparti escono già confermate quando la turnazione è pubblicata. «Scarica» le prepara per WhatsApp.
          </p>
        </header>
        <ProntoWhatsApp
          fogli={fogli}
          valori={stato.valori}
          podio={stato.podio ?? {}}
          email={stato.email}
          wa={wa}
          puo={(c) => puo(stato.ruolo, c.id)}
          salva={salva}
          carica={carica}
          confermaReparti={async (l, r) => {
            await confermaReparti(l, r);
            setStato((s) => (s && s.wa ? { ...s, wa: { ...s.wa, conferme: { ...s.wa.conferme, [l]: { ...r, il: new Date().toISOString(), da: s.email } } } } : s));
          }}
        />
      </div>
    );
  }
  // Bacheca: piccola anteprima del foglio, senza barra (non si tocca niente)
  if (conf.anteprima)
    return (
      <div className="pa anteprima" style={{ pointerEvents: "none" }}>
        <Pagine2 fogli={fogli} vista={vista} ruolo="legge" tocca={() => undefined} rif={pagine} stampa={false} />
      </div>
    );
  const nomeRuolo = { inf: "adunanza infrasettimanale", fs: "adunanza del fine settimana", tutto: "tutte le adunanze", legge: "" }[stato.ruolo];
  const viste = VISTE.concat(stato.conReparti ? [["rep", "Adunanze e reparti"]] : []);
  return (
    <div className={`pa${stampa ? " stampa" : ""}`}>
      <header className="pa-bar">
        <div className="pa-tit">
          <b>Programmi adunanze</b>
          <span>
            {stato.ruolo === "legge" ? "Programmi pubblicati" : `${stato.email} · compili ${nomeRuolo}`}
          </span>
        </div>
        <div className="pa-ctl">
          {bimestri.length > 1 && (
            <select value={bim} onChange={(e) => setBim(e.target.value)} aria-label="Bimestre">
              {bimestri.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          )}
          <div className="pa-tabs" role="tablist">
            {viste.map(([k, n]) => (
              <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}>
                {n}
              </button>
            ))}
          </div>
          {!stato.senzaWA && !stato.bacheca && (
            <button className={`pa-btn${wa ? "" : " sec"}`} onClick={() => setWa((x) => !x)} aria-pressed={wa}>
              {wa ? "Torna al programma" : "Immagini WhatsApp"}
            </button>
          )}
          <button className="pa-btn" onClick={() => void pdf()} disabled={!!lavoro || wa}>
            {lavoro || "Scarica PDF"}
          </button>
          <button className="pa-btn sec" onClick={() => void scegliPagine()} disabled={!!lavoro || wa}>
            Scegli pagine
          </button>
        </div>
        {stato.ruolo !== "legge" && <p className="pa-aiuto">
          Tocca uno spazio tratteggiato per scrivere un nome. Tocca la data di un’adunanza per cambiare giorno e orario (anche per le settimane seguenti) o per mettere
          al suo posto un’assemblea o un congresso. Si salva da solo.
        </p>}
      </header>
      {wa ? (
        <PannelloWhatsApp
          fogli={fogli}
          valori={stato.valori}
          podio={stato.podio ?? {}}
          email={stato.email}
          puo={(c) => puo(stato.ruolo, c.id)}
          tipi={vista === "inf" ? ["INFRA"] : vista === "fs" ? ["FINE"] : ["INFRA", "FINE"]}
          salva={salva}
          carica={(b64, nome) => chiama<string>("caricaImmagine", b64, nome)}
        />
      ) : (
        <Pagine2 fogli={fogli} vista={vista} ruolo={stato.ruolo} tocca={tocca} rif={pagine} stampa={stampa} />
      )}
      {mod?.k === "nome" && (
        <FinestraNome
          m={mod}
          chiudi={() => setMod(null)}
          salva={(v) => {
            void salva([[mod.chiave, v.trim()]]);
            setMod(null);
          }}
        />
      )}
      {scelta && (
        <div className="pa-fin" onClick={(e) => e.target === e.currentTarget && setScelta(null)}>
          <div className="pa-box">
            <small>Scegli le pagine da mettere nel PDF</small>
            <div className="pa-azioni">
              <button type="button" className="pa-link" onClick={() => setScelta({ ...scelta, sel: scelta.img.map(() => true) })}>
                Tutte
              </button>
              <button type="button" className="pa-link" onClick={() => setScelta({ ...scelta, sel: scelta.img.map(() => false) })}>
                Nessuna
              </button>
            </div>
            <div className="pa-pagsel">
              {scelta.img.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  className={scelta.sel[i] ? "si" : ""}
                  aria-pressed={scelta.sel[i]}
                  onClick={() => setScelta({ ...scelta, sel: scelta.sel.map((x, j) => (j === i ? !x : x)) })}
                >
                  <img src={u} alt={`Pagina ${i + 1}`} />
                  {scelta.sel[i] ? "✓ " : ""}Pagina {i + 1}
                </button>
              ))}
            </div>
            <div className="pa-azioni">
              <span />
              <button type="button" className="pa-btn sec" onClick={() => setScelta(null)}>
                Annulla
              </button>
              <button
                type="button"
                className="pa-btn"
                disabled={!scelta.sel.some(Boolean)}
                onClick={() => {
                  const pag = scelta.sel.flatMap((x, i) => (x ? [i] : []));
                  const img = pag.map((i) => scelta.img[i]!);
                  setScelta(null);
                  void consegnaPdf(img, pag.length < scelta.img.length ? pag : undefined).catch((e: Error) => alert("PDF non riuscito: " + e.message));
                }}
              >
                Scarica {scelta.sel.filter(Boolean).length === 1 ? "la pagina" : `${scelta.sel.filter(Boolean).length} pagine`}
              </button>
            </div>
          </div>
        </div>
      )}
      {mod?.k === "carta" && (
        <FinestraCarta
          m={mod}
          chiudi={() => setMod(null)}
          salva={async (data, ora, seguenti, ev, file, ritocchi) => {
            const speciale = ev?.tipo === TIPO_SPECIALE;
            if (speciale) seguenti = false; // a special meeting is one day only
            let fotoId = ev?.fotoId;
            if (file && ev) {
              setLavoro("Carico la foto…");
              try {
                const url = await ridimensiona(file);
                fotoId = await chiama<string>("caricaFoto", url.split(",")[1], file.name);
                setFoto((f) => ({ ...f, [fotoId!]: url }));
              } catch (e) {
                alert("Foto non caricata: " + (e as Error).message);
              } finally {
                setLavoro("");
              }
            }
            const base0 = Object.values(base)
              .flatMap((f) => f.settimane.flatMap((s) => s.carte))
              .find((c) => c.id === mod.carta.id);
            const id = mod.carta.id;
            const oraBase = base0?.ora ?? Object.values(base)[0]?.inizio ?? "";
            const g = giornoDiTesto(data);
            const righe: [string, string][] = [];
            if (stato?.cal && (!ev || speciale) && g >= 0) {
              // portal: the move goes to the Calendar (everyone follows: surveys, rotations, outings, images)
              const [y, mm, dd] = lunediDi(id).split("-").map(Number) as [number, number, number];
              const iso = new Date(Date.UTC(y, mm - 1, dd + ((g + 6) % 7))).toISOString().slice(0, 10);
              try {
                const cal = await chiama<Stato["cal"]>("spostaAdunanza", id, iso, ora.trim(), seguenti);
                setStato((x) => (x ? { ...x, cal } : x));
                righe.push([`${id}:data`, ""], [`${id}:ora`, ""]);
              } catch (e) {
                alert("Non spostata: " + (e as Error).message);
              }
            } else if (seguenti && g >= 0) {
              // from this week on: one rule, and this week follows it
              righe.push([`regola-${tipoBreve(id)}:${lunediDi(id)}`, JSON.stringify({ g, ora: ora.trim() })]);
              righe.push([`${id}:data`, data.trim() !== titoloGiorno(lunediDi(id), g) ? data.trim() : ""]);
              righe.push([`${id}:ora`, ""]);
            } else {
              const reg = regolaPer(id, stato?.valori ?? {});
              const titolo0 = reg ? titoloGiorno(lunediDi(id), reg.g) : base0?.titolo;
              const ora0 = reg?.ora || oraBase;
              righe.push([`${id}:data`, data.trim() && data.trim() !== titolo0 ? data.trim() : ""]);
              righe.push([`${id}:ora`, ora.trim() && ora.trim() !== ora0 ? ora.trim() : ""]);
            }
            void salva([
              ...righe,
              [`${mod.carta.id}:evento`, ev ? JSON.stringify({ ...ev, foto: undefined, ...(fotoId ? { fotoId } : {}) }) : ""],
              [`${mod.carta.id}:ritocchi`, ritocchi && (Object.keys(ritocchi.s ?? {}).length || Object.keys(ritocchi.r ?? {}).length) ? JSON.stringify(ritocchi) : ""],
            ]);
            setMod(null);
          }}
        />
      )}
    </div>
  );
}

function Pagine2({
  fogli,
  vista,
  ruolo,
  tocca,
  rif,
  stampa,
}: {
  fogli: Foglio[];
  vista: string;
  ruolo: Ruolo;
  tocca: (e: React.MouseEvent) => void;
  rif: React.RefObject<HTMLDivElement | null>;
  stampa: boolean;
}) {
  const [stage, k] = useScala(794);
  return (
    <div ref={stage} className="pa-stage">
      <div ref={rif} className={`compila ruolo-${ruolo}`} onClick={tocca}>
        {fogli.map((f) => {
          const v = f.viste.find((x) => x.id === vista)!;
          const st = { ...f.stile, dimensione: Math.round((f.stile.dimensione * (v.scala ?? 100)) / 100) };
          const a = aspetto(st);
          const [pw, ph] = dimensioniPagina(st);
          return (
            <Pagine
              key={f.id + vista}
              w={pw}
              h={ph}
              margine={st.margine}
              scala={stampa ? 1 : k}
              style={a.style}
              className={a.className}
              testata={<Testata f={f} v={v} stile={st} />}
              piede={(n, tot) => <Piede f={f} v={v} n={n} tot={tot} />}
              blocchi={blocchiVista(f, v, st)}
              misuraKey={JSON.stringify([f, vista])}
              perPagina={v.perPagina}
            />
          );
        })}
      </div>
    </div>
  );
}

function FinestraNome({
  m,
  chiudi,
  salva,
}: {
  m: Extract<Modifica, { k: "nome" }>;
  chiudi: () => void;
  salva: (v: string) => void;
}) {
  const [v, setV] = useState(m.valore);
  return (
    <div className="pa-fin" onClick={(e) => e.target === e.currentTarget && chiudi()}>
      <form
        className="pa-box"
        onSubmit={(e) => {
          e.preventDefault();
          salva(v);
        }}
      >
        <small>{m.parte}</small>
        <label>
          {m.etichetta}
          <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Es. G. Esposito" />
        </label>
        <div className="pa-azioni">
          {m.valore && (
            <button type="button" className="pa-btn sec" onClick={() => salva("")}>
              Svuota
            </button>
          )}
          <span />
          <button type="button" className="pa-btn sec" onClick={chiudi}>
            Annulla
          </button>
          <button className="pa-btn">Salva</button>
        </div>
      </form>
    </div>
  );
}

function FinestraCarta({
  m,
  chiudi,
  salva,
}: {
  m: Extract<Modifica, { k: "carta" }>;
  chiudi: () => void;
  salva: (
    data: string,
    ora: string,
    seguenti: boolean,
    ev: (Evento & { fotoId?: string }) | null,
    file: File | null,
    ritocchi: Ritocchi | null,
  ) => void;
}) {
  const [data, setData] = useState(m.data);
  const [ora, setOra] = useState(m.ora);
  const [seguenti, setSeguenti] = useState(false);
  const [ev, setEv] = useState<(Evento & { fotoId?: string }) | null>(m.evento);
  const [file, setFile] = useState<File | null>(null);
  const [rit, setRit] = useState<Ritocchi>(m.ritocchi);
  const [apriRit, setApriRit] = useState(false);
  const p = (x: Partial<Evento>) => setEv((e) => ({ tipo: TIPI_EVENTO[0]!, ...(e ?? {}), ...x }));
  const fine = m.carta.tipo === "FINE";
  const speciale = ev?.tipo === TIPO_SPECIALE;
  // the time can be changed on a normal meeting and on a special one (not on an assembly week)
  const conOra = speciale || !ev || !m.carta.kicker || m.carta.kicker === m.evento?.tipo;
  const righe = ev?.righe ?? [];
  const setRighe = (r: RigaSpeciale[]) => p({ righe: r });
  const nuovaRiga = (): RigaSpeciale => ({
    id: `${m.carta.id}-r${900000 + Math.floor(Math.random() * 99999)}`,
    titolo: "",
    min: null,
    nome: true,
  });
  const quanti = Object.keys(rit.s ?? {}).length + Object.keys(rit.r ?? {}).length;
  return (
    <div className="pa-fin" onClick={(e) => e.target === e.currentTarget && chiudi()}>
      <form
        className="pa-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (seguenti && !speciale && giornoDiTesto(data) < 0) {
            alert("Scrivi il giorno all’inizio, per esempio «Mercoledì 6 gennaio».");
            return;
          }
          const ev2 = ev && speciale ? { ...ev, righe: righe.filter((r) => r.titolo.trim()) } : ev;
          salva(data, ora, seguenti, ev2, file, ev ? null : rit);
        }}
      >
        <small>{fine ? "Adunanza del fine settimana" : "Adunanza infrasettimanale"}</small>
        <label>
          Giorno
          <input value={data} onChange={(e) => setData(e.target.value)} placeholder="Martedì 3 novembre" />
        </label>
        {conOra && (
          <>
            <label>
              Orario d’inizio
              <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
            </label>
            {speciale ? (
              <p className="pa-nota">Giorno e orario valgono solo per questa adunanza.</p>
            ) : (
              <label className="pa-check">
                <input type="checkbox" checked={seguenti} onChange={(e) => setSeguenti(e.target.checked)} />
                Usa questo giorno della settimana e questo orario anche per tutte le settimane seguenti
              </label>
            )}
          </>
        )}
        <label>
          Questa settimana
          <select
            value={ev?.tipo ?? ""}
            onChange={(e) =>
              e.target.value
                ? p({ tipo: e.target.value, ...(e.target.value === TIPO_SPECIALE && !ev?.righe?.length ? { righe: [nuovaRiga()] } : {}) })
                : setEv(null)
            }
          >
            <option value="">C’è l’adunanza (programma normale)</option>
            {TIPI_EVENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {ev && speciale && (
          <>
            <label>
              Tema
              <input value={ev.tema ?? ""} onChange={(e) => p({ tema: e.target.value })} placeholder="Visita alla filiale italiana" />
            </label>
            <label>
              Luogo (se non è in Sala)
              <input value={ev.luogo ?? ""} onChange={(e) => p({ luogo: e.target.value })} />
            </label>
            <div className="pa-righe">
              <b>Programma</b>
              {righe.map((r, i) => (
                <div key={r.id} className="pa-rsp">
                  <input
                    value={r.titolo}
                    placeholder="Titolo (es. Cantico 1 e preghiera, Discorso…)"
                    onChange={(e) => setRighe(righe.map((x) => (x.id === r.id ? { ...x, titolo: e.target.value } : x)))}
                  />
                  <input
                    className="min"
                    inputMode="numeric"
                    placeholder="min"
                    value={r.min ?? ""}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setRighe(righe.map((x) => (x.id === r.id ? { ...x, min: Number.isFinite(n) ? n : null } : x)));
                    }}
                  />
                  <div className="pa-rsp-sotto">
                  <label className="pa-check">
                    <input
                      type="checkbox"
                      checked={!!r.nome}
                      onChange={(e) => setRighe(righe.map((x) => (x.id === r.id ? { ...x, nome: e.target.checked } : x)))}
                    />
                    con nome
                  </label>
                  <span className="pa-rsp-az">
                    <button type="button" className="pa-link" disabled={i === 0} onClick={() => { const y = [...righe]; [y[i - 1], y[i]] = [y[i]!, y[i - 1]!]; setRighe(y); }}>
                      ↑
                    </button>
                    <button type="button" className="pa-link" disabled={i === righe.length - 1} onClick={() => { const y = [...righe]; [y[i + 1], y[i]] = [y[i]!, y[i + 1]!]; setRighe(y); }}>
                      ↓
                    </button>
                    <button type="button" className="pa-link" onClick={() => setRighe(righe.filter((x) => x.id !== r.id))}>
                      Togli
                    </button>
                  </span>
                  </div>
                </div>
              ))}
              <button type="button" className="pa-btn sec" onClick={() => setRighe([...righe, nuovaRiga()])}>
                + Aggiungi una riga
              </button>
              <small>I nomi si scrivono poi sul programma, toccando lo spazio tratteggiato, come per le altre parti.</small>
            </div>
            <label>
              Nota
              <input value={ev.nota ?? ""} onChange={(e) => p({ nota: e.target.value })} />
            </label>
          </>
        )}
        {ev && !speciale && (
          <>
            <label>
              Tema
              <input value={ev.tema ?? ""} onChange={(e) => p({ tema: e.target.value })} />
            </label>
            <label>
              Luogo
              <input value={ev.luogo ?? ""} onChange={(e) => p({ luogo: e.target.value })} placeholder="Sala delle Assemblee di …" />
            </label>
            <label>
              Indirizzo
              <input value={ev.indirizzo ?? ""} onChange={(e) => p({ indirizzo: e.target.value })} />
            </label>
            <label>
              Orario
              <input value={ev.orario ?? ""} onChange={(e) => p({ orario: e.target.value })} placeholder="Dalle 9:30" />
            </label>
            <label>
              Nota
              <input value={ev.nota ?? ""} onChange={(e) => p({ nota: e.target.value })} placeholder="Questa settimana non c’è l’adunanza in Sala." />
            </label>
            <label>
              Foto del programma {ev.fotoId && !file ? "(già caricata: scegline un’altra per sostituirla)" : ""}
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {(ev.fotoId || file) && (
              <button type="button" className="pa-link" onClick={() => { setFile(null); setEv((e) => (e ? { ...e, fotoId: undefined } : e)); }}>
                Togli la foto
              </button>
            )}
          </>
        )}
        {!ev && m.base && (
          <div className="pa-righe">
            <button type="button" className="pa-link" onClick={() => setApriRit((x) => !x)}>
              {apriRit ? "▾" : "▸"} Titoli e durate di questa adunanza{quanti ? ` (${quanti} ${quanti === 1 ? "modifica" : "modifiche"})` : ""}
            </button>
            {apriRit && <Ritocca base={m.base} rit={rit} setRit={setRit} />}
          </div>
        )}
        <div className="pa-azioni">
          <span />
          <button type="button" className="pa-btn sec" onClick={chiudi}>
            Annulla
          </button>
          <button className="pa-btn">Salva</button>
        </div>
      </form>
    </div>
  );
}

/** Titles and minutes of one meeting: each field starts from the guide; a value equal to the guide is not kept. */
function Ritocca({ base, rit, setRit }: { base: Carta; rit: Ritocchi; setRit: (r: Ritocchi) => void }) {
  const setS = (id: string, k: "titolo" | "durata", v: string, b: string | undefined) => {
    const s = { ...(rit.s ?? {}) };
    const x = { ...(s[id] ?? {}) };
    if (v === (b ?? "")) delete x[k];
    else x[k] = v;
    if (Object.keys(x).length) s[id] = x;
    else delete s[id];
    setRit({ ...rit, s });
  };
  const setR = (id: string, k: "titolo" | "min", v: string | number | null, b: string | number | null | undefined) => {
    const r = { ...(rit.r ?? {}) };
    const x = { ...(r[id] ?? {}) } as { titolo?: string; min?: number | null };
    if (v === (b ?? (k === "min" ? null : ""))) delete x[k];
    else if (k === "min") x.min = v as number | null;
    else x.titolo = v as string;
    if (Object.keys(x).length) r[id] = x;
    else delete r[id];
    setRit({ ...rit, r });
  };
  const titoloRiga = (r: Riga) => r.tipo === "parte" || r.tipo === "testo";
  // what the sheet shows now (a section length follows the minutes of its part)
  const eff = structuredClone(base);
  applicaRitocchi(eff, rit);
  const durataEff = (id: string) => eff.sezioni.find((x) => x.id === id)?.durata ?? "";
  return (
    <div className="pa-rit">
      <small>Valgono solo per questa adunanza. Gli orari delle parti dopo si ricalcolano da soli.</small>
      {base.sezioni.map((z) => (
        <fieldset key={z.id}>
          {!z.senzaTitolo && (
            <div className="pa-rsp">
              <input
                value={rit.s?.[z.id]?.titolo ?? z.titolo}
                onChange={(e) => setS(z.id, "titolo", e.target.value, z.titolo)}
                aria-label="Titolo della sezione"
              />
              <input
                className="dur"
                value={durataEff(z.id)}
                placeholder="(… min)"
                onChange={(e) => setS(z.id, "durata", e.target.value, z.durata)}
                aria-label="Durata della sezione"
              />
            </div>
          )}
          {z.righe
            .filter((r) => (titoloRiga(r) && !r.campi?.includes("titolo")) || r.min != null)
            .map((r) => {
              const tt = rit.r?.[r.id]?.titolo ?? r.titolo;
              const mm = rit.r?.[r.id] && "min" in rit.r[r.id]! ? rit.r[r.id]!.min : r.min;
              return (
                <div key={r.id} className="pa-rsp">
                  {titoloRiga(r) && !r.campi?.includes("titolo") ? (
                    <input value={tt} onChange={(e) => setR(r.id, "titolo", e.target.value, r.titolo)} aria-label="Titolo" />
                  ) : (
                    <span className="pa-rsp-t">{r.tipo === "cantico" ? `Cantico ${r.titolo || ""}`.trim() : r.titolo || "Tema del discorso"}</span>
                  )}
                  {r.min != null && (
                    <input
                      className="min"
                      inputMode="numeric"
                      value={mm ?? ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setR(r.id, "min", Number.isFinite(n) ? n : null, r.min);
                      }}
                      aria-label="Minuti"
                    />
                  )}
                </div>
              );
            })}
        </fieldset>
      ))}
      <button type="button" className="pa-link" onClick={() => setRit({})}>
        Ripristina come la guida
      </button>
    </div>
  );
}

/** The picture, at most 1600 px wide, as JPEG (data URL). */
function ridimensiona(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => rej(new Error("immagine non leggibile"));
    img.src = URL.createObjectURL(file);
  });
}

const radice = document.getElementById("root") ?? document.body.appendChild(document.createElement("div"));
radice.textContent = "";
createRoot(radice).render(<App />);
