// Arkaic landing: each wireframe form drifts about its own centroid.
// Motion is a sum of slow sines at incommensurate frequencies with random
// phases, so it is smooth everywhere (no direction snaps) yet never repeats.
// Threaded forms get little travel across their letter seam (rx) and more
// along it (ry). Honors prefers-reduced-motion.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const video = document.querySelector("video.schlieren");
  if (video && reduce.matches) video.pause();

  const prisms = Array.from(document.querySelectorAll(".prism"));
  if (prisms.length === 0 || reduce.matches) return;

  const TAU = Math.PI * 2;
  const Rand = (lo, hi) => lo + Math.random() * (hi - lo);

  // one oscillator = amplitude share, frequency (Hz), phase
  function Oscillators(count, fLo, fHi) {
    const list = [];
    for (let i = 0; i < count; i++) list.push({ f: Rand(fLo, fHi), p: Rand(0, TAU), a: Rand(0.5, 1) });
    const norm = list.reduce((sum, o) => sum + o.a, 0);
    for (const o of list) o.a /= norm; // shares sum to 1 so the envelope never exceeds the radius
    return list;
  }
  const Eval = (list, t) => list.reduce((sum, o) => sum + o.a * Math.sin(TAU * o.f * t + o.p), 0);

  const bodies = prisms.map((el) => ({
    el,
    rx: Number(el.dataset.rx || 14),
    ry: Number(el.dataset.ry || el.dataset.rx || 14),
    rot: Number(el.dataset.rot || 12), // degrees, peak
    ox: Oscillators(3, 0.030, 0.085),  // periods of roughly 12 to 33 s
    oy: Oscillators(3, 0.025, 0.080),
    or: Oscillators(2, 0.020, 0.060),
    t0: Rand(0, 1000),
  }));

  function Tick(now) {
    const t = now / 1000;
    for (const b of bodies) {
      const x = Eval(b.ox, t + b.t0) * b.rx;
      const y = Eval(b.oy, t + b.t0) * b.ry;
      const r = Eval(b.or, t + b.t0) * b.rot;
      b.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
    }
    requestAnimationFrame(Tick);
  }
  requestAnimationFrame(Tick);
})();
