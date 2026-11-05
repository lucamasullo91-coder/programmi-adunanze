// Drawing of the sheets: cards, rows, header and footer, and the pages (blocks laid out page after page,
// measured in the browser so that nothing is cut).
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CARATTERI,
  NOMI_CARTA,
  ORDINALI,
  colore,
  coloreCarta,
  famiglia,
  orari,
  type Carta,
  type Foglio,
  type Riga,
  type Settimana,
  type Stile,
  type Vista,
} from "./tipi";
import { icona, srcIcona } from "./icone";

/** Only <sup>, <sub>, <b>, <i>, <br> are kept from the text (names like N<sup>mi</sup> Diodati). */
export function ricco(s: string | undefined): { __html: string } {
  const e = (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return { __html: e.replace(/&lt;(\/?)(sup|sub|b|i|br)\s*\/?&gt;/gi, "<$1$2>") };
}
const R = ({ t, cls }: { t: string | undefined; cls?: string }) => (
  <span className={cls} dangerouslySetInnerHTML={ricco(t)} />
);

export const PAGINA: Record<Stile["formato"], [number, number]> = {
  A4: [794, 1123],
  A5: [559, 794],
  A6: [397, 559],
  Letter: [816, 1056],
  /** Images to share: square for a chat, 9:16 for the phone screen (1080×1920 at 2×). */
  Quadrato: [794, 794],
  Telefono: [540, 960],
};
export const dimensioniPagina = (s: Stile): [number, number] => {
  const [w, h] = PAGINA[s.formato];
  return s.orientamento === "orizzontale" ? [h, w] : [w, h];
};

const caricati = new Set<string>();
/** Loads a Google font the first time a sheet uses it. */
export function caricaCarattere(id: string) {
  const c = CARATTERI.find((x) => x.id === id);
  if (!c?.google || caricati.has(id) || typeof document === "undefined") return;
  caricati.add(id);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${c.google}&display=swap`;
  document.head.appendChild(l);
}

/** CSS variables and classes of a page from the style. */
export function aspetto(s: Stile): { style: CSSProperties; className: string } {
  const c = s.colori;
  const modo = (m: Stile["testoParti"], pers: string) =>
    m === "sezione" ? "var(--s)" : m === "personalizzato" ? pers : "var(--fg-ink)";
  const d = s.densita === "compatta" ? 0.6 : s.densita === "ampia" ? 1.5 : 1;
  const style = {
    "--fg-font": famiglia(s.carattere),
    "--fg-cond": famiglia(s.condensato),
    "--fg-fs": `${(13.5 * s.dimensione) / 100}px`,
    "--fg-ink": c.inchiostro,
    "--fg-paper": c.carta,
    "--fg-line": c.linee,
    "--fg-gen": c.generale,
    "--fg-acc": c.accento,
    "--fg-testata": c.testata,
    "--fg-vita": c.vita,
    "--fg-tp": modo(s.testoParti, s.colParti),
    "--fg-tn": modo(s.testoNomi, s.colNomi),
    "--fg-tnum": s.numeri === "sezione" ? "var(--s)" : "var(--fg-ink)",
    "--fg-r": `${s.angoli}px`,
    "--fg-d": String(d),
    "--fg-gap": `${Math.round(12 * d)}px`,
  } as CSSProperties;
  const className = [
    "fg-pg",
    `fascia-${s.fascia}`,
    s.bn && "bn",
    !s.bordi && "nobordi",
    !s.sfondoSchede && "nosfondo",
    !s.orari && "noorari",
    !s.ruoli && "noruoli",
    s.maiuscoloNomi && "maiuscolo",
    // "Section colour" must be resolved inside each section (where --s is set), not on the page.
    s.testoParti === "sezione" && "tp-sez",
    s.testoNomi === "sezione" && "tn-sez",
    s.numeri === "sezione" && "num-sez",
  ]
    .filter(Boolean)
    .join(" ");
  return { style, className };
}

const NOTA = (
  <svg className="fg-nt" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="currentColor"
      d="M21.5 6.5v24.2a7.2 7.2 0 1 0 3 5.8V15.4c4.7 1 8.4 3.8 9.8 8.3.4 1.2 2.2.9 2.1-.4C36 13.6 29.6 8.6 22.8 5.6a.9.9 0 0 0-1.3.9z"
    />
  </svg>
);

export type Selezione = {
  k: "foglio" | "vista" | "settimana" | "carta" | "sezione" | "riga";
  id: string;
} | null;
type Sel = { sel?: Selezione | undefined; edit?: boolean | undefined };

/** A field the compiler fills in: the value, or a dotted line to write on. */
function Campo({ r, k, t, lungo }: { r: Riga; k: "chi" | "chi2" | "titolo"; t: string | undefined; lungo?: boolean }) {
  return (
    <span
      className={cls("campo", !t && "vuoto", lungo && "lungo")}
      data-campo={`${r.id}:${k}`}
      dangerouslySetInnerHTML={ricco(t)}
    />
  );
}
const selAttr = (k: string, id: string, x: Sel) =>
  x.edit ? { "data-sel": `${k}:${id}`, className: x.sel?.id === id ? "sel" : undefined } : {};
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ") || undefined;

function Vuoto({ edit, t = "—" }: { edit?: boolean | undefined; t?: string }) {
  return edit ? <span className="fg-vuoto">{t}</span> : null;
}

function RigaFoglio({
  r,
  info,
  x,
  stile,
}: {
  r: Riga;
  info: { ora: string | null; n: number | null } | undefined;
  x: Sel;
  stile: Stile;
}) {
  const sa = selAttr("riga", r.id, x);
  const durata =
    stile.durate && r.mostraMin && typeof r.min === "number" ? (
      <span className="m">({r.min} min)</span>
    ) : null;
  const col = r.colore
    ? ({ "--fg-tp": colore(r.colore, stile.colori) } as CSSProperties)
    : undefined;
  const nomi = (
    <span className="v">
      {r.chi2 || r.campi?.includes("chi2") ? (
        <>
          <span className="ln">
            {r.ruolo && <small>{r.ruolo}</small>}
            {r.campi?.includes("chi") ? <Campo r={r} k="chi" t={r.chi} /> : <R t={r.chi} />}
          </span>
          <span className="ln">
            {r.ruolo2 && <small>{r.ruolo2}</small>}
            {r.campi?.includes("chi2") ? <Campo r={r} k="chi2" t={r.chi2} /> : <R t={r.chi2} />}
          </span>
        </>
      ) : (
        <>
          {r.ruolo && (r.chi || r.campi?.includes("chi")) && <small>{r.ruolo}</small>}
          {r.campi?.includes("chi") ? (
            <Campo r={r} k="chi" t={r.chi} />
          ) : r.chi ? (
            <R t={r.chi} />
          ) : r.ruolo && x.edit ? (
            <Vuoto edit t={r.ruolo} />
          ) : null}
        </>
      )}
    </span>
  );
  const h = <span className="h">{info?.ora ?? ""}</span>;
  if (r.tipo === "testa")
    return (
      <div {...sa} className={cls("fg-r top", sa.className)} style={col}>
        <span className="h" />
        <span className="w">
          {r.titolo}
          {r.rif && (
            <>
              {" "}
              · <b dangerouslySetInnerHTML={ricco(r.rif)} />
            </>
          )}
        </span>
        {nomi}
      </div>
    );
  if (r.tipo === "voce")
    return (
      <div {...sa} className={cls("fg-r voce", sa.className)} style={col}>
        {h}
        <span className="w">
          <span className="lbl">{r.titolo}</span>
        </span>
        {r.campi?.includes("chi") ? (
          <span className="v">
            <Campo r={r} k="chi" t={r.chi} />
          </span>
        ) : r.chi ? (
          <span className="v">
            <R t={r.chi} />
          </span>
        ) : (
          <span className="v">
            <Vuoto edit={x.edit} />
          </span>
        )}
      </div>
    );
  if (r.tipo === "cantico")
    return (
      <div {...sa} className={cls("fg-r cantico", sa.className)} style={col}>
        {h}
        <span className="w">
          {NOTA}
          <b>
            Cantico
            {r.campi?.includes("titolo") ? (
              <>
                {" "}
                <Campo r={r} k="titolo" t={r.titolo} />
              </>
            ) : r.titolo ? (
              ` ${r.titolo}`
            ) : (
              ""
            )}
            {r.suffisso ? ` ${r.suffisso}` : ""}
          </b>
          {r.sottotitolo && <span className="st">{r.sottotitolo}</span>}
        </span>
        {nomi}
      </div>
    );
  return (
    <div
      {...sa}
      className={cls("fg-r", r.grande && "big", r.tipo === "testo" && "testo", sa.className)}
      style={col}
    >
      {h}
      <span className="w">
        {stile.numeriParti && info?.n ? <span className="n">{info.n}.</span> : null}
        {r.campi?.includes("titolo") ? (
          <b>
            <Campo r={r} k="titolo" t={r.titolo} lungo />
          </b>
        ) : r.titolo ? (
          <b dangerouslySetInnerHTML={ricco(r.titolo)} />
        ) : (
          <Vuoto edit={x.edit} t="Titolo" />
        )}
        {durata}
        {r.suffisso && <span className="m">{r.suffisso}</span>}
        {r.tag && <span className="tag">{r.tag}</span>}
        {r.ambito && <span className="a">{r.ambito}</span>}
        {r.rif && <span className="ref" dangerouslySetInnerHTML={ricco(r.rif)} />}
        {r.tema && <span className="q">“{r.tema}”</span>}
      </span>
      {nomi}
    </div>
  );
}

function ImgIcona({ id, col, cls: c }: { id: string; col: string; cls?: string }) {
  const i = icona(id);
  if (!i) return null;
  const larga = /torre|testata/.test(id);
  return (
    <img
      src={srcIcona(id, col)}
      alt=""
      className={cls(c, larga && "larga", i.chiara && "chiara")}
    />
  );
}

export function CartaFoglio({
  c,
  f,
  stile,
  kicker,
  nascondiFlag,
  x = {},
}: {
  c: Carta;
  f: Pick<Foglio, "inizio">;
  stile: Stile;
  kicker?: string | undefined;
  nascondiFlag?: boolean;
  x?: Sel;
}) {
  const info = orari(c, f.inizio);
  const conOre = [...info.values()].some((v) => v.ora);
  const band = coloreCarta(c, stile.colori);
  const sa = selAttr("carta", c.id, x);
  const k = c.kicker ?? kicker ?? NOMI_CARTA[c.tipo];
  return (
    <article
      data-tipo={c.tipo}
      className={cls("fg-card", !conOre && "senza-ore")}
      style={{ "--c": band } as CSSProperties}
    >
      <div {...sa} className={cls("fg-band", sa.className)}>
        <div className="tx">
          {k && <div className="k">{c.kicker && kicker ? `${kicker} · ${c.kicker}` : k}</div>}
          <div className="t">
            {c.editData ? (
              <span className="campo data" data-campo={`${c.id}:data`}>
                {c.titolo}
              </span>
            ) : (
              c.titolo || <Vuoto edit={x.edit} t="Giorno" />
            )}
          </div>
        </div>
        {c.ora && <span className="ora">{c.ora}</span>}
        {c.flag && !nascondiFlag && <span className="flag">{c.flag}</span>}
        {stile.icone && !!c.icone?.length && (
          <div className="ics">
            {c.icone.map((i) => (
              <ImgIcona key={i} id={i} col="#fff" />
            ))}
          </div>
        )}
      </div>
      {c.evento ? (
        <div className="ev-bd">
          {c.evento.foto && <img className="ev-foto" src={c.evento.foto} alt="" />}
          <div className="ev-info">
            {c.evento.tema && <div className="ev-tema">{c.evento.tema}</div>}
            {(
              [
                ["Luogo", c.evento.luogo],
                ["Indirizzo", c.evento.indirizzo],
                ["Orario", c.evento.orario],
              ] as const
            ).map(([l, v]) =>
              v ? (
                <div key={l} className="ev-r">
                  <small>{l}</small>
                  <span>{v}</span>
                </div>
              ) : null,
            )}
            {c.evento.nota && <p className="ev-nota">{c.evento.nota}</p>}
          </div>
        </div>
      ) : (
      <div className="fg-bd">
        {c.sezioni.map((s) => {
          const sc = colore(s.colore, stile.colori);
          const ss = selAttr("sezione", s.id, x);
          return (
            <div key={s.id} style={{ "--s": sc } as CSSProperties}>
              {!s.senzaTitolo ? (
                <div {...ss} className={cls("fg-sec", ss.className)}>
                  {stile.icone && s.icona && <ImgIcona id={s.icona} col={sc} />}
                  <span>{s.titolo}</span>
                  {s.durata && <span className="d">{s.durata}</span>}
                  {s.valore ? (
                    <span className="val" dangerouslySetInnerHTML={ricco(s.valore)} />
                  ) : null}
                </div>
              ) : x.edit ? (
                <div
                  {...ss}
                  className={cls("fg-sec", ss.className)}
                  style={{ borderBottomStyle: "dotted", opacity: 0.5 }}
                >
                  <span>{s.titolo || "Sezione"} (titolo nascosto)</span>
                </div>
              ) : null}
              {s.righe.map((r) => (
                <RigaFoglio key={r.id} r={r} info={info.get(r.id)} x={x} stile={stile} />
              ))}
            </div>
          );
        })}
      </div>
      )}
    </article>
  );
}

const MESI_NUM = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
function sostituisci(t: string, f: Foglio) {
  const parti = t.split(/(\{sorv\}|\{condTG\}|\{cong\})/);
  return parti.map((p, i) =>
    p === "{sorv}" ? (
      <b key={i}>{f.sorv}</b>
    ) : p === "{condTG}" ? (
      <b key={i}>{f.condTG}</b>
    ) : p === "{cong}" ? (
      <b key={i}>{f.cong}</b>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

export function Testata({ f, v, stile, x = {} }: { f: Foglio; v: Vista; stile: Stile; x?: Sel }) {
  const sa = selAttr("vista", v.id, x);
  return (
    <header {...sa} className={cls("fg-hd", sa.className)}>
      <div>
        <div className="fg-kick">{f.cong}</div>
        <div className="fg-wheat" />
        <h1 className="fg-ttl">
          <small>{v.sup}</small>
          {v.titolo}
        </h1>
      </div>
      <div className="fg-hd-r">
        <div className="fg-month">
          {f.mese} {f.anno}
        </div>
        <div className="fg-when">
          {v.quando.map((q, i) => (
            <span
              key={i}
              style={
                {
                  "--w": colore(q.colore.startsWith("#") ? q.colore : `@${q.colore}`, stile.colori),
                } as CSSProperties
              }
            >
              {q.etichetta}
              <i>{q.ora || f.inizio}</i>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

export function Piede({
  f,
  v,
  n,
  tot,
  x = {},
}: {
  f: Foglio;
  v: Vista;
  n: number;
  tot: number;
  x?: Sel;
}) {
  const mm = String(MESI_NUM.indexOf(f.mese.toLowerCase()) + 1).padStart(2, "0");
  const sa = selAttr("foglio", f.id, x);
  return (
    <footer {...sa} className={cls("fg-ft", sa.className)}>
      <span className="t">
        {v.piede} · {f.mese} {f.anno}
      </span>
      <span className="c">{sostituisci(v.centro, f)}</span>
      <span className="code">
        {f.sigla && (
          <b>
            {f.sigla}/{v.codice}-{mm}.{f.anno.slice(2)}
          </b>
        )}
        Pagina {n} di {tot}
      </span>
    </footer>
  );
}

/** The blocks of a view: for each week its cards, laid out as the view says. */
export type Blocco = { key: string; node: ReactNode; nuova: boolean; legato?: boolean };

export function blocchiVista(f: Foglio, v: Vista, stile: Stile, x: Sel = {}): Blocco[] {
  const out: Blocco[] = [];
  f.settimane.forEach((s: Settimana, i) => {
    if (s.nascosta && !x.edit) return;
    const kick = `${ORDINALI[i] ?? `${i + 1}ª`} settimana · ${s.label}`;
    const righe = (s.disposizioni?.[v.id] ?? v.righe)
      .map((tipi) =>
        tipi.map((t) => s.carte.find((c) => c.tipo === t)).filter((c): c is Carta => !!c),
      )
      .filter((r) => r.length);
    const altre = v.settimana ? s.carte.filter((c) => c.tipo === "ALTRO") : [];
    const carta = (c: Carta) => (
      <CartaFoglio
        key={c.id}
        c={c}
        f={f}
        stile={stile}
        x={x}
        kicker={v.kicker ? kick : undefined}
        nascondiFlag={v.settimana && !!s.visita && /^visita/i.test(c.flag ?? "")}
      />
    );
    const riga = (r: Carta[], k: number) =>
      r.length === 1 ? (
        <Fragment key={k}>{carta(r[0]!)}</Fragment>
      ) : (
        <div
          key={k}
          className="fg-duo"
          style={{
            gridTemplateColumns: r
              .map((_, j) => {
                if (j > 0 || r.length !== 2) return "minmax(0,1fr)";
                // A meeting with its duties: the duties narrower; two meetings: the midweek one a bit wider.
                const rep = r[1]!.tipo.startsWith("REP") && !r[0]!.tipo.startsWith("REP");
                return `minmax(0,${rep ? (v.proporzioneReparti ?? 1.95) : v.proporzione}fr)`;
              })
              .join(" "),
          }}
        >
          {r.map(carta)}
        </div>
      );
    const sa = selAttr("settimana", s.id, x);
    if (v.settimana) {
      // The week header goes with the first row; the other rows are separate blocks kept with it when they fit.
      const testa = (
        <div {...sa} className={cls("fg-wk", sa.className)}>
          <b>{ORDINALI[i] ?? `${i + 1}ª`} settimana</b>
          <span>{s.label}</span>
          {s.visita && <em>Visita del sorvegliante di circoscrizione</em>}
          {s.nota && !s.visita && <em>{s.nota}</em>}
        </div>
      );
      const parti = [...righe.map(riga), ...altre.map(carta)];
      const op = s.nascosta ? { opacity: 0.4 } : undefined;
      out.push({
        key: s.id,
        nuova: !!s.nuovaPagina,
        node: (
          <div className="fg-blk" style={op}>
            {testa}
            {parti[0]}
          </div>
        ),
      });
      parti.slice(1).forEach((n, k) =>
        out.push({
          key: `${s.id}-${k}`,
          nuova: false,
          legato: true,
          node: (
            <div className="fg-blk" style={op}>
              {n}
            </div>
          ),
        }),
      );
    } else
      righe.forEach((r, k) =>
        out.push({
          key: `${s.id}-${k}`,
          nuova: !!s.nuovaPagina && k === 0,
          node: <div style={s.nascosta ? { opacity: 0.4 } : undefined}>{riga(r, k)}</div>,
        }),
      );
  });
  return out;
}

/**
 * Pages of fixed size: the header on top of each page, then as many blocks as fit, the footer at the bottom.
 * The blocks are measured off screen first.
 */
export function Pagine({
  w,
  h,
  margine,
  testata,
  piede,
  blocchi,
  style,
  className,
  scala,
  misuraKey,
  onPagine,
  perPagina,
  crescita = 1.25,
}: {
  w: number;
  h: number;
  margine: number;
  testata: ReactNode | ((n: number) => ReactNode) | null;
  piede: ((n: number, tot: number) => ReactNode) | null;
  blocchi: Blocco[];
  style: CSSProperties;
  className: string;
  scala: number;
  misuraKey: string;
  onPagine?: (n: number) => void;
  /** Fixed number of blocks (weeks or meetings) per page: the text shrinks or grows to fill the page. */
  perPagina?: number | undefined;
  /** How much the text may grow to fill the page (perPagina). */
  crescita?: number;
}) {
  const misura = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [gruppi, setGruppi] = useState<number[][]>([blocchi.map((_, i) => i)]);
  const [font, setFont] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let vivo = true;
    void document.fonts.ready.then(() => vivo && setFont((n) => n + 1));
    const f = () => setFont((n) => n + 1);
    document.fonts.addEventListener?.("loadingdone", f);
    return () => {
      vivo = false;
      document.fonts.removeEventListener?.("loadingdone", f);
    };
  }, []);
  const pad = Math.round(margine * 3.78);
  useLayoutEffect(() => {
    const m = misura.current;
    if (!m) return;
    const hd = (m.querySelector("[data-m=hd]") as HTMLElement | null)?.offsetHeight ?? 0;
    const ft = (m.querySelector("[data-m=ft]") as HTMLElement | null)?.offsetHeight ?? 0;
    const gap = parseFloat(getComputedStyle(m.querySelector(".fg-body") ?? m).rowGap || "12") || 12;
    const corpo1 = h - pad * 2 - hd - ft - 4;
    const corpoN = typeof testata === "function" ? corpo1 + hd : corpo1;
    const alt = [...m.querySelectorAll<HTMLElement>("[data-m=b]")].map((e) => e.offsetHeight);
    const out: number[][] = [];
    let cur: number[] = [],
      usato = 0;
    if (perPagina) {
      // A unit is a block that does not belong to the one before (a week, or a meeting).
      let unita = 0;
      alt.forEach((_, i) => {
        const b = blocchi[i];
        if (cur.length && !b?.legato && (unita >= perPagina || b?.nuova)) {
          out.push(cur);
          cur = [];
          unita = 0;
        }
        if (!b?.legato) unita++;
        cur.push(i);
      });
      if (cur.length || !out.length) out.push(cur);
      const altezza = (g: number[]) => g.reduce((t, i, j) => t + alt[i]! + (j ? gap : 0), 0);
      const rapporto = Math.min(
        ...out.map((g, i) => (i ? corpoN : corpo1) / Math.max(altezza(g), 1)),
      );
      const nk = Math.max(
        0.5,
        Math.min(crescita, k * (rapporto > 1 ? 1 + (rapporto - 1) * 0.9 : rapporto * 0.99)),
      );
      if (Math.abs(nk - k) > 0.012 && (rapporto < 1 || rapporto > 1.04)) setK(nk);
      setGruppi((g) => (JSON.stringify(g) === JSON.stringify(out) ? g : out));
      return;
    }
    if (k !== 1) setK(1);
    alt.forEach((a, i) => {
      const corpo = out.length ? corpoN : corpo1;
      const serve = (cur.length ? gap : 0) + a;
      if (cur.length && (usato + serve > corpo || blocchi[i]?.nuova)) {
        // A block that belongs with the one before (same week) takes it along to the new page when both fit there.
        const prec = cur.at(-1)!;
        if (
          blocchi[i]?.legato &&
          !blocchi[i]?.nuova &&
          cur.length > 1 &&
          alt[prec]! + gap + a <= corpo
        ) {
          cur.pop();
          out.push(cur);
          cur = [prec];
          usato = alt[prec]!;
        } else {
          out.push(cur);
          cur = [];
          usato = 0;
        }
      }
      usato += (cur.length ? gap : 0) + a;
      cur.push(i);
    });
    if (cur.length || !out.length) out.push(cur);
    setGruppi((g) => (JSON.stringify(g) === JSON.stringify(out) ? g : out));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misuraKey, font, w, h, pad, blocchi.length, perPagina, k, crescita]);
  useEffect(() => {
    onPagine?.(gruppi.length);
  }, [gruppi.length, onPagine]);
  const pagina = (contenuto: ReactNode, n: number, tot: number, misurando = false) => (
    <section
      className={className}
      style={{
        ...style,
        width: w,
        height: misurando ? "auto" : h,
        padding: `${pad}px ${pad + 6}px ${Math.max(pad - 6, 4)}px`,
      }}
    >
      {testata && (typeof testata !== "function" || n === 1) && (
        <div data-m={misurando ? "hd" : undefined}>
          {typeof testata === "function" ? testata(n) : testata}
        </div>
      )}
      <div
        className="fg-body"
        style={k !== 1 ? ({ "--fg-k": String(k) } as CSSProperties) : undefined}
      >
        {contenuto}
      </div>
      {piede && <div data-m={misurando ? "ft" : undefined}>{piede(n, tot)}</div>}
    </section>
  );
  return (
    <>
      <div ref={misura} className="fg-misura" aria-hidden>
        {pagina(
          blocchi.map((b) => (
            <div key={b.key} data-m="b">
              {b.node}
            </div>
          )),
          1,
          1,
          true,
        )}
      </div>
      <div className="fg-pages">
        {gruppi.map((g, i) => (
          <div key={i} className="fg-pw" style={{ width: w * scala, height: h * scala }}>
            <div
              style={{ transform: `scale(${scala})`, transformOrigin: "0 0", width: w, height: h }}
            >
              {pagina(
                g.map(
                  (j) =>
                    blocchi[j] && <Fragment key={blocchi[j]!.key}>{blocchi[j]!.node}</Fragment>,
                ),
                i + 1,
                gruppi.length,
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Scale that fits a page of width w in the element (a callback ref: the element can appear later). */
export function useScala(w: number, max = 1) {
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [k, setK] = useState(0.5);
  useLayoutEffect(() => {
    if (!el) return;
    const f = () => setK(Math.min(max, Math.max(0.2, (el.clientWidth - 16) / w)));
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, w, max]);
  return [ref, k] as const;
}

const cacheFont = new Map<string, Promise<string>>();
/**
 * The @font-face rules of the fonts in use with the files inlined (latin only), for the images: the browser
 * does not let html-to-image read Google's stylesheets, so without this the images fall back to Arial.
 */
export function cssCaratteri(ids: string[]): Promise<string> {
  const chiave = [...new Set(ids)].sort().join(",");
  if (!cacheFont.has(chiave)) {
    cacheFont.set(
      chiave,
      (async () => {
        const parti: string[] = [];
        for (const id of new Set(ids)) {
          const c = CARATTERI.find((x) => x.id === id);
          if (!c?.google) continue;
          try {
            const css = await (
              await fetch(`https://fonts.googleapis.com/css2?family=${c.google}&display=swap`)
            ).text();
            const blocchi = css
              .split("@font-face")
              .slice(1)
              .map((b) => `@font-face${b}`)
              .filter((b) => /U\+0000-00FF/i.test(b) || !/unicode-range/.test(b));
            for (const b of blocchi) {
              const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
              if (!url) continue;
              const buf = await (await fetch(url)).arrayBuffer();
              let bin = "";
              const u8 = new Uint8Array(buf);
              for (let i = 0; i < u8.length; i += 0x8000)
                bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
              parti.push(b.replace(url, `data:font/woff2;base64,${btoa(bin)}`));
            }
          } catch {
            /* offline: the image uses the fallback font */
          }
        }
        return parti.join("\n");
      })(),
    );
  }
  return cacheFont.get(chiave)!;
}
