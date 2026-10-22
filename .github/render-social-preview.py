"""Render .github/social-preview.png at 1280x640 in the Hive Code colors.

Colors: pollen #FFC629, ultraviolet ink #1F0A4D, violet #7B3BFF.
Requires Pillow and the Inter / JetBrains Mono fonts installed on the machine.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

INK = (31, 10, 77)
POLLEN = (255, 198, 41)
VIOLET = (123, 59, 255)
WHITE = (255, 255, 255)
MUTED = (214, 204, 240)
GRID = (58, 32, 122)

WIDTH, HEIGHT = 1280, 640
OUT = Path(__file__).with_name("social-preview.png")
INTER = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"
INTER_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def hexagon(draw, cx, cy, radius, fill=None, outline=None, width=2):
    points = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(points, fill=fill, outline=outline)
    if outline and width > 1:
        draw.line(points + [points[0]], fill=outline, width=width)


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), INK)
    draw = ImageDraw.Draw(image)

    # A small cluster, fully inside the frame, clear of the type on the left.
    marks = [
        (980, 168, 34, None, GRID, 3),
        (1088, 196, 86, POLLEN, None, 0),
        (1200, 292, 58, VIOLET, None, 0),
        (968, 360, 52, None, POLLEN, 4),
        (1116, 430, 70, None, VIOLET, 4),
        (1004, 500, 28, POLLEN, None, 0),
    ]
    for cx, cy, radius, fill, outline, width in marks:
        hexagon(draw, cx, cy, radius, fill=fill, outline=outline, width=width)

    draw.rectangle((0, 0, WIDTH, 12), fill=POLLEN)
    draw.rectangle((0, HEIGHT - 10, WIDTH, HEIGHT), fill=VIOLET)

    eyebrow = font(MONO, 22)
    title = font(INTER_BOLD, 92)
    body = font(INTER, 32)
    small = font(MONO, 20)
    label = font(MONO, 18)

    draw.text((72, 78), "THE HIVE CODE", font=eyebrow, fill=POLLEN)
    draw.text((68, 124), "hive coding", font=title, fill=WHITE)
    draw.text((72, 250), "Software built by communities", font=body, fill=MUTED)
    draw.text((72, 296), "and shipped by agents.", font=body, fill=MUTED)

    draw.rectangle((72, 368, 196, 374), fill=POLLEN)

    steps = [
        ("COMMUNITY", "decides"),
        ("AGENTS", "build"),
        ("A HUMAN", "approves"),
    ]
    x = 72
    for head, tail in steps:
        draw.text((x, 404), head, font=label, fill=POLLEN)
        draw.text((x, 432), tail, font=font(INTER, 28), fill=WHITE)
        x += 210

    draw.text((72, 560), "thehivecode.ai", font=small, fill=POLLEN)
    image.save(OUT, "PNG")
    print(f"wrote {OUT} {image.size}")


if __name__ == "__main__":
    main()
