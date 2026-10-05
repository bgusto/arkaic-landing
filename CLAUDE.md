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

**Brand system.** `styles.css` opens with the rules: Graphite and Paper foundation, Montagu Slab for display, Space Grotesk for text, flat and matte with no shadows or gradients. Accent colors (cyan, gold, coral) appear only through the prisms, the eigenmode texture bands, and the coral "Evolve" wordmark. All colors and spacing are CSS variables in `:root`. Note that the comparison marks in the inline SVG `<symbol>` defs in `index.html` hardcode hex values (`#1E1D1A`, `#F27649`), so a palette change must touch both files.

**Page structure.** Sections alternate backgrounds: dark hero, paper "01 Product", graphite "02 Team", then a coral contact band and the footer. `.section > *` is capped at `--max` and centered, while `.waitlist-band` breaks out to full bleed using negative margins equal to `--gutter`. Keep that coupling if you change section padding.

**Hero prisms (the part that spans files).** The headline in `index.html` has three SVG prisms threaded between letters. `.anchor` wraps a letter and positions its prism, with size and offset in `em`, so the prism follows its letter at any width or line wrap. `.lt-front` (z-index 3) paints a letter over a prism, and unwrapped neighbors sit behind it. The headline must not create a stacking context, or this layering breaks.

`main.js` animates each `.prism` through an inline `transform`:
- Drift is a sum of slow sines. `data-rx` and `data-ry` on the `<img>` set the radii. Threaded forms get a small `rx` across the letter seam and a larger `ry` along it.
- A damped spring plus a Gaussian pointer repulsion field pulls forms back. Stiffness scales with `ry/rx`, so there are no hard limits.
- `REF_FONT = 107.5` is the headline font size at a 1280px viewport (`8.4vw`). Drift radii are scaled by the actual size relative to it. If you change the `.display` font-size clamp, update this constant.
- Everything is skipped under `prefers-reduced-motion`, and the pointer field only runs when `(pointer: fine)`.

The `translate(-50%, -50%)` in the JS-written transform must match the CSS, since `left`/`top` mark the form's centre.

**Comparison table.** A real `<table class="matrix">` styled with CSS only. Header tabs are skewed parallelograms, and the column names are rotated to match, both driven by `--skew`, `--head-h`, and `--col-w` through `tan()`. Phone and tablet breakpoints (480px and 1060px) override those variables rather than the rules. Each cell is an SVG `<use>` of a shared mark plus a visually hidden Yes/Partial/No label for screen readers. Keep the label in sync with the mark when editing cells. Row labels carry a CSS-only tooltip (`.tip`, shown on hover or focus) holding the capability definition, and the scroller reserves bottom padding so the last row's tooltip is not clipped. The footnote states the "as of" date for the competitor claims, so update it when the data changes.

**Waitlist form.** Posts to Formspree (`action` URL in `index.html`). `main.js` intercepts submit and uses `fetch`, reporting the result in `.waitlist-msg`. Without JS the form posts normally. The `_gotcha` input is a honeypot, so leave it hidden.

**Responsive breakpoints.** 1060px (comparison table), 820px (single-column layouts, hero height), 480px (headline lines go inline so it wraps as one run of text, and the table shrinks further).
