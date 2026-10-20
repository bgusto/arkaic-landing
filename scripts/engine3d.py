"""Write engine3d-data.js: a gas-generator liquid rocket engine as 3D wireframe strokes.

A regeneratively cooled thrust chamber: a Rao bell nozzle with a coolant inlet
manifold at the lip and a turbine exhaust manifold where the nozzle extension
joins, a cylindrical chamber under an oxidizer dome, a gimbal bearing on top.
One vertical turbopump beside the chamber with its two volutes, a turbine below
it with a gas generator. Every duct goes somewhere: oxidizer from the pump into
the dome, fuel from the pump down to the lip manifold, turbine exhaust down into
the nozzle manifold.
trace-loop.js hides the lines behind the engine's solids: `occ` gives it the
thrust chamber as a profile table and the round parts as cylinders. Strokes are
densified so a hidden part drops out cleanly.
Units match trace-loop.js: z is up; the throat is at z = 0 before the drawing is
centred. Each stroke is a flat list of x, y, z; anchors place the callouts.

    python3 scripts/engine3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "engine3d-data.js"
TAU = 2 * math.pi

R_THROAT = 100
R_CHAMBER, Z_CHAMBER = 190, 400          # chamber radius, top of the cylinder
Z_DOME = 560                             # top of the oxidizer dome
R_EXIT = 520
EPS = (R_EXIT / R_THROAT) ** 2           # expansion ratio, 27
Z_EXIT = -0.8 * (math.sqrt(EPS) - 1) * R_THROAT / math.tan(math.radians(15))   # an 80% bell
Z_JOINT = -560                           # where the nozzle extension joins, under the exhaust manifold
PX = -445                                # the turbopump's axis

strokes = []


def bezier(p0, p1, p2, u):
    return [(1 - u) ** 2 * a + 2 * (1 - u) * u * b + u * u * c for a, b, c in zip(p0, p1, p2)]


def ring(cx, cy, z, r, n=48, a0=0.0, a1=TAU):
    strokes.append([(cx + r * math.cos(a0 + (a1 - a0) * k / n), cy + r * math.sin(a0 + (a1 - a0) * k / n), z) for k in range(n + 1)])


def cylinder(cx, cy, z0, z1, r, lines=12, rings=()):
    for z in (z0, z1, *rings):
        ring(cx, cy, z, r)
    for k in range(lines):
        a = TAU * k / lines
        strokes.append([(cx + r * math.cos(a), cy + r * math.sin(a), z0), (cx + r * math.cos(a), cy + r * math.sin(a), z1)])


def torus(z, R, r, n=64, sections=8, inner=True):
    """A ring of tube radius r around the z axis, as four rings and a few cross sections.
    A manifold that hugs a wall has no inner ring to draw."""
    for dz, dr in ((0, r), (0, -r), (r, 0), (-r, 0)):
        if dr < 0 and not inner:
            continue
        ring(0, 0, z + dz, R + dr, n=n)
    for k in range(sections):
        a = TAU * (k + 0.5) / sections
        strokes.append([((R + r * math.cos(t)) * math.cos(a), (R + r * math.cos(t)) * math.sin(a), z + r * math.sin(t)) for t in [TAU * j / 16 for j in range(17)]])


def tube(path, r, step=70, sides=4, end_rings=True):
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
        strokes.append([at(f, TAU * k / sides + math.pi / 4) for f in frames])
    next_ring = 0.0 if end_rings else step
    for f, s in zip(frames, length):
        if s >= next_ring or (end_rings and s == length[-1]):
            strokes.append([at(f, TAU * k / 12) for k in range(13)])
            next_ring = s + step


# ---- the thrust chamber profile: exit lip up to the chamber top, as (z, r) ----
theta_n, theta_e = math.radians(36), math.radians(9)
arc = [(-0.382 * R_THROAT * math.sin(th), R_THROAT + 0.382 * R_THROAT * (1 - math.cos(th))) for th in [theta_n * k / 6 for k in range(7)]]
zn, rn = arc[-1]
tn, te = math.tan(theta_n), math.tan(theta_e)
zq = ((rn - R_EXIT) + tn * zn - te * Z_EXIT) / (tn - te)     # where the two tangents meet: the parabola's control point
rq = rn + tn * (zn - zq)
bell = [bezier((zn, rn), (zq, rq), (Z_EXIT, R_EXIT), k / 48) for k in range(1, 49)]
theta_c = math.radians(35)                                   # the converging cone
up = [(1.5 * R_THROAT * math.sin(th), R_THROAT + 1.5 * R_THROAT * (1 - math.cos(th))) for th in [theta_c * k / 5 for k in range(1, 6)]]
zc, rc = up[-1]
z_wall = zc + (R_CHAMBER - 30 - rc) / math.tan(theta_c)
up.append((z_wall, R_CHAMBER - 30))
z_corner = z_wall + 30 / math.tan(theta_c)
up += [bezier((z_wall, R_CHAMBER - 30), (z_corner, R_CHAMBER), (z_corner + 40, R_CHAMBER), k / 6) for k in range(1, 7)]
up.append((Z_CHAMBER, R_CHAMBER))
profile = list(reversed(bell)) + list(reversed(arc)) + up


def r_at(z):
    """The chamber's radius at z, interpolated along the profile (exit lip first, z rising)."""
    for (z0, r0), (z1, r1) in zip(profile, profile[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return min(profile, key=lambda p: abs(p[0] - z))[1]



bell_part = [p for p in profile if p[0] <= Z_JOINT] + [(Z_JOINT, r_at(Z_JOINT))]
jacket_part = [(Z_JOINT, r_at(Z_JOINT))] + [p for p in profile if p[0] > Z_JOINT]
for k in range(32):                                          # the tube-wall nozzle extension, a tube per meridian
    a = TAU * k / 32
    strokes.append([(r * math.cos(a), r * math.sin(a), z) for z, r in bell_part])
for k in range(16):                                          # the chamber and upper nozzle: every other tube carries on
    a = TAU * k / 16
    strokes.append([(r * math.cos(a), r * math.sin(a), z) for z, r in jacket_part])
for z in (-1120, -930, -740, -400, -260, 0, 95, z_corner + 60):   # hoops
    ring(0, 0, z, r_at(z), n=64 if z < Z_JOINT else 48)

# ---- the manifolds: coolant inlet at the lip, turbine exhaust at the joint, fuel at the chamber top ----
Z_MAN, R_MAN, RT_MAN = Z_EXIT + 14, R_EXIT + 12, 24
torus(Z_MAN, R_MAN, RT_MAN, n=72, sections=10, inner=False)
R_EXH, RT_EXH = r_at(Z_JOINT) + 26, 30
torus(Z_JOINT, R_EXH, RT_EXH, n=64, sections=8, inner=False)
torus(Z_CHAMBER - 45, R_CHAMBER + 22, 16, n=48, sections=4)

# ---- the oxidizer dome and the gimbal bearing ----
H_DOME = Z_DOME - Z_CHAMBER
dome = lambda t: (R_CHAMBER * math.sin(t), Z_CHAMBER + H_DOME * math.cos(t))
for k in range(16):                                          # the dome's meridians carry on from the chamber's
    a = TAU * k / 16
    strokes.append([(r * math.cos(a), r * math.sin(a), z) for r, z in [dome(math.pi / 2 * (1 - j / 10)) for j in range(11)]])
for t in (math.radians(62), math.radians(38)):
    r, z = dome(t)
    ring(0, 0, z, r, n=36)
cylinder(0, 0, Z_DOME - 8, Z_DOME + 42, 40, lines=8)
cylinder(0, 0, Z_DOME + 42, Z_DOME + 54, 58, lines=10)

# ---- the turbopump: pump body, two volutes, inlets, the turbine and gas generator ----
Z_PUMP0, Z_PUMP1, R_PUMP = 300, 520, 85
cylinder(PX, 0, Z_PUMP0, Z_PUMP1, R_PUMP, lines=12, rings=(410,))
cylinder(PX, 0, 215, Z_PUMP0, 108, lines=12, rings=(255,))                        # the turbine housing
cylinder(PX + 40, 165, 230, 340, 34, lines=8)                                      # the gas generator
strokes.append([(PX + 40, 131, 285), (PX + 40, 108, 285)])


def volute(z, phi_end, r_tube):
    """A scroll around the pump that grows to a tangential discharge at phi_end (counterclockwise)."""
    return [(PX + (R_PUMP + 2 + 44 * u) * math.cos(phi_end - 1.5 * math.pi * (1 - u)),
             (R_PUMP + 2 + 44 * u) * math.sin(phi_end - 1.5 * math.pi * (1 - u)), z) for u in [k / 30 for k in range(31)]]


# oxidizer: top volute, out toward the chamber and into the side of the dome
R_V = R_PUMP + 2 + 44
ox = volute(470, -math.pi / 2, 28)
entry_t = math.radians(52)
er, ez = dome(entry_t)
entry = (-er * math.cos(0.42), -er * math.sin(0.42), ez)
ox += [bezier((PX + 40, -R_V, 470), (-200, -R_V, 495), entry, k / 18) for k in range(1, 19)]
tube(ox, 28, step=150)
# fuel: lower volute, out the far side and down beside the bell to the lip manifold
fu = volute(345, math.pi / 2, 26)
X_F = -560
fu += [bezier((PX - 40, R_V, 345), (X_F, R_V, 345), (X_F, R_V, 230), k / 10) for k in range(1, 11)]
fu += [(X_F, R_V, z) for z in range(130, int(Z_MAN + 120), -110)]
fu += [bezier((X_F, R_V, Z_MAN + 120), (X_F, R_V, Z_MAN + 40), (-R_MAN * math.cos(0.22), R_MAN * math.sin(0.22), Z_MAN + RT_MAN), k / 8) for k in range(1, 9)]
tube(fu, 26, step=150)
# turbine exhaust: out of the bottom of the turbine, straight down, then in to the manifold on the nozzle
EX, EY = PX, -70
phi_x = math.atan2(EY, EX)
ex = [(EX, EY, z) for z in range(215, -400, -100)]
ex += [bezier((EX, EY, -400), (EX, EY, Z_JOINT + RT_EXH + 60), (R_EXH * math.cos(phi_x), R_EXH * math.sin(phi_x), Z_JOINT + RT_EXH), k / 10) for k in range(1, 11)]
tube(ex, 40, step=160, end_rings=False)

anchors = {
    "mix": [150, 0, 470],
    "pump": [PX - R_PUMP, 0, 440],
    "chamber": [R_CHAMBER, 0, 240],
    "throat": [R_THROAT, 0, 0],
    "contour": [round(r_at(-560)), 0, -560],
    "cool": [-round(r_at(-900)), 0, -900],
    "exp": [R_EXIT, 0, round(Z_EXIT)],
}


def densify(s, step=22):
    out = [s[0]]
    for a, b in zip(s, s[1:]):
        n = max(1, math.ceil(math.dist(a, b) / step))
        out += [tuple(a[d] + (b[d] - a[d]) * k / n for d in range(3)) for k in range(1, n + 1)]
    return out


strokes = [densify(s) for s in strokes]

# centre the drawing on its vertical midpoint, as the canvas centres on the origin
zs = [p[2] for s in strokes for p in s]
Z_MID = (max(zs) + min(zs)) / 2
strokes = [[(x, y, z - Z_MID) for x, y, z in s] for s in strokes]
anchors = {k: [x, y, z - Z_MID] for k, (x, y, z) in anchors.items()}

# the solids: the thrust chamber and dome as r(z) every 10 units, the round parts as cylinders
DZ = 10
z_lo, z_hi = int(Z_EXIT), int(Z_DOME)
table = []
for z in range(z_lo, z_hi + 1, DZ):
    if z <= Z_CHAMBER:
        table.append(round(r_at(z)))
    else:
        table.append(round(R_CHAMBER * math.sqrt(max(0.0, 1 - ((z - Z_CHAMBER) / H_DOME) ** 2))))
occ = {"z0": round(z_lo - Z_MID), "dz": DZ, "r": table,
       "cyls": [[round(cx), round(cy), r, round(z0 - Z_MID), round(z1 - Z_MID)] for cx, cy, r, z0, z1 in
                ((PX, 0, R_PUMP, Z_PUMP0, Z_PUMP1), (PX, 0, 108, 215, Z_PUMP0), (PX + 40, 165, 34, 230, 340),
                 (0, 0, 40, Z_DOME - 8, Z_DOME + 42), (0, 0, 58, Z_DOME + 42, Z_DOME + 54))]}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.ENGINE3D={three:true,occ:" + json.dumps(occ, separators=(",", ":")) + ",anchors:" + json.dumps(anchors, separators=(",", ":"))
               + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes, {sum(len(s) for s in flat) // 3} points, z from {min(zs) - Z_MID:.0f} to {max(zs) - Z_MID:.0f}")
