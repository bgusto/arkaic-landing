"""Write rde3d-data.js: a rotating detonation engine as 3D wireframe strokes.

An annular combustor, an outer wall around a centrebody, under a head plate with
a fuel inlet and an oxidizer inlet and a ring of injector orifices; a conical
plug nozzle on the centrebody below the exit. A window is cut in the outer wall
at the front of the final view, and through it the flow in the annulus is drawn
as a wireframe volume: the detonation front standing across the gap at the head
end, the fresh-fill layer it runs into (a ramp, one lap around, from nothing
just behind the front to full height just ahead of it) and the oblique shock
trailing behind the front down to the exit. The front travels toward +theta.

trace-loop.js hides the lines behind the engine's solids for this scene, so the
window is a real cutaway: `occ` gives it the solids (wall, head plate,
centrebody, plug) and the window. Strokes are densified so a hidden part drops
out cleanly. Units match trace-loop.js: z is the engine axis, the head is at the
top. The flow strokes come last in the list (`late`), drawn after the engine.

    python3 scripts/rde3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "rde3d-data.js"
TAU = 2 * math.pi

R_OUT, R_IN = 420, 290                   # outer wall, centrebody
Z_TOP, Z_EXIT, Z_TIP = 300, -300, -560   # injector face, exit plane, plug tip
Z_HEAD = Z_TOP + 50                      # the head plate's top
R_HEAD = R_OUT + 20
FILL = 210                               # fresh-mixture height at the front
YAW_END = 0.2 + 0.14 * (9 + 1.5) / 2     # the view's final yaw (trace-loop.js: yaw0 + spin * hold)
FRONT = math.pi / 2 - YAW_END            # theta that faces the viewer then
THETA_D = FRONT - 0.4                    # where the front stands: right of centre, so its sheet shows its face
CUT0, CUT1 = THETA_D - 0.75, THETA_D + 0.95  # the window in the outer wall, about a quarter turn
R_MID = (R_OUT + R_IN) / 2
R_FLOW = R_OUT - 14                      # the flow's outer boundary, just inside the wall

strokes = []


def ring(r, z, n=64, a0=0.0, a1=TAU):
    strokes.append([(r * math.cos(a0 + (a1 - a0) * k / n), r * math.sin(a0 + (a1 - a0) * k / n), z) for k in range(n + 1)])


def on_wall(r, pts):
    """A curve on the cylinder of radius r, from (theta, z) pairs."""
    strokes.append([(r * math.cos(t), r * math.sin(t), z) for t, z in pts])


def tie(t, z, r0=R_IN, r1=R_FLOW):
    """A radial line across the annulus."""
    strokes.append([(r0 * math.cos(t), r0 * math.sin(t), z), (r1 * math.cos(t), r1 * math.sin(t), z)])


def in_cut(a):
    return (a - CUT0) % TAU < CUT1 - CUT0


# ---- the outer wall, with the window cut out of it ----
for z in (Z_TOP, 0, Z_EXIT):
    ring(R_OUT, z, a0=CUT1, a1=CUT0 + TAU)
for z in (Z_EXIT, Z_EXIT + 20):                              # the exit flange
    ring(R_OUT + 22, z, a0=CUT1, a1=CUT0 + TAU)
for a in (CUT0, CUT1):                                       # the cut edges, with the wall's thickness
    for r in (R_OUT, R_OUT - 12):
        strokes.append([(r * math.cos(a), r * math.sin(a), Z_TOP), (r * math.cos(a), r * math.sin(a), Z_EXIT)])
    for z in (Z_TOP, Z_EXIT):
        strokes.append([((R_OUT - 12) * math.cos(a), (R_OUT - 12) * math.sin(a), z), (R_OUT * math.cos(a), R_OUT * math.sin(a), z)])
for k in range(12):
    a = TAU * k / 12
    if in_cut(a):
        continue
    strokes.append([(R_OUT * math.cos(a), R_OUT * math.sin(a), Z_TOP), (R_OUT * math.cos(a), R_OUT * math.sin(a), Z_EXIT)])

# ---- the centrebody and its plug ----
for z in (Z_TOP, 0, Z_EXIT):
    ring(R_IN, z, n=48)
for k in range(12):
    a = TAU * k / 12
    strokes.append([(R_IN * math.cos(a), R_IN * math.sin(a), Z_TOP), (R_IN * math.cos(a), R_IN * math.sin(a), Z_EXIT)])
    strokes.append([(R_IN * math.cos(a), R_IN * math.sin(a), Z_EXIT), (0, 0, Z_TIP)])
for u in (0.33, 0.66):
    ring(R_IN * (1 - u), Z_EXIT - (Z_EXIT - Z_TIP) * u, n=40)

# ---- the head plate: a thick disc over the annulus, the injector orifices through it, two inlets ----
ring(R_HEAD, Z_TOP)
ring(R_HEAD, Z_HEAD)
for k in range(24):
    a = TAU * k / 24
    strokes.append([(R_HEAD * math.cos(a), R_HEAD * math.sin(a), Z_TOP), (R_HEAD * math.cos(a), R_HEAD * math.sin(a), Z_HEAD)])
for k in range(28):
    a = TAU * (k + 0.5) / 28
    cx, cy = R_MID * math.cos(a), R_MID * math.sin(a)
    strokes.append([(cx + 12 * math.cos(TAU * j / 12), cy + 12 * math.sin(TAU * j / 12), Z_HEAD) for j in range(13)])


def inlet(a, r_pipe, length):
    """A radial pipe into the head plate, a flange at its end."""
    ca, sa = math.cos(a), math.sin(a)
    z = (Z_TOP + Z_HEAD) / 2
    for j in range(6):
        t = TAU * j / 6
        strokes.append([(R_HEAD * ca - r_pipe * math.sin(t) * sa, R_HEAD * sa + r_pipe * math.sin(t) * ca, z + r_pipe * math.cos(t)),
                        ((R_HEAD + length) * ca - r_pipe * math.sin(t) * sa, (R_HEAD + length) * sa + r_pipe * math.sin(t) * ca, z + r_pipe * math.cos(t))])
    for s, rr in ((length - 14, r_pipe + 12), (length, r_pipe + 12)):
        strokes.append([((R_HEAD + s) * ca - rr * math.sin(t) * sa, (R_HEAD + s) * sa + rr * math.sin(t) * ca, z + rr * math.cos(t)) for t in [TAU * j / 16 for j in range(17)]])


A_OX, A_FUEL = -YAW_END, math.pi - YAW_END                   # the right and left of the final view
inlet(A_OX, 22, 150)
inlet(A_FUEL, 18, 130)

late = len(strokes)

# ---- the flow in the annulus ----
# the fresh-fill ramp: nothing just behind the front, full height one lap on; drawn only in the
# window, where the cutaway shows it
h = lambda t: FILL * (1 - ((t - THETA_D) % TAU) / TAU)          # fill height at theta
for a0, a1 in ((CUT0 + 0.02, THETA_D - 0.04), (THETA_D + 0.04, CUT1 - 0.02)):
    seg = [(a0 + (a1 - a0) * k / 24, Z_TOP - h(a0 + (a1 - a0) * k / 24)) for k in range(25)]
    for r in (R_IN, R_FLOW):
        on_wall(r, seg)
for t in [THETA_D + 0.19 * k for k in range(1, 5)] + [THETA_D - 0.35]:
    tie(t, Z_TOP - h(t))
# the oblique shock, trailing behind the front from its top down to the exit, under the wall's edge
shock = [(THETA_D - (THETA_D - CUT0 - 0.02) * u, Z_TOP - FILL - (Z_TOP - FILL - Z_EXIT) * u) for u in [k / 24 for k in range(25)]]
for r in (R_IN, R_FLOW):
    on_wall(r, shock)
for k in (8, 16):
    tie(*shock[k])
# the detonation front: a sheet across the gap down the fill height, its foot trailing a little
front = [(THETA_D - 0.07 * u, Z_TOP - FILL * u) for u in [k / 8 for k in range(9)]]
for r in (R_IN, R_FLOW):
    for dt in (0.0, 0.012, 0.024):                           # tripled, so it reads first
        on_wall(r, [(t + dt, z) for t, z in front])
for k in (0, 2, 4, 6, 8):
    tie(*front[k])
for k in range(4):                                           # hatched, a dense sheet
    (t0, z0), (t1, z1) = front[2 * k], front[2 * k + 2]
    strokes.append([(R_IN * math.cos(t0), R_IN * math.sin(t0), z0), (R_FLOW * math.cos(t1), R_FLOW * math.sin(t1), z1)])


def densify(s, step=22):
    out = [s[0]]
    for a, b in zip(s, s[1:]):
        n = max(1, math.ceil(math.dist(a, b) / step))
        out += [tuple(a[d] + (b[d] - a[d]) * k / n for d in range(3)) for k in range(1, n + 1)]
    return out


strokes = [densify(s) for s in strokes]

at = lambda r, t, z: [round(r * math.cos(t)), round(r * math.sin(t)), round(z)]
anchors = {
    "diameter": at(R_OUT, A_FUEL, 0),
    "flow": at(R_HEAD + 150, A_OX, (Z_TOP + Z_HEAD) / 2),
    "gap": at(R_MID, A_OX + 0.45, Z_EXIT),
    "injector": at(R_MID, A_OX + 0.9, Z_HEAD),
    "length": at(R_OUT, A_FUEL + 0.3, Z_EXIT + 100),
    "phi": at(R_HEAD + 130, A_FUEL, (Z_TOP + Z_HEAD) / 2),
    "plug": at(R_IN * 0.6, A_OX, (Z_EXIT + Z_TIP) / 2),
}
zs = [p[2] for s in strokes for p in s]
Z_MID = (max(zs) + min(zs)) / 2
strokes = [[(x, y, z - Z_MID) for x, y, z in s] for s in strokes]
anchors = {k: [x, y, round(z - Z_MID)] for k, (x, y, z) in anchors.items()}
occ = {"rOut": R_OUT, "rIn": R_IN, "rHead": R_HEAD, "zHead": round(Z_HEAD - Z_MID), "zTop": round(Z_TOP - Z_MID),
       "zExit": round(Z_EXIT - Z_MID), "zTip": round(Z_TIP - Z_MID), "cut": [round(CUT0 % TAU, 4), round((CUT1 - CUT0), 4)]}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.RDE3D={three:true,late:" + str(late) + ",occ:" + json.dumps(occ, separators=(",", ":")) + ",anchors:"
               + json.dumps(anchors, separators=(",", ":")) + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes ({len(flat) - late} for the flow), {sum(len(s) for s in flat) // 3} points")
