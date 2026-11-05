// Printed sheets built like a document: weeks → cards (a meeting, a duty roster…) → sections → rows.
// Everything is data, so every title, colour, row and section can be changed, added, moved or removed.
// Used by Programmi adunanze (the month's sheets) and by the circuit overseer's visit program.

export type TipoRiga = "parte" | "cantico" | "testo" | "voce" | "testa";

export type Riga = {
  id: string;
  tipo: TipoRiga;
  /** parte/testo: the title; cantico: the song number; voce: the label (Oratore, Lettore…); testa: the label. */
  titolo: string;
  /** Minutes: they move the clock of the following rows. */
  min?: number | null;
  /** Extra minutes after the row (the counsel after a student part). */
  extra?: number;
  /** Show the clock time on the left. */
  orario?: boolean;
  /** Numbered (1., 2., …), counted across the card. */
  numero?: boolean;
  /** Show "(10 min)" after the title. */
  mostraMin?: boolean;
  chi?: string;
  ruolo?: string;
  chi2?: string;
  ruolo2?: string;
  /** Small caps label after the title (Di casa in casa). */
  ambito?: string;
  /** Reference after the title (Ger 50:24). */
  rif?: string;
  /** Quoted line under the title. */
  tema?: string;
  /** Boxed tag after the title (Video). */
  tag?: string;
  /** cantico: text after the number ("e preghiera"); testo: subtitle. */
  suffisso?: string;
  /** Song title, shown in italics. */
  sottotitolo?: string;
  /** Bigger title (public talk theme, Watchtower article). */
  grande?: boolean;
  /** Own text colour (hex or @palette key). */
  colore?: string;
  /** Fields the people who compile the program fill in (names, theme, song number). */
  campi?: ("chi" | "chi2" | "titolo")[];
};

export type Sezione = {
  id: string;
  titolo: string;
  /** Hex colour or "@key" of the palette (follows the palette when it changes). */
  colore?: string;
  icona?: string;
  /** Text after the title in lighter type: "(30 min)". */
  durata?: string;
  /** Value on the heading line, on the right (e.g. the cleaning group). */
  valore?: string;
  senzaTitolo?: boolean;
  righe: Riga[];
};

export type TipoCarta = "INFRA" | "FINE" | "REP_INF" | "REP_FS" | "ALTRO";

export type Carta = {
  id: string;
  tipo: TipoCarta;
  /** Small line above the title in the band. */
  kicker?: string;
  titolo: string;
  /** Start time, the clock of its rows starts here (empty: the sheet's). */
  ora?: string;
  colore?: string;
  icone?: string[];
  /** Boxed note in the band (visit of the circuit overseer, Bozza…). */
  flag?: string;
  sezioni: Sezione[];
  /** How the card is drawn: a program (default), the field service days, a box with a theme, free text. */
  modo?: "scheda" | "comitive" | "riquadro" | "testo";
  /** comitive: the meetings for field service. */
  slots?: { d: string; o: string; l: string; c: string }[];
  /** riquadro: when and where; testo/riquadro: the text under the title. */
  quando?: { data: string; ora: string; luogo: string };
  testo?: string;
  icona?: string;
  /** Visit program: the versions that show it (all when empty). */
  versioni?: Versione[];  /** The date in the band can be changed by who compiles the program. */
  editData?: boolean;
  /** The meeting is replaced by another event (circuit assembly, convention…). */
  evento?: Evento;
};

export type Evento = {
  tipo: string;
  tema?: string;
  luogo?: string;
  indirizzo?: string;
  orario?: string;
  nota?: string;
  /** Picture of the program (data URL). */
  foto?: string;
};

export type Versione = "std" | "nom" | "full";

export type Settimana = {
  id: string;
  label: string;
  visita?: boolean;
  nota?: string;
  /** Start a new page with this week. */
  nuovaPagina?: boolean;
  /** Not printed. */
  nascosta?: boolean;
  carte: Carta[];
  /** Visit program (each "week" is a section of the sheet): subtitle, versions, layout. */
  sottotitolo?: string;
  versioni?: Versione[];
  /** affiancati: all in a row; colonna: one under the other; coppie: each meeting with its duties beside it. */
  disposizione?: "affiancati" | "colonna" | "coppie";
  /** Programmi: how the cards of this week are laid out in a view, instead of the view's layout (by view id). */
  disposizioni?: Record<string, TipoCarta[][]>;
  /** All the boxes of the section the same size. */
  uguali?: boolean;
};

export type Vista = {
  id: string;
  nome: string;
  sup: string;
  titolo: string;
  /** Rows of cards for each week: each inner list is one row, cards side by side. */
  righe: TipoCarta[][];
  /** Width ratio of the cards in a row of two (first : second). */
  proporzione: number;
  settimana: boolean;
  /** Week name in the band of each card ("1ª settimana · dal 2 all'8 novembre"). */
  kicker: boolean;
  quando: { etichetta: string; ora: string; colore: string }[];
  piede: string;
  centro: string;
  codice: string;
  /** Text size of this view in % of the sheet's. */
  scala?: number;
  /** Weeks (or meetings, in views without the week line) per page; the text adapts to fill it. Empty: as many as fit. */
  perPagina?: number;
  /** Width ratio of a meeting and its duties side by side. */
  proporzioneReparti?: number;
};

/** Ready layouts of the cards of a week. */
export const DISPOSIZIONI: { id: string; nome: string; righe: TipoCarta[][] }[] = [
  { id: "sotto", nome: "Una sotto l'altra", righe: [["INFRA"], ["FINE"]] },
  { id: "affiancate", nome: "Affiancate", righe: [["INFRA", "FINE"]] },
  {
    id: "conReparti",
    nome: "Ognuna con i suoi reparti accanto",
    righe: [
      ["INFRA", "REP_INF"],
      ["FINE", "REP_FS"],
    ],
  },
  {
    id: "affiancateReparti",
    nome: "Affiancate, reparti sotto",
    righe: [
      ["INFRA", "FINE"],
      ["REP_INF", "REP_FS"],
    ],
  },
  { id: "infra", nome: "Solo infrasettimanale", righe: [["INFRA"]] },
  { id: "infraReparti", nome: "Infrasettimanale con i reparti", righe: [["INFRA", "REP_INF"]] },
  { id: "fine", nome: "Solo fine settimana", righe: [["FINE"]] },
  { id: "fineReparti", nome: "Fine settimana con i reparti", righe: [["FINE", "REP_FS"]] },
];
export const disposizioneDi = (righe: TipoCarta[][]) =>
  DISPOSIZIONI.find((d) => JSON.stringify(d.righe) === JSON.stringify(righe));

export type Colori = {
  testata: string;
  infra: string;
  fine: string;
  reparti: string;
  tesori: string;
  ministero: string;
  vita: string;
  generale: string;
  accento: string;
  inchiostro: string;
  carta: string;
  linee: string;
};

export type ModoColore = "sezione" | "inchiostro" | "personalizzato";

export type Stile = {
  carattere: string;
  condensato: string;
  /** Text size in % of the base. */
  dimensione: number;
  densita: "compatta" | "normale" | "ampia";
  colori: Colori;
  testoParti: ModoColore;
  colParti: string;
  testoNomi: ModoColore;
  colNomi: string;
  numeri: "sezione" | "inchiostro";
  fascia: "piena" | "chiara" | "linea";
  sfondoSchede: boolean;
  bordi: boolean;
  angoli: number;
  orari: boolean;
  numeriParti: boolean;
  durate: boolean;
  icone: boolean;
  ruoli: boolean;
  testata: boolean;
  piede: boolean;
  maiuscoloNomi: boolean;
  margine: number;
  formato: "A4" | "A5" | "A6" | "Letter" | "Quadrato" | "Telefono";
  orientamento: "verticale" | "orizzontale";
  bn: boolean;
};

export type Foglio = {
  versione: 1;
  id: string;
  mese: string;
  anno: string;
  cong: string;
  sigla: string;
  sorv: string;
  condTG: string;
  inizio: string;
  bozzaReparti?: boolean;
  viste: Vista[];
  stile: Stile;
  settimane: Settimana[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const PALETTE: Record<string, { nome: string; colori: Colori }> = {
  guida: {
    nome: "Guida per l'adunanza",
    colori: {
      testata: "#A8432B",
      infra: "#A8432B",
      fine: "#521F46",
      reparti: "#4D5A68",
      tesori: "#2E6E7C",
      ministero: "#A86F00",
      vita: "#A8432B",
      generale: "#4D5A68",
      accento: "#F2C66D",
      inchiostro: "#1E2326",
      carta: "#F6F5F2",
      linee: "#D5D9DE",
    },
  },
  ufficiale: {
    nome: "Colori della guida ufficiale",
    colori: {
      testata: "#2F4858",
      infra: "#2F4858",
      fine: "#4A3A6B",
      reparti: "#4D5A68",
      tesori: "#575A5D",
      ministero: "#BE8900",
      vita: "#7E0024",
      generale: "#4D5A68",
      accento: "#BE8900",
      inchiostro: "#1A1A1A",
      carta: "#FFFFFF",
      linee: "#D9D9D9",
    },
  },
  blu: {
    nome: "Blu",
    colori: {
      testata: "#1D5E77",
      infra: "#1D5E77",
      fine: "#3D4F55",
      reparti: "#3D4F55",
      tesori: "#2E6E7C",
      ministero: "#8E6410",
      vita: "#9C2B23",
      generale: "#3D4F55",
      accento: "#6DB2CB",
      inchiostro: "#16212B",
      carta: "#F6F8F8",
      linee: "#D6DFDD",
    },
  },
  sobrio: {
    nome: "Sobrio (grigi)",
    colori: {
      testata: "#333333",
      infra: "#333333",
      fine: "#555555",
      reparti: "#555555",
      tesori: "#444444",
      ministero: "#444444",
      vita: "#444444",
      generale: "#555555",
      accento: "#999999",
      inchiostro: "#111111",
      carta: "#FFFFFF",
      linee: "#CCCCCC",
    },
  },
};

export const CHIAVI_COLORE: [keyof Colori, string][] = [
  ["testata", "Titolo del foglio"],
  ["infra", "Infrasettimanale"],
  ["fine", "Fine settimana"],
  ["reparti", "Reparti"],
  ["tesori", "Tesori della Parola di Dio"],
  ["ministero", "Efficaci nel ministero"],
  ["vita", "Vita cristiana"],
  ["generale", "Sezioni generali"],
  ["accento", "Accento (linea sotto il nome)"],
  ["inchiostro", "Testo"],
  ["carta", "Sfondo delle schede"],
  ["linee", "Linee"],
];

export const CARATTERI: { id: string; nome: string; famiglia: string; google?: string }[] = [
  {
    id: "fira",
    nome: "Fira Sans",
    famiglia: "'Fira Sans'",
    google: "Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400",
  },
  {
    id: "fira-c",
    nome: "Fira Sans Condensed",
    famiglia: "'Fira Sans Condensed'",
    google: "Fira+Sans+Condensed:ital,wght@0,400;0,500;0,600;0,700;1,400",
  },
  {
    id: "fira-xc",
    nome: "Fira Sans Extra Condensed",
    famiglia: "'Fira Sans Extra Condensed'",
    google: "Fira+Sans+Extra+Condensed:wght@400;500;600;700;800",
  },
  {
    id: "plex",
    nome: "IBM Plex Sans",
    famiglia: "'IBM Plex Sans'",
    google: "IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",
  },
  {
    id: "plex-c",
    nome: "IBM Plex Sans Condensed",
    famiglia: "'IBM Plex Sans Condensed'",
    google: "IBM+Plex+Sans+Condensed:ital,wght@0,400;0,500;0,600;0,700;1,400",
  },
  {
    id: "archivo",
    nome: "Archivo",
    famiglia: "'Archivo'",
    google: "Archivo:wdth,wght@62..125,400..900",
  },
  {
    id: "noto",
    nome: "Noto Sans",
    famiglia: "'Noto Sans'",
    google: "Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",
  },
  {
    id: "serif",
    nome: "Noto Serif",
    famiglia: "'Noto Serif'",
    google: "Noto+Serif:ital,wght@0,400;0,600;0,700;1,400",
  },
  {
    id: "source-serif",
    nome: "Source Serif 4 (Trascrizioni)",
    famiglia: "'Source Serif 4'",
    google: "Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400;1,8..60,600",
  },
  {
    id: "montserrat",
    nome: "Montserrat (scrittura dell'anno)",
    famiglia: "'Montserrat'",
    google: "Montserrat:wght@500;600;800;900",
  },
  {
    id: "sistema",
    nome: "Del dispositivo",
    famiglia: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
];

export const famiglia = (id: string) =>
  CARATTERI.find((c) => c.id === id)?.famiglia ?? CARATTERI[0]!.famiglia;

export const STILE_BASE: Stile = {
  carattere: "fira",
  condensato: "fira-xc",
  dimensione: 100,
  densita: "normale",
  colori: PALETTE["guida"]!.colori,
  testoParti: "sezione",
  colParti: "#1E2326",
  testoNomi: "inchiostro",
  colNomi: "#1E2326",
  numeri: "sezione",
  fascia: "piena",
  sfondoSchede: true,
  bordi: true,
  angoli: 4,
  orari: true,
  numeriParti: true,
  durate: true,
  icone: true,
  ruoli: true,
  testata: true,
  piede: true,
  maiuscoloNomi: true,
  margine: 8,
  formato: "A4",
  orientamento: "verticale",
  bn: false,
};

export const VISTE_BASE: Vista[] = [
  {
    id: "inf",
    scala: 96,
    perPagina: 2,
    nome: "Infrasettimanale",
    sup: "Programma dell'adunanza",
    titolo: "Infrasettimanale",
    righe: [["INFRA"]],
    proporzione: 1,
    settimana: false,
    kicker: true,
    quando: [{ etichetta: "Martedì", ora: "", colore: "infra" }],
    piede: "Adunanza infrasettimanale",
    centro: "Sorvegliante dell'adunanza {sorv}",
    codice: "AI",
  },
  {
    id: "fs",
    perPagina: 3,
    scala: 104,
    nome: "Fine settimana",
    sup: "Programma dell'adunanza",
    titolo: "Del fine settimana",
    righe: [["FINE"]],
    proporzione: 1,
    settimana: false,
    kicker: true,
    quando: [{ etichetta: "Sabato", ora: "", colore: "fine" }],
    piede: "Adunanza del fine settimana",
    centro: "Conduttore Torre di Guardia {condTG}",
    codice: "AFS",
  },
  {
    id: "uni",
    scala: 100,
    nome: "Programma unico",
    sup: "Programma delle",
    titolo: "Adunanze",
    righe: [["INFRA"], ["FINE"]],
    proporzione: 1,
    settimana: true,
    kicker: false,
    quando: [
      { etichetta: "Martedì", ora: "", colore: "infra" },
      { etichetta: "Sabato", ora: "", colore: "fine" },
    ],
    piede: "Programma delle adunanze",
    centro: "Sorv. adunanza {sorv} · Torre di Guardia {condTG}",
    codice: "PA",
  },
  {
    id: "affiancato",
    scala: 90,
    nome: "Affiancato",
    sup: "Programma delle",
    titolo: "Adunanze",
    righe: [["INFRA", "FINE"]],
    proporzione: 1.25,
    settimana: true,
    kicker: false,
    quando: [
      { etichetta: "Martedì", ora: "", colore: "infra" },
      { etichetta: "Sabato", ora: "", colore: "fine" },
    ],
    piede: "Programma delle adunanze",
    centro: "Sorv. adunanza {sorv} · Torre di Guardia {condTG}",
    codice: "PA",
  },
  {
    id: "rep",
    scala: 89,
    nome: "Adunanze e reparti",
    sup: "Programma delle adunanze e",
    titolo: "Turnazione reparti",
    righe: [
      ["INFRA", "REP_INF"],
      ["FINE", "REP_FS"],
    ],
    proporzione: 1.95,
    proporzioneReparti: 1.95,
    settimana: true,
    kicker: false,
    quando: [
      { etichetta: "Martedì", ora: "", colore: "infra" },
      { etichetta: "Sabato", ora: "", colore: "fine" },
    ],
    piede: "Adunanze e reparti",
    centro: "Sorv. adunanza {sorv} · Torre di Guardia {condTG}",
    codice: "AR",
  },
];

export const NOMI_CARTA: Record<TipoCarta, string> = {
  INFRA: "Adunanza infrasettimanale",
  FINE: "Adunanza del fine settimana",
  REP_INF: "Reparti infrasettimanale",
  REP_FS: "Reparti fine settimana",
  ALTRO: "Altra scheda",
};

/** "#hex" or "@key" → colour. */
export function colore(c: string | undefined, colori: Colori, riserva = colori.generale): string {
  if (!c) return riserva;
  if (c.startsWith("@")) return colori[c.slice(1) as keyof Colori] ?? riserva;
  return c;
}

export const coloreCarta = (c: Carta, colori: Colori) =>
  colore(
    c.colore,
    colori,
    c.tipo === "FINE" || c.tipo === "REP_FS"
      ? colori.fine
      : c.tipo === "REP_INF"
        ? colori.reparti
        : colori.infra,
  );

export const ORDINALI = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"];

export const hm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const minuti = (ora: string | undefined) => {
  const x = /^(\d{1,2})[:.](\d{2})/.exec(ora ?? "");
  return x ? Number(x[1]) * 60 + Number(x[2]) : null;
};

/** Clock time and number of every row of a card, in order. */
export function orari(
  c: Carta,
  inizio: string,
): Map<string, { ora: string | null; n: number | null }> {
  const out = new Map<string, { ora: string | null; n: number | null }>();
  let t = minuti(c.ora) ?? minuti(inizio) ?? 19 * 60 + 30;
  let n = 0;
  for (const s of c.sezioni)
    for (const r of s.righe) {
      const conOra = r.orario ?? (r.tipo !== "voce" && r.tipo !== "testa");
      const ha = typeof r.min === "number";
      out.set(r.id, {
        ora: conOra && (ha || r.tipo === "cantico") ? hm(t) : null,
        n: r.numero ? ++n : null,
      });
      if (ha) t += (r.min as number) + (r.extra ?? 0);
    }
  return out;
}

/** Deep copy with new ids (to duplicate a week, a card, a section or a row). */
export function conNuoviId<T>(x: T): T {
  const c = structuredClone(x) as unknown;
  const giro = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(giro);
    else if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      if (typeof r["id"] === "string") r["id"] = uid();
      Object.values(r).forEach(giro);
    }
  };
  giro(c);
  return c as T;
}

export function sposta<T>(l: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= l.length) return l;
  const c = [...l];
  [c[i], c[j]] = [c[j]!, c[i]!];
  return c;
}

/** A sheet saved by an older version: fill in what is missing. */
export function normalizza(f: Foglio): Foglio {
  const viste = VISTE_BASE.map((v) => ({ ...v, ...(f.viste?.find((x) => x.id === v.id) ?? {}) }));
  for (const v of f.viste ?? []) if (!viste.some((x) => x.id === v.id)) viste.push(v);
  return {
    ...f,
    versione: 1,
    viste,
    stile: {
      ...STILE_BASE,
      ...(f.stile ?? {}),
      colori: { ...STILE_BASE.colori, ...(f.stile?.colori ?? {}) },
    },
  };
}

export const MESI_IT = [
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
export const GIORNI_IT = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];
export const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
