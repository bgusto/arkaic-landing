"""Write rde3d-data.js: a rotating detonation engine as 3D wireframe strokes.

An annular combustor (outer wall, inner centrebody) under an injector face, with
a plug nozzle on the centrebody below the exit. One detonation front stands in the
annulus at the head end; behind it, drawn on the centrebody through a cutaway in the
outer wall, the fresh-fill layer it will burn on its next lap, the oblique shock it
trails and the slip line.
Units match trace-loop.js: z is the engine axis, the injector face is at the top.
The wave strokes come last in the list (`late`), so they are drawn after the engine.

    python3 scripts/rde3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "rde3d-data.js"

R_OUT, R_IN = 430, 310           # outer wall, centrebody
Z_TOP, Z_EXIT, Z_TIP = 330, -330, -640
FILL = 170                       # fresh-mixture height at the front
THETA_D = 0.95                   # where the front stands (radians, near the front of the final view); it travels toward +theta
TAU = 2 * math.pi

strokes = []


def ring(r, z, n=64, a0=0.0, a1=TAU):
    strokes.append([(r * math.cos(a0 + (a1 - a0) * k / n), r * math.sin(a0 + (a1 - a0) * k / n), z) for k in range(n + 1)])


def on_wall(r, pts):
    """A curve on the cylinder of radius r, from (theta, z) pairs."""
    strokes.append([(r * math.cos(t), r * math.sin(t), z) for t, z in pts])


# ---- the combustor: outer wall (cut away in front of the wave) and centrebody ----
CUT0, CUT1 = THETA_D - 1.7, THETA_D + 0.35        # the window in the outer wall
ring(R_OUT, Z_TOP)                                 # the head plate's rim stays whole
ring(R_OUT, Z_EXIT, a0=CUT1, a1=CUT0 + TAU)
for a in (CUT0, CUT1):                             # the cut edges
    strokes.append([(R_OUT * math.cos(a), R_OUT * math.sin(a), Z_TOP), (R_OUT * math.cos(a), R_OUT * math.sin(a), Z_EXIT)])
for k in range(12):
    a = TAU * k / 12
    if (a - CUT0) % TAU < CUT1 - CUT0 + 0.15:
        continue
    strokes.append([(R_OUT * math.cos(a), R_OUT * math.sin(a), Z_TOP), (R_OUT * math.cos(a), R_OUT * math.sin(a), Z_EXIT)])
for z in (Z_TOP, Z_EXIT):
    ring(R_IN, z, n=48)
for k in range(8):
    a = TAU * k / 8
    strokes.append([(R_IN * math.cos(a), R_IN * math.sin(a), Z_TOP), (R_IN * math.cos(a), R_IN * math.sin(a), Z_EXIT)])

# ---- injector face: the annulus at the head end, a ring of injector orifices ----
R_MID = (R_OUT + R_IN) / 2
for k in range(24):
    a = TAU * (k + 0.5) / 24
    cx, cy = R_MID * math.cos(a), R_MID * math.sin(a)
    strokes.append([(cx + 13 * math.cos(TAU * j / 12), cy + 13 * math.sin(TAU * j / 12), Z_TOP) for j in range(13)])
ring(R_IN * 0.55, Z_TOP, n=40)          # the centrebody's closed top, a plain cap
for k in range(8):
    a = TAU * k / 8
    strokes.append([(R_IN * 0.55 * math.cos(a), R_IN * 0.55 * math.sin(a), Z_TOP), (R_IN * math.cos(a), R_IN * math.sin(a), Z_TOP)])

# ---- plug nozzle on the centrebody, below the exit ----
plug = [(Z_EXIT - (Z_EXIT - Z_TIP) * u, R_IN * (1 - u) ** 1.6) for u in [k / 12 for k in range(13)]]
for k in range(8):
    a = TAU * k / 8
    strokes.append([(r * math.cos(a), r * math.sin(a), z) for z, r in plug])
for u in (0.35, 0.7):
    z, r = Z_EXIT - (Z_EXIT - Z_TIP) * u, R_IN * (1 - u) ** 1.6
    ring(r, z, n=40)

late = len(strokes)

# ---- the detonation front: a sheet across the annulus, from the injector face down the fill height ----
for r in (R_OUT, R_IN):
    for dt in (0.0, 0.01, 0.02):                   # tripled, so the front reads first
        on_wall(r, [(THETA_D + dt, Z_TOP), (THETA_D + dt, Z_TOP - FILL)])
for z in (Z_TOP, Z_TOP - FILL):
    strokes.append([(R_IN * math.cos(THETA_D), R_IN * math.sin(THETA_D), z), (R_OUT * math.cos(THETA_D), R_OUT * math.sin(THETA_D), z)])
# on the centrebody, seen through the cutaway: the fill layer thinning back to nothing a lap behind
# the front, and the oblique shock and slip line trailing from the top of the front to the exit
on_wall(R_IN, [(THETA_D - (TAU - 0.15) * u, Z_TOP - FILL * (1 - u)) for u in [k / 48 for k in range(49)]])
on_wall(R_IN, [(THETA_D - 1.05 * u, Z_TOP - FILL - (Z_TOP - FILL - Z_EXIT) * u) for u in [k / 24 for k in range(25)]])
on_wall(R_IN, [(THETA_D - 1.9 * u, Z_TOP - FILL - (Z_TOP - FILL - Z_EXIT) * u) for u in [k / 24 for k in range(25)]])

at = lambda r, t, z: [round(r * math.cos(t)), round(r * math.sin(t)), round(z)]
anchors = {
    "diameter": at(R_OUT, THETA_D - 2.6, Z_TOP - 120),
    "flow": at(R_MID, THETA_D - 0.9, Z_TOP),
    "gap": at(R_MID, THETA_D + 2.6, Z_TOP),
    "injector": at(R_MID, THETA_D + 1.2, Z_TOP),
    "length": at(R_OUT, THETA_D + 3.6, 0),
    "phi": at(R_IN * 0.4, 0, Z_TOP),
    "plug": [0, 0, round((Z_EXIT + Z_TIP) / 2)],
}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.RDE3D={three:true,late:" + str(late) + ",anchors:" + json.dumps(anchors, separators=(",", ":")) + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes ({len(flat) - late} for the wave)")
