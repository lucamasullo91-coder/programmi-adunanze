// The WhatsApp images of the departments, one per week, from the rotation published in the portal:
// Audio/Video (podium, microphones, mixer, PC of each meeting), Uscieri, Letteratura e territori, Pulizie.
// They need no confirmation: who compiles the rotation (Luca) has already published it.
import { MESI_IT } from "../tipi";
import type { Blocco, Modello, Nome } from "./immagine";
import { COLORE_AV } from "./programma";

export type NomeWA = { v: string; nome?: string; cognome?: string } | null;
export type AdWA = { tipo: "INFRA" | "FINE"; data: string; ora: string; av?: [string, NomeWA][]; usc?: [string, NomeWA][]; let?: [string, NomeWA][] };
export type PulWA = { gruppo: string; coord: NomeWA; ref: NomeWA; generale: { gruppo: string; coord: NomeWA; ref: NomeWA } | null };
export type SettWA = { lunedi: string; al: string; adunanze: AdWA[]; pul?: PulWA; pubblicato?: string };
export type Vede = { comp: string | null; pres: boolean; prove: { INFRA: boolean; FINE: boolean }; rep: Record<Rep, boolean>; luca: boolean };
export type Rep = "av" | "usc" | "let" | "pul";
export type ConfRep = { firma: string; quando: string; il: string; da: string; png: Partial<Record<Rep, string>> };

export const REPARTI: [Rep, string, string][] = [
  ["av", "Audio/Video", COLORE_AV],
  ["usc", "Uscieri", "#4D5A68"],
  ["let", "Letteratura e territori", "#2E6E7C"],
  ["pul", "Pulizie", "#A86F00"],
];
const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const dt = (s: string) => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
export const giornoIt = (s: string) => {
  const x = dt(s);
  return `${GIORNI[x.getUTCDay()]} ${x.getUTCDate()} ${MESI_IT[x.getUTCMonth()]}`;
};
/** "8 – 13 dicembre", "29 dicembre – 3 gennaio". */
export function intervallo(dal: string, al: string) {
  const a = dt(dal), b = dt(al);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} – ${b.getUTCDate()} ${MESI_IT[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MESI_IT[a.getUTCMonth()]} – ${b.getUTCDate()} ${MESI_IT[b.getUTCMonth()]}`;
}
const nm = (x: NomeWA): Nome => (x ? { v: x.v, nome: x.nome || undefined, cognome: x.cognome || undefined } : { v: "" });

/** The images of one week (only the departments in the data: the server sends only what this person may see). */
/** Fixed colours (not the program's, which change with the months): the same week always gives the same images. */
const COLORI = { infra: "#A8432B", fine: "#16325C", generale: "#4D5A68" };
export function modelliReparti(s: SettWA, cong: string): Partial<Record<Rep, Modello>> {
  const colori = COLORI;
  const out: Partial<Record<Rep, Modello>> = {};
  const sotto = intervallo(s.lunedi, s.al);
  const base = (rep: string, colore: string, blocchi: Blocco[]): Modello => ({
    kicker: "Turnazione reparti",
    titolo: "Settimana",
    sotto,
    colore,
    striscia: { testo: `Reparto ${rep}`, colore: "#1E2326" },
    piede: cong,
    blocchi,
  });
  for (const [k, nome, colore] of REPARTI) {
    if (k === "pul") continue;
    const ads = s.adunanze.filter((a) => a[k]);
    if (!ads.length) continue;
    out[k] = base(
      nome,
      colore,
      ads.map((a) => ({
        titolo: `${giornoIt(a.data)} · ${a.ora}`,
        colore: a.tipo === "INFRA" ? colori.infra : colori.fine,
        voci: (a[k] ?? []).map(([et, x]) => ({ etichetta: et, nomi: [nm(x)] })),
      })),
    );
  }
  if (s.pul) {
    const p = s.pul;
    const blocchi: Blocco[] = [
      {
        titolo: "Pulizie della settimana",
        colore: colori.generale,
        voci: [
          { etichetta: "Gruppo", testo: p.gruppo },
          { etichetta: "Coordinatore", nomi: [nm(p.coord)] },
          { etichetta: "Referente", nomi: [nm(p.ref)] },
        ],
      },
    ];
    if (p.generale)
      blocchi.push({
        titolo: "Pulizia generale",
        colore: "#A86F00",
        voci: [
          { etichetta: "Gruppo", testo: p.generale.gruppo },
          { etichetta: "Coordinatore", nomi: [nm(p.generale.coord)] },
          { etichetta: "Referente", nomi: [nm(p.generale.ref)] },
        ],
      });
    out.pul = base("Pulizie", "#A86F00", blocchi);
  }
  return out;
}
/** When the first meeting of the week starts ("2026-12-08 19:30"): the automatic messages go some days before. */
export const quandoSett = (s: SettWA) => {
  const a = [...s.adunanze].sort((x, y) => (x.data < y.data ? -1 : 1))[0];
  return a ? `${a.data} ${a.ora || "19:30"}` : `${s.lunedi} 19:30`;
};
