# compose.py OUT.gif CROP_LEFT TERM_W : the loop, at 2x, from the 4x renders
#   beat 1: mock-base/mock-hover with a drawn cursor clicking Download; beat 2: the terminal states
import sys
from PIL import Image, ImageDraw, ImageEnhance
out, crop_left, term_w = sys.argv[1], int(sys.argv[2]), sys.argv[3]
R = 4; O = 2   # render scale, output scale
FPS = 20
def ui(name):
    im = Image.open(name).convert("RGB")
    w, h = im.size
    return im.crop((crop_left * R, 0, w, h)).resize(((w // R - crop_left) * O, h // R * O), Image.LANCZOS)
base, hover = ui("mock-base.png"), ui("mock-hover.png")
W, H = base.size
def term(name):
    im = Image.open(name).convert("RGB"); return im.resize((im.width // R * O, im.height // R * O), Image.LANCZOS)
# the Download button in the mock, in points (from the render: the toolbar's first button)
BTN = (840 - crop_left, 65, 84, 25)
end = ((BTN[0] + BTN[2] * 0.55) * O, (BTN[1] + BTN[3] * 0.6) * O)
start = ((980 - crop_left) * O, 430 * O)
def ease(u): return u * u * (3 - 2 * u)
def cursor(im, x, y):
    k = 1.2 * O
    pts = [(x + px * k, y + py * k) for px, py in [(0, 0), (0, 16.5), (4.2, 12.6), (7.2, 19.3), (9.6, 18.3), (6.7, 11.6), (12, 11.6)]]
    d = ImageDraw.Draw(im)
    d.line(pts + [pts[0]], fill=(255, 255, 255), width=O)
    d.polygon(pts, fill=(20, 20, 20))
    return im
pressed = hover.copy()
bx, by, bw, bh = [int(v * O) for v in BTN]
pressed.paste(ImageEnhance.Brightness(pressed.crop((bx - 2, by - 2, bx + bw + 2, by + bh + 2))).enhance(0.93), (bx - 2, by - 2))
frames = []
def add(im, n, pos=None):
    for _ in range(n): frames.append(cursor(im.copy(), *pos) if pos else im)
add(base, int(1.2 * FPS), start)
n = int(0.9 * FPS)
for i in range(1, n + 1):
    u = ease(i / n); add(base, 1, (start[0] + (end[0] - start[0]) * u, start[1] + (end[1] - start[1]) * u))
add(hover, int(0.4 * FPS), end)
add(pressed, int(0.15 * FPS), end)
add(hover, int(1.0 * FPS), end)
t = lambda s: term(f"term-{term_w}-{s}.png")
add(t("n0"), int(0.5 * FPS))
for k in range(1, 32): add(t(f"n{k}"), 1)   # one character a frame
add(t("n31"), int(0.4 * FPS))
for l in range(2, 21, 2): add(t(f"l{l}"), 3)   # two lines every 0.15 s
add(t("l20"), int(4.0 * FPS))
assert all(f.size == (W, H) for f in frames), {f.size for f in frames}
pal = Image.new("RGB", (W, H * 2)); pal.paste(base, (0, 0)); pal.paste(t("l20"), (0, H))
pal = pal.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
q[0].save(out, save_all=True, append_images=q[1:], duration=int(1000 / FPS), loop=0, optimize=True, disposal=1)
print(out, "frames", len(frames), "size", W, H, "seconds", len(frames) / FPS)
for i, k in [(int(1.5 * FPS), "a"), (int(2.0 * FPS), "b"), (int(3.0 * FPS), "c"), (len(frames) - 1, "d")]: frames[i].save(f"key-{out}-{k}.png")
