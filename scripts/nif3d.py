"""Write nif3d-data.js: a NIF indirect-drive shot as 3D wireframe strokes.

A gold hohlraum (6.4 mm across, 11.2 mm long, a laser entrance hole at each end)
around the fuel capsule, and NIF's 48 beam quads entering from both ends in four
cones (23.5, 30, 44.5 and 50 degrees from the axis). Each quad is one line from
the target chamber wall, through its entrance hole, to where it lands on the
hohlraum wall. Units match trace-loop.js (1 mm = 90): z is the hohlraum axis.
Each stroke is a flat list of x, y, z; anchors place the callouts.

    python3 scripts/nif3d.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "nif3d-data.js"

MM = 90
R_HOHL, Z_HOHL = 3.2 * MM, 5.62 * MM      # radius, half length
R_LEH = 1.82 * MM                          # laser entrance hole radius
R_CAP = 1.05 * MM                          # capsule radius
R_CHAMBER = 1150                           # where the beams start: the target chamber, not to scale
CONES = [(23.5, 4, 22.5), (30.0, 4, 67.5), (44.5, 8, 0.0), (50.0, 8, 22.5)]   # angle from axis, quads, first azimuth

strokes = []


def ring(z, r, n=48, cx=0.0, cy=0.0):
    strokes.append([(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n), z) for k in range(n + 1)])


# ---- hohlraum: the wall, and an end cap with its entrance hole at each end ----
for z in (-Z_HOHL, -Z_HOHL / 2, 0, Z_HOHL / 2, Z_HOHL):
    ring(z, R_HOHL)
for k in range(16):
    a = 2 * math.pi * k / 16
    strokes.append([(R_HOHL * math.cos(a), R_HOHL * math.sin(a), -Z_HOHL), (R_HOHL * math.cos(a), R_HOHL * math.sin(a), Z_HOHL)])
for z in (-Z_HOHL, Z_HOHL):
    ring(z, R_LEH, n=40)
    for k in range(8):
        a = 2 * math.pi * k / 8
        strokes.append([(R_LEH * math.cos(a), R_LEH * math.sin(a), z), (R_HOHL * math.cos(a), R_HOHL * math.sin(a), z)])

# ---- capsule, and the fill tube that reaches it through the wall ----
for j in range(1, 6):
    phi = math.pi * j / 6
    ring(R_CAP * math.cos(phi), R_CAP * math.sin(phi), n=32)
for k in range(8):
    a = math.pi * k / 8
    strokes.append([(R_CAP * math.sin(t) * math.cos(a), R_CAP * math.sin(t) * math.sin(a), R_CAP * math.cos(t)) for t in [2 * math.pi * j / 32 for j in range(33)]])
strokes.append([(R_CAP * math.cos(0.3), 0, R_CAP * math.sin(0.3)), (R_HOHL, 0, 0.55 * MM)])

# ---- beams: from the chamber wall, in through the entrance hole, to the hohlraum wall ----
beam_ends = {}
for side in (1, -1):
    for theta, n, az0 in CONES:
        th = math.radians(theta)
        for k in range(n):
            ph = math.radians(az0 + 360 * k / n)
            u = (math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), side * math.cos(th))   # outward from the hole
            leh = (0, 0, side * Z_HOHL)
            # out to the chamber sphere: |leh + t u| = R
            b = side * Z_HOHL * u[2]
            t_out = -b + math.sqrt(b * b - Z_HOHL ** 2 + R_CHAMBER ** 2)
            start = [leh[i] + t_out * u[i] for i in range(3)]
            # in through the hole until it meets the wall on the far side
            t_in = R_HOHL / math.sin(th)
            end = [leh[i] - t_in * u[i] for i in range(3)]
            strokes.append([start, end])
            beam_ends.setdefault((side, theta), []).append((start, end))

lerp = lambda a, b, u: [round(x + (y - x) * u) for x, y in zip(a, b)]
outer, inner = beam_ends[(1, 50.0)][1], beam_ends[(1, 23.5)][2]
anchors = {
    "pulse": lerp(*beam_ends[(-1, 44.5)][4], 0.25),
    "cone": lerp(*inner, 0.3),
    "pointing": [round(c) for c in outer[1]],
    "leh": [round(R_LEH), 0, round(Z_HOHL)],
    "length": [round(R_HOHL * math.cos(2.4)), round(R_HOHL * math.sin(2.4)), round(-Z_HOHL / 2)],
    "ablator": [0, round(R_CAP), 0],
    "fill": [round(-R_HOHL * 0.7), 0, round(-Z_HOHL * 0.75)],
}
flat = [[round(c) for p in s for c in p] for s in strokes]
OUT.write_text("window.NIF3D={three:true,anchors:" + json.dumps(anchors, separators=(",", ":")) + ",p:" + json.dumps(flat, separators=(",", ":")) + "};\n")
print(f"wrote {OUT.name}: {len(flat)} strokes, {sum(len(s) for s in flat) // 3} points")
