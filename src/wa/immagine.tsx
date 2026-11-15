// WhatsApp image (1080×1350, vertical chat format) in the style of the printed programs: a coloured band with
// who it is for and the meeting, then blocks with a coloured heading and rows "label → names". Names are split
// in first name (small, line above) and surname (big), so they read well on a phone. The same file is used by
// Programmi adunanze and by Congregation Manager: keep it free of app-specific imports.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export const LARGHEZZA = 1080;
export const ALTEZZA = 1350;

/** A name; `prima` = the name it replaced (struck through, smaller). `nome`/`cognome` when known (else split from v). */
export type Nome = {
  v: string;
  prima?: string | undefined;
  ruolo?: string | undefined;
  nome?: string | undefined;
  cognome?: string | undefined;
};
export type Voce = {
  /** "1." before the label. */
  n?: number | null | undefined;
  etichetta: string;
  /** Small line under the label (Cantico 49, Di casa in casa…). */
  sotto?: string | undefined;
  /** People (split into first name / surname). */
  nomi?: Nome[] | undefined;
  /** Plain value instead of people (song number, congregation, outline). */
  testo?: string | undefined;
  /** The value goes under the label, big (public talk theme). */
  grande?: boolean | undefined;
};
export type Blocco = {
  titolo?: string | undefined;
  colore: string;
  icona?: string | undefined;
  voci: Voce[];
};
export type Modello = {
  /** Small caps line in the band: who it is for. */
  kicker: string;
  titolo: string;
  /** Date and time, under the title. */
  sotto: string;
  colore: string;
  blocchi: Blocco[];
  piede?: string | undefined;
  /** Small boxed tag in the band (Aggiornamento, Bozza). */
  flag?: string | undefined;
};

const PARTICELLE = new Set([
  "de",
  "di",
  "del",
  "della",
  "dello",
  "dei",
  "degli",
  "da",
  "la",
  "lo",
  "li",
  "lu",
  "d'",
  "van",
  "von",
  "mc",
]);

/** "Diego Alex Petralito" → ["Diego Alex", "Petralito"]; "Anna De Luca" → ["Anna", "De Luca"]; "G. Esposito" → ["G.", "Esposito"]. */
export function dividiNome(s: string): [string, string] {
  const p = s.trim().replace(/\s+/g, " ").split(" ");
  if (p.length < 2) return ["", p[0] ?? ""];
  let i = p.length - 1;
  while (i > 1 && PARTICELLE.has(p[i - 1]!.toLowerCase())) i--;
  return [p.slice(0, i).join(" "), p.slice(i).join(" ")];
}


/** One person on one line, all capitals, as on the printed program: role tag, then NAME SURNAME. */
function Persona({ x }: { x: Nome }) {
  const vuoto = !x.v.trim();
  return (
    <span className="wa-p">
      {x.prima && <s className="wa-prima">{x.prima}</s>}
      <span className="wa-pl">
        {x.ruolo && <span className="wa-ruolo">{x.ruolo}</span>}
        <span className={`wa-nome${vuoto ? " vuoto" : ""}`}>{vuoto ? "da definire" : x.v}</span>
      </span>
    </span>
  );
}

function RigaVoce({ v, colore }: { v: Voce; colore: string }) {
  const lbl = (
    <span className="wa-l">
      <span className="wa-et">
        {v.n ? <b className="wa-n">{v.n}.</b> : null}
        {v.etichetta}
      </span>
      {v.sotto && <span className="wa-sotto">{v.sotto}</span>}
    </span>
  );
  if (v.grande)
    return (
      <div className="wa-r grande">
        <span className="wa-et piccola" style={{ color: colore }}>
          {v.etichetta}
        </span>
        <span className={`wa-tema${v.testo ? "" : " vuoto"}`}>{v.testo || "da definire"}</span>
        {v.sotto && <span className="wa-sotto">{v.sotto}</span>}
      </div>
    );
  return (
    <div className="wa-r">
      {lbl}
      <span className="wa-v">
        {v.nomi ? (
          v.nomi.map((x, i) => <Persona key={i} x={x} />)
        ) : (
          <span className={`wa-txt${v.testo ? "" : " vuoto"}`}>{v.testo || "da definire"}</span>
        )}
      </span>
    </div>
  );
}

/** "Martedì 17 novembre · 19:30": the date big, the time a bit smaller on the same line. */
function Data({ s }: { s: string }) {
  const i = s.lastIndexOf(" · ");
  const [d, o] = i > 0 && /^\d{1,2}:\d{2}$/.test(s.slice(i + 3)) ? [s.slice(0, i), s.slice(i + 3)] : [s, ""];
  return (
    <div className={`wa-s${d.length > 26 ? " lunga" : ""}`}>
      {d}
      {o && <span className="wa-ora">{o}</span>}
    </div>
  );
}

/** The image at its real size (1080×1350). The text shrinks or grows (--k) so that the content fills the page. */
export function Immagine({
  m,
  icone,
  rif,
  style,
}: {
  m: Modello;
  icone?: Record<string, ReactNode>;
  rif?: (el: HTMLDivElement | null) => void;
  style?: CSSProperties;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const firma = JSON.stringify(m);
  // fit again once the fonts are there (the first measure may use the fallback font)
  const [caratteri, setCaratteri] = useState(0);
  useEffect(() => {
    let vivo = true;
    void document.fonts.ready.then(() => vivo && setCaratteri((x) => x + 1));
    const f = () => setCaratteri((x) => x + 1);
    document.fonts.addEventListener?.("loadingdone", f);
    return () => {
      vivo = false;
      document.fonts.removeEventListener?.("loadingdone", f);
    };
  }, []);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const corpo = el.querySelector<HTMLElement>(".wa-corpo");
    if (!corpo) return;
    // Largest size that still fits: binary search between 0.5 and 1.35.
    let lo = 0.4;
    let hi = 1.6;
    // fits = nothing below the page, no name wider than its row, no part title cut. A row whose names do not fit
    // beside the title goes on two lines (title, then names): so sparse images can use bigger text.
    const righe = [...el.querySelectorAll<HTMLElement>(".wa-r:not(.grande)")];
    const entra = (k: number) => {
      el.style.setProperty("--k", String(k));
      for (const r of righe) r.classList.remove("pila");
      const larga = (r: HTMLElement) => {
        const t = r.querySelector<HTMLElement>(".wa-et");
        return r.scrollWidth > r.clientWidth + 1 || (!!t && t.scrollWidth > t.clientWidth + 1);
      };
      for (const r of righe) if (larga(r)) r.classList.add("pila");
      if (corpo.scrollHeight > corpo.clientHeight + 1) return false;
      for (const r of righe) if (r.scrollWidth > r.clientWidth + 1) return false;
      for (const e of el.querySelectorAll<HTMLElement>(".wa-et"))
        if (e.scrollHeight > e.clientHeight + 8 || e.scrollWidth > e.clientWidth + 1) return false;
      return true;
    };
    if (entra(hi)) return;
    for (let i = 0; i < 12; i++) {
      const k = (lo + hi) / 2;
      if (entra(k)) lo = k;
      else hi = k;
    }
    entra(lo);
  }, [firma, caratteri]);
  return (
    <div
      ref={(el) => {
        box.current = el;
        rif?.(el);
      }}
      className="wa"
      style={{ ...style, "--c": m.colore } as CSSProperties}
    >
      <div className="wa-band">
        <div className="wa-t">{m.titolo}</div>
        <Data s={m.sotto} />
        <div className="wa-k">
          <span>{m.kicker}</span>
          {m.flag && <em>{m.flag}</em>}
        </div>
      </div>
      <div className="wa-corpo">
        {m.blocchi.map((b, i) => (
          <section key={i} className="wa-b" style={{ "--s": b.colore } as CSSProperties}>
            {b.titolo && (
              <h3>
                {b.icona && icone?.[b.icona]}
                <span>{b.titolo}</span>
              </h3>
            )}
            {b.voci.map((v, j) => (
              <RigaVoce key={j} v={v} colore={b.colore} />
            ))}
          </section>
        ))}
      </div>
      {m.piede && <div className="wa-piede">{m.piede}</div>}
    </div>
  );
}

/** The image as PNG (data URL), at 1080×1350. `fontEmbedCSS` = the @font-face rules with the fonts inlined. */
export async function pngDi(
  el: HTMLElement,
  toPng: (n: HTMLElement, o: Record<string, unknown>) => Promise<string>,
  fontEmbedCSS?: string,
): Promise<string> {
  await document.fonts.ready;
  const opz = {
    width: LARGHEZZA,
    height: ALTEZZA,
    pixelRatio: 1,
    cacheBust: false,
    backgroundColor: "#F6F5F2",
    style: { transform: "none", margin: "0" },
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
  };
  // Safari draws the fonts only from the second time
  await toPng(el, opz);
  return toPng(el, opz);
}

export const CSS_IMMAGINE = `
.wa { --k: 1; --c: #4D5A68; width: ${LARGHEZZA}px; height: ${ALTEZZA}px; background: #F6F5F2; color: #1E2326;
  font-family: "Fira Sans", system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden;
  font-size: calc(var(--k) * 10px); -webkit-font-smoothing: antialiased; position: relative; text-align: left; line-height: 1.2; }
.wa * { box-sizing: border-box; }
.wa-band { background: var(--c); color: #fff; padding: 38px 56px 34px; flex: none; position: relative; }
.wa-band::after { content: ""; position: absolute; left: 56px; bottom: 0; width: 120px; height: 8px; background: #F2C66D; }
.wa-t { font-size: 40px; font-weight: 500; line-height: 1.1; letter-spacing: .01em; opacity: .95; }
.wa-s { font-size: 72px; font-weight: 700; line-height: 1.05; margin-top: 8px; letter-spacing: -.01em; white-space: nowrap; }
.wa-ora { font-size: .62em; font-weight: 500; margin-left: .45em; opacity: .9; }
.wa-s.lunga { font-size: 46px; white-space: normal; }
.wa-k { display: flex; align-items: center; gap: 18px; margin-top: 18px; font-size: 34px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.wa-k em { font-style: normal; font-size: 22px; letter-spacing: .08em; border: 2px solid #fff; border-radius: 8px; padding: 4px 12px; }
.wa-corpo { flex: 1; min-height: 0; padding: 30px 56px 12px; display: flex; flex-direction: column; gap: 1.5em; overflow: hidden; }
.wa-b h3 { margin: 0 0 .35em; display: flex; align-items: center; gap: .55em; color: var(--s); font-size: 2.9em; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; border-bottom: 3px solid var(--s); padding-bottom: .3em; }
.wa-b h3 img, .wa-b h3 svg { width: 1.5em; height: 1.5em; object-fit: contain; }
.wa-r { display: grid; grid-template-columns: minmax(36%, 1fr) auto; align-items: center; gap: .6em 1.6em; padding: .55em 0;
  border-bottom: 1.5px solid #DCD9D2; }
.wa-r:last-child { border-bottom: 0; }
.wa-r.pila { grid-template-columns: minmax(0, 1fr); gap: .25em; }
.wa-r.pila .wa-v { justify-self: start; align-items: flex-start; }
.wa-r.pila .wa-p { align-items: flex-start; text-align: left; }
.wa-r.pila .wa-pl { justify-content: flex-start; }
.wa-r.pila .wa-txt { text-align: left; }
.wa-l { display: flex; flex-direction: column; gap: .2em; min-width: 0; }
.wa-et { font-size: 4.3em; font-weight: 600; line-height: 1.12; color: var(--s); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.wa-et.piccola { font-size: 2.7em; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.wa-n { margin-right: .3em; font-weight: 700; }
.wa-sotto { font-size: 2.9em; color: #5F6B77; line-height: 1.2; }
.wa-v { display: flex; flex-direction: column; gap: .3em; align-items: flex-end; justify-self: end; }
.wa-p { display: flex; flex-direction: column; align-items: flex-end; text-align: right; line-height: 1.1; }
.wa-pl { display: flex; align-items: baseline; justify-content: flex-end; gap: .5em; white-space: nowrap; }
.wa-ruolo { font-size: 2.3em; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s); }
.wa-prima { font-size: 2.9em; color: #8A939C; text-decoration-thickness: 3px; text-transform: uppercase; margin-bottom: .1em; }
.wa-nome { font-size: 4.3em; font-weight: 700; text-transform: uppercase; letter-spacing: .01em; }
.wa-nome.vuoto, .wa-txt.vuoto, .wa-tema.vuoto { color: #A2AAB2; font-weight: 400; font-style: italic; font-size: 3.4em; text-transform: none; }
.wa-txt { font-size: 4.6em; font-weight: 700; text-align: right; text-transform: uppercase; white-space: nowrap; }
.wa-r.grande { display: flex; flex-direction: column; align-items: flex-start; gap: .4em; }
.wa-tema { font-size: 5.2em; font-weight: 700; line-height: 1.12; }
.wa-piede { flex: none; padding: 10px 56px 30px; font-size: 24px; color: #5F6B77; letter-spacing: .08em; text-transform: uppercase; display: flex; justify-content: space-between; }
`;
