# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Single-page marketing site for Arkaic (arkaic.inc), which is building a product called Evolve. It is plain static files: `index.html`, `styles.css`, `main.js`, and `assets/`. There is no package.json, build step, linter, or test suite. `CNAME` holds the custom domain, so the site is served as-is from the repo root.

## Running locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works. Verify changes in a browser, including at phone width (see breakpoints below).

## Cache busting

`index.html` references `styles.css?v=N` and `main.js?v=N`. Bump the number whenever you change the matching file, or returning visitors keep the old copy.

## Architecture

**Brand system.** `styles.css` opens with the rules: Graphite and Paper foundation, Montagu Slab for display, Space Grotesk for text, flat and matte with no shadows or gradients. Accent colors (cyan, gold, coral) appear only through the prisms, the eigenmode texture bands, and the coral "Evolve" wordmark. All colors and spacing are CSS variables in `:root`.

**Page structure.** Sections alternate backgrounds: dark hero, paper "01 Product", graphite "02 Team", then a coral contact band and the footer. `.section > *` is capped at `--max` and centered, while `.waitlist-band` breaks out to full bleed using negative margins equal to `--gutter`. Keep that coupling if you change section padding.

**Hero prisms (the part that spans files).** The headline in `index.html` has three SVG prisms threaded between letters. `.anchor` wraps a letter and positions its prism, with size and offset in `em`, so the prism follows its letter at any width or line wrap. `.lt-front` (z-index 3) paints a letter over a prism, and unwrapped neighbors sit behind it. The headline must not create a stacking context, or this layering breaks.

`main.js` animates each `.prism` through an inline `transform`:
- Drift is a sum of slow sines. `data-rx` and `data-ry` on the `<img>` set the radii. Threaded forms get a small `rx` across the letter seam and a larger `ry` along it.
- A damped spring plus a Gaussian pointer repulsion field pulls forms back. Stiffness scales with `ry/rx`, so there are no hard limits.
- `REF_FONT = 107.5` is the headline font size at a 1280px viewport (`8.4vw`). Drift radii are scaled by the actual size relative to it. If you change the `.display` font-size clamp, update this constant.
- Everything is skipped under `prefers-reduced-motion`, and the pointer field only runs when `(pointer: fine)`.

The `translate(-50%, -50%)` in the JS-written transform must match the CSS, since `left`/`top` mark the form's centre.

**Page frame.** The content width, margins and section padding are boat.dev's: `--max` 1248px, `--gutter` 48px (32px under 1024px, 16px under 768px), `--section-y` 96px (80px, 64px) over each section, 32px less under it. Keep them together if you change one.

**Hero.** Graphite throughout. Copy on the left, held to three lines by `max-width: 6.6em` on the display text; the live drawings (`trace-loop.js`) on the right, Paper line on Graphite. Phones stack them. The headline is `6.6vw`, so `REF_FONT` in `main.js` is 84.5. The rotation is engine, wing, propeller, fusion shot, quadcopter, each scene 8 s with the build at `SPEED = 3` (three times the base timings); the chip stack (`ic3d-data.js`) is built but left out as not good enough. `data-ink="pencil"` on the canvas would draw Graphite pencil on paper instead, unused now.

**Tiles in section 01.** Under the heading "Don't just optimize, Evolve.", `.tile-grid` holds three GIF loops (`assets/tile-run.gif`, `tile-learn.gif`, `tile-optimize.gif`) in boat.dev's feature layout: 390 x 216 boxes with a 1px frame, a 24px mono caption above (the method) and below (the result), a 24/32 heading and a 46ch line. The three articles share rows through `subgrid`, so the headings sit on one line across the row and the paragraphs start level; keep headings short enough for one line. The GIFs are rendered from `evolve-clips/10-tiles` (`python3 render.py run learn optimize`) at 780 x 432 with no margins of their own: the whole box is the plot, or the terminal. The captions live in `index.html`, not in the GIFs. The GIF URLs carry `?v=N`; bump it when a loop is re-rendered, or browsers keep the old one. Section 01's paragraph is commented out for now; the loops carry the section.

**Topbar.** The site links are repeated by hand in `index.html`, `work/index.html` and `meet/index.html`; change all three. The Applications item is a `.nav-menu`: a button and a panel of section links (`#confidence`, `#cost`, `#cycles`). CSS opens it on hover and focus, `nav.js` toggles it on click and closes it on an outside click or Escape. On phones the panel is always shown, indented under the word, inside the Menu panel.

**Waitlist form.** Posts to Formspree (`action` URL in `index.html`). `main.js` intercepts submit and uses `fetch`, reporting the result in `.waitlist-msg`. Without JS the form posts normally. The `_gotcha` input is a honeypot, so leave it hidden.

**Responsive breakpoints.** 820px (single-column layouts, hero height), 480px (headline lines go inline so it wraps as one run of text).
