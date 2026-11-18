// "Pronto per WhatsApp": week by week, the images to send in the groups.
// - Each meeting: the chairman's image and the Audio/Video rehearsal one (podium + parts with an assistant),
//   confirmed by who compiles that program (Pannello);
// - The departments (Audio/Video, Uscieri, Letteratura e territori, Pulizie): from the published rotation, confirmed
//   by themselves. For Luca they are also turned into PNG files and kept, so the Telegram messages can send them.
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { cssCaratteri } from "../Rendering";
import type { Carta, Foglio } from "../tipi";
import { ALTEZZA, Immagine, LARGHEZZA, pngDi, type Modello } from "./immagine";
import { PannelloWhatsApp } from "./Pannello";
import { REPARTI, intervallo, modelliReparti, quandoSett, type ConfRep, type Rep, type SettWA, type Vede } from "./reparti";

export type StatoWA = { vede: Vede; reparti: Record<string, SettWA>; conferme: Record<string, ConfRep>; cong: string };
type Props = {
  fogli: Foglio[];
  valori: Record<string, string>;
  podio: Record<string, string>;
  email: string;
  wa: StatoWA;
  puo: (c: Carta) => boolean;
  salva: (coppie: [string, string][]) => Promise<void>;
  carica: (base64: string, nome: string) => Promise<string>;
  confermaReparti: (lunedi: string, rec: Omit<ConfRep, "il" | "da">) => Promise<void>;
};

const lunediOggi = () => {
  const d = new Date();
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
  return x.toISOString().slice(0, 10);
};
const piu = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

async function png(el: HTMLElement) {
  const { toPng } = await import("../vendor/html-to-image/index.js");
  const css = await cssCaratteri(["fira"]);
  return pngDi(el, toPng as never, css || undefined);
}

export function ProntoWhatsApp(p: Props) {
  const cong = p.wa.cong;
  const lun0 = lunediOggi();
  const settimane = useMemo(() => {
    const s = new Set<string>();
    for (const f of p.fogli) for (const w of f.settimane) for (const c of w.carte) if (/^\d{4}-\d{2}-\d{2}-(inf|fs)$/.test(c.id)) s.add(c.id.slice(0, 10));
    for (const k of Object.keys(p.wa.reparti)) s.add(k);
    return [...s].filter((x) => x >= lun0).sort();
  }, [p.fogli, p.wa.reparti, lun0]);
  const [sett, setSett] = useState("");
  const scelta = sett && settimane.includes(sett) ? sett : settimane[0] ?? "";
  const rep = p.wa.reparti[scelta];
  const modelli = useMemo(() => (rep ? modelliReparti(rep, cong) : {}), [rep, cong]);
  const [grande, setGrande] = useState<Modello | null>(null);
  const [lavoro, setLavoro] = useState("");
  const nodi = useRef(new Map<string, HTMLDivElement>());
  const vedeAd = p.wa.vede.pres || p.wa.vede.prove.INFRA || p.wa.vede.prove.FINE || !!p.wa.vede.comp;

  async function scaricaReparti() {
    setLavoro("rep");
    try {
      const files: File[] = [];
      for (const [k, nome] of REPARTI) {
        const el = nodi.current.get(k);
        if (!modelli[k] || !el) continue;
        const b = await (await fetch(await png(el))).blob();
        files.push(new File([b], `Reparto ${nome.replace("/", "-")} ${scelta}.png`, { type: "image/png" }));
      }
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files })) {
        try {
          await navigator.share({ files });
          return;
        } catch {
          /* download below */
        }
      }
      for (const x of files) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(x);
        a.download = x.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch (e) {
      alert("Immagini non pronte: " + (e as Error).message);
    } finally {
      setLavoro("");
    }
  }

  const conf = p.wa.conferme[scelta];
  const firma = rep ? JSON.stringify(modelli) : "";
  return (
    <div className="wa-pan">
      <div className="wa-sett">
        <label>
          Settimana
          <select value={scelta} onChange={(e) => setSett(e.target.value)}>
            {settimane.map((s) => (
              <option key={s} value={s}>
                {intervallo(s, piu(s, 6))}
                {s === lun0 ? " · questa settimana" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {vedeAd && (
        <>
          <h2 className="wa-h">Adunanze</h2>
          <PannelloWhatsApp
            fogli={p.fogli}
            valori={p.valori}
            podio={p.podio}
            email={p.email}
            puo={p.puo}
            tipi={["INFRA", "FINE"]}
            salva={p.salva}
            carica={p.carica}
            settimana={scelta}
            vede={p.wa.vede}
          />
        </>
      )}
      {Object.keys(modelli).length > 0 && (
        <>
          <h2 className="wa-h">Reparti</h2>
          <article className="wa-voce ok">
            <header>
              <div>
                <b>Turnazione reparti</b>
                <span>Pubblicata: confermata in automatico</span>
              </div>
              {p.wa.vede.luca && (
                <span className={`wa-stato ${conf?.firma === firma ? "ok" : "cambiata"}`}>
                  {conf?.firma === firma ? "Pronta per Telegram" : "Preparo le immagini per Telegram…"}
                </span>
              )}
            </header>
            <div className="wa-mini quattro">
              {REPARTI.filter(([k]) => modelli[k]).map(([k, nome]) => (
                <button key={k} type="button" className="wa-th" onClick={() => setGrande(modelli[k]!)} aria-label="Ingrandisci">
                  <Scalata className="wa-th-in">
                    <Immagine
                      m={modelli[k]!}
                      rif={(el) => {
                        if (el) nodi.current.set(k, el);
                      }}
                    />
                  </Scalata>
                  <span>{nome}</span>
                </button>
              ))}
            </div>
            <div className="pa-azioni">
              <span />
              <button className="pa-btn sec" disabled={!!lavoro} onClick={() => void scaricaReparti()}>
                {lavoro === "rep" ? "Un momento…" : "Scarica"}
              </button>
            </div>
          </article>
        </>
      )}
      {!vedeAd && !rep && <p className="pa-msg">La turnazione di questa settimana non è ancora pubblicata.</p>}
      {p.wa.vede.luca && <GeneraReparti wa={p.wa} carica={p.carica} conferma={p.confermaReparti} />}
      {grande && (
        <div className="pa-fin wa-zoom" onClick={() => setGrande(null)}>
          <Scalata className="wa-zoom-in">
            <Immagine m={grande} />
          </Scalata>
        </div>
      )}
    </div>
  );
}

/** Luca only, out of sight: every week whose department images changed since they were last saved is drawn,
 *  turned into PNG files and saved (one week at a time). `fine` = called when there is nothing left to do. */
export function GeneraReparti({
  wa,
  carica,
  conferma,
  fine,
}: {
  wa: StatoWA;
  carica: Props["carica"];
  conferma: Props["confermaReparti"];
  fine?: (n: number) => void;
}) {
  const [fatte, setFatte] = useState<Record<string, string>>({});
  const coda = useMemo(
    () =>
      Object.values(wa.reparti)
        .map((s) => ({ s, m: modelliReparti(s, wa.cong) }))
        .map((x) => ({ ...x, firma: JSON.stringify(x.m) }))
        .filter((x) => (fatte[x.s.lunedi] ?? wa.conferme[x.s.lunedi]?.firma) !== x.firma),
    [wa, fatte],
  );
  const ora = coda[0];
  const nodi = useRef(new Map<Rep, HTMLDivElement>());
  const conta = useRef(0);
  useEffect(() => {
    if (!ora) {
      fine?.(conta.current);
      return;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        await document.fonts.ready;
        const ids: Partial<Record<Rep, string>> = {};
        for (const [k, nome] of REPARTI) {
          const el = nodi.current.get(k);
          if (!ora.m[k] || !el) continue;
          const d = await png(el);
          ids[k] = await carica(d.split(",")[1]!, `${ora.s.lunedi.replace(/-/g, "")} reparto ${nome.toLowerCase().replace(/[^a-z]+/g, "-")}.png`);
        }
        await conferma(ora.s.lunedi, { firma: ora.firma, quando: quandoSett(ora.s), png: ids });
        conta.current++;
      } catch (e) {
        console.error(e);
      }
      if (vivo) setFatte((f) => ({ ...f, [ora.s.lunedi]: ora.firma }));
    }, 900);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [ora?.s.lunedi, ora?.firma]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ora) return null;
  return (
    <div className="wa-fuori" aria-hidden>
      {REPARTI.filter(([k]) => ora.m[k]).map(([k]) => (
        <Immagine
          key={ora.s.lunedi + k}
          m={ora.m[k]!}
          rif={(el) => {
            if (el) nodi.current.set(k, el);
          }}
        />
      ))}
    </div>
  );
}

function Scalata({ className, children }: { className: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.2);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / LARGHEZZA));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={className} style={{ "--wk": k } as React.CSSProperties}>
      {children}
    </div>
  );
}

export const CSS_PRONTO = `
.wa-sett { display: flex; gap: 10px; align-items: end; }
.wa-sett label { display: grid; gap: 4px; font-size: 12px; color: var(--pa-muted); font-weight: 600; }
.wa-sett select { font: inherit; font-size: 16px; padding: 8px 10px; border: 1px solid var(--pa-line); border-radius: 10px; background: #fff; color: var(--pa-ink); }
.wa-h { margin: 6px 4px -4px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--pa-muted); }
.wa-mini.quattro { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.wa-fuori { position: fixed; left: -20000px; top: 0; width: ${LARGHEZZA}px; height: ${ALTEZZA}px; overflow: hidden; pointer-events: none; }
.wa-fuori > .wa { position: absolute; top: 0; left: 0; }
`;
