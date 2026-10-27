// The team carousel: the person shown is centred, the others beside them,
// smaller and dimmed. Arrows, dots, a click on a side card, arrow keys
// while the carousel has focus, and a sideways swipe move it, wrapping
// around. Without this script the cards stand in a row with their bios.
(() => {
  const root = document.querySelector(".team-carousel");
  if (!root) return;
  const people = [...root.querySelectorAll(".person")];
  if (people.length < 2) return;
  const controls = root.querySelector(".team-controls");
  const dots = root.querySelector(".team-dots");
  let current = 0;

  const show = (i) => {
    current = (i + people.length) % people.length;
    people.forEach((p, k) => {
      const offset = k - current;
      p.classList.toggle("current", offset === 0);
      p.classList.toggle("far", Math.abs(offset) > 1);
      p.style.transform = offset === 0 ? "none" : `translateX(${offset * 62}%) scale(0.78)`;
      p.setAttribute("aria-hidden", String(offset !== 0));
    });
    [...dots.children].forEach((d, k) => d.setAttribute("aria-current", String(k === current)));
  };

  people.forEach((p, k) => {
    const d = document.createElement("button");
    d.type = "button";
    d.setAttribute("aria-label", p.querySelector(".person-name").textContent);
    d.addEventListener("click", () => show(k));
    dots.append(d);
    p.addEventListener("click", () => { if (k !== current) show(k); });
  });
  for (const b of root.querySelectorAll(".team-arrow")) {
    b.addEventListener("click", () => show(current + Number(b.dataset.step)));
  }
  root.tabIndex = 0;
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
  let x0 = null;
  root.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  root.classList.add("on");
  controls.hidden = false;
  show(0);
})();
