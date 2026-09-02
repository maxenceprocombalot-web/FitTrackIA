from PIL import Image, ImageDraw
import os

SS = 4
N  = 1024 * SS
BG = (10, 10, 11)
GOLD_TOP, GOLD_BOTTOM = (240, 202, 96), (196, 145, 18)

def gold(size):
    g = Image.new("RGB", (1, size)); px = g.load()
    for y in range(size):
        t = y / (size - 1)
        px[0, y] = tuple(round(GOLD_TOP[i] + (GOLD_BOTTOM[i] - GOLD_TOP[i]) * t) for i in range(3))
    return g.resize((size, size))

def cap(d, p, w):
    r = w / 2
    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

canvas = Image.new("RGB", (N, N), BG)
mask = Image.new("L", (N, N), 0)
d = ImageDraw.Draw(mask)
cx = N / 2

# ── Chevron ──────────────────────────────────────────────────────────────────
# Segments droits : line() donne des bords nets, contrairement au tamponnage.
CH_W  = int(N * 0.084)
apex  = (cx, int(N * 0.268))
left  = (int(N * 0.238), int(N * 0.492))
right = (int(N * 0.762), int(N * 0.492))
d.line([left, apex, right], fill=255, width=CH_W, joint="curve")
for p in (left, apex, right):
    cap(d, p, CH_W)

# ── Courbe ascendante ────────────────────────────────────────────────────────
# Tamponnage très dense : une courbe tracée avec line() laisse des encoches.
CV_W = int(N * 0.058)
r = CV_W / 2
x0, x1 = int(N * 0.238), int(N * 0.735)
y0, y1 = int(N * 0.775), int(N * 0.612)
prev = None
for i in range(2001):
    t = i / 2000
    x = x0 + (x1 - x0) * t
    y = y0 + (y1 - y0) * (t ** 2.1)
    if prev is None or abs(x - prev[0]) + abs(y - prev[1]) > r / 8:
        d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        prev = (x, y)
cap(d, (x0, y0), CV_W)

# Point d'arrivée
pr = int(N * 0.053)
d.ellipse([x1 - pr, y1 - pr, x1 + pr, y1 + pr], fill=255)

canvas.paste(gold(N), (0, 0), mask)
out = canvas.resize((1024, 1024), Image.LANCZOS).convert("RGB")
out.save(os.path.expanduser("~/Projects/FitTrackIA/assets/icon.png"), "PNG", optimize=True)
print("✅ icône v3")
