# OKLCH picker · Code by Ear

An OKLCH color picker for blind and low-vision front-end students: enter a brand color, hear what it is, pick a readable text color, get a hover state and copy the CSS. Spec: [oklch-picker-spec.md](oklch-picker-spec.md).

## What's done

One page, four steps under `h2` headings (spec 10.1):

1. **Brand color** — "I have a brand color" (required field: HEX, `rgb()`, `hsl()`, `oklch()`) or "Pick a color" (Lightness, Chroma, Hue sliders and charts). The description, e.g. "Vivid warm red, 61%", is heard once; the swatch and charts are for sighted users only.
2. **Text color** — white / black, any font size and weight 100–900; WCAG and APCA verdicts with their own icons; Show recommendation sets the color, size and weight.
3. **Hover** — darker for white text, lighter for black; the pair is checked again.
4. **Result CSS** — CSS variables with a HEX fallback for `oklch(from …)`, Copy Result CSS.

Accessibility:

- Custom `role="slider"`: arrows, PageUp / PageDown, Home / End, hue wraps 359 → 0. While the arrow is held the slider is silent: `aria-valuetext` and the live region update once, ~500 ms after the last change.
- One polite live region: color first, then WCAG, then APCA on its own line.
- Charts, gradients and swatches are `aria-hidden`.
- Light / dark theme from the system with a switch; Large view (root font size 125%); `forced-colors` keep real color samples; `prefers-reduced-motion`; 44px touch targets on touch screens; no horizontal scroll at 320px.

## Deliberately not done

- Free mode, blind-zone hints, gamut warnings (P3, Rec. 2020), brand-tinted text — spec 10.7 and 9.
- Charts from oklch-picker (WebGL, `@colordx/gpu`): a CPU canvas draws the 240×140 sRGB slices fast enough and adds no dependency.
- `apca-w3`: its license (Limited W3 License, AGPL otherwise) and its font lookup table ("All Rights Reserved") don't fit an open project. APCA 0.0.98G is implemented from the published formula; the threshold is a simple rule instead of the table: large text (WCAG) Lc 45, smaller than 16px or thinner than 400 Lc 75, otherwise Lc 60.

## How to run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/, opens from any static host (base: './')
npm test           # unit tests
npm run e2e        # Playwright + axe, desktop and mobile
npm run lint
npm run size       # size-limit, run after build
```

## Verified by

- Unit tests (Vitest): the six test colors from spec 10.6 — OKLCH, WCAG ratio (±0.01), APCA Lc (±1), recommendation, hover; verdict texts from 10.4; color words; parsing; the CSS from 3.9.
- E2E (Playwright): axe WCAG 2.0–2.2 A/AA in light and dark themes, with an error and a recommendation shown; headings; the main scenario; slider silence while the arrow is held; hue wrap; copy.
- size-limit: JS 12 kB, CSS 10 kB (brotli). JS was 11.7 kB; raised by 0.3 kB for the given / pick modes.
- Not yet: NVDA + Firefox, VoiceOver on Mac and iPhone (spec 5).

## Known compromises

- The button samples are excluded from axe: they show the student's pair on purpose, including failing ones.
- `#F1FAEE` hover is `#F9FFF6` (20.66:1), not `#FEFFFB` from spec 10.6: the hex fallback clips to sRGB the way browsers render `oklch()`.
- To check on real screen readers first (spec 7): whether NVDA speaks the slider value and the live region as two phrases, and whether VoiceOver on iPhone moves a custom `role="slider"` with swipes up and down.
- daisyUI is included whole; limiting it to the used components would cut the CSS.
