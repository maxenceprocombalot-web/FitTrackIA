from PIL import Image, ImageDraw, ImageFont
import os

SRC = os.path.expanduser("~/Projects/FitTrackIA/docs/screenshots")
OUT = os.path.join(SRC, "store")
FONTS = os.path.join(os.path.dirname(__file__), "fonts")
os.makedirs(OUT, exist_ok=True)

W, H = 1320, 2868
BG      = (10, 10, 11)      # fond de l'app
GOLD    = (232, 184, 75)    # accent or
MUTED   = (181, 175, 161)   # texte secondaire
BORDER  = (42, 42, 46)

TITLE = ImageFont.truetype(f"{FONTS}/BarlowCondensed-Bold.ttf", 104)
SUB   = ImageFont.truetype(f"{FONTS}/Barlow-Regular.ttf", 44)

# Accroche courte + une ligne d'explication. Le titre porte la promesse,
# la sous-ligne donne le détail concret.
SHOTS = [
    ("1-accueil.png",    "TOUT TON SUIVI,\nUN SEUL ÉCRAN",   "Calories, macros, série et hydratation en direct"),
    ("2-sport.png",      "CHAQUE SÉANCE,\nCHAQUE RECORD",    "Séries, charges, PR automatiques et progression"),
    ("3-programmes.png", "29 PROGRAMMES,\n19 SPORTS",        "Marathon, triathlon, basket, muscu, Hyrox…"),
    ("4-nutrition.png",  "SCANNE,\nMANGE, PROGRESSE",        "2 265 aliments français + estimation par photo"),
    ("5-progres.png",    "VOIS TA\nTRANSFORMATION",          "Courbe de poids, score de forme, records"),
    ("6-coach.png",      "UN COACH QUI LIT\nTES VRAIES DONNÉES", "Il croise ton sport et ton assiette pour t'ajuster"),
]

def rounded(img, r):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0]-1, img.size[1]-1], radius=r, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

for name, title, sub in SHOTS:
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)

    # ── Titre ────────────────────────────────────────────────────────────
    y = 120
    for line in title.split("\n"):
        bbox = d.textbbox((0, 0), line, font=TITLE)
        d.text(((W - (bbox[2] - bbox[0])) / 2, y), line, font=TITLE, fill=GOLD)
        y += 116

    # ── Sous-titre ───────────────────────────────────────────────────────
    y += 18
    bbox = d.textbbox((0, 0), sub, font=SUB)
    d.text(((W - (bbox[2] - bbox[0])) / 2, y), sub, font=SUB, fill=MUTED)

    # ── Capture ──────────────────────────────────────────────────────────
    shot = Image.open(os.path.join(SRC, name)).convert("RGB")
    sw = 1024
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    top = 500
    # Rogner le bas si nécessaire pour garder une marge sous l'image
    max_h = H - top - 70
    if sh > max_h:
        shot = shot.crop((0, 0, sw, max_h)); sh = max_h
    shot = rounded(shot, 44)

    x = (W - sw) // 2
    d.rounded_rectangle([x - 2, top - 2, x + sw + 1, top + sh + 1], radius=46, outline=BORDER, width=3)
    canvas.paste(shot, (x, top), shot)

    canvas.save(os.path.join(OUT, name), "PNG", optimize=True)
    print(f"  ✅ {name}")

print(f"\n{len(SHOTS)} captures habillées → docs/screenshots/store/")
