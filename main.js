// Arkaic landing: each wireframe form drifts about its own centroid and is
// gently repelled by the pointer, springing back on a damped Hooke spring.
//
// Drift: a sum of slow sines at incommensurate frequencies with random phases,
// smooth everywhere and non-repeating. Threaded forms get little travel across
// their letter seam (rx) and more along it (ry).
// Spring: F = -k·d - c·v + repulsion(pointer), integrated per frame. No hard
// limits: threaded forms are simply stiffer across their seam than along it.
// Honors prefers-reduced-motion (no drift, no spring).
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
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
  // Bouncy return: damping ratio 0.32 gives a couple of visible oscillations.
  // Travel is limited by the spring alone: threaded forms are stiffer across
  // their letter seam than along it (stiffness scales with ry/rx), so the
  // same push moves them far less across than along, with no hard wall.
  const K = 34;                          // stiffness along the free axis (~1.1 s period)
  const ZETA = 0.32;
  const SIGMA = 85;                      // pointer field width (Gaussian), px
  const PUSH = 780;                      // peak repulsive acceleration at the pointer

  // Drift radii (data-rx/ry) are tuned for the 1280px desktop headline; scale
  // them with the type so small screens keep the forms on their letters.
  const headline = document.querySelector(".display");
  const REF_FONT = 107.5;
  let scale = 1;
  const Rescale = () => { scale = parseFloat(getComputedStyle(headline).fontSize) / REF_FONT; };
  Rescale();
  window.addEventListener("resize", Rescale, { passive: true });

  const bodies = prisms.map((el) => {
    const rx = Number(el.dataset.rx || 14);
    const ry = Number(el.dataset.ry || rx);
    const ratio = ry / rx;
    const kx = K * ratio, ky = K;
    return {
      el, rx, ry,
      rot: Number(el.dataset.rot || 12),
      ox: Oscillators(3, 0.030, 0.085),
      oy: Oscillators(3, 0.025, 0.080),
      or: Oscillators(2, 0.020, 0.060),
      t0: Rand(0, 1000),
      // spring state and per-axis constants
      dx: 0, dy: 0, vx: 0, vy: 0,
      kx, ky,
      cx: 2 * Math.sqrt(kx) * ZETA,
      cy: 2 * Math.sqrt(ky) * ZETA,
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
      // spring + damping, per axis
      let ax = -b.kx * b.dx - b.cx * b.vx;
      let ay = -b.ky * b.dy - b.cy * b.vy;
      // repulsion from the pointer: a wide Gaussian field, so the force eases
      // in and out as the pointer passes instead of shoving
      if (pointer) {
        const r = b.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ex = cx - pointer.x, ey = cy - pointer.y;
        const dist = Math.hypot(ex, ey) || 1;
        const f = PUSH * Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
        ax += (ex / dist) * f;
        ay += (ey / dist) * f;
      }
      b.vx += ax * dt; b.vy += ay * dt;
      b.dx += b.vx * dt; b.dy += b.vy * dt;

      const x = Eval(b.ox, t + b.t0) * b.rx * scale + b.dx;
      const y = Eval(b.oy, t + b.t0) * b.ry * scale + b.dy;
      const rot = Eval(b.or, t + b.t0) * b.rot + b.vx * 0.06; // motion, not offset, tips the form
      b.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
    }
    requestAnimationFrame(Tick);
  }
  requestAnimationFrame(Tick);
})();

// Waitlist: submit to Formspree in place and report the result inline.
// Without JS the form posts normally and Formspree shows its own thank-you page.
(() => {
  const form = document.querySelector(".waitlist");
  if (!form) return;
  const msg = form.querySelector(".waitlist-msg");
  const button = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    button.disabled = true;
    msg.textContent = "";
    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      msg.textContent = "You're on the list. We'll be in touch.";
    } catch {
      msg.textContent = "Something went wrong. Email inquiries@arkaic.inc and we'll add you.";
    } finally {
      button.disabled = false;
    }
  });
})();
