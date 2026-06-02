# Annotation Layers

This folder stores SVG annotation overlays for exchange screenshots.
Annotations add arrows, callouts, and highlight regions to guide the reader.

## Naming Convention

```
{exchange}-{category}-{yyyy-mm}.svg
```

Examples:
- `binance-registration-2026-06.svg`
- `okx-kyc-2026-06.svg`
- `mexc-bonus-2026-06.svg`

## When to Create an Annotation

Add an annotation SVG when the screenshot contains a UI element that:
- Is not immediately obvious to a first-time user
- Requires the reader to look at a specific field or button
- Benefits from a step number (e.g. multi-step flows)

Annotations are **optional** — many screenshots are self-explanatory and
should be published without overlays.

## How the Pipeline Uses Annotations

`scripts/process-screenshot.mjs` checks for a matching annotation file at:
```
assets/annotations/{exchange}-{category}-{date}.svg
```

If found, it composites the SVG over the screenshot at `gravity: 'northwest'`.
If not found, the pipeline continues cleanly without any annotation.

## Design Rules

All annotations must follow `docs/screenshot-style-guide.md`:

**Arrows:**
- Stroke: 2.5px, color `#6C63FF`, opacity 0.82
- Rounded line joins and caps
- Drop shadow: `filter: drop-shadow(0 2px 6px rgba(108,99,255,0.28))`
- Cubic bezier curve — smooth, not straight

**Callouts:**
- Background: `rgba(0, 0, 0, 0.72)`
- Text: white, 13px Inter, 500 weight
- Border radius: 8px, padding: 6px 12px

**Highlights:**
- Border: `1.5px solid rgba(108, 99, 255, 0.60)`
- Fill: `rgba(108, 99, 255, 0.08)`
- Border radius: 6px

**Forbidden:**
- Red color anywhere
- Hand-drawn or sketch style
- Giant circles
- Emoji or clickbait overlays

## SVG Template

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="[screenshot-height]">
  <defs>
    <filter id="arrow-shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(108,99,255,0.28)" />
    </filter>
  </defs>

  <!-- Arrow example -->
  <path
    d="M 400,200 C 420,200 440,180 460,160"
    fill="none"
    stroke="#6C63FF"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-opacity="0.82"
    filter="url(#arrow-shadow)"
  />
  <!-- Arrowhead -->
  <polygon
    points="460,160 452,168 468,168"
    fill="#6C63FF"
    fill-opacity="0.82"
  />

  <!-- Callout example -->
  <rect x="300" y="170" width="180" height="28" rx="8"
    fill="rgba(0,0,0,0.72)" />
  <text x="390" y="189" text-anchor="middle"
    font-family="Inter, system-ui" font-size="13" fill="white">
    Enter referral code here
  </text>
</svg>
```

## Status

No annotation files exist yet. This folder is ready for content once
screenshots are captured and reviewed.
