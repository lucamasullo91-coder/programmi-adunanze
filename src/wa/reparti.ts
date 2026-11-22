// The WhatsApp images of the departments, one per week, from the rotation published in the portal:
// Audio/Video (podium, microphones, mixer, PC of each meeting), Uscieri, Letteratura e territori, Pulizie.
// They need no confirmation: who compiles the rotation (Luca) has already published it.
import { MESI_IT } from "../tipi";
import { srcIcona } from "../icone";
import type { Blocco, Modello, Nome } from "./immagine";
import { COLORE_AV } from "./programma";

export type NomeWA = { v: string; nome?: string; cognome?: string } | null;
export type AdWA = { tipo: "INFRA" | "FINE"; data: string; ora: string; av?: [string, NomeWA][]; usc?: [string, NomeWA][]; let?: [string, NomeWA][] };
export type PulWA = { gruppo: string; coord: NomeWA; ref: NomeWA; generale: { gruppo: string; data?: string; coord: NomeWA; ref: NomeWA } | null };
export type SettWA = { lunedi: string; al: string; adunanze: AdWA[]; pul?: PulWA; pubblicato?: string; quando?: string; colori?: { infra?: string; fine?: string } };
export type Vede = {
  comp: string | null;
  pres: boolean;
  /** The chairman image, meeting by meeting (from «Chi vede cosa»); old servers send only pres. */
  presT?: { INFRA: boolean; FINE: boolean };
  prove: { INFRA: boolean; FINE: boolean };
  rep: Record<Rep, boolean>;
  luca: boolean;
};
export const vedePres = (v: Pick<Vede, "pres" | "presT">, t: "INFRA" | "FINE") => (v.presT ? v.presT[t] : v.pres);
export type Rep = "av" | "usc" | "let" | "pul";
export type ConfRep = { firma: string; quando: string; il: string; da: string; png: Record<string, string> };

export const REPARTI: [Rep, string, string][] = [
  ["av", "Audio/Video", COLORE_AV],
  ["usc", "Uscieri", "#4D5A68"],
  ["let", "Letteratura e territori", "#A86F00"],
  ["pul", "Pulizie", "#A86F00"],
];
const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const dt = (s: string) => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
export const giornoIt = (s: string) => {
  const x = dt(s);
  return `${GIORNI[x.getUTCDay()]} ${x.getUTCDate()} ${MESI_IT[x.getUTCMonth()]}`.normalize("NFC");
};
/** "8 – 13 dicembre", "29 dicembre – 3 gennaio". */
export function intervallo(dal: string, al: string) {
  const a = dt(dal), b = dt(al);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} – ${b.getUTCDate()} ${MESI_IT[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MESI_IT[a.getUTCMonth()]} – ${b.getUTCDate()} ${MESI_IT[b.getUTCMonth()]}`;
}
const nm = (x: NomeWA): Nome => (x ? { v: x.v, nome: x.nome || undefined, cognome: x.cognome || undefined } : { v: "" });

/** Fixed colours (not the program's, which change with the months): the same week always gives the same images. */
const COLORI = { infra: "#A8432B", fine: "#16325C", generale: "#4D5A68" };
/** Colours of the Pulizie department as in Congregation Manager: gold for the weekly cleaning, blue for the general one. */
export const COLORE_PULIZIE = "#9A7A1E";
export const COLORE_GENERALE = "#235C90";
/** Key of one image: "pul" for the week's cleaning, "<data>|INFRA|av" for a meeting's department. */
export type ChiaveImg = string;
export const chiaveAd = (a: AdWA, k: Rep) => `${a.data}|${a.tipo}|${k}`;
/** The images of one week (only the departments in the data: the server sends only what this person may see).
 *  First the week's cleaning, then each meeting with Audio/Video, Uscieri, Letteratura e territori. */
export function modelliReparti(s: SettWA, cong: string, mese?: { infra?: string; fine?: string }): Record<ChiaveImg, Modello> {
  // the band takes the colours of the meetings of that month (guide for midweek, Watchtower for the weekend), as on the programs
  const col = mese ?? s.colori;
  const colori = { ...COLORI, ...(col?.infra ? { infra: col.infra } : {}), ...(col?.fine ? { fine: col.fine } : {}) };
  const out: Record<ChiaveImg, Modello> = {};
  if (s.pul) {
    const p = s.pul;
    const blocchi: Blocco[] = [
      {
        titolo: "Pulizia dopo le adunanze",
        colore: COLORE_PULIZIE,
        icona: srcIcona("pulizia", COLORE_PULIZIE) || undefined,
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
        colore: COLORE_GENERALE,
        icona: srcIcona("pulizia", COLORE_GENERALE) || undefined,
        voci: [
          ...(p.generale.data ? [{ etichetta: "Giorno", testo: giornoIt(p.generale.data) }] : []),
          { etichetta: "Gruppo", testo: p.generale.gruppo },
          { etichetta: "Coordinatore", nomi: [nm(p.generale.coord)] },
          { etichetta: "Referente", nomi: [nm(p.generale.ref)] },
        ],
      });
    out.pul = {
      kicker: "Pulizie della Sala",
      titolo: "Settimana",
      sotto: intervallo(s.lunedi, s.al),
      colore: COLORE_PULIZIE,
      striscia: { testo: "Reparto Pulizie", colore: "#1E2326" },
      piede: cong,
      blocchi,
    };
  }
  for (const a of [...s.adunanze].sort((x, y) => (x.data < y.data ? -1 : 1)))
    for (const [k, nome, colore] of REPARTI) {
      if (k === "pul") continue;
      const righe = a[k];
      if (!righe) continue;
      // no "Reparto …" strip: the block title already says it. Letteratura e territori: two big cards with their icon.
      const blocchi: Blocco[] =
        k === "let"
          ? righe.map(([et, x]) => ({
              titolo: et,
              colore,
              scheda: true,
              icona: srcIcona(/territ/i.test(et) ? "territorio" : "libro", "#FFFFFF") || undefined,
              voci: [{ etichetta: et, nomi: [nm(x)] }],
            }))
          : [{ titolo: nome, colore, voci: righe.map(([et, x]) => ({ etichetta: et, nomi: [nm(x)] })) }];
      out[chiaveAd(a, k)] = {
        titolo: a.tipo === "INFRA" ? "Adunanza infrasettimanale" : "Adunanza del fine settimana",
        sotto: `${giornoIt(a.data)} · ${a.ora}`,
        colore: a.tipo === "INFRA" ? colori.infra : colori.fine,
        piede: cong,
        inLinea: true,
        blocchi,
      };
    }
  return out;
}
/** When the first meeting of the week starts ("2026-12-08 19:30"): the automatic messages go some days before. */
export const quandoSett = (s: SettWA) => {
  const a = [...s.adunanze].sort((x, y) => (x.data < y.data ? -1 : 1))[0];
  return a ? `${a.data} ${a.ora || "19:30"}` : s.quando || `${s.lunedi} 19:30`;
};
