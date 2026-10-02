#!/usr/bin/env python3
"""Home Screen app icons: the sprig on Velvet's plum wall and lamp light.

Writes the SVG sources (scripts/icons/icon.svg, icon-maskable.svg; public/favicon.svg),
then renders the PNGs into public/ with headless Chromium (scripts/icons/render.mjs, needs
the `playwright` package and a Chromium it can launch):

  public/apple-touch-icon.png      180  iOS Home Screen (opaque: iOS fills transparency black)
  public/icons/icon-192.png        192  manifest, purpose any
  public/icons/icon-512.png        512  manifest, purpose any (Android splash)
  public/icons/icon-maskable-512.png 512 manifest, purpose maskable (sprig inside the 80% safe circle)

Usage: python3 scripts/icons/build.py [--svg-only]
An original drawing on purpose: the old favicon was the 🌿 emoji, whose platform art is not
ours to ship as an app icon and renders differently on every OS.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

def svg(scale=1.0, dy=18, rounded=False):
    leaf = "M0 0 C 30 -27, 80 -29, 112 0 C 80 29, 30 27, 0 0 Z"
    vein = "M6 0 Q 56 -4 104 0"
    leaves = [  # x, y, angle, size, shade
        (254, 368, -152, 1.00, "a"), (255, 346, -28, 1.00, "b"),
        (257, 300, -146, 0.88, "b"), (259, 276, -34, 0.88, "a"),
        (261, 226, -138, 0.74, "a"), (262, 205, -42, 0.74, "b"),
        (259, 150, -96, 0.62, "b"),
    ]
    g = []
    for x, y, a, s, sh in leaves:
        g.append(f'<g transform="translate({x} {y}) rotate({a}) scale({s})">'
                 f'<path d="{leaf}" fill="url(#leaf{sh})"/>'
                 f'<path d="{vein}" fill="none" stroke="#E9F2D8" stroke-opacity=".45" stroke-width="3.2" stroke-linecap="round"/></g>')
    rx = ' rx="112"' if rounded else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34233A"/><stop offset="1" stop-color="#170F1B"/></linearGradient>
    <radialGradient id="lamp" cx=".5" cy="-.04" r=".75" fx=".5" fy="-.04"><stop offset="0" stop-color="#FFBE82" stop-opacity=".34"/><stop offset=".55" stop-color="#FFBE82" stop-opacity=".08"/><stop offset="1" stop-color="#FFBE82" stop-opacity="0"/></radialGradient>
    <linearGradient id="leafa" x1="0" y1="-1" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#B9DB9C"/><stop offset="1" stop-color="#6E9F6A"/></linearGradient>
    <linearGradient id="leafb" x1="0" y1="-1" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#9CCB8E"/><stop offset="1" stop-color="#4F8459"/></linearGradient>
    <linearGradient id="stem" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E0A85E"/><stop offset="1" stop-color="#F6D29A"/></linearGradient>
  </defs>
  <rect width="512" height="512"{rx} fill="url(#wall)"/>
  <rect width="512" height="512"{rx} fill="url(#lamp)"/>
  <g transform="translate(256 {256+dy}) scale({scale}) translate(-256 -256)">
    <path d="M255 418 C 249 340, 270 262, 259 146" fill="none" stroke="url(#stem)" stroke-width="9" stroke-linecap="round"/>
    {"".join(g)}
  </g>
</svg>'''


def main():
    with open(os.path.join(HERE, "icon.svg"), "w") as f: f.write(svg(1.0) + "\n")
    with open(os.path.join(HERE, "icon-maskable.svg"), "w") as f: f.write(svg(0.78, 14) + "\n")
    with open(os.path.join(ROOT, "public", "favicon.svg"), "w") as f: f.write(svg(1.12, 14, rounded=True) + "\n")
    if "--svg-only" not in sys.argv:
        subprocess.run(["node", os.path.join(HERE, "render.mjs")], check=True, cwd=ROOT)


if __name__ == "__main__":
    main()
