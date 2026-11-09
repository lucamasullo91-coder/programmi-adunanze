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
import { normalizza, GIORNI_IT, MESI_IT, cap, type Carta, type Evento, type Foglio, type Riga } from "./tipi";
import { jpegDaDataUrl, pdfDaJpeg, scarica } from "./pdfzip";

// Any error is shown on the page (otherwise a failure inside the Google page is just a blank screen).
const mostraErrore = (m: string) => {
  const d = document.createElement("pre");
  d.style.cssText = "white-space:pre-wrap;margin:16px;padding:12px;border:1px solid #A8432B;color:#A8432B;font:13px monospace;background:#fff";
  d.textContent = "Errore: " + m;
  document.body.appendChild(d);
};
window.addEventListener("error", (e) => mostraErrore(`${e.message} (${e.filename}:${e.lineno})`));
window.addEventListener("unhandledrejection", (e) => mostraErrore(String((e.reason as Error)?.message ?? e.reason)));
for (const c of [fogliCss, appCss]) {
  const st = document.createElement("style");
  st.textContent = c;
  document.head.appendChild(st);
}

type Ruolo = "inf" | "fs" | "tutto";
type Stato = {
  email: string;
  ruolo: Ruolo;
  impostazioni: Record<string, string>;
  valori: Record<string, string>;
};
type Bimestre = { id: string; nome: string; mesi: string[] };

const conf = (window as unknown as { __CONF?: { base?: string } }).__CONF ?? {};
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
  ruolo === "tutto" || (ruolo === "inf") === (tipoCarta(cartaId) === "INFRA");
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
function applica(f: Foglio, valori: Record<string, string>, foto: Record<string, string>, imp: Record<string, string>): Foglio {
  const g = structuredClone(f);
  g.sorv = imp["sorv"] ?? "";
  g.condTG = imp["condTG"] ?? "";
  if (imp["cong"]) g.cong = imp["cong"];
  for (const s of g.settimane)
    for (const c of s.carte) {
      const reg = c.kicker ? null : regolaPer(c.id, valori); // not on special weeks (Memorial)
      if (reg) {
        c.titolo = titoloGiorno(lunediDi(c.id), reg.g);
        if (reg.ora) c.ora = reg.ora;
      }
      const d = valori[`${c.id}:data`];
      if (d) c.titolo = d;
      const o = valori[`${c.id}:ora`];
      if (o) c.ora = o;
      const ev = valori[`${c.id}:evento`];
      if (ev)
        try {
          const e = JSON.parse(ev) as Evento & { fotoId?: string };
          c.evento = { ...e, ...(e.fotoId && foto[e.fotoId] ? { foto: foto[e.fotoId] } : {}) };
          c.kicker = e.tipo;
          c.flag = undefined;
        } catch {
          /* ignore a broken value */
        }
      for (const z of c.sezioni)
        for (const r of z.righe)
          for (const k of r.campi ?? []) {
            const v = valori[`${r.id}:${k}`];
            if (v != null) (r as Record<string, unknown>)[k] = v;
          }
    }
  // Header ("Mercoledì 19:30"): day and time of the first meeting of each kind in the month
  const prima = (t: "INFRA" | "FINE") =>
    g.settimane.flatMap((s) => s.carte).find((c) => c.tipo === t && !c.kicker && !c.evento);
  for (const v of g.viste ?? [])
    for (const q of v.quando ?? []) {
      const c = prima(q.colore === "fine" ? "FINE" : "INFRA");
      if (!c) continue;
      const gi = giornoDiTesto(c.titolo ?? "");
      if (gi >= 0) q.etichetta = cap(GIORNI_IT[gi]!);
      q.ora = c.ora ?? "";
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
  "Nessuna adunanza",
];

type Modifica =
  | { k: "nome"; chiave: string; etichetta: string; parte: string; valore: string }
  | { k: "carta"; carta: Carta; data: string; ora: string; evento: (Evento & { fotoId?: string }) | null };

function App() {
  const [stato, setStato] = useState<Stato | null>(null);
  const [errore, setErrore] = useState("");
  const [bimestri, setBimestri] = useState<Bimestre[]>([]);
  const [bim, setBim] = useState("");
  const [base, setBase] = useState<Record<string, Foglio>>({});
  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem("pa-vista") ?? "inf";
    } catch {
      return "inf";
    }
  });
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [mod, setMod] = useState<Modifica | null>(null);
  const [lavoro, setLavoro] = useState("");
  const [stampa, setStampa] = useState(false);
  const pagine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      chiama<Stato>("stato"),
      fetch(BASE + "dati/indice.json", { cache: "no-store" }).then((r) => r.json() as Promise<{ bimestri: Bimestre[] }>),
    ])
      .then(([s, ind]) => {
        setStato(s);
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
      localStorage.setItem("pa-vista", vista);
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
        ? mesi.filter((m) => base[m]).map((m) => applica(base[m]!, stato.valori, foto, stato.impostazioni))
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
      setMod({ k: "carta", carta, data: carta.titolo, ora: carta.ora ?? fogli[0]?.inizio ?? "", evento: ev ? JSON.parse(ev) : null });
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

  async function pdf() {
    const box = pagine.current;
    if (!box || !fogli[0]) return;
    setLavoro("Preparo il PDF…");
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
      const [w, h] = dimensioniPagina(fogli[0].stile);
      const nome = `Programma ${VISTE.find((v) => v[0] === vista)![1].toLowerCase()} ${bimestri.find((b) => b.id === bim)?.nome ?? ""}`.trim();
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
    } catch (e) {
      alert("PDF non riuscito: " + (e as Error).message + ". Usa «Stampa o salva PDF».");
    } finally {
      box.classList.remove("esporta");
      setLavoro("");
    }
  }

  if (errore) return <div className="pa-msg">{errore}</div>;
  if (!stato) return <div className="pa-msg">Carico il programma…</div>;
  const nomeRuolo = { inf: "adunanza infrasettimanale", fs: "adunanza del fine settimana", tutto: "tutte le adunanze" }[stato.ruolo];
  return (
    <div className={`pa${stampa ? " stampa" : ""}`}>
      <header className="pa-bar">
        <div className="pa-tit">
          <b>Programmi adunanze</b>
          <span>
            {stato.email} · compili {nomeRuolo}
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
            {VISTE.map(([k, n]) => (
              <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}>
                {n}
              </button>
            ))}
          </div>
          <button className="pa-btn" onClick={() => void pdf()} disabled={!!lavoro}>
            {lavoro || "Scarica PDF"}
          </button>
          <button className="pa-btn sec" onClick={() => setStampa(true)}>
            Stampa o salva PDF
          </button>
        </div>
        <p className="pa-aiuto">
          Tocca uno spazio tratteggiato per scrivere un nome. Tocca la data di un’adunanza per cambiare giorno e orario (anche per le settimane seguenti) o per mettere
          al suo posto un’assemblea o un congresso. Si salva da solo.
        </p>
      </header>
      <Pagine2 fogli={fogli} vista={vista} ruolo={stato.ruolo} tocca={tocca} rif={pagine} stampa={stampa} />
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
      {mod?.k === "carta" && (
        <FinestraCarta
          m={mod}
          chiudi={() => setMod(null)}
          salva={async (data, ora, seguenti, ev, file) => {
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
            if (seguenti && g >= 0) {
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
  salva: (data: string, ora: string, seguenti: boolean, ev: (Evento & { fotoId?: string }) | null, file: File | null) => void;
}) {
  const [data, setData] = useState(m.data);
  const [ora, setOra] = useState(m.ora);
  const [seguenti, setSeguenti] = useState(false);
  const [ev, setEv] = useState<(Evento & { fotoId?: string }) | null>(m.evento);
  const [file, setFile] = useState<File | null>(null);
  const p = (x: Partial<Evento>) => setEv((e) => ({ tipo: TIPI_EVENTO[0]!, ...(e ?? {}), ...x }));
  const fine = m.carta.tipo === "FINE";
  return (
    <div className="pa-fin" onClick={(e) => e.target === e.currentTarget && chiudi()}>
      <form
        className="pa-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (seguenti && giornoDiTesto(data) < 0) {
            alert("Scrivi il giorno all’inizio, per esempio «Mercoledì 6 gennaio».");
            return;
          }
          salva(data, ora, seguenti, ev, file);
        }}
      >
        <small>{fine ? "Adunanza del fine settimana" : "Adunanza infrasettimanale"}</small>
        <label>
          Giorno
          <input value={data} onChange={(e) => setData(e.target.value)} placeholder="Martedì 3 novembre" />
        </label>
        {!m.carta.kicker && (
          <>
            <label>
              Orario d’inizio
              <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
            </label>
            <label className="pa-check">
              <input type="checkbox" checked={seguenti} onChange={(e) => setSeguenti(e.target.checked)} />
              Usa questo giorno della settimana e questo orario anche per tutte le settimane seguenti
            </label>
          </>
        )}
        <label>
          Questa settimana
          <select
            value={ev?.tipo ?? ""}
            onChange={(e) => (e.target.value ? p({ tipo: e.target.value }) : setEv(null))}
          >
            <option value="">C’è l’adunanza (programma normale)</option>
            {TIPI_EVENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {ev && (
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
