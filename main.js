// Arkaic landing: the three wireframe forms drift near the headline and lean
// toward the pointer. Motion is small and physically motivated (brand: forms
// "hover or float around typography and can react to mouse movement").
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prisms = Array.from(document.querySelectorAll(".prism"));
  const hero = document.querySelector(".hero");
  if (!hero || prisms.length === 0) return;

  // Pause the video when the user prefers reduced motion.
  const video = document.querySelector("video.schlieren");
  if (video && reduce.matches) video.pause();

  if (reduce.matches || !window.matchMedia("(pointer: fine)").matches) return;

  let targetX = 0, targetY = 0, x = 0, y = 0, raf = 0;

  function OnMove(event) {
    const rect = hero.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;   // -1 … 1
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(Tick);
  }

  function Tick() {
    x += (targetX - x) * 0.08;
    y += (targetY - y) * 0.08;
    for (const prism of prisms) {
      const depth = Number(prism.dataset.depth || 0.5);
      const dx = x * 28 * depth;
      const dy = y * 20 * depth;
      const rot = x * 6 * depth;
      prism.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    }
    raf = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(Tick) : 0;
  }

  hero.addEventListener("pointermove", OnMove, { passive: true });
  hero.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; if (!raf) raf = requestAnimationFrame(Tick); });
})();
