"""Write meet/busy.json: busy intervals from the Proton Calendar share link.

Reads the calendar's public ICS link from PROTON_ICS_URL, expands recurring
events over the booking horizon, and writes merged busy intervals in UTC.
Only start and end times are published, never titles or details.
Free (TRANSP:TRANSPARENT) and cancelled events don't block time.
"""

import json
import os
import sys
import urllib.request
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

HORIZON_DAYS = 35
LOCAL = ZoneInfo("America/New_York")   # all-day events block this calendar day
OUT = Path(__file__).resolve().parent.parent / "meet" / "busy.json"


def ToUtc(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=LOCAL)   # floating time: read as local
        return value.astimezone(timezone.utc)
    if isinstance(value, date):
        return datetime.combine(value, time(0), LOCAL).astimezone(timezone.utc)
    raise TypeError(f"unexpected date value {value!r}")


def Main():
    url = os.environ["PROTON_ICS_URL"].replace("webcal://", "https://", 1)
    req = urllib.request.Request(url, headers={"User-Agent": "arkaic-meet"})
    with urllib.request.urlopen(req, timeout=60) as res:
        cal = icalendar.Calendar.from_ical(res.read())

    now = datetime.now(timezone.utc)
    end = now + timedelta(days=HORIZON_DAYS)
    spans = []
    for ev in recurring_ical_events.of(cal).between(now - timedelta(days=1), end):
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        if str(ev.get("TRANSP", "")).upper() == "TRANSPARENT":
            continue
        start = ToUtc(ev["DTSTART"].dt)
        if "DTEND" in ev:
            stop = ToUtc(ev["DTEND"].dt)
        elif "DURATION" in ev:
            stop = start + ev["DURATION"].dt
        else:
            stop = start + (timedelta(days=1) if not isinstance(ev["DTSTART"].dt, datetime) else timedelta(0))
        if stop > now and stop > start:
            spans.append([max(start, now), stop])

    spans.sort()
    merged = []
    for start, stop in spans:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], stop)
        else:
            merged.append([start, stop])

    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")
    busy = [[iso(a), iso(b)] for a, b in merged]

    # rewrite only when the intervals change, so the scheduled job doesn't
    # commit a new timestamp every run
    try:
        if json.loads(OUT.read_text()).get("busy") == busy:
            print("busy.json unchanged")
            return
    except (FileNotFoundError, ValueError):
        pass
    OUT.write_text(json.dumps({"updated": iso(now), "busy": busy}, indent=1) + "\n")
    print(f"busy.json: {len(busy)} intervals")


if __name__ == "__main__":
    sys.exit(Main())
