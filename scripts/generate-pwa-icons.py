#!/usr/bin/env python3
"""public/icons/icon.png → Android/iOS PWA 크기별 PNG 생성."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "icons" / "icon.png"
OUT = ROOT / "public" / "icons"

# (size_px, filename)
SIZES = [
    (144, "icon-144.png"),
    (192, "icon-192.png"),
    (512, "icon-512.png"),
    (180, "apple-touch-icon.png"),
    (167, "apple-touch-icon-167.png"),
    (152, "apple-touch-icon-152.png"),
    (120, "apple-touch-icon-120.png"),
]


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"원본이 없습니다: {SRC}")
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    sq = im.crop((left, top, left + s, top + s))
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in SIZES:
        out = OUT / name
        sq.resize((size, size), Image.Resampling.LANCZOS).save(
            out, "PNG", optimize=True
        )
        print(f"Wrote {out.relative_to(ROOT)} ({size}×{size})")


if __name__ == "__main__":
    main()
