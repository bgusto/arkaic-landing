// The topbar's menu on phones: the button opens the site links in a panel
// under the bar, and any link, or Escape, closes it (wide screens hide the
// button). Also the Applications panel in the row, on every width.
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); setMenu(false); } });

  // the Applications panel: the button toggles it, and a click elsewhere or Escape closes it
  // (hover and focus open it in CSS; on phones it is always shown, so this does nothing visible)
  const menu = bar.querySelector(".nav-menu"), mbtn = menu && menu.querySelector(".nav-menu-btn");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("open", open);
    mbtn.setAttribute("aria-expanded", String(open));
  }
  if (mbtn) {
    mbtn.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    document.addEventListener("click", (e) => { if (!menu.contains(e.target)) setMenu(false); });
    for (const a of menu.querySelectorAll("a")) a.addEventListener("click", () => setMenu(false));
  }
})();
