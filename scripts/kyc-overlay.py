from PIL import Image, ImageDraw

BASE = r'C:\projects\CryptoBonusWorld\public\media\walkthroughs\bybit'

# ── FACE IMAGE: draw smiley in the oval ──────────────────────────────────────
img = Image.open(BASE + r'\KYC - mob - face id.jpg').convert('RGBA')
overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)

cx, cy, r = 369, 690, 232  # oval centre + radius

# Yellow face circle
d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255, 220, 50, 255))

# Eyes
ew = 28
d.ellipse([cx-80-ew, cy-70-ew, cx-80+ew, cy-70+ew], fill=(30, 30, 30, 255))
d.ellipse([cx+80-ew, cy-70-ew, cx+80+ew, cy-70+ew], fill=(30, 30, 30, 255))

# Smile
for i in range(8):
    d.arc([cx-120, cy, cx+120, cy+140], start=10, end=170,
          fill=(30, 30, 30, 255), width=10)

# Eyebrows
for off in range(4):
    d.arc([cx-115, cy-175+off*3, cx-35, cy-90+off*3],
          start=200, end=340, fill=(80, 50, 20, 255), width=6)
    d.arc([cx+35,  cy-175+off*3, cx+115, cy-90+off*3],
          start=200, end=340, fill=(80, 50, 20, 255), width=6)

result = Image.alpha_composite(img, overlay).convert('RGB')
out_face = BASE + r'\KYC - mob - face id - edited.jpg'
result.save(out_face, quality=92)
print('face saved:', out_face)

# ── DOCUMENT IMAGE: draw fake ID card in scan frame ──────────────────────────
img2 = Image.open(BASE + r'\KYC - mob - 1 - document.jpg').convert('RGB')
d2 = ImageDraw.Draw(img2)

# Scan frame is roughly: x 60-678, y 540-980
fx1, fy1, fx2, fy2 = 72, 548, 666, 962

# White card background
d2.rectangle([fx1+10, fy1+10, fx2-10, fy2-10], fill=(245, 245, 245))

# Card border
d2.rectangle([fx1+10, fy1+10, fx2-10, fy2-10], outline=(180, 180, 200), width=3)

# Photo placeholder (left side) - smiley face box
px1, py1, px2, py2 = fx1+22, fy1+22, fx1+140, fy1+175
d2.rectangle([px1, py1, px2, py2], fill=(200, 215, 235))
# Mini smiley in photo box
pcx = (px1+px2)//2
pcy = (py1+py2)//2
pr = 42
d2.ellipse([pcx-pr, pcy-pr, pcx+pr, pcy+pr], fill=(255, 220, 50))
d2.ellipse([pcx-14, pcy-12, pcx-6, pcy-4],   fill=(40, 40, 40))
d2.ellipse([pcx+6,  pcy-12, pcx+14, pcy-4],  fill=(40, 40, 40))
d2.arc([pcx-16, pcy+2, pcx+16, pcy+22], start=10, end=170, fill=(40, 40, 40), width=4)

# Text lines (right of photo)
lx = fx1 + 158
line_color = (160, 160, 175)
name_color = (60, 60, 80)
d2.rectangle([lx, fy1+30, lx+180, fy1+46], fill=name_color)
d2.rectangle([lx, fy1+58, lx+140, fy1+70], fill=line_color)
d2.rectangle([lx, fy1+82, lx+120, fy1+94], fill=line_color)
d2.rectangle([lx, fy1+106, lx+160, fy1+118], fill=line_color)
d2.rectangle([lx, fy1+130, lx+100, fy1+142], fill=line_color)

# Separator line
d2.line([fx1+20, fy1+200, fx2-20, fy1+200], fill=(200, 200, 210), width=1)

# MRZ-style lines at bottom
mrz_y = fy2 - 80
mrz_color = (140, 140, 155)
d2.rectangle([fx1+20, mrz_y,    fx2-20, mrz_y+14],    fill=mrz_color)
d2.rectangle([fx1+20, mrz_y+22, fx2-20, mrz_y+36], fill=mrz_color)

# Flag/chip placeholder top-right
d2.rectangle([fx2-80, fy1+20, fx2-20, fy1+55], fill=(220, 185, 80), outline=(190, 160, 60), width=2)

out_doc = BASE + r'\KYC - mob - 1 - document - edited.jpg'
img2.save(out_doc, quality=92)
print('doc saved:', out_doc)
