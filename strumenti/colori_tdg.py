# Applies the Watchtower colours (strumenti/colori_tdg.json) to the weekend cards in dati/*.json:
# card band = study-edition cover colour, "Studio Torre di Guardia" section = colour of that week's article.
# Colours too light for white text / text on the sheet are darkened (same hue) to a contrast of at least 4.5.
import json, glob, colorsys, os
QUI = os.path.dirname(os.path.abspath(__file__))
def lum(h):
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def contrasto(a, b="#F6F5F2"):
    x, y = sorted((lum(a), lum(b)), reverse=True); return (x + 0.05) / (y + 0.05)
def leggibile(h):
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (1, 3, 5))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    while contrasto(h) < 4.5 and l > 0.05:
        l -= 0.01; r, g, b = colorsys.hls_to_rgb(hh, l, s)
        h = "#%02X%02X%02X" % (round(r * 255), round(g * 255), round(b * 255))
    return h
def applica(cartella):
    C = json.load(open(os.path.join(QUI, "colori_tdg.json")))
    cop = {w: leggibile(e["colore"]) for e in C["copertine"].values() for w in e["settimane"]}
    art = {w: leggibile(c) for w, c in C["articoli"].items()}
    for p in sorted(glob.glob(os.path.join(cartella, "2*.json"))):
        d = json.load(open(p)); n = 0
        for s in d["settimane"]:
            for c in s["carte"]:
                if c["tipo"] != "FINE": continue
                lun = c["id"][:10]
                if lun in cop: c["colore"] = cop[lun]; n += 1
                for z in c["sezioni"]:
                    if z["titolo"] == "Studio Torre di Guardia" and lun in art: z["colore"] = art[lun]
        json.dump(d, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
        print(os.path.basename(p), n, "settimane colorate")
if __name__ == "__main__":
    import sys; applica(sys.argv[1] if len(sys.argv) > 1 else "dati")
