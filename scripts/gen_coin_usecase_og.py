#!/usr/bin/env python3
"""
CryptoBonusWorld — Coin & Use-Case OG Image Generator
Generates branded 1200×630 social preview images for:
  public/og/coin-{slug}.png      — 15 coin pages
  public/og/use-case-{slug}.png  — 20 use-case pages
Style: dark premium fintech · gold accent · coin symbol glow rings
"""

import os, sys, math
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

W, H = 1200, 630
BASE    = r"C:\projects\CryptoBonusWorld"
OUT_OG  = os.path.join(BASE, "public", "og")
os.makedirs(OUT_OG, exist_ok=True)

# ── Palette ──────────────────────────────────────────────────────────────────
BG1   = (10,  10,  14)
BG2   = (16,  18,  28)
GOLD1 = (251, 191,  36)
GOLD2 = (245, 197,  66)
GOLD3 = (217, 119,   6)
WHITE = (255, 255, 255)
W2    = (220, 220, 232)
MUTED = (128, 128, 148)
MUT2  = (100, 100, 118)
BRD   = ( 40,  40,  58)

# ── Coin brand colours ────────────────────────────────────────────────────────
COIN_COLORS = {
    'bitcoin':  (247, 147,  26),   # #F7931A
    'ethereum': ( 98, 126, 234),   # #627EEA
    'usdt':     ( 38, 161, 123),   # #26A17B
    'bnb':      (243, 186,  47),   # #F3BA2F
    'solana':   (153,  69, 255),   # #9945FF
    'xrp':      (  0, 170, 228),   # #00AAE4
    'doge':     (194, 166,  51),   # #C2A633
    'ton':      (  0, 152, 234),   # #0098EA
    'ada':      (  0,  51, 173),   # #0033AD
    'avax':     (232,  65,  66),   # #E84142
    'trx':      (255,   0,  19),   # #FF0013
    'link':     ( 42,  90, 218),   # #2A5ADA
    'dot':      (230,   0, 122),   # #E6007A
    'ltc':      (191, 187, 187),   # #BFBBBB
    'pepe':     (  0, 194,  20),   # #00C214
}

COIN_DATA = [
    ('bitcoin',  'BTC', 'Bitcoin'),
    ('ethereum', 'ETH', 'Ethereum'),
    ('usdt',     'USDT','Tether (USDT)'),
    ('bnb',      'BNB', 'BNB'),
    ('solana',   'SOL', 'Solana'),
    ('xrp',      'XRP', 'XRP'),
    ('doge',     'DOGE','Dogecoin'),
    ('ton',      'TON', 'Toncoin'),
    ('ada',      'ADA', 'Cardano'),
    ('avax',     'AVAX','Avalanche'),
    ('trx',      'TRX', 'TRON'),
    ('link',     'LINK','Chainlink'),
    ('dot',      'DOT', 'Polkadot'),
    ('ltc',      'LTC', 'Litecoin'),
    ('pepe',     'PEPE','Pepe'),
]

# ── Use-case data ─────────────────────────────────────────────────────────────
UC_COLORS = {
    'beginners':        ( 52, 211, 153),
    'futures':          (239, 100,  97),
    'no-kyc':           (167, 139, 250),
    'copy-trading':     ( 56, 189, 248),
    'low-fees':         (251, 191,  36),
    'p2p':              ( 52, 211, 153),
    'p2p-trading':      ( 52, 211, 153),
    'altcoins':         (245, 158,  11),
    'high-leverage':    (239, 100,  97),
    'day-traders':      ( 56, 189, 248),
    'day-trading':      ( 56, 189, 248),
    'mobile-trading':   ( 52, 211, 153),
    'europe':           ( 96, 165, 250),
    'uk':               ( 96, 165, 250),
    'canada':           (239, 100,  97),
    'passive-income':   (167, 139, 250),
    'leverage-trading': (239, 100,  97),
    'stablecoin-yield': ( 38, 161, 123),
    'tax-friendly':     ( 52, 211, 153),
    'spot-trading':     (245, 197,  66),
}

UC_DATA = [
    ('beginners',       'Best for Beginners',         'Start crypto with zero experience'),
    ('futures',         'Futures Trading',             'Perpetual contracts & leverage'),
    ('no-kyc',          'No KYC Exchanges',            'Trade without identity verification'),
    ('copy-trading',    'Copy Trading',                'Mirror top traders automatically'),
    ('low-fees',        'Low Fee Exchanges',           'Minimise trading costs'),
    ('p2p',             'P2P Trading',                 'Buy crypto from real people'),
    ('altcoins',        'Altcoin Trading',             'Access 500+ tokens & altcoins'),
    ('high-leverage',   'High Leverage Trading',       'Up to 125× leverage available'),
    ('day-traders',     'Best for Day Traders',        'Speed, depth, low latency'),
    ('day-trading',     'Day Trading Exchanges',       'Tight spreads, fast execution'),
    ('mobile-trading',  'Mobile Trading Apps',         'Trade on iOS & Android'),
    ('europe',          'Best for Europe',             'Regulated, EUR-friendly'),
    ('uk',              'Best for UK Traders',         'FCA-compliant alternatives'),
    ('canada',          'Best for Canada',             'CAD on/off ramps'),
    ('passive-income',  'Passive Income',              'Staking, earn & yield products'),
    ('leverage-trading','Leverage Trading',            'Amplify positions up to 100×'),
    ('p2p-trading',     'P2P Trading Platforms',       'Peer-to-peer crypto marketplace'),
    ('stablecoin-yield','Stablecoin Yield',            'Earn on USDT, USDC & DAI'),
    ('tax-friendly',    'Tax-Friendly Exchanges',      'KYC & reporting tools'),
    ('spot-trading',    'Spot Trading Exchanges',      'Buy & sell at current market price'),
]

# ── Fonts ─────────────────────────────────────────────────────────────────────
FONTS_WIN = r"C:\Windows\Fonts"

def font(weight, size):
    candidates = {
        'black': ['seguibl.ttf',  'bahnschrift.ttf', 'arialbd.ttf'],
        'bold':  ['segoeuib.ttf', 'bahnschrift.ttf', 'arialbd.ttf'],
        'semi':  ['seguisb.ttf',  'segoeuib.ttf',    'arialbd.ttf'],
        'reg':   ['segoeui.ttf',  'arial.ttf'],
        'light': ['segoeuil.ttf', 'segoeui.ttf',     'arial.ttf'],
    }
    for fn in candidates.get(weight, ['segoeui.ttf']):
        p = os.path.join(FONTS_WIN, fn)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# ── Helpers ───────────────────────────────────────────────────────────────────
def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))

def clamp01(v):
    return max(0.0, min(1.0, v))

def tw(draw, text, fnt):
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[2] - bb[0]

def th(draw, text, fnt):
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[3] - bb[1]

def draw_gradient_bg(img, c1=BG1, c2=BG2):
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = clamp01(x / W * 0.55 + y / H * 0.45)
            px[x, y] = lerp(c1, c2, t)

def draw_radial_glow(img, cx, cy, radius, color, strength=0.15):
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
    for x in range(W):
        t = x / (W - 1)
        draw.rectangle([x, y, x, y + h - 1], fill=lerp(c1, c2, t))

def subtle_grid(draw, color=(28, 28, 44), step=48):
    for gy in range(0, H, step):
        for gx in range(0, W, step):
            draw.rectangle([gx, gy, gx + 1, gy + 1], fill=color)

def draw_cbw_footer(draw, y=H - 52):
    draw.text((80, y),      'CryptoBonusWorld',      font=font('semi', 19), fill=GOLD2)
    draw.text((80, y + 24), 'cryptobonusworld.com',  font=font('reg',  16), fill=MUTED)

def draw_coin_symbol_badge(img, symbol, color, cx, cy):
    """
    Draw a beautiful glowing coin badge:
    - 3 concentric glow rings
    - Filled circle with brand colour tint
    - Symbol text centred
    Returns (img, draw)
    """
    r = 120  # outer radius

    # ── Glow rings ────────────────────────────────────────────────────────────
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    for step in range(60, 0, -1):
        ring_r = r + step * 2
        alpha  = int(55 * (1 - step / 60) ** 2.2)
        gd.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
                   fill=(*color, alpha))
    base = img.convert('RGBA')
    base.alpha_composite(glow)
    img  = base.convert('RGB')
    draw = ImageDraw.Draw(img)

    # ── Circle fill (dark with colour tint) ───────────────────────────────────
    fill_bg = lerp((14, 14, 22), color, 0.25)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill_bg)

    # ── 2-px coloured ring ────────────────────────────────────────────────────
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=3)

    # ── Inner ring (subtle) ───────────────────────────────────────────────────
    draw.ellipse([cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10],
                 outline=(*lerp(color, (255,255,255), 0.15),), width=1)

    # ── Symbol text ───────────────────────────────────────────────────────────
    sym_len = len(symbol)
    sym_size = 62 if sym_len <= 3 else 50 if sym_len == 4 else 42
    f_sym = font('black', sym_size)
    sym_w = tw(draw, symbol, f_sym)
    sym_h = th(draw, symbol, f_sym)
    draw.text((cx - sym_w // 2, cy - sym_h // 2 - 2), symbol, font=f_sym, fill=WHITE)

    return img, draw

def draw_giant_watermark(img, text, color, alpha=14):
    """Faint large symbol as right-side watermark."""
    wm  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd  = ImageDraw.Draw(wm)
    f_wm = font('black', 340)
    bb   = wd.textbbox((0, 0), text, font=f_wm)
    lw, lh = bb[2] - bb[0], bb[3] - bb[1]
    wx   = 620 + (W - 620 - lw) // 2
    wy   = (H - lh) // 2 - 10
    wd.text((wx, wy), text, font=f_wm, fill=(*color, alpha))
    base = img.convert('RGBA')
    base.alpha_composite(wm)
    return base.convert('RGB')

# ════════════════════════════════════════════════════════════════════════════
# COIN OG
# ════════════════════════════════════════════════════════════════════════════

def make_coin_og(slug, symbol, name):
    color = COIN_COLORS.get(slug, GOLD2)

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, BG1, (13, 15, 24))

    # Glow: coin colour top-right, dark bottom-left
    img = draw_radial_glow(img, W - 60,  -40,  520, color,         strength=0.10)
    img = draw_radial_glow(img,      0,  H + 40, 400, (10, 12, 26), strength=0.14)

    draw = ImageDraw.Draw(img)
    subtle_grid(draw, color=(24, 24, 40), step=52)

    # Gold top bar with coin-colour tint
    for x in range(W):
        t = x / (W - 1)
        c = lerp(lerp(GOLD3, color, 0.30), lerp(GOLD1, color, 0.20), t)
        draw.rectangle([x, 0, x, 4], fill=c)

    lx  = 80
    bx  = lx + 280   # text starts after badge

    # ── Coin badge ────────────────────────────────────────────────────────────
    badge_cx = lx + 120
    badge_cy = H // 2 - 20
    img, draw = draw_coin_symbol_badge(img, symbol, color, badge_cx, badge_cy)

    # ── Pre-label ─────────────────────────────────────────────────────────────
    f_pre = font('bold', 14)
    pre   = 'BUY   CRYPTO   WITH   BONUS'
    draw.text((bx, 38), pre, font=f_pre, fill=MUTED)

    # ── Coin name (large) ─────────────────────────────────────────────────────
    f_name   = font('black', 74)
    name_disp = name if len(name) <= 12 else name.split('(')[0].strip()
    draw.text((bx, 70), name_disp, font=f_name, fill=WHITE)

    # ── Symbol pill ───────────────────────────────────────────────────────────
    f_pill  = font('bold', 18)
    pill_bg = lerp((20, 20, 32), color, 0.25)
    pill_fg = lerp(WHITE, color, 0.10)
    sym_pill_text = f' {symbol} '
    pill_w  = tw(draw, sym_pill_text, f_pill) + 20
    pill_h  = 32
    pill_y  = 156
    draw.rounded_rectangle([bx, pill_y, bx + pill_w, pill_y + pill_h],
                            radius=8, fill=pill_bg)
    draw.rounded_rectangle([bx, pill_y, bx + pill_w, pill_y + pill_h],
                            radius=8, outline=(*color,), width=1)
    draw.text((bx + 10, pill_y + 6), sym_pill_text.strip(), font=f_pill, fill=pill_fg)

    # ── Divider ───────────────────────────────────────────────────────────────
    div_y = 218
    draw.rectangle([bx, div_y, bx + 500, div_y + 2],
                   fill=lerp(GOLD3, color, 0.40))

    # ── Subtitle ──────────────────────────────────────────────────────────────
    f_sub = font('semi', 28)
    draw.text((bx, div_y + 14), f'Best exchanges to buy {symbol}', font=f_sub, fill=W2)

    # ── Three key points ──────────────────────────────────────────────────────
    points = [
        f'Compare bonuses across 12+ exchanges',
        f'Verified referral codes — June 2026',
        f'Includes no-KYC & low-fee options',
    ]
    f_pt  = font('reg', 19)
    dot_c = lerp(color, GOLD1, 0.40)
    for i, pt in enumerate(points):
        py = div_y + 62 + i * 34
        draw.ellipse([bx, py + 8, bx + 7, py + 15], fill=dot_c)
        draw.text((bx + 16, py), pt, font=f_pt, fill=MUTED)

    # ── Footer ────────────────────────────────────────────────────────────────
    draw_cbw_footer(draw)

    # Right accent bar
    bar_c = lerp(color, GOLD1, 0.25)
    draw.rectangle([W - 7, 0, W - 3, H], fill=bar_c)

    # Bottom bar
    for x in range(W):
        t = x / (W - 1)
        draw.rectangle([x, H - 4, x, H - 1], fill=lerp(color, GOLD1, t * 0.5))

    # Faint watermark
    img = draw_giant_watermark(img, symbol, color, alpha=18)

    out = os.path.join(OUT_OG, f'coin-{slug}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] coin-{slug}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# USE-CASE OG
# ════════════════════════════════════════════════════════════════════════════

def make_use_case_og(slug, title, subtitle):
    color = UC_COLORS.get(slug, GOLD2)

    img = Image.new('RGB', (W, H), BG1)
    draw_gradient_bg(img, BG1, (12, 14, 24))

    img = draw_radial_glow(img, W - 80,  80,  500, color,         strength=0.09)
    img = draw_radial_glow(img,      0,  H,   380, (10, 12, 28), strength=0.13)

    draw = ImageDraw.Draw(img)
    subtle_grid(draw, color=(24, 24, 42), step=52)

    # Top bar
    for x in range(W):
        t = x / (W - 1)
        draw.rectangle([x, 0, x, 4], fill=lerp(GOLD3, lerp(GOLD1, color, 0.30), t))

    lx = 80

    # ── Pre-label ─────────────────────────────────────────────────────────────
    f_pre = font('bold', 14)
    draw.text((lx, 38), 'CRYPTO EXCHANGE COMPARISON   ·   2026', font=f_pre, fill=MUTED)

    # ── Title (word-wrapped if needed) ────────────────────────────────────────
    f_title = font('black', 68)
    # Split at natural break if title is too long
    words = title.split()
    line1, line2 = '', ''
    for w in words:
        candidate = (line1 + ' ' + w).strip()
        if tw(draw, candidate, f_title) < W - lx - 120:
            line1 = candidate
        else:
            line2 = (line2 + ' ' + w).strip()

    draw.text((lx, 70),  line1, font=f_title, fill=WHITE)
    if line2:
        draw.text((lx, 148), line2, font=f_title, fill=WHITE)

    title_bottom = 148 + 80 if line2 else 148

    # ── Coloured accent underline ─────────────────────────────────────────────
    div_y = title_bottom + 12
    div_w = min(tw(draw, line1, f_title), W - lx - 120)
    draw.rectangle([lx, div_y, lx + div_w, div_y + 4],
                   fill=lerp(color, GOLD1, 0.35))

    # ── Subtitle ──────────────────────────────────────────────────────────────
    f_sub = font('semi', 26)
    draw.text((lx, div_y + 18), subtitle, font=f_sub, fill=W2)

    # ── Feature chips ────────────────────────────────────────────────────────
    chips = ['Verified bonuses', 'Working referral codes', 'Updated June 2026']
    f_chip = font('semi', 16)
    chip_x = lx
    chip_y = div_y + 68
    chip_bg = lerp((18, 18, 32), color, 0.22)
    for chip in chips:
        cw = tw(draw, chip, f_chip) + 28
        ch = 34
        draw.rounded_rectangle([chip_x, chip_y, chip_x + cw, chip_y + ch],
                                radius=8, fill=chip_bg)
        draw.rounded_rectangle([chip_x, chip_y, chip_x + cw, chip_y + ch],
                                radius=8, outline=(*lerp(color, (255,255,255), 0.2),), width=1)
        draw.text((chip_x + 14, chip_y + 8), chip, font=f_chip, fill=lerp(W2, color, 0.25))
        chip_x += cw + 12

    # ── Bottom section: exchange count ────────────────────────────────────────
    f_count = font('black', 48)
    count_y = H - 170
    draw.text((lx, count_y), '12+', font=f_count, fill=lerp(GOLD1, color, 0.30))
    f_count_sub = font('reg', 20)
    draw.text((lx + tw(draw, '12+', f_count) + 18, count_y + 12),
              'exchanges compared', font=f_count_sub, fill=MUTED)

    # ── Footer ────────────────────────────────────────────────────────────────
    draw_cbw_footer(draw)

    # Right accent bar
    draw.rectangle([W - 7, 0, W - 3, H], fill=lerp(color, GOLD1, 0.20))

    # Bottom bar
    for x in range(W):
        t = x / (W - 1)
        draw.rectangle([x, H - 4, x, H - 1], fill=lerp(color, GOLD1, t * 0.45))

    # Large faint initial watermark right side
    wm  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd  = ImageDraw.Draw(wm)
    f_wm = font('black', 380)
    letter = title.split()[0][0].upper()
    bb = wd.textbbox((0, 0), letter, font=f_wm)
    lw2, lh2 = bb[2] - bb[0], bb[3] - bb[1]
    wx  = 680 + (W - 680 - lw2) // 2
    wy  = (H - lh2) // 2 - 10
    wd.text((wx, wy), letter, font=f_wm, fill=(*color, 16))
    base = img.convert('RGBA')
    base.alpha_composite(wm)
    img  = base.convert('RGB')

    out = os.path.join(OUT_OG, f'use-case-{slug}.png')
    img.save(out, 'PNG', optimize=True)
    print(f'[OK] use-case-{slug}.png  ({os.path.getsize(out) // 1024} KB)')


# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════

def main():
    print('CryptoBonusWorld — Coin & Use-Case OG Generator')
    print('=' * 52)

    print(f'\n[COINS] {len(COIN_DATA)} images')
    for slug, symbol, name in COIN_DATA:
        try:
            make_coin_og(slug, symbol, name)
        except Exception as e:
            print(f'[FAIL] coin-{slug}: {e}')

    print(f'\n[USE-CASES] {len(UC_DATA)} images')
    for slug, title, subtitle in UC_DATA:
        try:
            make_use_case_og(slug, title, subtitle)
        except Exception as e:
            print(f'[FAIL] use-case-{slug}: {e}')

    coin_count = sum(1 for _, _, _ in COIN_DATA)
    uc_count   = sum(1 for _, _, _ in UC_DATA)
    print(f'\n{"=" * 52}')
    print(f'Done — {coin_count + uc_count} OG images generated')
    print(f'  public/og/coin-*.png        ({coin_count})')
    print(f'  public/og/use-case-*.png    ({uc_count})')

if __name__ == '__main__':
    main()
