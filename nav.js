// The topbar's menu on phones: the button opens the site links in a panel
// under the bar, and any link, or Escape, closes it. Nothing runs where the
// links are already shown (wide screens hide the button).
(() => {
  const bar = document.querySelector(".topbar");
  const btn = bar && bar.querySelector(".nav-toggle");
  if (!btn) return;
  const set = (open) => {
    bar.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close" : "Menu";
  };
  btn.addEventListener("click", () => set(!bar.classList.contains("open")));
  for (const a of bar.querySelectorAll(".topnav a")) a.addEventListener("click", () => set(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
})();
