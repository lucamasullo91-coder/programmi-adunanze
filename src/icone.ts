// Icons of the sheets and images: line icons (recoloured with the text) and the pictures of the meeting guide.
import tesori from "./assets/tesori.png";
import ministero from "./assets/ministero.png";
import vita from "./assets/vita.png";
import gemma from "./assets/gemma.png";
import grano from "./assets/grano.png";
import pecora from "./assets/pecora.png";
import torre from "./assets/tower_ink.png";
import torre_bianca from "./assets/tower_white.png";
import testata from "./assets/masthead_ink.png";
import testata_bianca from "./assets/masthead_white.png";

export type Icona = {
  id: string;
  nome: string;
  gruppo: string;
  svg?: string;
  img?: string;
  chiara?: boolean;
};

export const ICONE: Icona[] = [
  {
    id: "cantico",
    nome: "Cantico",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor"><path d="M21.5 6.5v24.2a7.2 7.2 0 1 0 3 5.8V15.4c4.7 1 8.4 3.8 9.8 8.3.4 1.2 2.2.9 2.1-.4C36 13.6 29.6 8.6 22.8 5.6a.9.9 0 0 0-1.3.9z"/></svg>',
  },
  {
    id: "multimedia",
    nome: "Contenuti multimediali",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="38" height="26" rx="3"/><path d="M17 41h14M24 35v6"/><path d="M20.5 16.5v11l9-5.5z" fill="currentColor"/></svg>',
  },
  {
    id: "video",
    nome: "Video",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="12" width="27" height="24" rx="3"/><path d="m32 21 11-6v18l-11-6"/></svg>',
  },
  {
    id: "discorso",
    nome: "Discorso",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18h20l-3 24H17z"/><path d="M11 18h26"/><path d="M24 18v-6"/><circle cx="24" cy="9" r="3"/><path d="M19 30h10"/></svg>',
  },
  {
    id: "microfono",
    nome: "Microfono",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="17" y="5" width="14" height="22" rx="7"/><path d="M11 22a13 13 0 0 0 26 0M24 35v8M17 43h14"/></svg>',
  },
  {
    id: "lettura",
    nome: "Lettura biblica",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 13c-5-4-12-4-19-3v27c7-1 14-1 19 3 5-4 12-4 19-3V10c-7-1-14-1-19 3z"/><path d="M24 13v27"/><path d="M33 9v10l3-2 3 2V9.6"/></svg>',
  },
  {
    id: "libro",
    nome: "Bibbia aperta (scritture dei video)",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="322 105 238 122" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round"><path d="M386 117 L327 181 C352 184 380 189 403 197 L408 204 C420 203 432 207 442 212 C468 215 495 218 520 223 L556 151 L547 145"/><path d="M409 111 L353 177 C378 179 402 184 425 192 L465 121 C449 115 430 111 409 111 Z"/><path d="M465 121 C488 120 512 125 532 134 C536 139 540 145 543 150"/><path d="M532 134 L499 208"/><path d="M425 192 C450 195 475 200 499 208"/><path d="M425 192 C430 196 434 202 437 208"/></svg>',
  },
  {
    id: "bibbia",
    nome: "Bibbia",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 12c-5-4-12-4-19-3v28c7-1 14-1 19 3 5-4 12-4 19-3V9c-7-1-14-1-19 3z"/><path d="M24 12v28"/></svg>',
  },
  {
    id: "studio",
    nome: "Studio biblico",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 16c-4-3-9.5-3-15-2.4V37c5.5-.6 11-.6 15 2.4 4-3 9.5-3 15-2.4V13.6c-5.5-.6-11-.6-15 2.4z"/><path d="M24 16v23.4"/><circle cx="17" cy="7.5" r="3"/><circle cx="31" cy="7.5" r="3"/></svg>',
  },
  {
    id: "domande",
    nome: "Domande",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10h32a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H22l-9 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="M20 18a4 4 0 1 1 5.5 3.7c-1 .4-1.5 1.2-1.5 2.3v.5"/><circle cx="24" cy="29" r=".8" fill="currentColor"/></svg>',
  },
  {
    id: "preghiera",
    nome: "Preghiera",
    gruppo: "Adunanze",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 22V8.5a3 3 0 0 0-6 0V24l-5.5 6.5V42H24"/><path d="M24 22V8.5a3 3 0 0 1 6 0V24l5.5 6.5V42H24"/><path d="M24 22v20"/></svg>',
  },
  {
    id: "casa",
    nome: "Di casa in casa",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22 24 7l18 15"/><path d="M11 18v23h26V18"/><path d="M20 41V29h8v12"/></svg>',
  },
  {
    id: "informale",
    nome: "Testimonianza informale",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H15l-6 5v-5H6a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z"/><path d="M35 17h7a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-3v5l-6-5h-9a3 3 0 0 1-3-3v-2"/></svg>',
  },
  {
    id: "carrello",
    nome: "Testimonianza pubblica",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="5" width="22" height="28" rx="2"/><path d="M18 12h12M18 18h12M18 24h8"/><path d="M13 33v6M35 33v6"/><circle cx="13" cy="41.5" r="2.5"/><circle cx="35" cy="41.5" r="2.5"/></svg>',
  },
  {
    id: "lettera",
    nome: "Lettera",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="38" height="26" rx="3"/><path d="m6 13 18 13 18-13"/></svg>',
  },
  {
    id: "telefono",
    nome: "Telefono",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h6l3 9-4 3a24 24 0 0 0 13 13l3-4 9 3v6a3 3 0 0 1-3 3C21 39 9 27 9 9a3 3 0 0 1 3-3z"/></svg>',
  },
  {
    id: "territorio",
    nome: "Territorio",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 12-5 14 5 12-5v31l-12 5-14-5-12 5z"/><path d="M17 6v31M31 11v31"/></svg>',
  },
  {
    id: "borsa",
    nome: "Ministero",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="15" width="38" height="25" rx="3"/><path d="M17 15v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M5 25h38"/><path d="M21 25v4h6v-4"/></svg>',
  },
  {
    id: "percorso",
    nome: "Percorso",
    gruppo: "Ministero",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="39" r="4"/><path d="M14 39h14a7 7 0 0 0 0-14h-8a7 7 0 0 1 0-14h6"/><path d="M36 3.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7z"/><circle cx="36" cy="10.5" r="2.2"/></svg>',
  },
  {
    id: "sala",
    nome: "Sala del Regno",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 24 8l20 12"/><path d="M8 18v23h32V18"/><path d="M4 41h40"/><path d="M15 41V27M33 41V27M21 41v-8h6v8"/></svg>',
  },
  {
    id: "persona",
    nome: "Persona",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="14" r="7"/><path d="M9 42c1.5-9 7.5-14 15-14s13.5 5 15 14"/></svg>',
  },
  {
    id: "gruppo",
    nome: "Gruppo",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="13" r="5.5"/><circle cx="11" cy="18" r="4.2"/><circle cx="37" cy="18" r="4.2"/><path d="M13 40c1-7.5 5.5-12 11-12s10 4.5 11 12"/><path d="M3 37c.6-5 3.6-8.4 8-8.6M45 37c-.6-5-3.6-8.4-8-8.6"/></svg>',
  },
  {
    id: "pastore",
    nome: "Anziani (pastori)",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 44V16a9 9 0 1 1 9 9"/><path d="M33 25a3 3 0 0 0 3-3"/></svg>',
  },
  {
    id: "pulizia",
    nome: "Pulizie",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M30 5 22 25"/><path d="M14 25h18l2 17H12z"/><path d="M18 31v11M24 31v11M30 31v11"/></svg>',
  },
  {
    id: "audio",
    nome: "Audio",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30v-6a16 16 0 0 1 32 0v6"/><rect x="5" y="28" width="8" height="13" rx="3"/><rect x="35" y="28" width="8" height="13" rx="3"/></svg>',
  },
  {
    id: "assemblea",
    nome: "Assemblea",
    gruppo: "Congregazione",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 41h38"/><path d="M8 41V24l16-10 16 10v17"/><path d="M14 41v-9h20v9"/><path d="M24 14V5l7 3-7 3"/></svg>',
  },
  {
    id: "luogo",
    nome: "Luogo",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4a13 13 0 0 0-13 13c0 9.7 13 26 13 26s13-16.3 13-26A13 13 0 0 0 24 4z"/><circle cx="24" cy="17" r="4.5"/></svg>',
  },
  {
    id: "orario",
    nome: "Orario",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="18"/><path d="M24 13v11l7 5"/></svg>',
  },
  {
    id: "calendario",
    nome: "Calendario",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="9" width="36" height="33" rx="3"/><path d="M6 19h36M16 5v8M32 5v8"/><path d="M14 27h4M22 27h4M30 27h4M14 34h4M22 34h4"/></svg>',
  },
  {
    id: "pranzo",
    nome: "Pranzo",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5v12a4 4 0 0 0 8 0V5M18 5v38"/><path d="M34 43V5c-4 2-6 7-6 13v8h6"/></svg>',
  },
  {
    id: "nota",
    nome: "Note",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M31 6 42 17 18 41H7V30z"/><path d="m26 11 11 11"/></svg>',
  },
  {
    id: "download",
    nome: "Scarica",
    gruppo: "Agenda",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v24M14 21l10 10 10-10"/><path d="M7 33v6a3 3 0 0 0 3 3h28a3 3 0 0 0 3-3v-6"/></svg>',
  },
  {
    id: "tesori",
    nome: "Tesori della Parola di Dio",
    gruppo: "Guida Vita e ministero",
    img: tesori,
  },
  {
    id: "ministero",
    nome: "Efficaci nel ministero",
    gruppo: "Guida Vita e ministero",
    img: ministero,
  },
  { id: "vita", nome: "Vita cristiana", gruppo: "Guida Vita e ministero", img: vita },
  { id: "gemma", nome: "Gemma", gruppo: "Guida Vita e ministero", img: gemma },
  { id: "grano", nome: "Grano", gruppo: "Guida Vita e ministero", img: grano },
  { id: "pecora", nome: "Pecora", gruppo: "Guida Vita e ministero", img: pecora },
  { id: "torre", nome: "Torre di Guardia", gruppo: "Torre di Guardia", img: torre },
  {
    id: "torre_bianca",
    nome: "Torre di Guardia (bianca)",
    gruppo: "Torre di Guardia",
    img: torre_bianca,
    chiara: true,
  },
  { id: "testata", nome: "Testata La Torre di Guardia", gruppo: "Torre di Guardia", img: testata },
  {
    id: "testata_bianca",
    nome: "Testata (bianca)",
    gruppo: "Torre di Guardia",
    img: testata_bianca,
    chiara: true,
  },
];

export const icona = (id: string | undefined) => (id ? ICONE.find((i) => i.id === id) : undefined);

/** Image source of an icon in a colour (line icons take it, pictures stay as they are). */
export function srcIcona(id: string | undefined, col = "#2C3036"): string {
  const i = icona(id);
  if (!i) return "";
  if (i.img) return i.img;
  return `data:image/svg+xml,${encodeURIComponent(i.svg!.replace(/currentColor/g, col))}`;
}

export const GRUPPI_ICONE = [...new Set(ICONE.map((i) => i.gruppo))];
