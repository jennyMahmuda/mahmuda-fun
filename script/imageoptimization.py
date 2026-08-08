#!/usr/bin/env python3
"""Create responsive WebP derivatives without overwriting source artwork.

Usage:
  python3 script/imageoptimization.py                 # report candidates only
  python3 script/imageoptimization.py --write         # write assets/images/optimized
"""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [ROOT / "assets" / "images", ROOT / "story-post" / "image"]
OUTPUT = ROOT / "assets" / "images" / "optimized"
FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
WIDTHS = (480, 800, 1200)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write WebP derivatives")
    parser.add_argument("--quality", type=int, default=82)
    args = parser.parse_args()
    files = sorted({p for source in SOURCES if source.exists() for p in source.rglob("*") if p.suffix.lower() in FORMATS})
    written = 0
    for source in files:
        try:
            with Image.open(source) as image:
                width, height = image.size
                if width < 480:
                    continue
                print(f"{source.relative_to(ROOT)}: {width}x{height}")
                if not args.write:
                    continue
                relative = source.relative_to(ROOT)
                target_dir = OUTPUT / relative.parent.relative_to("assets/images") if str(relative).startswith("assets/images/") else OUTPUT / "story-post"
                target_dir.mkdir(parents=True, exist_ok=True)
                for target_width in WIDTHS:
                    if width < target_width:
                        continue
                    target_height = round(height * target_width / width)
                    derivative = ImageOps.exif_transpose(image).convert("RGB").resize((target_width, target_height), Image.Resampling.LANCZOS)
                    target = target_dir / f"{source.stem}-{target_width}w.webp"
                    derivative.save(target, "WEBP", quality=max(60, min(args.quality, 95)), method=6)
                    written += 1
        except Exception as exc:
            print(f"skip {source}: {exc}")
    print(f"imageoptimization: scanned={len(files)} written={written} mode={'write' if args.write else 'dry-run'}")


if __name__ == "__main__":
    main()
