#!/usr/bin/env python3
"""
CryptoBonusWorld — OG Image Generator v2.0
============================================
Generates branded social preview images (1200×630) for every page type.

Outputs:
  public/og-default.png            — homepage / generic fallback
  public/og/exchange-{slug}.png    — 14 exchange review pages
  public/og/guide-{slug}.png       — 22 guide pages
  public/og/compare-{pair}.png     — 29 compare pages
  public/og/country-{slug}.png     — 15 country pages

Style: dark premium fintech · gold accent · editorial · Bloomberg × Stripe
"""

import json
import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

# ── Dimensions ──────────────────────────────────────────────────────────────
W, H = 1200, 630

# ── Paths ────────────────────────────────────────────────────────────────────
BASE       = r"C:\projects\CryptoBonusWorld"
OUT_ROOT   = os.path.join(BASE, "public")
OUT_OG     = os.path.join(BASE, "public", "og")
LOGOS_DIR  = os.path.join(BASE, "public", "logos")
DATA_EX    = os.path.join(BASE, "src", "data", "exchanges.json")
DATA_GU    = os.path.join(BASE, "src", "data", "guides.json")
DATA_CP    = os.path.join(BASE, "src", "data", "compare-pairs.json")
DATA_CO    = os.path.join(BASE, "src", "data", "countries.json")

os.makedirs(OUT_OG, exist_ok=True)

# ── Palette ──────────────────────────────────────────────────────────────────
BG1     = ( 10,  10,  14)   # near-black
BG2     = ( 18,  18,  28)   # dark navy
GOLD1   = (251, 191,  36)   # #fbbf24 bright gold
GOLD2   = (245, 197,  66)   # #f5c542 mid gold
GOLD3   = (217, 119,   6)   # #d97706 warm gold
WHITE   = (255, 255, 255)
WHITE2  = (220, 220, 232)   # cool white
MUTED   = (128, 128, 148)   # muted text
MUTED2  = (100, 100, 118)   # dimmer muted
BORDER  = ( 40,  40,  58)   # border

# ── Brand colours per exchange ────────────────────────────────────────────────
BRAND = {
    'bybit':   (247, 166,   0),
    'binance': (243, 186,  47),
    'coinbase':(  0, 134, 255),
    'mexc':    (  0, 192, 180),
    'okx':     (200, 200, 210),
    'bitget':  ( 29, 162, 180),
    'bingx':   ( 24, 144, 255),
    'gate-io': ( 43, 175, 204),
    'kucoin':  ( 35, 175, 145),
    'htx':     ( 19,  82, 240),
    'coinex':  (  0, 207, 197),
    'phemex':  (190, 121, 223),
    'bitunix': (249, 115,  22),
    'lbank':   (  0,  82, 254),
}

# ── Category colours & icons for guides ──────────────────────────────────────
CAT_COLORS = {
    'Basics':          (245, 197,  66),   # gold
    'Exchange Guides': ( 96, 165, 250),   # blue
    'How-To Guides':   ( 52, 211, 153),   # green
    'Bonus Guides':    (245, 158,  11),   # amber
    'Earning Guides':  (167, 139, 250),   # purple
    'Trading Guides':  ( 45, 212, 191),   # teal
}
CAT_ICONS = {
    'Basics':          '📚',
    'Exchange Guides': '🏦',
    'How-To Guides':   '🛠',
    'Bonus Guides':    '🎁',
    'Earning Guides':  '💰',
    'Trading Guides':  '📈',
}

# ── Font loader ───────────────────────────────────────────────────────────────
FONTS_WIN = r"C:\Windows\Fonts"

def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = {
        'black':  ['seguibl.ttf',  'bahnschrift.ttf', 'arialbd.ttf'],
        'bold':   ['segoeuib.ttf', 'bahnschrift.ttf', 'arialbd.ttf'],
        'semi':   ['seguisb.ttf',  'segoeuib.ttf',    'arialbd.ttf'],
        'reg':    ['segoeui.ttf',  'arial.ttf'],
        'light':  ['segoeuil.ttf', 'segoeui.ttf',     'arial.ttf'],
        'emoji':  ['seguiemj.ttf', 'seguisym.ttf',    'arial.ttf'],
    }
    for fn in candidates.get(weight, ['segoeui.ttf']):
        path = os.path.join(FONTS_WIN, fn)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# ── Drawing helpers ───────────────────────────────────────────────────────────

def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))

def clamp01(v):
    return max(0.0, min(1.0, v))

def draw_gradient_bg(img, c1=BG1, c2=BG2):
    """Smooth diagonal gradient background."""
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = clamp01(x / W * 0.55 + y / H * 0.45)
            px[x, y] = lerp(c1, c2, t)

def draw_radial_glow(img, cx, cy, radius, color, strength=0.15):
    """Soft radial glow composited over img (RGB)."""
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    steps = 20
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        a = int(255 * strength * (1 - i / steps) ** 1.5)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    base = img.convert('RGBA')
    base.alpha_composite(glow)
    return base.convert('RGB')

def draw_h_gradient_bar(draw, y, h, c1, c2):
    """Draw a horizontal gradient bar."""
    for x in range(W):
        t = x / (W - 1)
        draw.rectangle([x, y, x, y + h - 1], fill=lerp(c1, c2, t))

def draw_gold_top_bar(draw, h=5):
    draw_h_gradient_bar(draw, 0, h, GOLD3, GOLD1)

def draw_gold_bottom_bar(draw, h=4):
    draw_h_gradient_bar(draw, H - h, h, GOLD1, GOLD3)

def subtle_grid(draw, color=(28, 28, 44), step=48):
    """Dot grid pattern."""
    for gy in range(0, H, step):
        for gx in range(0, W, step):
            draw.rectangle([gx, gy, gx + 1, gy + 1], fill=color)

def tw(draw, text, fnt):
    """Text width."""
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[2] - bb[0]

def th(draw, text, fnt):
    """Text height."""
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[3] - bb[1]

def right_align_text(draw, x_right, y, text, fnt, color):
    draw.text((x_right - tw(draw, text, fnt), y), text, font=fnt, fill=color)

def word_wrap(text, max_chars):
    """Simple word-wrap returning list of lines."""
    words  = text.split()
    lines, cur = [], ''
    for w in words:
        candidate = (cur + ' ' + w).strip() if cur else w
        if len(candidate) <= max_chars:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def draw_pill(draw, x, y, text, fnt, bg, fg, pad_x=16, pad_y=7, radius=10):
    """Draw a pill/badge and return (width, height)."""
    text_w = tw(draw, text, fnt)
    text_h = th(draw, text, fnt)
    pw = text_w + pad_x * 2
    ph = text_h + pad_y * 2
    draw.rounded_rectangle([x, y, x + pw, y + ph], radius=radius, fill=bg)
    draw.text((x + pad_x, y + pad_y), text, font=fnt, fill=fg)
    return pw, ph

def draw_rating_stars(draw, x, y, rating_10, fnt):
    """Draw stars from a 10-point rating."""
    full  = int(rating_10 // 2)
    empty = 5 - full
    stars = '★' * full + '☆' * empty
    draw.text((x, y), stars, font=fnt, fill=GOLD1)
    score = f' {rating_10}/10'
    draw.text((x + tw(draw, stars, fnt) + 8, y), score, font=fnt, fill=WHITE2)

def draw_cbw_brand_footer(draw, y=H - 52):
    """Standard CryptoBonusWorld footer branding."""
    f_brand = font('semi', 19)
    f_url   = font('reg',  16)
    draw.text((80, y),      'CryptoBonusWorld',      font=f_brand, fill=GOLD2)
    draw.text((80, y + 24), 'cryptobonusworld.com',  font=f_url,   fill=MUTED)

def draw_watermark_letter(img, letter, color, alpha=16, size=380, rx=740):
    """Faded large letter as right-side watermark."""
    f_wm = font('black', size)
    wm   = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd   = ImageDraw.Draw(wm)
    bb   = wd.textbbox((0, 0), letter, font=f_wm)
    lw, lh = bb[2] - bb[0], bb[3] - bb[1]
    wm_x = rx + (W - rx - lw) // 2
    wm_y = (H - lh) // 2 - 20
    wd.text((wm_x, wm_y), letter, font=f_wm, fill=(*color, alpha))
    base = img.convert('RGBA')
    base.alpha_composite(wm)
    return base.convert('RGB')

def load_logo(slug, target_size):
    """Load exchange PNG logo; return RGBA Image or None."""
    path = os.path.join(LOGOS_DIR, f'{slug}.png')
    if not os.path.exists(path):
        return None
    try:
        logo = Image.open(path).convert('RGBA')
        # Resize to fit within target_size × target_size
        logo.thumbnail((target_size, target_size), Image.LANCZOS)
        return logo
    except Exception:
        return None

def draw_exchange_circle(img, draw, slug, name, brand_color, cx, cy, r):
    """
    Draw exchange avatar circle (logo if PNG exists, else first letter).
    Works on an already-composited RGB img.
    Returns (img, draw) — may be re-created after RGBA composite.
    """
    # Outer glow ring
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    for rr in range(r + 16, r - 1, -1):
        a = int(60 * ((rr - r) / 16) ** 2)
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                   fill=(*brand_color, max(0, 60 - a)))
    base = img.convert('RGBA')
    base.alpha_composite(glow)
    img = base.convert('RGB')
    draw = ImageDraw.Draw(img)

    # Circle fill: dark with brand tint
    bg = lerp((14, 14, 22), brand_color, 0.20)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=brand_color, width=2)

    # Try logo first
    logo = load_logo(slug, r * 2 - 16)
    if logo:
        lw, lh = logo.size
        px = cx - lw // 2
        py = cy - lh // 2
        # Composite logo onto img
        tmp = img.convert('RGBA')
        # Create circle mask
        mask = Image.new('L', (W, H), 0)
        md   = ImageDraw.Draw(mask)
        md.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=255)
        tmp.paste(logo, (px, py), logo)
        # Apply circle mask to keep logo inside circle
        result = img.convert('RGBA')
        result.paste(tmp, mask=mask)
        img  = result.convert('RGB')
        draw = ImageDraw.Draw(img)
    else:
        # Draw first letter
        f_av  = font('black', int(r * 1.05))
        letter = name[0].upper()
        lb = draw.textbbox((0, 0), letter, font=f_av)
        lw_t, lh_t = lb[2] - lb[0], lb[3] - lb[1]
        draw.text(
            (cx - lw_t // 2 + 1, cy - lh_t // 2 - 3),
            letter, font=f_av, fill=brand_color
        )

    return img, draw


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATE 1 — DEFAULT OG
# ════════════════════════════════════════════════════════════════════════════

def make_default_og():
    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img)
    img = draw_radial_glow(img, W - 200, 80, 540, GOLD3, strength=0.11)
    img = draw_radial_glow(img, 80, H - 80, 380, (20, 20, 60), strength=0.14)
    draw = ImageDraw.Draw(img)

    subtle_grid(draw)
    draw_gold_top_bar(draw, h=5)

    lx = 80

    # Logo mark: gold 'B' coin
    _draw_coin_logo(draw, lx + 50, 140, 50)

    # Brand name
    f_bn = font('black', 64)
    draw.text((lx + 116, 108), 'CryptoBonusWorld', font=f_bn, fill=WHITE)

    # Gold accent divider
    div_y = 220
    draw.rectangle([lx, div_y, lx + 520, div_y + 2], fill=GOLD2)

    # Tagline
    f_tag = font('semi', 32)
    draw.text((lx, div_y + 16), 'Compare Crypto Exchange Bonuses', font=f_tag, fill=WHITE2)

    f_sub = font('reg', 22)
    draw.text((lx, div_y + 60), '14 top exchanges reviewed · Welcome bonuses up to $30,000', font=f_sub, fill=MUTED)

    # Exchange pills
    pill_data = [
        ('Bybit',   '$30K USDT', BRAND['bybit']),
        ('OKX',     'Mystery',   BRAND['okx']),
        ('Bitget',  '$6.2K',     BRAND['bitget']),
        ('MEXC',    '$10K',      BRAND['mexc']),
    ]
    f_pill = font('semi', 17)
    px_cur = lx
    py     = 355
    for exname, amount, bc in pill_data:
        pill_bg = lerp((14, 14, 22), bc, 0.16)
        pw, ph  = draw_pill(draw, px_cur, py, f' {exname}  {amount} ', f_pill,
                            bg=pill_bg, fg=WHITE2, pad_x=12, pad_y=8, radius=10)
        draw.rounded_rectangle([px_cur, py, px_cur + 3, py + ph], radius=2, fill=bc)
        px_cur += pw + 12

    # Badge row
    f_badge = font('reg', 18)
    badges  = ['14 Exchanges', '·', 'Up to $30,000 USDT', '·', 'Updated 2026']
    bx = lx
    for b in badges:
        col = GOLD2 if b == '·' else MUTED
        draw.text((bx, 450), b, font=f_badge, fill=col)
        bx += tw(draw, b, f_badge) + 10

    draw_cbw_brand_footer(draw)

    # Right watermark "B"
    img = draw_watermark_letter(img, 'B', GOLD3, alpha=18)
    draw = ImageDraw.Draw(img)

    # Right label
    right_align_text(draw, W - 36, 26, 'cryptobonusworld.com', font('reg', 17), MUTED2)

    # Right vertical accent bar
    draw.rectangle([W - 7, 0, W - 3, H], fill=GOLD3)
    draw_gold_bottom_bar(draw, h=5)

    out = os.path.join(OUT_ROOT, 'og-default.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] og-default.png  ({os.path.getsize(out) // 1024} KB)')


def _draw_coin_logo(draw, cx, cy, r):
    """Gold coin B mark (used in default OG)."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD1)
    ir = int(r * 0.72)
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=(12, 12, 18))
    sw = max(int(r * 0.145), 3)
    sx = cx - int(r * 0.30)
    st, sb = cy - int(r * 0.45), cy + int(r * 0.45)
    draw.rounded_rectangle([sx, st, sx + sw, sb], radius=sw // 2, fill=GOLD1)
    bh = (sb - st) // 2
    br = int(bh * 0.50)
    draw.ellipse([sx + sw - br, st, sx + sw + br, st + bh * 2 - 2], fill=GOLD1)
    draw.ellipse([sx + sw - br + int(br * 0.25), st + 2,
                  sx + sw + br - int(br * 0.25), st + bh * 2 - 4], fill=(12, 12, 18))
    b2r = int(bh * 0.58)
    draw.ellipse([sx + sw - b2r, st + bh - 2, sx + sw + b2r, sb + bh], fill=GOLD1)
    draw.ellipse([sx + sw - b2r + int(b2r * 0.22), st + bh,
                  sx + sw + b2r - int(b2r * 0.22), sb + bh - 2], fill=(12, 12, 18))


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATE 2 — EXCHANGE OG
# ════════════════════════════════════════════════════════════════════════════

def _format_bonus(amount, currency, mode):
    """Format bonus amount for display."""
    if mode == 'fixed':
        if currency == 'USD':
            return f'${amount:,} {currency}'
        return f'{amount:,} {currency}'
    if amount >= 10000:
        k = amount // 1000
        return f'Up to ${k}K {currency}'
    if amount >= 1000:
        return f'Up to ${amount // 1000:.0f}K {currency}'
    return f'Up to ${amount:,} {currency}'

def make_exchange_og(ex):
    slug   = ex['slug']
    name   = ex['name']
    amount = ex.get('bonusAmount', 0)
    curr   = ex.get('bonusCurrency', 'USDT')
    mode   = ex.get('bonusDisplayMode', 'up-to')
    rating = ex.get('rating', 9.0)
    tag    = ex.get('shortDescription', '')
    brand  = BRAND.get(slug, (200, 170, 50))

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, BG1, BG2)
    img = draw_radial_glow(img, 60, 60, 680, brand, strength=0.13)
    img = draw_radial_glow(img, W, H, 460, GOLD3, strength=0.07)
    draw = ImageDraw.Draw(img)

    subtle_grid(draw)

    # Top brand-coloured bar
    draw_h_gradient_bar(draw, 0, 5, brand, lerp(brand, GOLD1, 0.45))

    lx = 80

    # ── Exchange avatar circle ───────────────────────────────────────────────
    av_cx, av_cy, av_r = lx + 60, 148, 58
    img, draw = draw_exchange_circle(img, draw, slug, name, brand, av_cx, av_cy, av_r)

    # Exchange name
    f_name = font('black', 60)
    draw.text((lx + av_r * 2 + 28, av_cy - av_r + 6), name, font=f_name, fill=WHITE)

    # "Bonus Review · 2026" sub-label
    f_sub2 = font('reg', 20)
    draw.text((lx + av_r * 2 + 30, av_cy + 18), f'Bonus Review · May 2026 · cryptobonusworld.com',
              font=f_sub2, fill=MUTED)

    # ── Bonus amount ─────────────────────────────────────────────────────────
    bonus_str = _format_bonus(amount, curr, mode)
    f_bonus   = font('black', 76)
    f_label   = font('reg',   20)
    draw.text((lx, 252), 'Welcome Bonus', font=f_label, fill=MUTED)
    draw.text((lx, 278), bonus_str, font=f_bonus, fill=GOLD1)

    # Gold divider
    div_y = 385
    draw.rectangle([lx, div_y, lx + 560, div_y + 2], fill=GOLD3)

    # Short tagline (word-wrapped, 2 lines)
    tag_short = tag[:80] + ('…' if len(tag) > 80 else '')
    lines = word_wrap(tag_short, 60)
    f_desc = font('reg', 21)
    for i, ln in enumerate(lines[:2]):
        draw.text((lx, div_y + 12 + i * 30), ln, font=f_desc, fill=WHITE2)

    # Rating
    f_stars = font('reg', 22)
    draw_rating_stars(draw, lx, div_y + 85, rating, f_stars)

    # Disclaimer note
    f_note = font('reg', 16)
    draw.text((lx, div_y + 116), 'Terms apply · Verify conditions on the official exchange page',
              font=f_note, fill=MUTED2)

    draw_cbw_brand_footer(draw)

    # ── Right watermark ──────────────────────────────────────────────────────
    img = draw_watermark_letter(img, name[0].upper(), brand, alpha=16)
    draw = ImageDraw.Draw(img)

    # "Reviewed on CryptoBonusWorld" top-right
    right_align_text(draw, W - 36, 26, 'Reviewed on CryptoBonusWorld', font('reg', 17), MUTED2)

    # Right accent bar
    bar_c = lerp(brand, GOLD1, 0.30)
    draw.rectangle([W - 7, 0, W - 3, H], fill=bar_c)
    draw_h_gradient_bar(draw, H - 5, 5, brand, GOLD1)

    out = os.path.join(OUT_OG, f'exchange-{slug}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] og/exchange-{slug}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATE 3 — GUIDE OG
# ════════════════════════════════════════════════════════════════════════════

def make_guide_og(guide):
    slug     = guide['slug']
    title    = guide['title']
    category = guide.get('category', 'Guides')
    read_min = guide.get('readTime', '10 min')
    updated  = guide.get('lastUpdated', '2026')

    cat_color = CAT_COLORS.get(category, GOLD2)
    cat_icon  = CAT_ICONS.get(category, '📄')

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, BG1, (14, 16, 26))
    # Subtle glow top-right in category colour
    img = draw_radial_glow(img, W - 100, -40, 500, cat_color, strength=0.09)
    img = draw_radial_glow(img, 0, H + 40, 420, (20, 20, 50), strength=0.13)
    draw = ImageDraw.Draw(img)

    subtle_grid(draw, color=(24, 24, 40), step=52)

    # Top gold bar
    draw_gold_top_bar(draw, h=4)

    lx = 80

    # ── "GUIDE" pre-label ────────────────────────────────────────────────────
    f_pre = font('bold', 14)
    pre_text = 'C R Y P T O B O N U S W O R L D   G U I D E'
    draw.text((lx, 32), pre_text, font=f_pre, fill=MUTED)

    # ── Category pill ────────────────────────────────────────────────────────
    f_cat = font('bold', 18)
    cat_bg = (*lerp((10, 10, 18), cat_color, 0.16),)
    pw_cat, ph_cat = draw_pill(draw, lx, 62, f'  {category}  ',
                               f_cat, bg=cat_bg, fg=cat_color,
                               pad_x=14, pad_y=7, radius=8)

    # Read time pill
    rt_bg = (*lerp((10, 10, 18), (80, 80, 100), 0.3),)
    draw_pill(draw, lx + pw_cat + 12, 62, f'  {read_min} read  ',
              f_cat, bg=(28, 28, 44), fg=MUTED, pad_x=12, pad_y=7, radius=8)

    # ── Title (large, word-wrapped) ──────────────────────────────────────────
    # Strip "2026" suffix if in title to save space on line 1, then add it back small
    display_title = title
    lines = word_wrap(display_title, 42)

    title_y = 120
    if len(lines) <= 2:
        f_title = font('black', 56)
    else:
        f_title = font('black', 48)

    for i, ln in enumerate(lines[:3]):
        draw.text((lx, title_y + i * 68), ln, font=f_title, fill=WHITE)

    # ── Gold divider ─────────────────────────────────────────────────────────
    div_y = title_y + len(lines[:3]) * 68 + 14
    div_y = max(div_y, 355)
    draw.rectangle([lx, div_y, lx + 480, div_y + 2], fill=GOLD3)

    # ── Quick answer snippet ─────────────────────────────────────────────────
    quick = guide.get('quickAnswer', '')
    if quick:
        snippet = quick[:100] + '…' if len(quick) > 100 else quick
        slines  = word_wrap(snippet, 68)
        f_snip  = font('reg', 19)
        for i, ln in enumerate(slines[:2]):
            draw.text((lx, div_y + 12 + i * 28), ln, font=f_snip, fill=MUTED)

    # ── Bottom trust row ─────────────────────────────────────────────────────
    trust_y = H - 100
    draw.rectangle([lx, trust_y, lx + 420, trust_y + 1], fill=BORDER)

    f_trust = font('reg', 17)
    trust_items = [
        f'Updated {updated[:7]}',
        '·',
        'Editorial review',
        '·',
        'cryptobonusworld.com',
    ]
    tx = lx
    for item in trust_items:
        c = GOLD2 if item == '·' else MUTED
        draw.text((tx, trust_y + 10), item, font=f_trust, fill=c)
        tx += tw(draw, item, f_trust) + 10

    draw_cbw_brand_footer(draw, y=H - 46)

    # ── Right side: large faded category icon ────────────────────────────────
    # Draw as text using emoji font
    try:
        f_icon_big = font('emoji', 220)
        icon_bb    = draw.textbbox((0, 0), cat_icon, font=f_icon_big)
        icon_w     = icon_bb[2] - icon_bb[0]
        icon_h     = icon_bb[3] - icon_bb[1]
        icon_x     = 760 + (420 - icon_w) // 2
        icon_y     = (H - icon_h) // 2 - 20
        # Draw via RGBA layer at low opacity
        icon_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        icon_draw  = ImageDraw.Draw(icon_layer)
        icon_draw.text((icon_x, icon_y), cat_icon, font=f_icon_big,
                       fill=(*cat_color, 28))
        base = img.convert('RGBA')
        base.alpha_composite(icon_layer)
        img  = base.convert('RGB')
        draw = ImageDraw.Draw(img)
    except Exception:
        # Fall back to text letter watermark
        img = draw_watermark_letter(img, category[0], cat_color, alpha=20, size=320, rx=760)
        draw = ImageDraw.Draw(img)

    # Right accent bar
    draw.rectangle([W - 7, 0, W - 3, H], fill=(*cat_color,))
    draw_gold_bottom_bar(draw, h=4)

    out = os.path.join(OUT_OG, f'guide-{slug}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] og/guide-{slug}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATE 4 — COMPARE OG
# ════════════════════════════════════════════════════════════════════════════

def make_compare_og(pair, exchanges_map):
    pair_id = pair['pair']
    slug_a  = pair['a']
    slug_b  = pair['b']
    label   = pair.get('label', f'{slug_a} vs {slug_b}')

    ex_a = exchanges_map.get(slug_a, {})
    ex_b = exchanges_map.get(slug_b, {})

    name_a  = ex_a.get('name', slug_a.title())
    name_b  = ex_b.get('name', slug_b.title())
    brand_a = BRAND.get(slug_a, (200, 170, 50))
    brand_b = BRAND.get(slug_b, (100, 160, 200))
    rating_a = ex_a.get('rating', 9.0)
    rating_b = ex_b.get('rating', 9.0)
    amount_a = ex_a.get('bonusAmount', 0)
    amount_b = ex_b.get('bonusAmount', 0)
    curr_a   = ex_a.get('bonusCurrency', 'USDT')
    curr_b   = ex_b.get('bonusCurrency', 'USDT')
    mode_a   = ex_a.get('bonusDisplayMode', 'up-to')
    mode_b   = ex_b.get('bonusDisplayMode', 'up-to')

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, (10, 10, 14), (16, 18, 28))

    # Dual glows — brand A left, brand B right
    img = draw_radial_glow(img, 0, H // 2, 420, brand_a, strength=0.12)
    img = draw_radial_glow(img, W, H // 2, 420, brand_b, strength=0.12)
    img = draw_radial_glow(img, W // 2, H, 340, GOLD3, strength=0.06)
    draw = ImageDraw.Draw(img)

    subtle_grid(draw, color=(24, 24, 40), step=50)
    draw_gold_top_bar(draw, h=5)

    # ── VS badge center-top ──────────────────────────────────────────────────
    f_vs_sm = font('bold', 15)
    vs_label = '  SIDE-BY-SIDE COMPARISON  '
    vsl_w, _ = draw_pill(draw, 0, 0, vs_label, f_vs_sm,
                          bg=(25, 25, 40), fg=MUTED, pad_x=18, pad_y=7, radius=8)
    draw.rounded_rectangle([(W - vsl_w) // 2, 24, (W + vsl_w) // 2, 24 + 30],
                           radius=8, fill=(25, 25, 40))
    draw.text(((W - tw(draw, vs_label.strip(), f_vs_sm)) // 2 + 3, 31),
              vs_label.strip(), font=f_vs_sm, fill=MUTED)

    # ── Exchange A — left column ─────────────────────────────────────────────
    col_a_cx = 220
    av_cy    = 230
    av_r     = 72

    img, draw = draw_exchange_circle(img, draw, slug_a, name_a, brand_a,
                                     col_a_cx, av_cy, av_r)

    # Name A
    f_exname = font('black', 52)
    name_a_w = tw(draw, name_a, f_exname)
    draw.text((col_a_cx - name_a_w // 2, av_cy + av_r + 18), name_a, font=f_exname, fill=WHITE)

    # Bonus A
    bonus_a = _format_bonus(amount_a, curr_a, mode_a)
    f_bamt  = font('bold', 26)
    b_a_w   = tw(draw, bonus_a, f_bamt)
    draw.text((col_a_cx - b_a_w // 2, av_cy + av_r + 78), bonus_a, font=f_bamt, fill=GOLD1)

    # Rating A
    f_stars_sm = font('reg', 19)
    stars_a    = '★' * int(rating_a // 2) + '☆' * (5 - int(rating_a // 2))
    stars_a_w  = tw(draw, stars_a, f_stars_sm)
    draw.text((col_a_cx - stars_a_w // 2, av_cy + av_r + 114), stars_a, font=f_stars_sm, fill=GOLD1)

    # ── VS central element ───────────────────────────────────────────────────
    vs_cx = W // 2
    vs_cy = av_cy

    # VS circle
    draw.ellipse([vs_cx - 52, vs_cy - 52, vs_cx + 52, vs_cy + 52], fill=(22, 22, 32))
    draw.ellipse([vs_cx - 52, vs_cy - 52, vs_cx + 52, vs_cy + 52], outline=GOLD3, width=2)
    f_vs = font('black', 44)
    vs_text = 'VS'
    vs_tw_  = tw(draw, vs_text, f_vs)
    vs_th_  = th(draw, vs_text, f_vs)
    draw.text((vs_cx - vs_tw_ // 2, vs_cy - vs_th_ // 2 - 2), vs_text, font=f_vs, fill=GOLD2)

    # Vertical dashed divider
    for y_d in range(80, H - 60, 10):
        draw.rectangle([vs_cx - 1, y_d, vs_cx + 1, y_d + 5], fill=BORDER)

    # ── Exchange B — right column ────────────────────────────────────────────
    col_b_cx = W - 220

    img, draw = draw_exchange_circle(img, draw, slug_b, name_b, brand_b,
                                     col_b_cx, av_cy, av_r)

    f_exname2 = font('black', 52)
    name_b_w = tw(draw, name_b, f_exname2)
    draw.text((col_b_cx - name_b_w // 2, av_cy + av_r + 18), name_b, font=f_exname2, fill=WHITE)

    bonus_b = _format_bonus(amount_b, curr_b, mode_b)
    b_b_w   = tw(draw, bonus_b, f_bamt)
    draw.text((col_b_cx - b_b_w // 2, av_cy + av_r + 78), bonus_b, font=f_bamt, fill=GOLD1)

    stars_b   = '★' * int(rating_b // 2) + '☆' * (5 - int(rating_b // 2))
    stars_b_w = tw(draw, stars_b, f_stars_sm)
    draw.text((col_b_cx - stars_b_w // 2, av_cy + av_r + 114), stars_b, font=f_stars_sm, fill=GOLD1)

    # ── Bottom footer ────────────────────────────────────────────────────────
    foot_y = H - 68
    draw.rectangle([80, foot_y, W - 80, foot_y + 1], fill=BORDER)

    f_foot = font('semi', 17)
    footer = 'Full Comparison · Fees · KYC · Bonuses · 2026'
    fw     = tw(draw, footer, f_foot)
    draw.text(((W - fw) // 2, foot_y + 10), footer, font=f_foot, fill=MUTED)

    draw_cbw_brand_footer(draw, y=foot_y + 30)
    right_align_text(draw, W - 36, foot_y + 30, 'cryptobonusworld.com', font('reg', 16), MUTED2)

    draw_gold_bottom_bar(draw, h=5)

    out = os.path.join(OUT_OG, f'compare-{pair_id}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] og/compare-{pair_id}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# TEMPLATE 5 — COUNTRY OG
# ════════════════════════════════════════════════════════════════════════════

# Country → ISO-2 code for watermark
COUNTRY_ISO = {
    'global':               'GL',
    'turkey':               'TR',
    'india':                'IN',
    'indonesia':            'ID',
    'nigeria':              'NG',
    'brazil':               'BR',
    'vietnam':              'VN',
    'philippines':          'PH',
    'united-arab-emirates': 'AE',
    'pakistan':             'PK',
    'kenya':                'KE',
    'ukraine':              'UA',
    'mexico':               'MX',
    'argentina':            'AR',
    'united-states':        'US',
}

# Country accent colours
COUNTRY_COLORS = {
    'turkey':               (220,  40,  40),
    'india':                (240, 140,  40),
    'indonesia':            (200,  40,  40),
    'nigeria':              ( 40, 180,  80),
    'brazil':               ( 40, 180,  60),
    'vietnam':              (200,  40,  40),
    'philippines':          ( 40, 100, 220),
    'united-arab-emirates': ( 40, 180, 100),
    'pakistan':             ( 40, 160,  80),
    'kenya':                (220,  40,  40),
    'ukraine':              ( 40, 120, 220),
    'mexico':               ( 40, 160,  60),
    'argentina':            ( 80, 140, 220),
    'united-states':        ( 60, 100, 220),
    'global':               GOLD2,
}

def make_country_og(country, top_exchange_names):
    slug     = country['slug']
    name     = country['name']
    flag     = country.get('flag', '')
    iso      = COUNTRY_ISO.get(slug, slug[:2].upper())
    accent   = COUNTRY_COLORS.get(slug, GOLD2)

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, (10, 10, 14), (14, 16, 26))
    img = draw_radial_glow(img, W - 80, 80, 480, accent, strength=0.10)
    img = draw_radial_glow(img, 0, H, 380, (15, 20, 40), strength=0.14)
    draw = ImageDraw.Draw(img)

    subtle_grid(draw, color=(24, 24, 42), step=52)
    draw_gold_top_bar(draw, h=5)

    lx = 80

    # ── Pre-label ─────────────────────────────────────────────────────────────
    f_pre = font('bold', 14)
    draw.text((lx, 32), 'BEST CRYPTO EXCHANGES', font=f_pre, fill=MUTED)

    # ── Flag + country name ────────────────────────────────────────────────────
    name_y = 68

    # Try to render flag emoji
    flag_rendered = False
    if flag:
        try:
            f_flag = font('emoji', 80)
            flag_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            flag_draw  = ImageDraw.Draw(flag_layer)
            flag_draw.text((lx, name_y - 8), flag, font=f_flag, fill=(255, 255, 255, 230))
            base = img.convert('RGBA')
            base.alpha_composite(flag_layer)
            img  = base.convert('RGB')
            draw = ImageDraw.Draw(img)
            flag_w = tw(draw, flag, f_flag) + 20
            flag_rendered = True
        except Exception:
            flag_rendered = False

    # Country name (large)
    f_cname = font('black', 72)
    name_x  = lx + (tw(draw, flag, font('emoji', 80)) + 22 if flag_rendered else 0)
    draw.text((lx + (108 if flag_rendered else 0), name_y), name, font=f_cname, fill=WHITE)

    # Subtitle
    f_sub = font('semi', 28)
    draw.text((lx, name_y + 88), 'Best Crypto Bonuses & Exchanges 2026', font=f_sub, fill=WHITE2)

    # Gold divider
    div_y = name_y + 132
    draw.rectangle([lx, div_y, lx + 560, div_y + 2], fill=GOLD3)

    # ── Top exchange badges ───────────────────────────────────────────────────
    f_exbadge = font('semi', 18)
    badge_y   = div_y + 16
    bx        = lx
    for exname in top_exchange_names[:4]:
        ex_slug = exname.lower().replace(' ', '-')
        bc = BRAND.get(ex_slug, (140, 140, 160))
        bg = lerp((14, 14, 22), bc, 0.18)
        pw, _ = draw_pill(draw, bx, badge_y, f'  {exname}  ', f_exbadge,
                          bg=bg, fg=WHITE2, pad_x=14, pad_y=8, radius=10)
        draw.rounded_rectangle([bx, badge_y, bx + 3, badge_y + 34], radius=2, fill=bc)
        bx += pw + 12

    # ── Trust row ─────────────────────────────────────────────────────────────
    trust_y = div_y + 75
    f_trust = font('reg', 17)
    draw.text((lx, trust_y),
              f'Reviewed by CryptoBonusWorld editorial team · Updated May 2026',
              font=f_trust, fill=MUTED)

    # ── Bonus callout ─────────────────────────────────────────────────────────
    bonus_y = trust_y + 36
    f_bonus = font('semi', 19)
    draw.text((lx, bonus_y), '✓ All bonuses verified  ·  ✓ KYC requirements listed  ·  ✓ Local payment methods',
              font=f_bonus, fill=MUTED)

    draw_cbw_brand_footer(draw)

    # ── Right ISO watermark ────────────────────────────────────────────────────
    img = draw_watermark_letter(img, iso[0], accent, alpha=22, size=300, rx=760)
    img = draw_watermark_letter(img, iso[-1], accent, alpha=14, size=300, rx=900)
    draw = ImageDraw.Draw(img)

    # Right accent bar
    draw.rectangle([W - 7, 0, W - 3, H], fill=(*accent,))
    draw_gold_bottom_bar(draw, h=5)

    out = os.path.join(OUT_OG, f'country-{slug}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] og/country-{slug}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════

def main():
    print('CryptoBonusWorld — OG Image Generator v2.0')
    print('=' * 50)

    # Load data
    with open(DATA_EX,  encoding='utf-8') as f: exchanges  = json.load(f)
    with open(DATA_GU,  encoding='utf-8') as f: guides     = json.load(f)
    with open(DATA_CP,  encoding='utf-8') as f: comp_pairs = json.load(f)
    with open(DATA_CO,  encoding='utf-8') as f: countries  = json.load(f)

    ex_map = {e['slug']: e for e in exchanges}

    total = 0

    # ── Default ──────────────────────────────────────────────────────────────
    print('\n[DEFAULT]')
    make_default_og()
    total += 1

    # ── Exchanges ────────────────────────────────────────────────────────────
    print(f'\n[EXCHANGES] {len(exchanges)} images')
    for ex in exchanges:
        try:
            make_exchange_og(ex)
            total += 1
        except Exception as e:
            print(f'[FAIL] exchange-{ex.get("slug","?")}  {e}')

    # ── Guides ───────────────────────────────────────────────────────────────
    print(f'\n[GUIDES] {len(guides)} images')
    for g in guides:
        try:
            make_guide_og(g)
            total += 1
        except Exception as e:
            print(f'[FAIL] guide-{g.get("slug","?")}  {e}')

    # ── Compare pairs ────────────────────────────────────────────────────────
    print(f'\n[COMPARE] {len(comp_pairs)} images')
    for pair in comp_pairs:
        try:
            make_compare_og(pair, ex_map)
            total += 1
        except Exception as e:
            print(f'[FAIL] compare-{pair.get("pair","?")}  {e}')

    # ── Countries ────────────────────────────────────────────────────────────
    print(f'\n[COUNTRIES] {len(countries)} images')
    for country in countries:
        # Build top exchange names for this country (first 4 available)
        top_names = [e['name'] for e in exchanges[:4]]
        try:
            make_country_og(country, top_names)
            total += 1
        except Exception as e:
            print(f'[FAIL] country-{country.get("slug","?")}  {e}')

    print(f'\n{"=" * 50}')
    print(f'✅  Done — {total} OG images generated')
    print(f'   {OUT_ROOT}\\og-default.png')
    print(f'   {OUT_OG}\\exchange-*.png  ({len(exchanges)})')
    print(f'   {OUT_OG}\\guide-*.png     ({len(guides)})')
    print(f'   {OUT_OG}\\compare-*.png   ({len(comp_pairs)})')
    print(f'   {OUT_OG}\\country-*.png   ({len(countries)})')


if __name__ == '__main__':
    main()
