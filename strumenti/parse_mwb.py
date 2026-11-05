import pymupdf, re, json, sys
SEZ = {0x296975: "tesori", 0xab7800: "minist", 0x942924: "vita"}
MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]

def righe(path):
    d = pymupdf.open(path)
    out = []
    for pn, p in enumerate(d):
        L = []
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                sp = [s for s in l["spans"] if s["text"].strip()]
                t = "".join(s["text"] for s in l["spans"]).strip()
                t = t.replace("\ufb00", "ff").replace("\ufb01", "fi").replace("\ufb02", "fl")
                t = re.sub(r"[\x00-\x1f]", " ", t)
                t = re.sub(r"^[\s\u02d9\u02c6\ue000-\uf8ff]+", "", t).strip()  # icons
                if not t or not sp or set(t) <= set("_"): continue
                s = sp[-1] if "Cantico" in t else sp[0]
                x, y = l["bbox"][0], l["bbox"][1]
                zona = 0 if y < 60 else (3 if y >= 598 else (1 if x < 250 else 2))
                L.append(dict(t=t, x=x, y=y, size=round(s["size"], 1), font=s["font"], col=s["color"], zona=zona, pg=pn))
        L.sort(key=lambda r: (r["zona"], r["y"], r["x"]))
        out += L
    return out

def mese_n(s):
    for i, m in enumerate(MESI):
        if s.lower().startswith(m[:3]): return i + 1
    return None

def parse(path, anno):
    R = righe(path)
    weeks = []; w = None; cur = None; parte = None
    def chiudi_parte():
        nonlocal parte
        if parte and w:
            t = re.sub(r"\s+", " ", parte["t"]).strip()
            m = re.match(r"(.*?)\s*\((\d+) min\)\s*(.*)$", t)
            if m:
                parte["t"] = re.sub(r"^\d+\.\s*", "", m.group(1)).strip(); parte["min"] = int(m.group(2)); parte["dopo"] = m.group(3)
            else: print("NOMIN", t, file=sys.stderr)
            if not (w.get("_rientro") and any(q["t"] == parte["t"] for q in w[parte["sez"]])): w[parte["sez"]].append(parte)
        parte = None
    for r in R:
        t = r["t"]
        if r["size"] == 11.0 and r["y"] < 30 and re.match(r"^\d", t):
            chiudi_parte()
            t2 = re.sub(r"(?<=\d)\s*-\s*(?=\d)", "-", t)
            t2 = re.sub(r"\s+", " ", t2)
            m = re.match(r"^(\d+)[uº°]?(?: ([A-ZÀ-Ù]+))?\s*[-–]\s*(\d+) ([A-ZÀ-Ù]+)\s*(.*)$", t2)
            if not m: print("HEAD?", t, file=sys.stderr); continue
            d1, m1, d2, m2, lett = m.groups()
            gia = [x for x in weeks if x["d1"] == int(d1) and x["m2"] == mese_n(m2)]
            if gia: w = gia[0]; w["_rientro"] = True; continue
            w = dict(head=t, d1=int(d1), m1=mese_n(m1 or m2), d2=int(d2), m2=mese_n(m2), lettura=re.sub(r"\s*-\s*", "-", lett).title(), c1=None, c2=None, c3=None, tesori=[], minist=[], vita=[], concl=3, note=[])
            weeks.append(w); continue
        if not w: continue
        if r["size"] == 11.0 and r["y"] < 30 and not w["lettura"]:
            w["lettura"] = re.sub(r"\s*-\s*", "-", t).title(); continue
        mc = re.match(r"^Cantico\s+(\d+)(\s+e preghiera)?", t)
        if mc:
            chiudi_parte()
            k = "c1" if (mc.group(2) and w["c1"] is None and r["zona"] == 0) else ("c3" if mc.group(2) else "c2")
            if w[k] is None: w[k] = mc.group(1)
            continue
        if t.startswith("Commenti introduttivi"): continue
        mm = re.match(r"^Commenti conclusivi \((\d+) min\)", t)
        if mm: chiudi_parte(); w["concl"] = int(mm.group(1)); continue
        if r["size"] in (9.5, 10.0) and "Demi" in r["font"] and r["col"] in SEZ:
            if re.match(r"^\d+\.\s", t):
                chiudi_parte(); parte = dict(sez=SEZ[r["col"]], t=t, det=[]); continue
            if parte and parte["sez"] == SEZ[r["col"]] and not re.search(r"\(\d+ min\)", parte["t"]):
                parte["t"] += " " + t; continue
        if parte and not re.search(r"\(\d+ min\)", parte["t"]) and re.match(r"^\(\d+ min\)", t):
            parte["t"] += " " + t; continue
        if r["col"] == 0xffffff or re.fullmatch(r"(TESORI|DELLA PAROLA DI DIO|EFFICACI|NEL MINISTERO|VITA|CRISTIANA|\d+)", t): continue
        if parte and r["size"] in (8.0, 9.5):
            parte["det"].append(t)
    chiudi_parte()
    for w in weeks:
        y1 = anno if not (w["m1"] == 12 and w["m2"] == 1) else anno
        w["anno1"] = anno; w["anno2"] = anno + (1 if w["m1"] == 12 and w["m2"] == 1 else 0)
        for p in w["tesori"] + w["minist"] + w["vita"]:
            p["righe"] = list(p["det"]); det = " ".join(p.pop("det"))
            det = re.sub(r"(\w)- (\w)", r"\1\2", det)
            p["det"] = det
    return weeks

if __name__ == "__main__":
    out = {}
    for f, a in [("mwb_I_202611", 2026), ("mwb_I_202701", 2027), ("mwb_I_202703", 2027)]:
        out[f] = parse(f"pdf/src/{f}.pdf", a)
    json.dump(out, open("gen/mwb.json", "w"), ensure_ascii=False, indent=1)
    for f, ws in out.items():
        print("##", f)
        for w in ws:
            print(f' {w["d1"]}/{w["m1"]}-{w["d2"]}/{w["m2"]} {w["lettura"]} | c {w["c1"]},{w["c2"]},{w["c3"]} concl {w["concl"]}')
            for s in ("tesori", "minist", "vita"):
                for p in w[s]: print(f'    {s[:3]} {p.get("min","?"):>2} {p["t"]} || {p.get("dopo")} || {p["det"][:70]}')
