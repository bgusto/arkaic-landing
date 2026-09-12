// Arkaic landing: each wireframe form drifts about its own centroid and is
// gently repelled by the pointer, springing back on a damped Hooke spring.
//
// Drift: a sum of slow sines at incommensurate frequencies with random phases,
// smooth everywhere and non-repeating. Threaded forms get little travel across
// their letter seam (rx) and more along it (ry).
// Spring: F = -k·d - c·v + repulsion(pointer), integrated per frame. The
// displacement is capped per axis so a threaded form never crosses its seam.
// Honors prefers-reduced-motion (no drift, no spring).
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const video = document.querySelector("video.schlieren");
  if (video && reduce.matches) video.pause();

  const prisms = Array.from(document.querySelectorAll(".prism"));
  if (prisms.length === 0 || reduce.matches) return;

  const TAU = Math.PI * 2;
  const Rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function Oscillators(count, fLo, fHi) {
    const list = [];
    for (let i = 0; i < count; i++) list.push({ f: Rand(fLo, fHi), p: Rand(0, TAU), a: Rand(0.5, 1) });
    const norm = list.reduce((sum, o) => sum + o.a, 0);
    for (const o of list) o.a /= norm; // shares sum to 1: the envelope never exceeds the radius
    return list;
  }
  const Eval = (list, t) => list.reduce((sum, o) => sum + o.a * Math.sin(TAU * o.f * t + o.p), 0);

  // ---- spring constants (px, s) ----
  const K = 42;                         // stiffness: ~1 s natural period
  const C = 2 * Math.sqrt(K) * 0.55;    // damping ratio 0.55: springs back with a small overshoot
  const REACH = 150;                    // pointer influence radius
  const PUSH = 1400;                    // peak repulsive acceleration at the pointer

  const bodies = prisms.map((el) => {
    const rx = Number(el.dataset.rx || 14);
    const ry = Number(el.dataset.ry || rx);
    return {
      el, rx, ry,
      rot: Number(el.dataset.rot || 12),
      ox: Oscillators(3, 0.030, 0.085),
      oy: Oscillators(3, 0.025, 0.080),
      or: Oscillators(2, 0.020, 0.060),
      t0: Rand(0, 1000),
      // spring state
      dx: 0, dy: 0, vx: 0, vy: 0,
      capX: Math.min(rx * 1.6, 16),     // threaded forms: stay on the seam
      capY: Math.min(ry * 1.6, 24),
    };
  });

  // pointer, in viewport coordinates; null when away or on touch devices
  let pointer = null;
  if (window.matchMedia("(pointer: fine)").matches) {
    const hero = document.querySelector(".hero") || document;
    hero.addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
    hero.addEventListener("pointerleave", () => { pointer = null; });
  }

  let last = performance.now();
  function Tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    for (const b of bodies) {
      // spring + damping
      let ax = -K * b.dx - C * b.vx;
      let ay = -K * b.dy - C * b.vy;
      // repulsion from the pointer, falling off quadratically to zero at REACH
      if (pointer) {
        const r = b.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ex = cx - pointer.x, ey = cy - pointer.y;
        const dist = Math.hypot(ex, ey) || 1;
        if (dist < REACH) {
          const s = 1 - dist / REACH;
          const f = PUSH * s * s;
          ax += (ex / dist) * f;
          ay += (ey / dist) * f;
        }
      }
      b.vx += ax * dt; b.vy += ay * dt;
      b.dx += b.vx * dt; b.dy += b.vy * dt;
      // per-axis caps keep threaded forms on their seam; kill velocity into the cap
      if (Math.abs(b.dx) > b.capX) { b.dx = Math.sign(b.dx) * b.capX; b.vx *= -0.3; }
      if (Math.abs(b.dy) > b.capY) { b.dy = Math.sign(b.dy) * b.capY; b.vy *= -0.3; }

      const x = Eval(b.ox, t + b.t0) * b.rx + b.dx;
      const y = Eval(b.oy, t + b.t0) * b.ry + b.dy;
      const rot = Eval(b.or, t + b.t0) * b.rot + b.dx * 0.4; // a push also tips the form slightly
      b.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
    }
    requestAnimationFrame(Tick);
  }
  requestAnimationFrame(Tick);
})();
