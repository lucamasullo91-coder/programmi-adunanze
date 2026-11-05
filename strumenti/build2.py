# Builds the app's Foglio documents (one per month) from the workbooks and the Watchtower study editions,
# with a token where each name has to be written; tokens become form fields in the PDF.
import json, re, sys, datetime as dt, copy
MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]
GIORNI = ["lunedì","martedì","mercoledì","giovedì","venerdì","sabato","domenica"]
MWB = json.load(open("gen/mwb.json")); WT = json.load(open("gen/w.json"))
CO = "Diego Alex Petralito"
VISITA = (dt.date(2026, 11, 2),)          # Monday of the visit week
COMMEMORAZIONE = dt.date(2027, 3, 22)
STILE = None
CAMPI = {}   # token id -> {nome, tipo}
n = 0
CAMPO = "\x00CAMPO"
def campo(*a, **k): return CAMPO
PREF = [""]
CONT = {}
def uid(k="x"):
    p = PREF[0]; CONT[p] = CONT.get(p, 0) + 1; return f"{p}-{k}{CONT[p]}"
def riga(tipo, titolo, **x):
    r = {"id": uid("r"), "tipo": tipo, "titolo": titolo, **x}; campi = []
    for k in ("chi", "chi2", "titolo"):
        if r.get(k) == CAMPO: r[k] = ""; campi.append(k)
    if campi: r["campi"] = campi
    return r
def sez(titolo, colore, righe, **x): return {"id": uid("s"), "titolo": titolo, "colore": colore, "righe": righe, **x}
def giorno(d): return f"{GIORNI[d.weekday()].capitalize()} {d.day} {MESI[d.month-1]}"
def etichetta(l):
    d = l + dt.timedelta(days=6)
    a = "all’" if d.day in (8, 11) else "al "
    da = "dall’" if l.day in (8, 11) else "dal "
    g1 = "1°" if l.day == 1 else str(l.day)
    return f"{da}{g1} {a}{d.day} {MESI[l.month-1]}" if l.month == d.month else f"{da}{g1} {MESI[l.month-1]} {a}{d.day} {MESI[d.month-1]}"
def orari(l):
    # Meeting days from Congregation Manager (orari_adunanze): until 3 Jan 2027 Tue 19:30 / Sat 19:30, then Wed 19:30 / Sun 11:00.
    return (1, 5, None) if l < dt.date(2027, 1, 4) else (2, 6, "11:00")

def amb(det):
    m = re.match(r"^(DI CASA IN CASA|TESTIMONIANZA INFORMALE|TESTIMONIANZA PUBBLICA)\.", det)
    return m.group(1).capitalize() if m else None

def rif_studio(p):
    r = p["righe"][0] if p["righe"] else ""
    if r.count("“") > r.count("”") and len(p["righe"]) > 1: r += " " + p["righe"][1]
    return r.strip()

def carta_infra(w, l, data):
    pref = data.isoformat(); PREF[0] = f"{l.isoformat()}-inf"
    visita = l in VISITA
    tes = []
    for i, p in enumerate(w["tesori"]):
        r = riga("parte", p["t"], min=p["min"], numero=True, mostraMin=True)
        if p["t"].startswith("Gemme"):
            r["rif"] = re.split(r"\s*—", p["det"])[0].strip(); r["chi"] = campo(f"{pref} Gemme spirituali")
        elif p["t"].startswith("Lettura biblica"):
            r["rif"] = rif_studio(p); r["extra"] = 1; r["ruolo"] = "Stud."; r["chi"] = campo(f"{pref} Lettura biblica")
        else: r["chi"] = campo(f"{pref} Tesori discorso")
        tes.append(r)
    mi = []
    for j, p in enumerate(w["minist"]):
        r = riga("parte", p["t"], min=p["min"], numero=True, mostraMin=True)
        a = amb(p["det"])
        if a: r["ambito"] = a
        nome = f"{pref} Ministero {j+1}"
        if p["det"].startswith("Discorso del presidente"):
            r["chi"] = "<i>Presidente</i>"
        elif p["t"].startswith("Cosa direste") or p["t"] == "Discorso" or p["det"].startswith("Discorso."):
            r["chi"] = campo(nome); r["extra"] = 0 if p["t"].startswith("Cosa direste") else 1
            if r["extra"] == 0: del r["extra"]
        else:
            r["extra"] = 1; r["ruolo"] = "Stud."; r["chi"] = campo(nome + " studente"); r["ruolo2"] = "Ass."; r["chi2"] = campo(nome + " assistente")
        mi.append(r)
    vi = [riga("cantico", w["c2"] or "", min=5)]
    for p in w["vita"]:
        if p["t"].startswith("Studio biblico di congregazione"):
            if visita: continue
            vi.append(riga("parte", p["t"], min=30, numero=True, mostraMin=True, rif=rif_studio(p),
                           ruolo="Cond.", chi=campo(f"{pref} Studio biblico conduttore"), ruolo2="Lett.", chi2=campo(f"{pref} Studio biblico lettore")))
        else:
            vi.append(riga("parte", p["t"], min=p["min"], numero=True, mostraMin=True, chi=campo(f"{pref} Vita cristiana {len(vi)}")))
    vi.append(riga("testo", "Commenti conclusivi", min=w["concl"], mostraMin=True))
    if visita:
        vi.append(riga("parte", "Discorso di servizio", min=30, numero=True, mostraMin=True, chi=CO))
    vi.append(riga("cantico", w["c3"] or "", min=None, suffisso="e preghiera", ruolo="Preghiera", chi=campo(f"{pref} Preghiera finale")))
    c = {"id": PREF[0], "tipo": "INFRA", "titolo": giorno(data), "editData": True, "icone": ["tesori", "ministero", "vita"], "sezioni": [
        sez("Apertura", "@generale", [
            riga("testa", "Lettura settimanale", rif=w["lettura"], ruolo="Presidente", chi=campo(f"{pref} Presidente")),
            riga("cantico", w["c1"] or "", min=5, suffisso="e preghiera", ruolo="Preghiera", chi=campo(f"{pref} Preghiera iniziale")),
            riga("testo", "Commenti introduttivi", min=1, mostraMin=True)], senzaTitolo=True),
        sez("Tesori della Parola di Dio", "@tesori", tes, icona="tesori"),
        sez("Efficaci nel ministero", "@ministero", mi, icona="ministero"),
        sez("Vita cristiana", "@vita", vi, icona="vita")]}
    if visita: c["flag"] = "Visita del sorvegliante di circoscrizione"
    return c

def carta_commemorazione(d):
    pref = d.isoformat(); PREF[0] = f"{(d - dt.timedelta(days=d.weekday())).isoformat()}-inf"
    return {"id": PREF[0], "tipo": "INFRA", "titolo": giorno(d), "editData": True, "kicker": "Commemorazione della morte di Gesù", "flag": "Nessuna adunanza infrasettimanale",
            "icone": ["vita"], "sezioni": [sez("Commemorazione della morte di Gesù", "@vita", [
                riga("voce", "Orario", chi=campo(f"{pref} Commemorazione orario", vuoto=10)),
                riga("voce", "Oratore", chi=campo(f"{pref} Commemorazione oratore")),
                riga("voce", "Preghiera per il pane", chi=campo(f"{pref} Commemorazione preghiera pane")),
                riga("voce", "Preghiera per il vino", chi=campo(f"{pref} Commemorazione preghiera vino"))], icona="vita")]}

def articolo(l):
    for a in WT:
        if a["d1"] == l.day and a["m1"] == l.month: return a

def carta_fine(l, data, ora):
    PREF[0] = f"{l.isoformat()}-fs"
    pref = data.isoformat(); visita = l in VISITA; a = articolo(l)
    ca = str(a["canti"][0]) if a else campo(f"{pref} Torre di Guardia cantico iniziale", "numero", 3)
    cb = str(a["canti"][1]) if a else campo(f"{pref} Torre di Guardia cantico finale", "numero", 3)
    wt = a["titolo"] if a else campo(f"{pref} Torre di Guardia titolo", "titolo", 4)
    disc = [riga("parte", campo(f"{pref} Discorso pubblico tema", "titolo", 4), min=30, grande=True)]
    if visita:
        disc += [riga("voce", "Oratore", chi=CO)]
    else:
        disc += [riga("voce", "Oratore", chi=campo(f"{pref} Oratore")), riga("voce", "Congregazione", chi=campo(f"{pref} Congregazione oratore"))]
    tg = [riga("cantico", ca, min=5), riga("parte", wt, min=30 if visita else 60, grande=True),
          riga("voce", "Conduttore", chi=campo(f"{pref} Conduttore Torre di Guardia")), riga("voce", "Lettore", chi=campo(f"{pref} Lettore Torre di Guardia"))]
    fine = riga("cantico", cb, suffisso="e preghiera", ruolo="Preghiera", chi=campo(f"{pref} Preghiera finale fine settimana"))
    sezioni = [
        sez("Apertura", "@generale", [riga("cantico", campo(f"{pref} Cantico iniziale", "numero", 3), min=5, suffisso="e preghiera", ruolo="Presidente", chi=campo(f"{pref} Presidente fine settimana"))], senzaTitolo=True),
        sez("Discorso pubblico", "@generale", disc, durata="(30 min)", icona="discorso"),
        sez("Studio Torre di Guardia", "@fine", tg + ([] if visita else [fine]), durata="(30 min)" if visita else "(60 min)", icona="torre")]
    if visita:
        sezioni.append(sez("Discorso conclusivo", "@generale", [riga("parte", "Discorso del sorvegliante di circoscrizione", min=30, grande=True), riga("voce", "Oratore", chi=CO), fine], durata="(30 min)", icona="discorso"))
    c = {"id": PREF[0], "tipo": "FINE", "titolo": giorno(data), "editData": True, "icone": ["torre_bianca"], "sezioni": sezioni}
    if ora: c["ora"] = ora
    if visita: c["flag"] = "Visita del sorvegliante di circoscrizione"
    return c

def settimane_mwb():
    out = []
    for ws in MWB.values():
        for w in ws:
            out.append((dt.date(w["anno1"], w["m1"], w["d1"]), w))
    return out

def foglio(anno, mese, base):
    gi, gf, oraf = orari(dt.date(anno, mese, 1) if not (anno == 2026) else dt.date(2026, 11, 2))
    weeks = []
    mw = dict(settimane_mwb())
    l = dt.date(anno, mese, 1)
    while l.weekday() != 0: l += dt.timedelta(days=1)
    while l.month == mese:
        gi, gf, oraf = orari(l)
        di, df = l + dt.timedelta(days=gi), l + dt.timedelta(days=gf)
        carte = []
        if l <= COMMEMORAZIONE <= l + dt.timedelta(days=6): carte.append(carta_commemorazione(COMMEMORAZIONE))
        elif l in mw: carte.append(carta_infra(mw[l], l, di))
        carte.append(carta_fine(l, df, oraf))
        s = {"id": l.isoformat(), "label": etichetta(l), "carte": carte}
        if l in VISITA: s["visita"] = True
        if l <= COMMEMORAZIONE <= l + dt.timedelta(days=6): s["nota"] = "Commemorazione: lunedì 22 marzo"
        weeks.append(s); l += dt.timedelta(days=7)
    for s_ in weeks:
        for c in s_["carte"]:
            for z in c["sezioni"]:
                for r in z["righe"]:
                    for k in ("chi", "chi2", "titolo"):
                        if r.get(k) == CAMPO:
                            r[k] = ""; r.setdefault("campi", [])
                            if k not in r["campi"]: r["campi"].append(k)
    f = copy.deepcopy(base)
    f.update({"id": f"{anno}-{mese:02d}", "mese": MESI[mese-1].capitalize(), "anno": str(anno), "settimane": weeks})
    gi_n = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"]
    for v in f["viste"]:
        q = []
        for x in v["quando"]:
            if x["colore"] == "infra": q.append({**x, "etichetta": gi_n[gi], "ora": ""})
            elif x["colore"] == "fine": q.append({**x, "etichetta": gi_n[gf], "ora": oraf or ""})
            else: q.append(x)
        v["quando"] = q
    return f

if __name__ == "__main__":
    import os
    base = json.load(open("gen/base.json"))
    base["stile"]["testoParti"] = "sezione"
    base["sorv"] = ""; base["condTG"] = ""
    for v in base["viste"]:
        if v["id"] == "uni": v["perPagina"] = 1
    out = sys.argv[1]
    for anno, mese in [(2026,11),(2026,12),(2027,1),(2027,2),(2027,3),(2027,4)]:
        f = foglio(anno, mese, base)
        json.dump(f, open(f"{out}/{anno}-{mese:02d}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"bimestri": [{"id": "2026-11", "nome": "Novembre – dicembre 2026", "mesi": ["2026-11", "2026-12"]}]}, open(f"{out}/indice.json", "w"), ensure_ascii=False, indent=1)
    print("ok", sorted(os.listdir(out)))
