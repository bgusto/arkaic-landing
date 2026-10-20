"""Write drone3d-data.js: a 7-inch FPV quadcopter as 3D wireframe strokes.

A carbon X frame: a bottom plate with four arms, a top plate on standoffs, the
flight controller stack between them. Four motors with three-blade props. A
battery strapped to the top plate, a tilted camera at the front, the video
antenna and two receiver whips at the back, and a payload slung under the
frame. x is forward, y is left, z is up; 1 mm is 4 units.

trace-loop.js hides the lines behind the solids: `occ` gives it the plates,
arms and battery as boxes, the motors as cylinders, and the payload as a
radius table along x. Strokes are densified so a hidden part drops out cleanly.

    python3 scripts/drone3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "drone3d-data.js"
TAU = 2 * math.pi

M = 416                                  # motors at (±M, ±M): a 295 mm wheelbase
R_PROP = 356                             # a 7-inch prop
PLATE = 16                               # plate thickness
Z_TOP = 136                              # the top plate's underside
BODY = (320, 160)                        # the body plates, x by y
BATT = (300, 140, 150)                   # the battery, x by y by z
Z_PAY = -120                             # the payload's axis
R_PAY = 68

strokes = []
boxes = []


def box(cx, cy, cz, hx, hy, hz, ang=0.0, solid=True):
    """A box turned by ang about z: its twelve edges."""
    c, s = math.cos(ang), math.sin(ang)
    at = lambda u, v, w: (cx + u * hx * c - v * hy * s, cy + u * hx * s + v * hy * c, cz + w * hz)
    for w in (-1, 1):
        strokes.append([at(u, v, w) for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1))])
    for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        strokes.append([at(u, v, -1), at(u, v, 1)])
    if solid:
        boxes.append([round(cx), round(cy), round(cz), hx, hy, hz, round(ang, 4)])


def ring(cx, cy, z, r, n=32):
    strokes.append([(cx + r * math.cos(TAU * k / n), cy + r * math.sin(TAU * k / n), z) for k in range(n + 1)])


def cylinder(cx, cy, z0, z1, r, lines=8, n=32):
    ring(cx, cy, z0, r, n)
    ring(cx, cy, z1, r, n)
    for k in range(lines):
        a = TAU * k / lines
        strokes.append([(cx + r * math.cos(a), cy + r * math.sin(a), z0), (cx + r * math.cos(a), cy + r * math.sin(a), z1)])


# ---- the frame ----
box(0, 0, PLATE / 2, BODY[0] / 2, BODY[1] / 2, PLATE / 2)                       # bottom plate
for sx in (1, -1):
    for sy in (1, -1):
        L = math.hypot(M, M) + 60
        box(sx * L / 2 / math.sqrt(2), sy * L / 2 / math.sqrt(2), PLATE / 2, L / 2, 28, PLATE / 2, math.atan2(sy, sx))   # an arm, from the centre out past the motor
box(0, 0, Z_TOP + PLATE / 2, BODY[0] / 2 - 10, BODY[1] / 2 - 5, PLATE / 2)      # top plate
for sx in (1, -1):
    for sy in (1, -1):
        cylinder(sx * 120, sy * 55, PLATE, Z_TOP, 8, lines=4, n=12)             # standoffs
for z in (52, 88):                                                              # the FC stack: two boards on posts
    strokes.append([(sx * 72, sy * 72, z) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1))])
for sx in (1, -1):
    for sy in (1, -1):
        strokes.append([(sx * 60, sy * 60, PLATE), (sx * 60, sy * 60, 100)])

# ---- motors and props ----
cyls = []
Z_PROP = 104
for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
    cx, cy = sx * M, sy * M
    ring(cx, cy, PLATE, 58, n=40)                                               # the motor base
    cylinder(cx, cy, 22, 74, 50, lines=12, n=40)                                # the bell
    cylinder(cx, cy, 74, Z_PROP, 10, lines=4, n=12)                             # the shaft
    cylinder(cx, cy, Z_PROP, Z_PROP + 14, 30, lines=6, n=24)                    # the prop hub
    cylinder(cx, cy, Z_PROP + 14, Z_PROP + 30, 14, lines=6, n=12)               # the nut
    cyls.append([cx, cy, 50, 22, 74])
    spin = 1 if sx == sy else -1                                                # CW and CCW props alternate
    phase = i * 0.4
    for b in range(3):
        a0 = TAU * b / 3 + phase
        le, te = [], []
        for k in range(25):
            u = k / 24
            rr = 32 + (R_PROP - 32) * u
            half = 6 + 46 * math.sin(math.pi * u ** 0.8)                        # half chord, widest mid-blade
            sweep = -0.22 * u * u * spin                                        # the blade sweeps back
            twist = 4 + 16 * (1 - u)                                            # pitch: the leading edge rides high
            a = a0 + sweep
            da = half / rr
            le.append((cx + rr * math.cos(a + da * spin), cy + rr * math.sin(a + da * spin), Z_PROP + 7 + twist))
            te.append((cx + rr * math.cos(a - da * spin), cy + rr * math.sin(a - da * spin), Z_PROP + 7 - twist))
        strokes.append(le + list(reversed(te)) + [le[0]])

# ---- battery on top, two straps round it and the plate ----
BX, BZ = -10, Z_TOP + PLATE + BATT[2] / 2
box(BX, 0, BZ, BATT[0] / 2, BATT[1] / 2, BATT[2] / 2)
for x in (BX - 80, BX + 70):
    for dx in (-18, 18):
        hy, z0, z1 = BATT[1] / 2 + 4, Z_TOP - 4, BZ + BATT[2] / 2 + 4
        strokes.append([(x + dx, hy, z0), (x + dx, hy, z1), (x + dx, -hy, z1), (x + dx, -hy, z0), (x + dx, hy, z0)])

# ---- the camera: a small box tilted up at the front, a lens on it ----
TILT = math.radians(25)
CX, CZ, HX, HY, HZ = 200, 76, 28, 40, 34
ct, st = math.cos(TILT), math.sin(TILT)
cam = lambda u, v, w: (CX + u * HX * ct - w * HZ * st, v * HY, CZ + u * HX * st + w * HZ * ct)
for w in (-1, 1):
    strokes.append([cam(u, v, w) for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1))])
for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    strokes.append([cam(u, v, -1), cam(u, v, 1)])
lens = lambda d, t: (CX + (HX + d) * ct - 26 * math.sin(t) * st, 26 * math.cos(t), CZ + (HX + d) * st + 26 * math.sin(t) * ct)   # in the face's plane
for d in (0, 30):
    strokes.append([lens(d, t) for t in [TAU * k / 20 for k in range(21)]])
for t in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
    strokes.append([lens(0, t), lens(30, t)])

# ---- antennas at the back: the video lollipop, two receiver whips ----
strokes.append([(-165, 0, Z_TOP + PLATE), (-330, 0, 320)])
strokes.append([(-345.6 - 15.6 * math.cos(t), 22 * math.sin(t), 335.6 + 15.6 * math.cos(t)) for t in [TAU * k / 20 for k in range(21)]])   # its head, a disc in the antenna's plane
for sy in (1, -1):
    strokes.append([(-160, sy * 70, PLATE), (-200, sy * 100, PLATE + 20), (-360, sy * 230, 250)])
    cylinder(-170, sy * 78, PLATE, PLATE + 24, 7, lines=3, n=10)

# ---- the payload slung under the frame: a cylinder with an ogive nose, two straps ----
X0, X1, XN = -200, 300, 400
prof = [(x, R_PAY) for x in range(X0, X1 + 1, 40)]
prof += [(X1 + (XN - X1) * u, R_PAY * math.sqrt(max(0.0, 1 - u * u))) for u in [k / 10 for k in range(1, 11)]]
for k in range(12):
    a = TAU * k / 12
    strokes.append([(x, r * math.cos(a), Z_PAY + r * math.sin(a)) for x, r in prof])
for x in (X0, X0 + 60, X1, X1 + 70):
    r = next(rr for xx, rr in prof if xx >= x)
    strokes.append([(x, r * math.cos(t), Z_PAY + r * math.sin(t)) for t in [TAU * k / 32 for k in range(33)]])
for x in (-100, 190):
    for dx in (-16, 16):
        loop = [(x + dx, (R_PAY + 4) * math.cos(t), Z_PAY + (R_PAY + 4) * math.sin(t)) for t in [math.pi * (1 + k / 16) for k in range(17)]]
        loop = [(x + dx, -(R_PAY + 4), 0), (x + dx, -(R_PAY + 4), Z_PAY)] + loop[::-1] + [(x + dx, R_PAY + 4, 0), (x + dx, -(R_PAY + 4), 0)]
        strokes.append(loop)


def densify(s, step=22):
    out = [s[0]]
    for a, b in zip(s, s[1:]):
        n = max(1, math.ceil(math.dist(a, b) / step))
        out += [tuple(a[d] + (b[d] - a[d]) * k / n for d in range(3)) for k in range(1, n + 1)]
    return out


strokes = [densify(s) for s in strokes]

anchors = {
    "prop": [M + 250, -M - 250, Z_PROP],
    "pitch": [-M - 200, M + 200, Z_PROP],
    "motor": [-M - 50, -M, 48],
    "arm": [250, 250, PLATE],
    "battery": [BX, BATT[1] / 2, BZ],
    "payload": [XN - 40, 0, Z_PAY],
    "camera": [CX + 60, -30, CZ + 30],
}
zs = [p[2] for s in strokes for p in s]
Z_MID = (max(zs) + min(zs)) / 2
strokes = [[(x, y, z - Z_MID) for x, y, z in s] for s in strokes]
anchors = {k: [round(x), round(y), round(z - Z_MID)] for k, (x, y, z) in anchors.items()}
DX = 10
xrev = {"x0": X0, "dx": DX, "cy": 0, "cz": round(Z_PAY - Z_MID),
        "r": [round(min(prof, key=lambda p: abs(p[0] - x))[1] if x <= X1 else R_PAY * math.sqrt(max(0.0, 1 - ((x - X1) / (XN - X1)) ** 2)))
              for x in range(X0, XN + 1, DX)]}
occ = {"boxes": [[cx, cy, round(cz - Z_MID), hx, hy, hz, ang] for cx, cy, cz, hx, hy, hz, ang in boxes],
       "cyls": [[cx, cy, r, round(z0 - Z_MID), round(z1 - Z_MID)] for cx, cy, r, z0, z1 in cyls], "xrev": xrev}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.DRONE3D={three:true,occ:" + json.dumps(occ, separators=(",", ":")) + ",anchors:" + json.dumps(anchors, separators=(",", ":"))
               + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes, {sum(len(s) for s in flat) // 3} points, z from {min(zs) - Z_MID:.0f} to {max(zs) - Z_MID:.0f}")
