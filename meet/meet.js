// Arkaic meeting booker: 30-minute slots on weekdays, 08:00-12:00 and
// 13:00-17:00 Eastern, minus busy times synced from Proton Calendar
// (busy.json, refreshed by .github/workflows/proton-busy.yml).
// A request goes to Formspree; Brandon confirms by email.
(() => {
  const ZONE = "America/New_York";
  const WINDOWS = [[8, 12], [13, 17]];   // hours, local to ZONE
  const SLOT_MIN = 30;
  const DAYS_AHEAD = 21;                 // calendar days shown
  const NOTICE_H = 12;                   // earliest bookable start, from now

  const root = document.querySelector(".meet-card");
  if (!root) return;
  const daysEl = root.querySelector(".meet-days");
  const slotsEl = root.querySelector(".meet-slots");
  const emptyEl = root.querySelector(".meet-empty");
  const pick = root.querySelector(".meet-pick");
  const form = root.querySelector(".meet-form");
  const done = root.querySelector(".meet-done");
  const msg = form.querySelector(".meet-msg");

  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const Fmt = (opts, zone = viewerZone) => new Intl.DateTimeFormat("en-US", { timeZone: zone, ...opts });
  const fmtDow = Fmt({ weekday: "short" });
  const fmtDay = Fmt({ month: "short", day: "numeric" });
  const fmtTime = Fmt({ hour: "numeric", minute: "2-digit" });
  const fmtLong = Fmt({ weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const fmtEt = Fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }, ZONE);
  const fmtZoneName = Fmt({ timeZoneName: "long" });

  // milliseconds ZONE is ahead of UTC at instant t
  const zoneParts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  });
  function Offset(t) {
    const p = Object.fromEntries(zoneParts.formatToParts(t).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
  }
  // wall-clock time in ZONE -> UTC ms (second pass settles DST edges)
  function ZonedToUtc(y, m, d, h, min) {
    const wall = Date.UTC(y, m, d, h, min);
    let t = wall - Offset(wall);
    t = wall - Offset(t);
    return t;
  }

  function BuildDays(busy) {
    const now = Date.now();
    const earliest = now + NOTICE_H * 3600e3;
    const today = new Date(now + Offset(now));   // ZONE's calendar date, read via UTC getters
    const days = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      const dow = date.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
      const slots = [];
      for (const [h0, h1] of WINDOWS) {
        for (let min = h0 * 60; min + SLOT_MIN <= h1 * 60; min += SLOT_MIN) {
          const start = ZonedToUtc(y, m, d, Math.floor(min / 60), min % 60);
          const end = start + SLOT_MIN * 60e3;
          if (start < earliest) continue;
          if (busy.some(([a, b]) => a < end && b > start)) continue;
          slots.push(start);
        }
      }
      days.push({ noon: ZonedToUtc(y, m, d, 12, 0), slots });
    }
    return days;
  }

  let chosen = null;

  function Option(el, label, selected, onPick) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "option");
    b.setAttribute("aria-selected", String(selected));
    b.innerHTML = label;
    b.addEventListener("click", onPick);
    el.append(b);
    return b;
  }

  function ShowDay(days, index) {
    daysEl.replaceChildren();
    days.forEach((day, i) => {
      const b = Option(daysEl, `<span>${fmtDow.format(day.noon)}</span>${fmtDay.format(day.noon)}`, i === index, () => ShowDay(days, i));
      b.disabled = day.slots.length === 0;
    });
    slotsEl.replaceChildren();
    const day = days[index];
    emptyEl.hidden = !!(day && day.slots.length);
    if (!day) return;
    for (const start of day.slots) {
      Option(slotsEl, fmtTime.format(start), false, () => Choose(start));
    }
  }

  function Choose(start) {
    chosen = start;
    form.querySelector(".meet-chosen").textContent = fmtLong.format(start);
    pick.hidden = true;
    form.hidden = false;
    msg.textContent = "";
    form.querySelector("#meet-name").focus();
  }

  form.querySelector(".meet-back").addEventListener("click", () => {
    form.hidden = true;
    pick.hidden = false;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const firm = form.elements.firm.value.trim();
    const et = fmtEt.format(chosen);
    form.elements._subject.value = `Meeting request: ${name}${firm ? ` (${firm})` : ""}, ${et}`;
    form.elements.meeting_start_utc.value = new Date(chosen).toISOString();
    form.elements.meeting_time_et.value = et;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    msg.textContent = "";
    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(res.status);
      form.hidden = true;
      done.hidden = false;
      done.querySelector(".meet-done-time").textContent = fmtLong.format(chosen);
      done.querySelector(".meet-ics").href = Ics(chosen, name, firm);
    } catch {
      msg.textContent = "Something went wrong. Email inquiries@arkaic.inc and we'll find a time.";
    } finally {
      button.disabled = false;
    }
  });

  function Ics(start, name, firm) {
    const stamp = (t) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Arkaic//Meet//EN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@arkaic.inc`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + SLOT_MIN * 60e3)}`,
      `SUMMARY:Arkaic × ${(firm || name).replace(/[,;\\]/g, " ")}`,
      "DESCRIPTION:Meeting with Brandon Gusto (Arkaic). Pending confirmation by email.",
      "END:VEVENT", "END:VCALENDAR",
    ];
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
  }

  async function Init() {
    root.querySelector(".meet-tz").textContent = `Times shown in ${fmtZoneName.formatToParts(Date.now()).find((p) => p.type === "timeZoneName").value}.`;
    let busy = [];
    try {
      const res = await fetch("/meet/busy.json", { cache: "no-store" });
      if (res.ok) busy = (await res.json()).busy.map(([a, b]) => [Date.parse(a), Date.parse(b)]);
    } catch { /* no busy data: show every slot */ }
    const days = BuildDays(busy);
    ShowDay(days, Math.max(0, days.findIndex((d) => d.slots.length)));
  }
  Init();
})();
