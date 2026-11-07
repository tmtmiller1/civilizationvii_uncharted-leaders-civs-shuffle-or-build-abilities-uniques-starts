#!/usr/bin/env python3
"""Draws the generic start terrain pictures: ui/img/terrain/<family>.png, one per GENERIC_BIASES tag
(shared/lshuf-constants.js), each a small landscape of that terrain. The game ships no art for a terrain, so these are
drawn here as SVG scenes and rasterized with rsvg-convert (brew install librsvg).

    python3 scripts/art/build-terrain-art.py
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "ui", "img", "terrain")
W, H = 256, 320

SKY = {
    "day": ("#9fc9ea", "#dfeefa"), "dusk": ("#e8a86a", "#f6d9a8"), "cold": ("#b9d2e3", "#eef5fa"),
    "humid": ("#8fb7c9", "#d9ecef"), "sea": ("#86b6dc", "#d6e9f5"), "wonder": ("#5a3f8a", "#d8a8e8"),
}


def sky(kind):
    a, b = SKY[kind]
    return (f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/>'
            f'<stop offset="1" stop-color="{b}"/></linearGradient>')


def hills(color, y, amp=22, n=3, dark=None):
    """A row of rounded hills across the picture, baseline y."""
    parts = []
    step = W / n
    for i in range(n + 1):
        cx = i * step
        parts.append(f'<ellipse cx="{cx:.0f}" cy="{y}" rx="{step * 0.75:.0f}" ry="{amp}" fill="{dark or color}"/>')
    return "".join(parts) + f'<rect x="0" y="{y}" width="{W}" height="{H - y}" fill="{color}"/>'


def ground(color, y):
    return f'<rect x="0" y="{y}" width="{W}" height="{H - y}" fill="{color}"/>'


def sun(cx, cy, r, color="#fff2b0"):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" opacity="0.9"/>'


def tree(x, y, h, trunk="#5a3a1e", crown="#2f6b2a", kind="round"):
    if kind == "pine":
        return (f'<rect x="{x - 2}" y="{y - h * 0.3:.0f}" width="4" height="{h * 0.3:.0f}" fill="{trunk}"/>'
                f'<polygon points="{x},{y - h} {x - h * 0.35:.0f},{y - h * 0.25:.0f} {x + h * 0.35:.0f},{y - h * 0.25:.0f}" fill="{crown}"/>'
                f'<polygon points="{x},{y - h * 0.8:.0f} {x - h * 0.45:.0f},{y - h * 0.05:.0f} {x + h * 0.45:.0f},{y - h * 0.05:.0f}" fill="{crown}"/>')
    if kind == "palm":
        fronds = "".join(f'<path d="M{x},{y - h} q{dx},{-18} {dx * 2.2:.0f},{-4}" stroke="{crown}" stroke-width="5" fill="none" stroke-linecap="round"/>'
                         for dx in (-16, -9, 9, 16))
        return f'<path d="M{x},{y} q{-6},{-h * 0.5:.0f} {4},{-h}" stroke="{trunk}" stroke-width="5" fill="none"/>' + fronds
    return (f'<rect x="{x - 2}" y="{y - h * 0.35:.0f}" width="4" height="{h * 0.35:.0f}" fill="{trunk}"/>'
            f'<circle cx="{x}" cy="{y - h * 0.6:.0f}" r="{h * 0.38:.0f}" fill="{crown}"/>')


def peak(x, y, w, h, color="#8c96a3", snow="#f4f7fa"):
    return (f'<polygon points="{x - w / 2:.0f},{y} {x},{y - h} {x + w / 2:.0f},{y}" fill="{color}"/>'
            f'<polygon points="{x - w * 0.16:.0f},{y - h * 0.68:.0f} {x},{y - h} {x + w * 0.16:.0f},{y - h * 0.68:.0f} '
            f'{x + w * 0.06:.0f},{y - h * 0.6:.0f} {x - w * 0.06:.0f},{y - h * 0.62:.0f}" fill="{snow}"/>')


def water(y, color="#3f86c4", light="#7ab6e0", height=None):
    h = height or (H - y)
    waves = "".join(f'<path d="M{-20 + i * 48},{y + 22 + (i % 2) * 14} q12,-6 24,0 t24,0" stroke="{light}" stroke-width="3" fill="none"/>'
                    for i in range(7))
    return f'<rect x="0" y="{y}" width="{W}" height="{h}" fill="{color}"/>' + waves


def river_path(color="#3f86c4", light="#7ab6e0", width=34):
    d = f"M{W * 0.15:.0f},{H} C{W * 0.1:.0f},{H * 0.8:.0f} {W * 0.6:.0f},{H * 0.78:.0f} {W * 0.55:.0f},{H * 0.62:.0f} S{W * 0.95:.0f},{H * 0.52:.0f} {W * 1.05:.0f},{H * 0.46:.0f}"
    return (f'<path d="{d}" stroke="{color}" stroke-width="{width}" fill="none" stroke-linecap="round"/>'
            f'<path d="{d}" stroke="{light}" stroke-width="{width * 0.25:.0f}" fill="none" stroke-dasharray="14 18" stroke-linecap="round"/>')


def scene(family):
    g = H * 0.62
    if family == "desert":
        return sky("dusk") + sun(200, 70, 26, "#fff0c0") + hills("#e2c37c", g, 26, 3) + hills("#c9a25a", g + 60, 30, 2) \
            + f'<ellipse cx="60" cy="{g + 40}" rx="120" ry="24" fill="#d4b06a"/>' + tree(205, g + 50, 40, "#6b4a2a", "#4f7d3a", "palm")
    if family == "grassland":
        return sky("day") + sun(60, 60, 20) + hills("#8fc45c", g, 30, 2, "#7ab54a") + hills("#5f9c3a", g + 70, 26, 3) \
            + tree(70, g + 40, 46) + tree(190, g + 30, 34)
    if family == "plains":
        return sky("dusk") + sun(190, 64, 22) + hills("#d8c46a", g, 16, 2) + ground("#b9a24a", g + 70) \
            + "".join(f'<rect x="{18 + i * 26}" y="{g + 40 + (i % 3) * 6}" width="6" height="{34 - (i % 3) * 6}" fill="#8f7a2a"/>' for i in range(9))
    if family == "tropical":
        return sky("humid") + hills("#2f8a4a", g - 10, 40, 2, "#3f9d5a") + ground("#1f6b38", g + 50) \
            + tree(60, g + 50, 70, "#5a3a1e", "#1e8a46", "palm") + tree(170, g + 40, 60, "#5a3a1e", "#2aa058", "palm") + tree(230, g + 70, 44, "#5a3a1e", "#1e8a46", "round")
    if family == "tundra":
        return sky("cold") + hills("#e9f1f5", g, 22, 3, "#dfe9ee") + ground("#cfdce3", g + 70) \
            + tree(60, g + 30, 56, "#4a3a2e", "#3a6a4a", "pine") + tree(120, g + 48, 40, "#4a3a2e", "#2f5a40", "pine") + tree(200, g + 36, 62, "#4a3a2e", "#3a6a4a", "pine")
    if family == "flat":
        return sky("day") + sun(70, 58, 18) + ground("#b8c77a", g) + f'<rect x="0" y="{g}" width="{W}" height="6" fill="#9db060"/>' \
            + f'<rect x="0" y="{g + 60}" width="{W}" height="4" fill="#9db060"/>' + f'<rect x="0" y="{g + 120}" width="{W}" height="4" fill="#9db060"/>'
    if family == "hill":
        return sky("day") + hills("#9fb86a", g - 20, 48, 2, "#8aa65a") + hills("#7a9a4a", g + 50, 44, 3) + hills("#5f7f38", g + 120, 36, 2)
    if family == "mountain":
        return sky("cold") + peak(70, g + 40, 170, 150, "#7f8a97") + peak(190, g + 40, 190, 190, "#8c96a3") + peak(130, g + 50, 140, 110, "#6f7a87") \
            + ground("#5f6f5a", g + 40)
    if family == "navigable_river":
        return sky("day") + hills("#7fb45a", g - 30, 26, 3) + ground("#6aa04a", g) + river_path("#2f78b8", "#8fc4e8", 62)
    if family == "vegetated":
        return sky("humid") + ground("#3f7a3a", g - 20) + "".join(tree(18 + i * 30, g + 20 + (i % 2) * 24, 60 + (i % 3) * 10, "#4a3220", ("#2f6b2a", "#3b7f34", "#255c24")[i % 3]) for i in range(8))
    if family == "floodplain":
        return sky("day") + ground("#9fc96a", g - 10) + river_path("#3f86c4", "#8fc4e8", 36) \
            + "".join(f'<rect x="{10 + i * 30}" y="{g + 6 + (i % 2) * 10}" width="5" height="22" fill="#6a9a3a"/>' for i in range(8))
    if family == "coast":
        return sky("sea") + sun(200, 66, 22) + water(g - 10, "#2f7fc0", "#8fc4e8") + f'<path d="M0,{H} L0,{g + 90} Q{W * 0.5:.0f},{g + 60} {W},{g + 110} L{W},{H} Z" fill="#e3cf92"/>'
    if family == "river":
        return sky("day") + hills("#8fc45c", g - 20, 28, 3) + ground("#6aa04a", g + 10) + river_path("#3f86c4", "#8fc4e8", 30)
    if family == "lake":
        return sky("day") + hills("#7fb45a", g - 30, 30, 3) + ground("#6aa04a", g) + f'<ellipse cx="{W / 2:.0f}" cy="{g + 90}" rx="110" ry="54" fill="#3f86c4"/>' \
            + f'<ellipse cx="{W / 2 - 20:.0f}" cy="{g + 80}" rx="60" ry="16" fill="#7ab6e0" opacity="0.6"/>' + tree(40, g + 30, 40) + tree(220, g + 36, 36)
    if family == "natural_wonder":
        return sky("wonder") + sun(128, 90, 34, "#ffe9a8") + peak(128, g + 60, 200, 210, "#6a5a8a", "#f7e9ff") + peak(50, g + 60, 120, 120, "#4a3f6a") + peak(210, g + 60, 120, 130, "#4a3f6a") \
            + ground("#3a3450", g + 60) + "".join(f'<circle cx="{30 + i * 40}" cy="{40 + (i * 37) % 60}" r="2" fill="#fff"/>' for i in range(6))
    if family == "island":
        return sky("sea") + sun(60, 60, 20) + water(g - 20, "#2f7fc0", "#8fc4e8") + f'<ellipse cx="{W / 2:.0f}" cy="{g + 60}" rx="90" ry="28" fill="#e3cf92"/>' \
            + f'<ellipse cx="{W / 2:.0f}" cy="{g + 48}" rx="56" ry="18" fill="#5f9c3a"/>' + tree(128, g + 46, 56, "#6b4a2a", "#2aa058", "palm")
    return sky("day") + ground("#777", g)


def svg(family):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>'
            f'{scene(family).split("</linearGradient>")[0]}</linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
            f'{scene(family).split("</linearGradient>", 1)[1]}'
            f'<rect width="{W}" height="{H}" fill="none" stroke="#1a1410" stroke-opacity="0.35" stroke-width="6"/></svg>')


FAMILIES = ["desert", "grassland", "plains", "tropical", "tundra", "flat", "hill", "mountain", "navigable_river",
            "vegetated", "floodplain", "coast", "river", "lake", "natural_wonder", "island"]


def main():
    os.makedirs(OUT, exist_ok=True)
    for family in FAMILIES:
        svg_path = os.path.join(OUT, f"{family}.svg")
        png_path = os.path.join(OUT, f"{family}.png")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg(family))
        subprocess.run(["rsvg-convert", "-w", str(W), "-h", str(H), "-o", png_path, svg_path], check=True)
        os.remove(svg_path)
    print(f"wrote {len(FAMILIES)} pictures to {os.path.relpath(OUT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
