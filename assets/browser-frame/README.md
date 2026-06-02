# Browser Frame Templates

This folder contains SVG browser chrome templates that are composited onto
desktop exchange screenshots during the processing pipeline.

## Files

| File | Purpose | Dimensions |
|---|---|---|
| `frame-1440-dark.svg` | Dark browser chrome for 1440px desktop captures | 1200×36px overlay |
| `frame-390-mobile.svg` | Mobile phone chrome for 390px captures | 390×56px overlay |

## Status

Templates are **not yet created**. The pipeline (`scripts/process-screenshot.mjs`)
checks for their presence and silently skips frame compositing if they don't exist.

To add frame templates:
1. Create the SVG file matching the spec in `docs/screenshot-style-guide.md` (§8)
2. Place it in this folder
3. The pipeline will automatically pick it up on next run

## Spec — frame-1440-dark.svg

```
Width:  1200px
Height: 36px
Style:
  - Background: #1A1A2E
  - Three traffic-light circles (muted — not colored): 8px each, left-aligned
  - URL bar: centered, 420px wide, #2A2A3E bg, 4px radius, contains exchange URL text
  - Text: 12px Inter, #8888AA
  - No close/minimize/maximize icons (keep clean)
  - Bottom border: 1px solid rgba(255,255,255,0.06)
```

## Spec — frame-390-mobile.svg

```
Width:  390px
Height: 56px
Style:
  - Top section: 390×44px, #000000, simulates iOS status bar
  - Status indicators: time (left), signal/wifi/battery (right) in white
  - Bottom section: 390×12px, optional home indicator line
```

## Integration

The pipeline composites the frame at `gravity: 'north'` (top of the image).
The screenshot is not padded — the frame overlays the top 36px of the UI.
This intentionally covers the actual browser chrome of the captured screenshot,
replacing it with our standardized template.
