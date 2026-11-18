// What goes on the WhatsApp images of a meeting, from the program already compiled:
// - presidente infrasettimanale: prayers and every part with a number, short titles, names only;
// - presidente fine settimana: opening song, theme, outline number, speaker, congregation;
// - reparto Audio/Video: the same public talk lines, or the Efficaci parts with student and assistant, plus the podium.
import { srcIcona } from "../icone";
import { MESI_IT, colore, orari, type Carta, type Foglio, type Riga } from "../tipi";
import type { Blocco, Modello, Nome, Voce } from "./immagine";

export const COLORE_AV = "#521F46";

export type Campo = "chi" | "chi2" | "titolo";
/** Key of the value written by who compiles: "<riga>:<campo>" (the same keys the program uses). */
export const chiave = (r: Riga, k: Campo) => `${r.id}:${k}`;
/** Previous name, kept when a name is changed from the WhatsApp panel: shown struck through. */
export const chiavePrima = (k: string) => `${k}~prima`;
export const chiaveSchema = (r: Riga) => `${r.id}:schema`;
export const chiavePodio = (c: Carta) => `${c.id}:podio`;
export const chiaveConferma = (c: Carta) => `${c.id}:wa`;
export const chiaveQuando = (c: Carta) => `${c.id}:quando`;

export type Conferma = { firma: string; il: string; da: string; png: { pres?: string; av?: string }; quando: string };

/** ISO date of a meeting from the date in its band ("Martedì 3 novembre"), in the year of the sheet. */
export function dataCarta(c: Carta, f: Foglio): string | null {
  const m = /(\d{1,2})\s+([a-zàèéìòù]+)/i.exec(c.titolo ?? "");
  if (!m) return null;
  const mese = MESI_IT.indexOf(m[2]!.toLowerCase());
  if (mese < 0) return null;
  const [fa, fm] = f.id.split("-").map(Number) as [number, number];
  let anno = fa;
  if (mese + 1 < fm - 6) anno++; // a January week in the December sheet
  if (mese + 1 > fm + 6) anno--;
  return `${anno}-${String(mese + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}
/** "2026-11-03 19:30": when the meeting starts. */
export const quandoCarta = (c: Carta, f: Foglio) => {
  const d = dataCarta(c, f);
  return d ? `${d} ${c.ora || f.inizio || "19:30"}` : null;
};

const nome = (r: Riga, k: "chi" | "chi2", valori: Record<string, string>, ruolo?: string): Nome => ({
  v: (r[k] ?? "").trim(),
  prima: valori[chiavePrima(chiave(r, k))] || undefined,
  ruolo,
});
const RUOLI: Record<string, string> = { "Stud.": "Studente", "Ass.": "Assistente", "Cond.": "Conduttore", "Lett.": "Lettore" };
const ruoloDi = (x: string | undefined) => (x ? RUOLI[x] ?? x : undefined);
const haNome = (r: Riga) => !!(r.campi?.includes("chi") || r.chi);
const conAssistente = (r: Riga) => !!(r.campi?.includes("chi2") || r.chi2) && r.ruolo2 === "Ass.";

const sottoData = (c: Carta, f: Foglio) => [c.titolo, c.oraDaDefinire ? "" : c.ora || f.inizio].filter(Boolean).join(" · ");

/** The public talk lines (song, theme, outline, speaker, congregation) of a weekend meeting. */
function discorsoPubblico(c: Carta, valori: Record<string, string>): Voce[] {
  const voci: Voce[] = [];
  const righe = c.sezioni.flatMap((z) => z.righe);
  const apertura = righe.find((r) => r.tipo === "cantico");
  if (apertura) voci.push({ etichetta: "Cantico iniziale", testo: apertura.titolo ? String(apertura.titolo) : "" });
  const sez = c.sezioni.find((z) => /discorso pubblico/i.test(z.titolo)) ?? c.sezioni[1];
  const tema = sez?.righe.find((r) => r.tipo === "parte");
  if (tema) {
    const schema = valori[chiaveSchema(tema)];
    voci.push({ etichetta: "Tema", testo: tema.titolo, grande: true, sotto: schema ? `Schema n. ${schema}` : "Schema n. —" });
  }
  for (const r of sez?.righe ?? []) {
    if (r.tipo !== "voce") continue;
    if (/congregazione/i.test(r.titolo)) voci.push({ etichetta: "Congregazione", testo: (r.chi ?? "").trim() });
    else voci.push({ etichetta: r.titolo, nomi: [nome(r, "chi", valori)] });
  }
  return voci;
}

/** The two images of a meeting, or null when there is no meeting (assembly, convention…). */
export function immaginiCarta(
  c: Carta,
  f: Foglio,
  valori: Record<string, string>,
  podio: string,
): { pres: Modello; av: Modello } | null {
  if (c.evento || (c.tipo !== "INFRA" && c.tipo !== "FINE")) return null;
  const col = (x: string | undefined) => colore(x, f.stile.colori);
  const piede = f.cong;
  const sezDp = c.sezioni.find((z) => /discorso pubblico/i.test(z.titolo));
  const striscia = { testo: "Audio/Video · prove", colore: COLORE_AV };
  const podioBlocco: Blocco = { colore: COLORE_AV, voci: [{ etichetta: "Podio", nomi: [{ v: podio }] }] };
  if (c.tipo === "FINE") {
    const dp = discorsoPubblico(c, valori);
    const fine = f.stile.colori.fine;
    const colDp = col(sezDp?.colore ?? "@fine");
    const blocco: Blocco = { titolo: "Discorso pubblico", colore: colDp, icona: srcIcona(sezDp?.icona ?? "discorso", colDp) || undefined, voci: dp };
    return {
      pres: { kicker: "Presidente", titolo: "Adunanza del fine settimana", sotto: sottoData(c, f), colore: fine, piede, blocchi: [blocco] },
      av: { titolo: "Adunanza del fine settimana", sotto: sottoData(c, f), colore: fine, striscia, piede, blocchi: [podioBlocco, blocco] },
    };
  }
  // Midweek
  const info = orari(c, f.inizio);
  const tutte = c.sezioni.flatMap((z) => z.righe);
  const preghiere = tutte.filter((r) => r.tipo === "cantico" && r.ruolo === "Preghiera");
  const blocchi: Blocco[] = [];
  const efficaci: Voce[] = [];
  for (const z of c.sezioni) {
    const voci: Voce[] = [];
    const tesori = /tesori/i.test(z.titolo);
    const ministero = /efficaci/i.test(z.titolo);
    let primaParte = true;
    for (const r of z.righe) {
      if (r.tipo === "cantico" && r.ruolo === "Preghiera") {
        const iniziale = r === preghiere[0] && preghiere.length > 1;
        voci.push({
          etichetta: iniziale ? "Preghiera iniziale" : "Preghiera finale",
          sotto: r.titolo ? `Cantico ${r.titolo}` : undefined,
          nomi: [nome(r, "chi", valori)],
        });
        continue;
      }
      if (r.tipo !== "parte" || !haNome(r)) continue;
      const n = info.get(r.id)?.n ?? null;
      const studio = /studio biblico/i.test(r.titolo);
      const etichetta = tesori && primaParte ? "Discorso" : studio ? "Studio biblico" : r.titolo;
      primaParte = false;
      const due = !!(r.campi?.includes("chi2") || r.chi2);
      const v: Voce = {
        n,
        etichetta,
        nomi: due
          ? [nome(r, "chi", valori, ruoloDi(r.ruolo)), nome(r, "chi2", valori, ruoloDi(r.ruolo2))]
          : [nome(r, "chi", valori)],
      };
      voci.push(v);
      if (ministero && conAssistente(r)) efficaci.push(v);
    }
    if (voci.length) blocchi.push({ titolo: z.titolo, colore: col(z.colore), icona: srcIcona(z.icona, col(z.colore)) || undefined, voci });
  }
  const sezMin = c.sezioni.find((z) => /efficaci/i.test(z.titolo));
  const ministero = col(sezMin?.colore ?? "@ministero");
  return {
    pres: {
      kicker: "Presidente",
      titolo: "Adunanza infrasettimanale",
      sotto: sottoData(c, f),
      colore: f.stile.colori.infra,
      piede,
      blocchi,
    },
    av: {
      titolo: "Adunanza infrasettimanale",
      sotto: sottoData(c, f),
      colore: f.stile.colori.infra,
      striscia,
      piede,
      blocchi: [
        podioBlocco,
        ...(efficaci.length
          ? [{ titolo: "Efficaci nel ministero", colore: ministero, icona: srcIcona(sezMin?.icona ?? "ministero", ministero) || undefined, voci: efficaci }]
          : []),
      ],
    },
  };
}
/** The fields of a meeting that appear on its images, for the "Modifica" window. */
export type CampoModifica = { chiave: string; etichetta: string; parte: string; valore: string; nome: boolean };
export function campiCarta(c: Carta, valori: Record<string, string>, podio: string): CampoModifica[] {
  const out: CampoModifica[] = [];
  const tutte = c.sezioni.flatMap((z) => z.righe);
  const preghiere = tutte.filter((r) => r.tipo === "cantico" && r.ruolo === "Preghiera");
  for (const z of c.sezioni)
    for (const r of z.righe) {
      for (const k of r.campi ?? []) {
        if (r.tipo === "testa") continue; // the chairman himself
        const ch = chiave(r, k);
        const v = valori[ch] ?? "";
        if (k === "titolo") {
          out.push({
            chiave: ch,
            etichetta: r.tipo === "cantico" ? "Numero del cantico" : "Tema del discorso",
            parte: r.tipo === "cantico" ? "Cantico iniziale" : "Discorso pubblico",
            valore: v,
            nome: false,
          });
          if (r.tipo === "parte") out.push({ chiave: chiaveSchema(r), etichetta: "Schema n.", parte: "Discorso pubblico", valore: valori[chiaveSchema(r)] ?? "", nome: false });
          continue;
        }
        if (c.tipo === "FINE" && r.tipo === "cantico") continue; // the chairman (Presidente) of the weekend
        if (c.tipo === "FINE" && r.tipo === "voce" && !/oratore|congregazione/i.test(r.titolo)) continue;
        const ruolo = k === "chi2" ? r.ruolo2 : r.ruolo;
        const parte =
          r.tipo === "cantico"
            ? r === preghiere[0] && preghiere.length > 1 ? "Preghiera iniziale" : "Preghiera finale"
            : r.tipo === "voce" ? "Discorso pubblico" : r.titolo;
        out.push({
          chiave: ch,
          etichetta: r.tipo === "voce" ? r.titolo : ruoloDi(ruolo) ?? (r.tipo === "cantico" ? "Preghiera" : "Nome"),
          parte,
          valore: v,
          nome: !/congregazione/i.test(r.titolo),
        });
      }
    }
  out.push({ chiave: chiavePodio(c), etichetta: "Addetto al podio", parte: "Reparto Audio/Video", valore: podio, nome: false });
  return out;
}

