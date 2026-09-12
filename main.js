// Arkaic landing: each wireframe form drifts randomly about its own centroid.
// Slow, small, and smooth: a random walk toward re-sampled targets, no pointer
// coupling. Honors prefers-reduced-motion.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const video = document.querySelector("video.schlieren");
  if (video && reduce.matches) video.pause();

  const prisms = Array.from(document.querySelectorAll(".prism"));
  if (prisms.length === 0 || reduce.matches) return;

  const bodies = prisms.map((el) => {
    // elliptical wander: forms threaded between letters get little room across
    // the seam (rx) and more along it (ry)
    const rx = Number(el.dataset.rx || 14);
    const ry = Number(el.dataset.ry || rx);
    return {
      el, rx, ry,
      x: 0, y: 0, rot: 0,
      tx: 0, ty: 0, trot: 0,
      speed: 0.010 + Math.random() * 0.008, // per-frame easing; each form has its own tempo
    };
  });

  function Retarget(b) {
    // uniform point in an ellipse around the centroid
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    b.tx = Math.cos(angle) * r * b.rx;
    b.ty = Math.sin(angle) * r * b.ry;
    b.trot = (Math.random() - 0.5) * 10;
  }
  bodies.forEach(Retarget);

  let last = performance.now();
  function Tick(now) {
    const dt = Math.min((now - last) / 16.667, 3); // normalise to 60fps frames
    last = now;
    for (const b of bodies) {
      const k = 1 - Math.pow(1 - b.speed, dt);
      b.x += (b.tx - b.x) * k;
      b.y += (b.ty - b.y) * k;
      b.rot += (b.trot - b.rot) * k;
      if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.6) Retarget(b);
      b.el.style.transform = `translate(-50%, -50%) translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px) rotate(${b.rot.toFixed(2)}deg)`;
    }
    requestAnimationFrame(Tick);
  }
  requestAnimationFrame(Tick);
})();
