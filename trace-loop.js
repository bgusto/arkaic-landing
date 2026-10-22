// Section 01's drawings, on rotation in one canvas: a rocket engine, a transport wing, a ship
// propeller, a NIF fusion shot, then an FPV quadcopter (3D wireframes that turn in space; the
// rocket engine, the shot and the quadcopter are built by scripts/engine3d.py, nif3d.py and
// drone3d.py, ic3d.py). Each is a set of vector strokes drawn on live like a plotter, held, then faded before
// the next, with callouts naming what you would optimize over. The engine, the quadcopter and the
// chip are drawn with the lines behind their solids hidden.
// Line colour follows the section: Graphite on Paper, Paper on Graphite.
// Honors prefers-reduced-motion (the engine, finished, as one still) and pauses off screen.
(() => {
  const canvas = document.querySelector(".trace-canvas");
  const ENGINE = window.ENGINE3D, WING = window.WING_TRACE, PROP = window.PROP_TRACE, NIF = window.NIF3D, DRONE = window.DRONE3D, IC = window.IC3D;
  if (!canvas || !canvas.getContext || !ENGINE || !WING || !PROP || !NIF || !DRONE || !IC) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const TAU = Math.PI * 2;
  const FADE_OUT = 1.0;
  const SPEED = 2;         // how much faster than the base timings below the drawings are drawn
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const lerp = (a, b, u) => a + (b - a) * u;
  const ink = canvas.closest(".paper") ? "30, 29, 26" : "245, 240, 232";
  const col = (a) => `rgba(${ink}, ${a})`;
  const bg = canvas.closest(".paper") ? "245, 240, 232" : "30, 29, 26";   // knocks lines out behind a name

  // Hidden lines. A scene's `hide(x, y, z, v)` says whether the ray from a point toward the viewer
  // (v, unit, in the scene's coordinates) passes through one of its solids. A point on a solid's
  // own surface is hidden only when the ray goes on into it, so the far side of a ring drops out.
  const EPS = 3;
  const rayCyl = (p, v, cx, cy, R) => {   // where the ray crosses the cylinder r = R about (cx, cy)
    const px = p[0] - cx, py = p[1] - cy;
    const a = v[0] * v[0] + v[1] * v[1], b = 2 * (px * v[0] + py * v[1]), c = px * px + py * py - R * R, D = b * b - 4 * a * c;
    if (D <= 0) return null;
    const s = Math.sqrt(D);
    return [(-b - s) / (2 * a), (-b + s) / (2 * a)];
  };
  const inside = (ti, p, v, z0, z1) =>   // the ray runs inside a solid for a while past the point
    !!ti && Math.min(ti[1], (z1 - p[2]) / v[2]) - Math.max(ti[0], (z0 - p[2]) / v[2], EPS) > EPS;
  const inCyls = (p, v, cyls) => cyls.some(([cx, cy, R, z0, z1]) => inside(rayCyl(p, v, cx, cy, R), p, v, z0, z1));

  // a scene of parts: boxes (centre, half sizes, turn about z), cylinders, and for the quadcopter
  // its payload, a solid of revolution along x given as r every dx
  function solidsOfParts(o) {
    const xr = o.xrev, n = xr ? xr.r.length : 0, x1 = xr ? xr.x0 + (n - 1) * xr.dx : 0, rMax = xr ? Math.max(...xr.r) : 0, STEP = 16;
    const rAt = (x) => {
      const u = (x - xr.x0) / xr.dx, i = Math.floor(u);
      return i < 0 || i >= n - 1 ? 0 : lerp(xr.r[i], xr.r[i + 1], u - i);
    };
    return (x, y, z, v) => {
      const p = [x, y, z];
      if (inCyls(p, v, o.cyls)) return true;
      for (const [cx, cy, cz, hx, hy, hz, ang] of o.boxes) {   // a slab test in the box's own frame
        const c = Math.cos(ang), s = Math.sin(ang);
        const q = [(x - cx) * c + (y - cy) * s, -(x - cx) * s + (y - cy) * c, z - cz], w = [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]], h = [hx, hy, hz];
        let ta = EPS, tb = Infinity;
        for (let d = 0; d < 3 && tb > ta; d++) {
          if (Math.abs(w[d]) < 1e-9) { if (Math.abs(q[d]) > h[d]) tb = -Infinity; continue; }
          const t1 = (-h[d] - q[d]) / w[d], t2 = (h[d] - q[d]) / w[d];
          ta = Math.max(ta, Math.min(t1, t2)); tb = Math.min(tb, Math.max(t1, t2));
        }
        if (tb - ta > EPS) return true;
      }
      if (!xr) return false;
      // the payload: walk the ray through the x range where it is within rMax of the axis
      const py = y - xr.cy, pz = z - xr.cz, a = v[1] * v[1] + v[2] * v[2], b = 2 * (py * v[1] + pz * v[2]), c = py * py + pz * pz - rMax * rMax, D = b * b - 4 * a * c;
      if (D <= 0) return false;
      const sq = Math.sqrt(D), xa = (xr.x0 - x) / v[0], xb = (x1 - x) / v[0];
      const ta = Math.max(EPS, (-b - sq) / (2 * a), Math.min(xa, xb)), tb = Math.min((-b + sq) / (2 * a), Math.max(xa, xb));
      for (let t = ta + STEP / 2; t < tb; t += STEP) {
        if (Math.hypot(py + t * v[1], pz + t * v[2]) < rAt(x + t * v[0]) - 2) return true;
      }
      return false;
    };
  }
  // the rocket engine: the thrust chamber and dome, a solid of revolution given as r every dz in z
  // (the ray is walked through it), and the pump, turbine, gas generator and gimbal as cylinders
  function solidsOfEngine(o) {
    const n = o.r.length, z1 = o.z0 + (n - 1) * o.dz, rMax = Math.max(...o.r), STEP = 16;
    const rAt = (z) => {
      const u = (z - o.z0) / o.dz, i = Math.floor(u);
      return i < 0 || i >= n - 1 ? 0 : lerp(o.r[i], o.r[i + 1], u - i);
    };
    return (x, y, z, v) => {
      const p = [x, y, z];
      if (inCyls(p, v, o.cyls)) return true;
      const ci = rayCyl(p, v, 0, 0, rMax);
      if (!ci) return false;
      const ta = Math.max(EPS, (o.z0 - z) / v[2], ci[0]), tb = Math.min((z1 - z) / v[2], ci[1]);
      for (let t = ta + STEP / 2; t < tb; t += STEP) {
        if (Math.hypot(x + t * v[0], y + t * v[1]) < rAt(z + t * v[2]) - 2) return true;
      }
      return false;
    };
  }

  // ---- the scenes ----
  // rot: turn (radians, clockwise); squash: foreshortens y after the turn and spin (a tilted view);
  // spin: radians per second about the vertical axis (three) ; three: strokes are x, y, z triples seen from
  // elev radians above the horizon; order: 0 to 1, when a stroke is drawn within the build;
  // speed: stroke units per second the pen moves; tip: shortest stroke that gets a pen dot.
  const scenes = [
    {
      p: ENGINE.p, three: true, elev: 0.5, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: -0.935, hide: solidsOfEngine(ENGINE.occ),    // ends with the turbopump at the left, a little in front
      corners: null, bound: [700, 1130],
      order: (mx, my, mz) => clamp((mz + 1000) / 2000),             // from the exit lip up to the powerhead
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Mixture ratio", a3: ENGINE.anchors.mix },
        { text: "Pump speed", a3: ENGINE.anchors.pump },
        { text: "Chamber pressure", a3: ENGINE.anchors.chamber },
        { text: "Throat area", a3: ENGINE.anchors.throat },
        { text: "Nozzle contour", a3: ENGINE.anchors.contour },
        { text: "Coolant channel depth", a3: ENGINE.anchors.cool },
        { text: "Expansion ratio", a3: ENGINE.anchors.exp },
      ],
    },
    {
      p: IC.p, three: true, elev: 0.5, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 1.65, hide: solidsOfParts(IC.occ),             // ends with the cut-away corner toward the viewer
      corners: null, bound: [900, 520],
      order: (mx, my, mz) => clamp((mz + 420) / 840),               // the substrate first, up through the stack to the fins
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Power map", a3: IC.anchors.power },
        { text: "Die stack order", a3: IC.anchors.stack },
        { text: "TSV density", a3: IC.anchors.tsv },
        { text: "Interlayer thickness", a3: IC.anchors.interlayer },
        { text: "Interposer thickness", a3: IC.anchors.interposer },
        { text: "Spreader thickness", a3: IC.anchors.spreader },
        { text: "Fin pitch", a3: IC.anchors.fins },
      ],
    },
    {
      p: WING.p, three: true, elev: 0.95, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.12, yaw0: -0.48, late: WING.late,
      corners: null, bound: [1150, 900],
      order: (mx, my) => Math.min(1, Math.abs(mx) / 950),          // fuselage first, then out to the tips
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Sweep", a3: WING.anchors.sweep },
        { text: "Taper ratio", a3: WING.anchors.taper },
        { text: "Twist distribution", a3: WING.anchors.twist },
        { text: "Span", a3: WING.anchors.span },
        { text: "Thickness-to-chord", a3: WING.anchors.thick },
        { text: "Camber", a3: WING.anchors.camber },
        { text: "FFD control points", a3: WING.anchors.ffd },
      ],
    },
    {
      p: NIF.p, three: true, elev: 0.32, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.3,
      corners: null, bound: [820, 1180],
      order: (mx, my, mz) => Math.min(1, Math.hypot(mx, my, mz) / 900),   // capsule, then the hohlraum, then the beams
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Laser pulse shape", a3: NIF.anchors.pulse },
        { text: "Cone fraction", a3: NIF.anchors.cone },
        { text: "Beam pointing", a3: NIF.anchors.pointing },
        { text: "LEH diameter", a3: NIF.anchors.leh },
        { text: "Hohlraum length", a3: NIF.anchors.length },
        { text: "Ablator thickness", a3: NIF.anchors.ablator },
        { text: "Gas fill density", a3: NIF.anchors.fill },
      ],
    },
    {
      p: PROP.p, three: true, elev: 0.62, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.365,
      corners: null, bound: [1000, 930],
      order: (mx, my) => Math.min(1, Math.hypot(mx, my) / 800),    // hub first, then out along the blades
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Blade count", a3: PROP.anchors.blades },
        { text: "Pitch distribution", a3: PROP.anchors.pitch },
        { text: "Chord distribution", a3: PROP.anchors.chord },
        { text: "Skew", a3: PROP.anchors.skew },
        { text: "Rake", a3: PROP.anchors.rake },
        { text: "Section camber", a3: PROP.anchors.camber },
        { text: "Hub diameter", a3: PROP.anchors.hub },
      ],
    },
    {
      p: DRONE.p, three: true, elev: 0.55, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.24, hide: solidsOfParts(DRONE.occ),          // ends nose-on from the front left, a little above
      corners: null, bound: [880, 520],
      order: (mx, my) => Math.min(1, Math.hypot(mx, my) / 800),    // frame first, then out to the props
      build: 9, dur: 10, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Propeller diameter", a3: DRONE.anchors.prop },
        { text: "Blade pitch", a3: DRONE.anchors.pitch },
        { text: "Motor KV", a3: DRONE.anchors.motor },
        { text: "Arm length", a3: DRONE.anchors.arm },
        { text: "Battery capacity", a3: DRONE.anchors.battery },
        { text: "Payload mass", a3: DRONE.anchors.payload },
      ],
    },
  ];
  for (const sc of scenes) {
    const st = sc.three ? 3 : 2;
    sc.strokes = sc.p.map((f, k) => {
      const n = f.length / st, cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(...Array.from({ length: st }, (_, d) => f[st * i + d] - f[st * i - st + d])));
      let mx = 0, my = 0, mz = 0;
      for (let i = 0; i < n; i++) { mx += f[st * i] / n; my += f[st * i + 1] / n; if (st === 3) mz += f[3 * i + 2] / n; }
      const len = cum[n - 1], jitter = ((k * 2654435761) % 1000) / 1000;
      return { f, n, cum, len, t0: (0.2 + (sc.late && k >= sc.late ? 1 : sc.order(mx, my, mz)) * sc.build * 0.92 + jitter * 0.5) / SPEED, dur: clamp(len / sc.speed, 0.2, sc.maxDur) / SPEED };
    });
    sc.callouts.forEach((c, i) => (c.t0 = (sc.build + 1.5 + i * 0.45) / SPEED));
    if (sc.corners) {   // half extents of the content once turned
      const rc = Math.cos(sc.rot), rs = Math.sin(sc.rot);
      sc.bound = [0, 0];
      for (const [x, y] of sc.corners) {
        sc.bound[0] = Math.max(sc.bound[0], Math.abs((x - sc.cx) * rc - (y - sc.cy) * rs));
        sc.bound[1] = Math.max(sc.bound[1], Math.abs((x - sc.cx) * rs + (y - sc.cy) * rc));
      }
    } else sc.bound = [sc.bound[0], sc.bound[1] * sc.squash];
  }

  let W = 0, H = 0, dpr = 1, S = 1;

  // maps a scene's coordinates to canvas pixels (centre origin) at time t
  function mapper(sc, t, spin = true) {
    const a = sc.rot + (spin ? sc.spin * Math.max(0, t - 2) : 0), c = Math.cos(a), s = Math.sin(a);
    return (x, y) => {
      const dx = x - sc.cx, dy = y - sc.cy;
      return [(dx * c - dy * s) * S, sc.squash * (dx * s + dy * c) * S];
    };
  }

  function drawStrokes(sc, P, t) {
    ctx.beginPath();
    const tips = [];
    for (const s of sc.strokes) {
      const u = clamp((t - s.t0) / s.dur);
      if (u <= 0) continue;
      const lim = u * s.len, f = s.f;
      ctx.moveTo(...P(f[0], f[1]));
      let i = 1;
      while (i < s.n && s.cum[i] <= lim) { ctx.lineTo(...P(f[2 * i], f[2 * i + 1])); i++; }
      if (i < s.n) {
        const r = (lim - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1]);
        const q = P(lerp(f[2 * i - 2], f[2 * i], r), lerp(f[2 * i - 1], f[2 * i + 1], r));
        ctx.lineTo(q[0], q[1]);
        if (s.len > sc.tip) tips.push(q);
      }
    }
    ctx.strokeStyle = col(0.82);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = col(0.95);
    for (const p of tips) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.8, 0, TAU);
      ctx.fill();
    }
  }

  // the 3D scene: turn about the vertical axis, tip toward the viewer, a little perspective;
  // segments are batched by depth so the near side is stronger
  const yawAt = (sc, t) => (sc.yaw0 ?? 0.6) + sc.spin * Math.min(t, (sc.build + 1.5) / SPEED);   // it turns while drawn, then holds so the names stay put
  function projector(sc, t) {
    const yaw = yawAt(sc, t), cw = Math.cos(yaw), sw = Math.sin(yaw), ce = Math.cos(sc.elev), se = Math.sin(sc.elev);
    const ox = sc.ext ? sc.ext.cx * S : 0, oy = sc.ext ? sc.ext.cy * S : 0;   // the drawing centred on the canvas
    return (x, y, z) => {
      const x1 = x * cw - y * sw, y1 = x * sw + y * cw, d = (y1 * ce + z * se) / 1000, k = 1 / (1 - 0.28 * d);
      return [x1 * k * S - ox, (-z * ce + y1 * se) * k * S - oy, d];
    };
  }
  // the drawing's centre and half extents on screen at unit scale, over the turn it makes while drawn
  function extent(sc) {
    if (sc.ext) return sc.ext;
    const keep = S; S = 1;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const tEnd = (sc.build + 1.5) / SPEED;
    for (let k = 0; k <= 4; k++) {
      const P = projector(sc, (tEnd * k) / 4);
      for (const s of sc.strokes) for (let i = 0; i < s.n; i++) {
        const [x, y] = P(s.f[3 * i], s.f[3 * i + 1], s.f[3 * i + 2]);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    S = keep;
    return (sc.ext = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2 });
  }
  // for a scene with solids, which points can be seen at time t: a flag per point of each stroke,
  // worked out again only when the view has turned a little (null: everything can be seen)
  function visibility(sc, t) {
    if (!sc.hide) return null;
    const yaw = yawAt(sc, t), key = Math.round(yaw / 0.008);
    if (sc.visKey !== key) {
      const ce = Math.cos(sc.elev), v = [Math.sin(yaw) * ce, Math.cos(yaw) * ce, Math.sin(sc.elev)];
      sc.vis = sc.strokes.map((s) => {
        const a = new Uint8Array(s.n);
        for (let i = 0; i < s.n; i++) a[i] = sc.hide(s.f[3 * i], s.f[3 * i + 1], s.f[3 * i + 2], v) ? 0 : 1;
        return a;
      });
      sc.visKey = key;
    }
    return sc.vis;
  }
  function drawStrokes3d(sc, t) {
    const NB = 6, bins = [], tips = [];
    const proj = projector(sc, t), vis = visibility(sc, t);
    const seg = (a, b) => {
      const lv = Math.max(1, Math.round((0.3 + 0.7 * clamp(((a[2] + b[2]) / 2 + 1.1) / 2.2)) * NB));
      const p = bins[lv] || (bins[lv] = new Path2D());
      p.moveTo(a[0], a[1]);
      p.lineTo(b[0], b[1]);
    };
    sc.strokes.forEach((s, k) => {
      const u = clamp((t - s.t0) / s.dur);
      if (u <= 0) return;
      const lim = u * s.len, f = s.f, vs = vis && vis[k];
      let prev = proj(f[0], f[1], f[2]), pv = !vs || vs[0], i = 1;
      while (i < s.n && s.cum[i] <= lim) {
        const cur = proj(f[3 * i], f[3 * i + 1], f[3 * i + 2]), cv = !vs || vs[i];
        if (pv && cv) seg(prev, cur);
        prev = cur; pv = cv; i++;
      }
      if (i < s.n) {
        const r = (lim - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1]);
        const q = proj(lerp(f[3 * i - 3], f[3 * i], r), lerp(f[3 * i - 2], f[3 * i + 1], r), lerp(f[3 * i - 1], f[3 * i + 2], r)), qv = !vs || vs[i];
        if (pv && qv) seg(prev, q);
        if (qv && s.len > sc.tip) tips.push(q);
      }
    });
    ctx.lineWidth = 0.9;
    bins.forEach((p, lv) => {
      ctx.strokeStyle = col(0.9 * lv / NB);
      ctx.stroke(p);
    });
    ctx.fillStyle = col(0.95);
    for (const p of tips) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.8, 0, TAU);
      ctx.fill();
    }
  }

  // where the finished drawing has ink, as a coarse grid, so a name can sit in the nearest clear spot beside its part
  const CELL = 5;
  function occupancy(sc, P, vis) {
    const nx = Math.ceil(W / CELL) + 2, ny = Math.ceil(H / CELL) + 2, a = new Uint8Array(nx * ny);
    const st = sc.three ? 3 : 2, mark = (x, y) => {
      const i = Math.floor((x + W / 2) / CELL) + 1, j = Math.floor((y + H / 2) / CELL) + 1;
      if (i >= 0 && i < nx && j >= 0 && j < ny) a[j * nx + i] = 1;
    };
    sc.strokes.forEach((sk, n) => {
      const vs = vis && vis[n];
      let prev = P(...sk.f.slice(0, st)), pv = !vs || vs[0];
      for (let i = 1; i < sk.n; i++) {
        const cur = P(...sk.f.slice(st * i, st * i + st)), cv = !vs || vs[i], k = Math.max(1, Math.ceil(Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) / CELL));
        if (pv && cv) for (let m = 0; m <= k; m++) mark(lerp(prev[0], cur[0], m / k), lerp(prev[1], cur[1], m / k));
        prev = cur; pv = cv;
      }
    });
    return { a, nx, ny };
  }
  function clearBox(g, x1, x2, y1, y2) {
    const i1 = Math.floor((x1 + W / 2) / CELL), i2 = Math.floor((x2 + W / 2) / CELL) + 2;
    const j1 = Math.floor((y1 + H / 2) / CELL), j2 = Math.floor((y2 + H / 2) / CELL) + 2;
    for (let j = Math.max(0, j1); j <= Math.min(g.ny - 1, j2); j++)
      for (let i = Math.max(0, i1); i <= Math.min(g.nx - 1, i2); i++) if (g.a[j * g.nx + i]) return false;
    return true;
  }

  // a name, no marker: beside the part it names, moved outward along its row until it clears the drawing
  const PAD = 16, LINE = 1.3;   // clearance around a name; line height in ems
  const namePx = () => Math.max(9, Math.min(11, W * 0.0135));
  function setFont(px) { ctx.font = `500 ${px}px "Space Grotesk", sans-serif`; ctx.letterSpacing = "0.1em"; }
  const measure = (lines) => Math.max(...lines.map((l) => ctx.measureText(l).width)) + 2;
  // where a box w wide and h tall beside ax (going dir) first clears the drawing, or null if nowhere on this row
  function findSpot(g, ax, dir, w, h, ay) {
    for (let x = ax + dir * 12; Math.abs(x) < W / 2 - w; x += dir * CELL) {
      const e = x + dir * w;
      if (clearBox(g, Math.min(x, e) - PAD, Math.max(x, e) + PAD, ay - h / 2, ay + h / 2)) return x;
    }
    return null;
  }
  // two lines, broken at the space nearest the middle
  function splitName(label) {
    let best = -1;
    for (let i = label.indexOf(" "); i >= 0; i = label.indexOf(" ", i + 1)) if (best < 0 || Math.abs(i - label.length / 2) < Math.abs(best - label.length / 2)) best = i;
    return best < 0 ? [label] : [label.slice(0, best), label.slice(best + 1)];
  }
  // how a name is set: one line where it fits beside its part, else two (so it need not sit over the drawing)
  function layoutName(c, g, px) {
    const label = c.text.toUpperCase();
    c.lines = [label]; c.w = measure(c.lines); c.h = px * LINE;
    if (findSpot(g, c.sx, c.dir, c.w, c.h, c.sy) === null && label.includes(" ")) {
      const two = splitName(label), w2 = measure(two);
      if (findSpot(g, c.sx, c.dir, w2, 2 * px * LINE, c.sy) !== null || w2 < c.w * 0.7) { c.lines = two; c.w = w2; c.h = 2 * px * LINE; }
    }
  }
  function drawCallout(c, t, g, ay, px) {
    const u = ease(clamp((t - c.t0) / (1.0 / SPEED)));
    if (u <= 0) return;
    const dir = c.dir, w = c.w, h = c.h;
    setFont(px);
    ctx.textAlign = dir > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    let x = findSpot(g, c.sx, dir, w, h, ay);
    if (x === null) x = dir * (W / 2);   // nowhere clear: against the edge, over the drawing
    x = clamp(x + dir * PAD * 0.5, -W / 2 + (dir < 0 ? w : 0) + 2, W / 2 - (dir > 0 ? w : 0) - 2);
    ctx.fillStyle = `rgba(${bg}, ${0.85 * u})`;   // knock the lines out behind the name where it has to sit over the drawing
    ctx.fillRect(dir > 0 ? x - 4 : x - w - 2, ay - h / 2 - 1, w + 6, h + 2);
    ctx.fillStyle = col(0.92 * u);
    c.lines.forEach((l, i) => ctx.fillText(l, x, ay + (i - (c.lines.length - 1) / 2) * px * LINE));
    ctx.letterSpacing = "0px";
    ctx.textBaseline = "alphabetic";
  }

  function render(sc, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, (W * dpr) / 2, (H * dpr) / 2);
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.globalAlpha = reduce.matches ? 1 : 1 - ease(clamp((t - (sc.dur - FADE_OUT)) / FADE_OUT));
    const narrow = W < 520;   // phones: the names sit over the edges of the drawing, knocked out
    const f = !sc.callouts.length ? 0.92 : narrow ? 0.68 : 0.62;   // leave room at the sides for the names
    const e = sc.three ? extent(sc) : { hx: sc.bound[0], hy: sc.bound[1] };
    S = Math.min((W * 0.5 * f) / e.hx, (H * 0.5 * 0.94) / e.hy);
    if (sc.three) drawStrokes3d(sc, t);
    else drawStrokes(sc, mapper(sc, t), t);
    const P = sc.three ? projector(sc, t) : mapper(sc, t, false);
    if (sc.callouts.length && t >= sc.callouts[0].t0) {
      const key = `${W},${H},${S}`;
      if (sc.gkey !== key) { sc.grid = occupancy(sc, P, visibility(sc, t)); sc.gkey = key; }
      // anchors on screen; names on one side are pushed apart so they never touch
      const px = namePx();
      setFont(px);
      for (const c of sc.callouts) {
        const [x, y] = c.a3 ? P(...c.a3) : P(c.ax, c.ay);
        c.sx = x; c.sy = y;
        if (c.dir === undefined) { c.dir = (c.a3 ? x >= 0 : c.side === "r") ? 1 : -1; c.lines = null; }   // fixed once placed, so a name never jumps sides
        if (!c.lines || c.lkey !== sc.gkey) { layoutName(c, sc.grid, px); c.lkey = sc.gkey; }
      }
      const GAP = narrow ? 7 : 8, lanes = [1, -1].map((d) => sc.callouts.filter((c) => c.dir === d).sort((a, b) => a.sy - b.sy));
      for (const lane of lanes) {
        lane.forEach((c) => (c.y = c.sy));
        for (let k = 1; k < lane.length; k++) lane[k].y = Math.max(lane[k].y, lane[k - 1].y + (lane[k - 1].h + lane[k].h) / 2 + GAP);
        if (lane.length) {   // a stack pushed past the bottom edge moves up as one
          const over = lane[lane.length - 1].y + lane[lane.length - 1].h / 2 - (H / 2 - 2);
          if (over > 0) lane.forEach((c) => (c.y -= over));
        }
      }
      for (const c of sc.callouts) drawCallout(c, t, sc.grid, c.y, px);
    }
  }

  let idx = 0, elapsed = 0;
  function fit() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    render(scenes[idx], reduce.matches ? scenes[0].dur - FADE_OUT - 0.5 : elapsed);
  }

  if (reduce.matches) {
    fit();
    new ResizeObserver(fit).observe(canvas);
    return;
  }

  let raf = 0, last = 0, onScreen = false;
  function frame(now) {
    elapsed += Math.min(0.1, (now - last) / 1000);   // a long gap (tab switch) must not skip ahead
    last = now;
    if (elapsed > scenes[idx].dur) { idx = (idx + 1) % scenes.length; elapsed = 0; scenes[idx].callouts.forEach((c) => (c.dir = undefined)); }
    render(scenes[idx], elapsed);
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    const go = onScreen && !document.hidden;
    if (go && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  fit();
  new ResizeObserver(fit).observe(canvas);
  new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; sync(); }).observe(canvas);
  document.addEventListener("visibilitychange", sync);
  sync();
})();
