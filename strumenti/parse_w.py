import pymupdf, re, json, sys
MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]
def mese_n(s):
    for i, m in enumerate(MESI):
        if s.lower().startswith(m[:3]): return i + 1
def parse(path):
    d = pymupdf.open(path); arts = []; a = None
    for pn, p in enumerate(d):
        L = []
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                t = "".join(s["text"] for s in l["spans"]).strip()
                t = re.sub(r"[\x00-\x1f]", " ", t).replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬀ", "ff").strip()
                if not t: continue
                s = l["spans"][0]
                L.append(dict(t=t, x=l["bbox"][0], y=l["bbox"][1], size=round(s["size"], 1), font=s["font"]))
        L.sort(key=lambda r: (r["y"], r["x"]))
        head = [r for r in L if r["y"] < 45 and r["size"] >= 11.5 and re.match(r"^\d", r["t"]) and re.search(r"20\d\d$", r["t"])]
        if head:
            h = re.sub(r"\s+", " ", head[0]["t"])
            nums = re.findall(r"(?<!\d)(\d{1,2})(?!\d)", h); mesi = re.findall(r"[A-ZÀ-Ù]{3,}", h); anni = re.findall(r"\d{4}", h)
            tit = " ".join(r["t"] for r in L if r["size"] > 20)
            a = dict(head=h, d1=int(nums[0]), m1=mese_n(mesi[0]), d2=int(nums[1]), m2=mese_n(mesi[-1]), anno=int(anni[-1]), titolo=re.sub(r"\s+", " ", tit).strip(), canti=[], pg=pn + 1)
            arts.append(a)
        if a:
            for r in L:
                mc = re.match(r"^CANTICO (\d+)$", r["t"])
                if mc and "Demi" in r["font"]: a["canti"].append(int(mc.group(1)))
    return arts
if __name__ == "__main__":
    out = []
    for f in ["w_I_202609", "w_I_202610", "w_I_202611", "w_I_202612", "w_I_202701"]:
        for a in parse(f"pdf/src/{f}.pdf"):
            a["fonte"] = f; out.append(a)
            a["canti"] = a["canti"][:2]; print(f, a["head"], "|", a["titolo"], "|", a["canti"], "p", a["pg"])
    json.dump(out, open("gen/w.json", "w"), ensure_ascii=False, indent=1)
