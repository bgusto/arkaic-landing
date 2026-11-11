// Copy buttons: a button with data-copy copies the text of the element it
// names (the id in data-copy). The copy symbol turns into a check mark for
// two seconds. Where the clipboard is not available, the text is selected
// so it can be copied by hand.
(() => {
  for (const btn of document.querySelectorAll("button[data-copy]")) {
    const src = document.getElementById(btn.dataset.copy);
    if (!src) continue;
    const label = btn.getAttribute("aria-label");
    let timer;
    btn.addEventListener("click", async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(src.textContent.trim());
        ok = true;
      } catch {
        const r = document.createRange();
        r.selectNodeContents(src);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      btn.classList.toggle("copied", ok);
      btn.setAttribute("aria-label", ok ? "Copied" : "Press Ctrl+C to copy");
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", label);
      }, 2000);
    });
  }
})();
