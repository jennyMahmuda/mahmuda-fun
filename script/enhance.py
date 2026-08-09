#!/usr/bin/env python3
"""
Hushed Chapters – Image SEO & Enhancement Script
---------------------------------------
• Crops / resizes images to optimal story-card & OpenGraph sizes
• Compresses for web
• Generates SEO-friendly filenames
• Adds basic metadata

Requirements:
  pip install Pillow

Usage:
  python script/enhance.py input.jpg
  python script/enhance.py input.jpg --out assets/images/
  python script/enhance.py folder/ --batch
  python script/enhance.py input.jpg --size card      # 800×500
  python script/enhance.py input.jpg --size og        # 1200×630
  python script/enhance.py input.jpg --size cover     # 1600×900
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image, ImageOps, ImageFilter, ImageEnhance
except ImportError:
    print("Pillow is required. Install with:  pip install Pillow")
    sys.exit(1)

# Target sizes (width, height)
SIZES = {
    "card":  (800, 500),    # Story card thumbnail
    "og":    (1200, 630),   # Open Graph / social
    "cover": (1600, 900),   # Large hero / cover
    "thumb": (400, 250),    # Small thumb
}

QUALITY = 85
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def smart_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Center-crop to exact aspect ratio, then resize."""
    img = ImageOps.exif_transpose(img)  # fix orientation
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        # too wide → crop sides
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        # too tall → crop top/bottom
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    return img.resize((target_w, target_h), Image.Resampling.LANCZOS)


def enhance(img: Image.Image, strength: float = 1.05) -> Image.Image:
    """Subtle sharpen + contrast boost for premium look."""
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Color(img).enhance(1.05)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    return img


def seo_filename(original: str, size_key: str) -> str:
    """Clean SEO-friendly name: original-name-card-800x500.webp"""
    stem = Path(original).stem
    # lowercase, replace spaces & special chars
    clean = "".join(c if c.isalnum() or c in "-_" else "-" for c in stem.lower())
    clean = "-".join(filter(None, clean.split("-")))  # collapse multiple -
    w, h = SIZES[size_key]
    return f"{clean}-{size_key}-{w}x{h}.webp"


def process_one(src: Path, out_dir: Path, size_key: str = "card", enhance_img: bool = True):
    if src.suffix.lower() not in SUPPORTED:
        print(f"  skip (unsupported): {src.name}")
        return

    try:
        img = Image.open(src).convert("RGB")
    except Exception as e:
        print(f"  error opening {src.name}: {e}")
        return

    target_w, target_h = SIZES[size_key]
    cropped = smart_crop(img, target_w, target_h)

    if enhance_img:
        cropped = enhance(cropped)

    out_name = seo_filename(src.name, size_key)
    out_path = out_dir / out_name

    cropped.save(out_path, "WEBP", quality=QUALITY, method=6)
    print(f"  ✓ {out_name}  ({target_w}×{target_h})")


def main():
    parser = argparse.ArgumentParser(description="Hushed Chapters Image SEO & Crop Tool")
    parser.add_argument("input", help="Image file or folder")
    parser.add_argument("--out", default="assets/images", help="Output directory")
    parser.add_argument("--size", choices=list(SIZES.keys()), default="card",
                        help="Target size preset")
    parser.add_argument("--batch", action="store_true", help="Process all images in folder")
    parser.add_argument("--no-enhance", action="store_true", help="Skip sharpen/contrast")
    parser.add_argument("--all-sizes", action="store_true",
                        help="Generate card + og + cover versions")

    args = parser.parse_args()

    src = Path(args.input)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🖼  Hushed Chapters Image Enhancer")
    print(f"   Output → {out_dir.resolve()}\n")

    sizes_to_run = list(SIZES.keys()) if args.all_sizes else [args.size]

    if src.is_dir() or args.batch:
        files = [f for f in src.iterdir() if f.suffix.lower() in SUPPORTED]
        if not files:
            print("No supported images found.")
            return
        for f in files:
            print(f"Processing {f.name}:")
            for sk in sizes_to_run:
                process_one(f, out_dir, sk, enhance_img=not args.no_enhance)
    else:
        if not src.exists():
            print(f"File not found: {src}")
            sys.exit(1)
        print(f"Processing {src.name}:")
        for sk in sizes_to_run:
            process_one(src, out_dir, sk, enhance_img=not args.no_enhance)

    print("\nDone.\n")


if __name__ == "__main__":
    main()
