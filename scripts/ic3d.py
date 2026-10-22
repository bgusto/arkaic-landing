"""Write ic3d-data.js: a 3D integrated circuit, the kind DeepOHeat predicts
temperature in, as 3D wireframe strokes.

An exploded package, bottom up: the substrate, a silicon interposer, three
stacked dies joined by through-silicon vias (TSVs), and above them, lifted
clear, the heat spreader with the finned heat sink on it. The interposer and
the dies have their front-right quarter cut away, so the cut faces show the
layers and the TSVs through them. The top die carries its power map: the
functional blocks, two of them hatched as the hot ones, with isotherms of the
temperature field around them. x and y span the package, z is up.

trace-loop.js hides the lines behind the solids: `occ` gives it every part
as boxes (an L-shaped layer is two boxes). Strokes are densified so a hidden
part drops out cleanly.

    python3 scripts/ic3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "ic3d-data.js"
TAU = 2 * math.pi

strokes = []
boxes = []


def box(cx, cy, cz, hx, hy, hz, solid=True, draw=True):
    """A box: its twelve edges, and its volume as an occluder."""
    at = lambda u, v, w: (cx + u * hx, cy + v * hy, cz + w * hz)
    if draw:
        for w in (-1, 1):
            strokes.append([at(u, v, w) for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1))])
        for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            strokes.append([at(u, v, -1), at(u, v, 1)])
    if solid:
        boxes.append([round(cx), round(cy), round(cz), hx, hy, hz, 0])


def layer(z0, z1, hx, hy):
    """A layer with its front-right quarter (x > 0, y < 0) cut away: an L in plan."""
    L = [(-hx, -hy), (0, -hy), (0, 0), (hx, 0), (hx, hy), (-hx, hy), (-hx, -hy)]
    for z in (z0, z1):
        strokes.append([(x, y, z) for x, y in L])
    for x, y in L[:-1]:
        strokes.append([(x, y, z0), (x, y, z1)])
    zc, hz = (z0 + z1) / 2, (z1 - z0) / 2
    box(-hx / 2, 0, zc, hx / 2, hy, hz, draw=False)        # the left half, full depth
    box(hx / 2, hy / 2, zc, hx / 2, hy / 2, hz, draw=False)  # the right half, back only


# ---- the package, bottom up ----
SUB = (640, 520, 40)          # substrate: half x, half y, thickness
INT = (560, 440, 30)          # interposer
DIE = (420, 330, 40)          # a die
GAP = 16                      # the interlayer between dies
N_DIE = 3
box(0, 0, SUB[2] / 2, SUB[0], SUB[1], SUB[2] / 2)
# solder balls under the substrate: a row of ticks along the front and right edges
for x in range(-SUB[0] + 60, SUB[0] - 40, 60):
    strokes.append([(x, -SUB[1], 0), (x, -SUB[1], -14)])
for y in range(-SUB[1] + 60, SUB[1] - 40, 60):
    strokes.append([(SUB[0], y, 0), (SUB[0], y, -14)])

z = SUB[2]
layer(z, z + INT[2], INT[0], INT[1])
z += INT[2] + 10
die_z = []
for i in range(N_DIE):
    layer(z, z + DIE[2], DIE[0], DIE[1])
    die_z.append((z, z + DIE[2]))
    z += DIE[2] + GAP
Z_TOP = die_z[-1][1]

# TSVs: vertical lines on the two cut faces of every die, and the interposer's
PITCH = 60
for z0, z1 in die_z + [(SUB[2], SUB[2] + INT[2])]:
    for x in range(PITCH // 2, DIE[0], PITCH):
        strokes.append([(x, 0, z0), (x, 0, z1)])
    for y in range(-PITCH // 2, -DIE[1], -PITCH):
        strokes.append([(0, y, z0), (0, y, z1)])
# micro-bumps in each interlayer, on the cut faces: short dashes
for (z0, z1), (nz0, nz1) in zip(die_z, die_z[1:]):
    zm = (z1 + nz0) / 2
    for x in range(PITCH // 2, DIE[0], PITCH):
        strokes.append([(x - 10, 0, zm), (x + 10, 0, zm)])
    for y in range(-PITCH // 2, -DIE[1], -PITCH):
        strokes.append([(0, y - 10, zm), (0, y + 10, zm)])

# ---- the top die's power map: blocks, the hot ones hatched, and isotherms ----
def rect(x0, y0, x1, y1, z):
    strokes.append([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z), (x0, y0, z)])


def hatch(x0, y0, x1, y1, z, step=26):
    for k in range(int(-(y1 - y0)), int(x1 - x0), step):
        xa, ya = x0 + k, y0
        xb, yb = x0 + k + (y1 - y0), y1
        if xa < x0: ya, xa = y0 + (x0 - xa), x0
        if xb > x1: yb, xb = y1 - (xb - x1), x1
        strokes.append([(xa, ya, z), (xb, yb, z)])


zt = Z_TOP + 0.5
cores = [(-380, 30, -230, 170), (-210, 30, -60, 170), (-380, -190, -230, -50), (-210, -190, -60, -50)]
for i, (x0, y0, x1, y1) in enumerate(cores):
    rect(x0, y0, x1, y1, zt)
    if i in (1, 3):
        hatch(x0, y0, x1, y1, zt)
rect(40, 60, 380, 300, zt)            # cache, at the back right
rect(-380, 210, -60, 300, zt)         # memory controller strip
rect(-380, -300, -60, -220, zt)       # I/O strip at the front left
# isotherms around the hot cores, clipped to the die's L
def inside_L(x, y, hx=DIE[0], hy=DIE[1]):
    return -hx <= x <= hx and -hy <= y <= hy and not (x > 0 and y < 0)


for rx, ry in ((150, 120), (235, 190), (320, 260)):
    run = []
    for k in range(97):
        a = TAU * k / 96
        p = (-135 + rx * math.cos(a), -10 + ry * math.sin(a), zt)
        if inside_L(p[0], p[1]) and abs(p[0]) < DIE[0] - 8 and abs(p[1]) < DIE[1] - 8:
            run.append(p)
        else:
            if len(run) > 1: strokes.append(run)
            run = []
    if len(run) > 1: strokes.append(run)

# ---- the lid and heat sink, exploded up and to the back left, clear of the stack ----
Z_LID = Z_TOP + 230
LX, LY = -300, 360
LID = (500, 400, 30)
box(LX, LY, Z_LID + LID[2] / 2, LID[0], LID[1], LID[2] / 2)                     # heat spreader
BASE = 30
box(LX, LY, Z_LID + LID[2] + BASE / 2, LID[0], LID[1], BASE / 2)                # heat-sink base
FIN_T, FIN_H, FIN_PITCH = 10, 130, 56
z_fin = Z_LID + LID[2] + BASE
fins = [LY + y for y in range(-LID[1] + 28, LID[1] - 20, FIN_PITCH)]
for y in fins:
    box(LX, y, z_fin + FIN_H / 2, LID[0], FIN_T / 2, FIN_H / 2)


def densify(s, step=22):
    out = [s[0]]
    for a, b in zip(s, s[1:]):
        n = max(1, math.ceil(math.dist(a, b) / step))
        out += [tuple(a[d] + (b[d] - a[d]) * k / n for d in range(3)) for k in range(1, n + 1)]
    return out


strokes = [densify(s) for s in strokes]

anchors = {
    "power": [-135, 110, Z_TOP],                       # the hot core
    "stack": [DIE[0] + 10, 0, (die_z[0][0] + die_z[-1][1]) / 2],
    "tsv": [200, -8, die_z[1][0] + DIE[2] / 2],
    "interlayer": [DIE[0], 0, (die_z[1][1] + die_z[2][0]) / 2],
    "interposer": [INT[0], INT[1] / 2, SUB[2] + INT[2] / 2],
    "spreader": [LX - LID[0], LY - LID[1], Z_LID + LID[2] / 2],
    "fins": [LX + LID[0], fins[-3], z_fin + FIN_H * 0.7],
}
zs = [p[2] for s in strokes for p in s]
Z_MID = (max(zs) + min(zs)) / 2
strokes = [[(x, y, z - Z_MID) for x, y, z in s] for s in strokes]
anchors = {k: [round(x), round(y), round(z - Z_MID)] for k, (x, y, z) in anchors.items()}
occ = {"boxes": [[cx, cy, round(cz - Z_MID), hx, hy, hz, ang] for cx, cy, cz, hx, hy, hz, ang in boxes], "cyls": []}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.IC3D={three:true,occ:" + json.dumps(occ, separators=(",", ":")) + ",anchors:" + json.dumps(anchors, separators=(",", ":"))
               + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes, {sum(len(s) for s in flat) // 3} points, {len(boxes)} boxes, z from {min(zs) - Z_MID:.0f} to {max(zs) - Z_MID:.0f}, x to {max(abs(p[0]) for s in strokes for p in s):.0f}, y to {max(abs(p[1]) for s in strokes for p in s):.0f}")
