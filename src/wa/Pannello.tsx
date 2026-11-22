// "Immagini WhatsApp": for every meeting of the two months, the image for the chairman and the one for the
// Audio/Video department, made from the program. Who compiles the program confirms them, or changes a name
// (the old one stays struck through, also on the program) and confirms again. Confirmed images are kept in
// the Google Sheet's Drive folder; the owner's automatic messages pick them up from there.
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { cssCaratteri } from "../Rendering";
import type { Carta, Foglio } from "../tipi";
import { ALTEZZA, Immagine, LARGHEZZA, pngDi, type Modello } from "./immagine";
import {
  campiCarta,
  chiaveConferma,
  chiavePodio,
  chiavePrima,
  chiaveQuando,
  dataCarta,
  immaginiCarta,
  quandoCarta,
  type CampoModifica,
  type Conferma,
} from "./programma";
import { vedePres, type Vede } from "./reparti";

type Props = {
  fogli: Foglio[];
  valori: Record<string, string>;
  podio: Record<string, string>;
  email: string;
  puo: (c: Carta) => boolean;
  /** Which meetings: INFRA, FINE or both (view "Combinato"). */
  tipi: ("INFRA" | "FINE")[];
  salva: (coppie: [string, string][]) => Promise<void>;
  carica: (base64: string, nome: string) => Promise<string>;
  /** Pronto per WhatsApp: only this week (lunedì) and only the images this person may see. */
  settimana?: string;
  vede?: Pick<Vede, "pres" | "presT" | "prove">;
};

type Voce = {
  c: Carta;
  f: Foglio;
  imm: { pres: Modello; av: Modello };
  firma: string;
  conf: Conferma | null;
  podio: string;
  quando: string | null;
};

const leggi = (s: string | undefined): Conferma | null => {
  if (!s) return null;
  try {
    return JSON.parse(s) as Conferma;
  } catch {
    return null;
  }
};
const quandoIt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
};

export function PannelloWhatsApp({ fogli, valori, podio, email, puo, tipi, salva, carica, settimana, vede }: Props) {
  const oggi = new Date().toISOString().slice(0, 10);
  const voci = useMemo<Voce[]>(() => {
    const out: Voce[] = [];
    for (const f of fogli)
      for (const s of f.settimane)
        for (const c of s.carte) {
          if (!tipi.includes(c.tipo as "INFRA" | "FINE")) continue;
          if (settimana && c.id.slice(0, 10) !== settimana) continue;
          if (vede ? !vedePres(vede, c.tipo as "INFRA" | "FINE") && !vede.prove[c.tipo as "INFRA" | "FINE"] && !puo(c) : !puo(c)) continue;
          const d = dataCarta(c, f);
          if (d && d < oggi) continue; // past meetings
          const p = valori[chiavePodio(c)] || (d ? podio[`${d}|${c.tipo}`] : "") || "";
          const imm = immaginiCarta(c, f, valori, p);
          if (!imm) continue;
          out.push({ c, f, imm, firma: JSON.stringify(imm), conf: leggi(valori[chiaveConferma(c)]), podio: p, quando: quandoCarta(c, f) });
        }
    return out;
  }, [fogli, valori, podio, tipi.join(), oggi, settimana]); // eslint-disable-line react-hooks/exhaustive-deps

  // The time of each meeting, for the automatic messages (also of meetings not confirmed yet).
  const scritti = useRef(new Set<string>());
  useEffect(() => {
    const coppie: [string, string][] = [];
    for (const v of voci) {
      if (!puo(v.c)) continue;
      const k = chiaveQuando(v.c);
      if (v.quando && valori[k] !== v.quando && !scritti.current.has(k + v.quando)) {
        scritti.current.add(k + v.quando);
        coppie.push([k, v.quando]);
      }
    }
    if (coppie.length) void salva(coppie);
  }, [voci]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modifica, setModifica] = useState<Voce | null>(null);
  const [grande, setGrande] = useState<Modello | null>(null);
  const [lavoro, setLavoro] = useState("");
  const [daConfermare, setDaConfermare] = useState<string | null>(null);
  const nodi = useRef(new Map<string, HTMLDivElement>());

  async function png(id: string) {
    const el = nodi.current.get(id);
    if (!el) throw new Error("immagine non pronta");
    const { toPng } = await import("../vendor/html-to-image/index.js");
    const css = await cssCaratteri(["fira"]);
    return pngDi(el, toPng as never, css || undefined);
  }

  async function conferma(v: Voce) {
    setLavoro(v.c.id);
    try {
      const giorno = (dataCarta(v.c, v.f) ?? v.c.id).replace(/-/g, "");
      const tipo = v.c.tipo === "INFRA" ? "infrasettimanale" : "fine-settimana";
      const pres = await carica((await png(`${v.c.id}:pres`)).split(",")[1]!, `${giorno} presidente ${tipo}.png`);
      const av = await carica((await png(`${v.c.id}:av`)).split(",")[1]!, `${giorno} audio-video prove ${tipo}.png`);
      const rec: Conferma = { firma: v.firma, il: new Date().toISOString(), da: email, png: { pres, av }, quando: v.quando ?? "" };
      await salva([[chiaveConferma(v.c), JSON.stringify(rec)]]);
    } catch (e) {
      alert("Conferma non riuscita: " + (e as Error).message);
    } finally {
      setLavoro("");
    }
  }

  // After "Modifica": confirm again once the new values are on screen.
  useEffect(() => {
    if (!daConfermare) return;
    const v = voci.find((x) => x.c.id === daConfermare);
    if (!v) return;
    setDaConfermare(null);
    // after the images have been fitted to the new text
    setTimeout(() => void conferma(v), 400);
  }, [daConfermare, voci]); // eslint-disable-line react-hooks/exhaustive-deps

  async function condividi(v: Voce) {
    setLavoro(v.c.id);
    try {
      const giorno = dataCarta(v.c, v.f) ?? v.c.id;
      const file = async (id: string, nome: string) => {
        const b = await (await fetch(await png(id))).blob();
        return new File([b], nome, { type: "image/png" });
      };
      const tipo = v.c.tipo === "INFRA" ? "infrasettimanale" : "fine settimana";
      const files: File[] = [];
      for (const k of tipiDi(v)) files.push(await file(`${v.c.id}:${k}`, k === "pres" ? `Presidente ${tipo} ${giorno}.png` : `Audio-Video prove ${tipo} ${giorno}.png`));
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

  if (!voci.length) return settimana ? null : <p className="pa-msg">Nessuna adunanza in programma in questo bimestre.</p>;
  const tipiDi = (v: Voce) =>
    (["pres", "av"] as const).filter((k) => !vede || puo(v.c) || (k === "pres" ? vedePres(vede, v.c.tipo as "INFRA" | "FINE") : vede.prove[v.c.tipo as "INFRA" | "FINE"]));
  return (
    <div className={settimana ? "wa-pan dentro" : "wa-pan"}>
      {!settimana && <p className="pa-aiuto wa-intro">
        Per ogni adunanza: l’immagine per il presidente e quella per le prove dell’Audio/Video (podio e parti con assistente), prese dal programma. Controllale e premi
        <b> Conferma</b>; se qualcosa è cambiato premi <b>Modifica</b>: il nome sostituito resta barrato, anche sul programma.
      </p>}
      {voci.map((v) => {
        const stato = !v.conf ? "da" : v.conf.firma === v.firma ? "ok" : "cambiata";
        const mio = puo(v.c);
        if (!mio && stato !== "ok")
          return (
            <article key={v.c.id} className="wa-voce da">
              <header>
                <div>
                  <b>{v.c.titolo}</b>
                  <span>{v.c.tipo === "INFRA" ? "Adunanza infrasettimanale" : "Adunanza del fine settimana"}</span>
                </div>
                <span className="wa-stato da">In attesa della conferma di chi compila</span>
              </header>
            </article>
          );
        return (
          <article key={v.c.id} className={`wa-voce ${stato}`}>
            <header>
              <div>
                <b>{v.c.titolo}</b>
                <span>{v.c.tipo === "INFRA" ? "Adunanza infrasettimanale" : "Adunanza del fine settimana"}</span>
              </div>
              <span className={`wa-stato ${stato}`}>
                {stato === "da" ? "Da confermare" : stato === "ok" ? `Confermata · ${quandoIt(v.conf!.il)}` : "Cambiata: da confermare di nuovo"}
              </span>
            </header>
            <div className="wa-mini">
              {tipiDi(v).map((k) => (
                <button key={k} type="button" className="wa-th" onClick={() => setGrande(v.imm[k])} aria-label="Ingrandisci">
                  <Scalata className="wa-th-in">
                    <Immagine
                      m={v.imm[k]}
                      rif={(el) => {
                        if (el) nodi.current.set(`${v.c.id}:${k}`, el);
                      }}
                    />
                  </Scalata>
                  <span>{k === "pres" ? "Presidente" : "Audio/Video · prove"}</span>
                </button>
              ))}
            </div>
            <div className="pa-azioni">
              {mio && <button className="pa-btn" disabled={!!lavoro || stato === "ok"} onClick={() => void conferma(v)}>
                {lavoro === v.c.id ? "Un momento…" : stato === "ok" ? "Confermata" : "Conferma"}
              </button>}
              {mio && <button className="pa-btn sec" disabled={!!lavoro} onClick={() => setModifica(v)}>
                Modifica
              </button>}
              <span />
              <button className="pa-btn sec" disabled={!!lavoro} onClick={() => void condividi(v)}>
                Scarica
              </button>
            </div>
          </article>
        );
      })}
      {grande && (
        <div className="pa-fin wa-zoom" onClick={() => setGrande(null)}>
          <Scalata className="wa-zoom-in">
            <Immagine m={grande} />
          </Scalata>
        </div>
      )}
      {modifica && (
        <FinestraModifica
          campi={campiCarta(modifica.c, valori, modifica.podio)}
          titolo={`${modifica.c.titolo} · ${modifica.c.tipo === "INFRA" ? "infrasettimanale" : "fine settimana"}`}
          valori={valori}
          chiudi={() => setModifica(null)}
          salva={async (cambi) => {
            const id = modifica.c.id;
            setModifica(null);
            await salva(cambi);
            setDaConfermare(id);
          }}
        />
      )}
    </div>
  );
}

/** A box with the width of its container; the 1080 px image inside is scaled to fill it. */
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

function FinestraModifica({
  campi,
  titolo,
  valori,
  chiudi,
  salva,
}: {
  campi: CampoModifica[];
  titolo: string;
  valori: Record<string, string>;
  chiudi: () => void;
  salva: (cambi: [string, string][]) => void;
}) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(campi.map((c) => [c.chiave, c.valore])));
  return (
    <div className="pa-fin" onClick={(e) => e.target === e.currentTarget && chiudi()}>
      <form
        className="pa-box"
        onSubmit={(e) => {
          e.preventDefault();
          const cambi: [string, string][] = [];
          for (const c of campi) {
            const nuovo = (v[c.chiave] ?? "").trim();
            if (nuovo === c.valore.trim()) continue;
            cambi.push([c.chiave, nuovo]);
            if (!c.nome) continue;
            // the name that was there stays, struck through (the first one, if it changes again)
            const kp = chiavePrima(c.chiave);
            const prima = valori[kp] ?? "";
            if (prima) {
              if (prima.trim() === nuovo) cambi.push([kp, ""]);
            } else if (c.valore.trim()) cambi.push([kp, c.valore.trim()]);
          }
          salva(cambi);
        }}
      >
        <small>{titolo}</small>
        <p className="pa-aiuto">Cambia solo quello che è diverso: il nome di prima resterà barrato. Al salvataggio le immagini si confermano da sole.</p>
        {campi.map((c, i) => (
          <label key={c.chiave}>
            {campi[i - 1]?.parte !== c.parte && <span className="wa-parte">{c.parte}</span>}
            {c.etichetta}
            <input
              value={v[c.chiave] ?? ""}
              inputMode={/cantico|schema/i.test(c.etichetta) ? "numeric" : undefined}
              onChange={(e) => setV((x) => ({ ...x, [c.chiave]: e.target.value }))}
              placeholder={c.nome ? "Nome e cognome" : ""}
            />
          </label>
        ))}
        <div className="pa-azioni">
          <span />
          <button type="button" className="pa-btn sec" onClick={chiudi}>
            Annulla
          </button>
          <button className="pa-btn">Salva e conferma</button>
        </div>
      </form>
    </div>
  );
}

export const CSS_PANNELLO = `
.wa-pan.dentro { padding: 0; max-width: none; margin: 0; width: 100%; }
.wa-pan { max-width: 760px; margin: 0 auto; padding: 14px 12px 60px; display: grid; gap: 14px; }
.wa-intro { padding: 0 4px; }
.wa-voce { background: #fff; border: 1px solid var(--pa-line); border-radius: 14px; padding: 12px; display: grid; gap: 12px; }
.wa-voce.ok { border-color: #8DB58F; }
.wa-voce.cambiata { border-color: #E0A24B; }
.wa-voce header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 12px; align-items: baseline; }
.wa-voce header b { font-size: 16px; display: block; }
.wa-voce header span { font-size: 12.5px; color: var(--pa-muted); }
.wa-stato { font-size: 12px !important; font-weight: 600; padding: 3px 9px; border-radius: 99px; background: #EFEDE8; color: var(--pa-ink) !important; }
.wa-stato.ok { background: #E6F1E6; color: #2F6B33 !important; }
.wa-stato.cambiata { background: #FBEEDB; color: #8A5300 !important; }
.wa-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wa-th { border: 0; padding: 0; background: none; cursor: zoom-in; display: grid; gap: 4px; font: inherit; font-size: 12px; color: var(--pa-muted); text-align: center; }
.wa-th-in { width: 100%; aspect-ratio: ${LARGHEZZA} / ${ALTEZZA}; overflow: hidden; border-radius: 8px; border: 1px solid var(--pa-line); position: relative; }
.wa-th-in > .wa, .wa-zoom-in > .wa { position: absolute; top: 0; left: 0; transform-origin: 0 0; transform: scale(var(--wk)); }
.wa-zoom { align-items: center !important; padding: 12px; cursor: zoom-out; }
.wa-zoom-in { width: min(94vw, calc(90vh * ${LARGHEZZA} / ${ALTEZZA})); aspect-ratio: ${LARGHEZZA} / ${ALTEZZA}; position: relative; overflow: hidden; border-radius: 10px; }
.wa-parte { display: block; margin-top: 6px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--pa-acc); }
`;
