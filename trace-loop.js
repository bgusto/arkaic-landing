// Section 01's drawings, on rotation in one canvas: a rocket engine, a transport wing, a ship
// propeller, a NIF fusion shot, then a rotating detonation engine (3D wireframes that turn in
// space; the rocket engine, the shot and the RDE are built by scripts/engine3d.py, nif3d.py and
// rde3d.py). Each is a set of vector strokes drawn on live like a plotter, held, then faded before
// the next, with callouts naming what you would optimize over.
// Line colour follows the section: Graphite on Paper, Paper on Graphite.
// Honors prefers-reduced-motion (the engine, finished, as one still) and pauses off screen.
(() => {
  const canvas = document.querySelector(".trace-canvas");
  const ENGINE = window.ENGINE3D, WING = window.WING_TRACE, PROP = window.PROP_TRACE, NIF = window.NIF3D, RDE = window.RDE3D;
  if (!canvas || !canvas.getContext || !ENGINE || !WING || !PROP || !NIF || !RDE) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const TAU = Math.PI * 2;
  const FADE_OUT = 1.4;
  const SPEED = 2;         // how much faster than the base timings below the drawings are drawn
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const lerp = (a, b, u) => a + (b - a) * u;
  const ink = canvas.closest(".paper") ? "30, 29, 26" : "245, 240, 232";
  const col = (a) => `rgba(${ink}, ${a})`;
  const bg = canvas.closest(".paper") ? "245, 240, 232" : "30, 29, 26";   // knocks lines out behind a name

  // ---- the scenes ----
  // rot: turn (radians, clockwise); squash: foreshortens y after the turn and spin (a tilted view);
  // spin: radians per second about the vertical axis (three) ; three: strokes are x, y, z triples seen from
  // elev radians above the horizon; order: 0 to 1, when a stroke is drawn within the build;
  // speed: stroke units per second the pen moves; tip: shortest stroke that gets a pen dot.
  const scenes = [
    {
      p: ENGINE.p, three: true, elev: 0.5, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.2,
      corners: null, bound: [800, 1160],
      order: (mx, my, mz) => clamp((mz + 1100) / 2200),             // from the exit lip up to the powerhead
      build: 9, dur: 14, speed: 1300, maxDur: 2.4, tip: 300,
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
      p: WING.p, three: true, elev: 0.95, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.12, yaw0: -0.48, late: WING.late,
      corners: null, bound: [1150, 900],
      order: (mx, my) => Math.min(1, Math.abs(mx) / 950),          // fuselage first, then out to the tips
      build: 9, dur: 14, speed: 1300, maxDur: 2.4, tip: 300,
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
      p: PROP.p, three: true, elev: 0.62, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.365,
      corners: null, bound: [1000, 930],
      order: (mx, my) => Math.min(1, Math.hypot(mx, my) / 800),    // hub first, then out along the blades
      build: 9, dur: 14, speed: 1300, maxDur: 2.4, tip: 300,
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
      p: NIF.p, three: true, elev: 0.32, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.3,
      corners: null, bound: [820, 1180],
      order: (mx, my, mz) => Math.min(1, Math.hypot(mx, my, mz) / 900),   // capsule, then the hohlraum, then the beams
      build: 9, dur: 14, speed: 1300, maxDur: 2.4, tip: 300,
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
      p: RDE.p, three: true, elev: 0.62, cx: 0, cy: 0, rot: 0, squash: 1,
      spin: 0.14, yaw0: 0.2, late: RDE.late,
      corners: null, bound: [700, 900],
      order: (mx, my, mz) => clamp((330 - mz) / 970),               // from the injector face down; the wave last
      build: 9, dur: 14, speed: 1300, maxDur: 2.4, tip: 300,
      callouts: [
        { text: "Outer diameter", a3: RDE.anchors.diameter },
        { text: "Mass flow rate", a3: RDE.anchors.flow },
        { text: "Annulus gap", a3: RDE.anchors.gap },
        { text: "Injector area ratio", a3: RDE.anchors.injector },
        { text: "Combustor length", a3: RDE.anchors.length },
        { text: "Equivalence ratio", a3: RDE.anchors.phi },
        { text: "Plug nozzle contour", a3: RDE.anchors.plug },
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
    sc.callouts.forEach((c, i) => (c.t0 = (sc.build + 1.5 + i * 0.6) / SPEED));
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
  function projector(sc, t) {
    const yaw = (sc.yaw0 ?? 0.6) + sc.spin * Math.min(t, (sc.build + 1.5) / SPEED),   // it turns while drawn, then holds so the names stay put
       cw = Math.cos(yaw), sw = Math.sin(yaw), ce = Math.cos(sc.elev), se = Math.sin(sc.elev);
    return (x, y, z) => {
      const x1 = x * cw - y * sw, y1 = x * sw + y * cw, d = (y1 * ce + z * se) / 1000, k = 1 / (1 - 0.28 * d);
      return [x1 * k * S, (-z * ce + y1 * se) * k * S, d];
    };
  }
  function drawStrokes3d(sc, t) {
    const NB = 6, bins = [], tips = [];
    const proj = projector(sc, t);
    const seg = (a, b) => {
      const lv = Math.max(1, Math.round((0.3 + 0.7 * clamp(((a[2] + b[2]) / 2 + 1.1) / 2.2)) * NB));
      const p = bins[lv] || (bins[lv] = new Path2D());
      p.moveTo(a[0], a[1]);
      p.lineTo(b[0], b[1]);
    };
    for (const s of sc.strokes) {
      const u = clamp((t - s.t0) / s.dur);
      if (u <= 0) continue;
      const lim = u * s.len, f = s.f;
      let prev = proj(f[0], f[1], f[2]), i = 1;
      while (i < s.n && s.cum[i] <= lim) {
        const cur = proj(f[3 * i], f[3 * i + 1], f[3 * i + 2]);
        seg(prev, cur);
        prev = cur; i++;
      }
      if (i < s.n) {
        const r = (lim - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1]);
        const q = proj(lerp(f[3 * i - 3], f[3 * i], r), lerp(f[3 * i - 2], f[3 * i + 1], r), lerp(f[3 * i - 1], f[3 * i + 2], r));
        seg(prev, q);
        if (s.len > sc.tip) tips.push(q);
      }
    }
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
  function occupancy(sc, P) {
    const nx = Math.ceil(W / CELL) + 2, ny = Math.ceil(H / CELL) + 2, a = new Uint8Array(nx * ny);
    const st = sc.three ? 3 : 2, mark = (x, y) => {
      const i = Math.floor((x + W / 2) / CELL) + 1, j = Math.floor((y + H / 2) / CELL) + 1;
      if (i >= 0 && i < nx && j >= 0 && j < ny) a[j * nx + i] = 1;
    };
    for (const sk of sc.strokes) {
      let prev = P(...sk.f.slice(0, st));
      for (let i = 1; i < sk.n; i++) {
        const cur = P(...sk.f.slice(st * i, st * i + st)), k = Math.max(1, Math.ceil(Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) / CELL));
        for (let m = 0; m <= k; m++) mark(lerp(prev[0], cur[0], m / k), lerp(prev[1], cur[1], m / k));
        prev = cur;
      }
    }
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
  function drawCallout(c, P, t, g, ay) {
    const u = ease(clamp((t - c.t0) / (1.0 / SPEED)));
    if (u <= 0) return;
    const dir = c.dir;
    const ax = c.sx;
    const px = Math.max(9, Math.min(11, W * 0.0135)), label = c.text.toUpperCase();
    ctx.font = `500 ${px}px "Space Grotesk", sans-serif`;
    ctx.letterSpacing = "0.1em";
    ctx.textAlign = dir > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(label).width + 2, PAD = 16, hh = px;
    let x = ax + dir * 12;
    for (; Math.abs(x) < W / 2 - w; x += dir * CELL) {
      const e = x + dir * w;
      if (clearBox(g, Math.min(x, e) - PAD, Math.max(x, e) + PAD, ay - hh, ay + hh)) break;
    }
    x = clamp(x + dir * PAD * 0.5, -W / 2 + (dir < 0 ? w : 0) + 2, W / 2 - (dir > 0 ? w : 0) - 2);
    ctx.fillStyle = col(0.92 * u);
    ctx.fillText(label, x, ay);
    ctx.letterSpacing = "0px";
    ctx.textBaseline = "alphabetic";
  }

  function render(sc, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, (W * dpr) / 2, (H * dpr) / 2);
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.globalAlpha = reduce.matches ? 1 : 1 - ease(clamp((t - (sc.dur - FADE_OUT)) / FADE_OUT));
    const f = sc.callouts.length ? 0.62 : 0.92;   // leave room at the sides for the names
    S = Math.min((W * 0.5 * f) / sc.bound[0], (H * 0.5 * 0.94) / sc.bound[1]);
    if (sc.three) drawStrokes3d(sc, t);
    else drawStrokes(sc, mapper(sc, t), t);
    if (W >= 520) {
      const P = sc.three ? projector(sc, t) : mapper(sc, t, false);
      if (sc.callouts.length && t >= sc.callouts[0].t0) {
        const key = `${W},${H},${S}`;
        if (sc.gkey !== key) { sc.grid = occupancy(sc, P); sc.gkey = key; }
        // anchors on screen; names on one side are pushed apart so they never touch
        for (const c of sc.callouts) {
          const [x, y] = c.a3 ? P(...c.a3) : P(c.ax, c.ay);
          c.sx = x; c.sy = y; if (c.dir === undefined) c.dir = (c.a3 ? x >= 0 : c.side === "r") ? 1 : -1;   // fixed once placed, so a name never jumps sides
        }
        const GAP = 22, lanes = [1, -1].map((d) => sc.callouts.filter((c) => c.dir === d).sort((a, b) => a.sy - b.sy));
        for (const lane of lanes) {
          lane.forEach((c) => (c.y = c.sy));
          for (let k = 1; k < lane.length; k++) lane[k].y = Math.max(lane[k].y, lane[k - 1].y + GAP);
        }
        for (const c of sc.callouts) drawCallout(c, P, t, sc.grid, c.y);
      }
    }
  }

  let idx = 0, elapsed = 0;
  function fit() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    render(scenes[idx], reduce.matches ? scenes[0].dur - 3 : elapsed);
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
