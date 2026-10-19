"""Write engine3d-data.js: a generic liquid rocket engine as 3D wireframe strokes.

A bell nozzle, a cylindrical chamber under an injector dome, a gimbal mount, one
turbopump beside the chamber, a feed duct to the dome and a coolant manifold
ring on the nozzle. Units match trace-loop.js: z is up, the exit lip
sits at z = -1008. Each stroke is a flat list of x, y, z; anchors place the
callouts.

    python3 scripts/engine3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "engine3d-data.js"

Z_EXIT, R_EXIT = -1008, 560
Z_THROAT, R_THROAT = 200, 110
Z_CHAMBER0, Z_CHAMBER1, R_CHAMBER = 330, 560, 200
Z_DOME = 670
MERIDIANS = 24

strokes = []


def bezier(p0, p1, p2, u):
    return [(1 - u) ** 2 * a + 2 * (1 - u) * u * b + u * u * c for a, b, c in zip(p0, p1, p2)]


def ring(cx, cy, z, r, n=48):
    strokes.append([(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n), z) for k in range(n + 1)])


def cylinder(cx, cy, z0, z1, r, lines=12, rings=()):
    for z in (z0, z1, *rings):
        ring(cx, cy, z, r)
    for k in range(lines):
        a = 2 * math.pi * k / lines
        strokes.append([(cx + r * math.cos(a), cy + r * math.sin(a), z0), (cx + r * math.cos(a), cy + r * math.sin(a), z1)])


def tube(path, r, step=70, sides=4):
    """A pipe along a polyline: rings across it every `step` and `sides` lines along it."""
    length = [0.0]
    for a, b in zip(path, path[1:]):
        length.append(length[-1] + math.dist(a, b))
    frames = []
    for i, p in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        t = [q - p_ for q, p_ in zip(b, a)]
        n = math.hypot(*t)
        t = [c / n for c in t]
        ref = (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0)
        u = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
        n = math.hypot(*u)
        u = [c / n for c in u]
        v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        frames.append((p, u, v))
    at = lambda f, a: [p + r * (math.cos(a) * u_ + math.sin(a) * v_) for p, u_, v_ in zip(*f)]
    for k in range(sides):
        strokes.append([at(f, 2 * math.pi * k / sides + math.pi / 4) for f in frames])
    next_ring = 0.0
    for f, s in zip(frames, length):
        if s >= next_ring or s == length[-1]:
            strokes.append([at(f, 2 * math.pi * k / 12) for k in range(13)])
            next_ring = s + step


# ---- the thrust chamber: one profile, revolved ----
# Bell from the throat to the exit: a short arc, then a parabola (Rao's approximation),
# leaving the throat at 32 degrees and the lip at 16 degrees.
theta_n, theta_e = math.radians(32), math.radians(16)
arc = []
for k in range(7):
    th = theta_n * k / 6
    arc.append((Z_THROAT - 0.382 * R_THROAT * math.sin(th), R_THROAT + 0.382 * R_THROAT * (1 - math.cos(th))))
zn, rn = arc[-1]
# control point where the tangents at N and at the lip meet
tn, te = math.tan(theta_n), math.tan(theta_e)
zq = ((rn - R_EXIT) + tn * zn - te * Z_EXIT) / (tn - te)     # where r = rn + tn (zn - z) meets r = Re + te (Ze - z)
rq = rn + tn * (zn - zq)
bell = [bezier((zn, rn), (zq, rq), (Z_EXIT, R_EXIT), k / 40) for k in range(1, 41)]
# converging section: throat up to the chamber wall, a smooth blend
conv = []
for k in range(1, 13):
    u = k / 12
    conv.append((Z_THROAT + (Z_CHAMBER0 - Z_THROAT) * u, R_THROAT + (R_CHAMBER - R_THROAT) * (1 - math.cos(math.pi * u)) / 2))
profile = list(reversed(bell)) + list(reversed(arc)) + conv + [(Z_CHAMBER1, R_CHAMBER)]   # exit lip first, up to the dome
for k in range(MERIDIANS):
    a = 2 * math.pi * k / MERIDIANS
    strokes.append([(r * math.cos(a), r * math.sin(a), z) for z, r in profile])
r_at = lambda z: min(profile, key=lambda p: abs(p[0] - z))[1]
for z in (-1008, -990, -830, -660, -500, -350, -210, -80, 40, 130, Z_THROAT, 265, Z_CHAMBER0, 445, Z_CHAMBER1):
    ring(0, 0, z, r_at(z))

# ---- injector dome, gimbal mount ----
for k in range(0, MERIDIANS, 2):
    a = 2 * math.pi * k / MERIDIANS
    strokes.append([(R_CHAMBER * math.sin(t) * math.cos(a), R_CHAMBER * math.sin(t) * math.sin(a), Z_CHAMBER1 + (Z_DOME - Z_CHAMBER1) * math.cos(t))
                    for t in [math.pi / 2 * (1 - j / 10) for j in range(11)]])
for t in (math.radians(55), math.radians(30)):
    ring(0, 0, Z_CHAMBER1 + (Z_DOME - Z_CHAMBER1) * math.cos(t), R_CHAMBER * math.sin(t), n=36)
cylinder(0, 0, Z_DOME - 10, 780, 55, lines=8)
cylinder(0, 0, 780, 805, 115, lines=8)

# ---- turbopump: pump body over a turbine, an inlet on top ----
PX = -430
cylinder(PX, 0, 420, 680, 95, lines=12, rings=(550,))
cylinder(PX, 0, 330, 420, 72, lines=12)
cylinder(PX, 0, 680, 760, 50, lines=8)

# ---- pump discharge duct to the dome; a coolant manifold ring on the nozzle ----
tube([bezier((PX + 90, 0, 610), (-230, 0, 720), (-110, 0, 655), k / 16) for k in range(17)], 34)
Z_MAN = -420
r_man = r_at(Z_MAN) + 34
ring(0, 0, Z_MAN, r_man, n=64)
ring(0, 0, Z_MAN + 24, r_man - 4, n=64)
ring(0, 0, Z_MAN - 24, r_man + 4, n=64)

anchors = {
    "mix": [140, 0, 640],
    "pump": [PX - 95, 0, 560],
    "chamber": [R_CHAMBER, 0, 450],
    "throat": [round(R_THROAT * 0.71), round(R_THROAT * 0.71), Z_THROAT],
    "contour": [round(r_at(-288)), 0, -288],
    "cool": [0, -round(r_man), Z_MAN],
    "exp": [R_EXIT, 0, Z_EXIT],
}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.ENGINE3D={three:true,anchors:" + json.dumps(anchors, separators=(",", ":")) + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes, {sum(len(s) for s in flat) // 3} points")
