#!/usr/bin/env python3
"""
mahmuda.fun – Lighthouse Performance Guardian
=============================================
Keeps the static site fast, smooth, and SEO-friendly.

Usage:
  python3 script/Lighthouse.py              # audit local HTML/assets
  python3 script/Lighthouse.py --fix       # auto-fix common issues
  python3 script/Lighthouse.py --url https://mahmuda.fun  # live Lighthouse (npx)
  python3 script/Lighthouse.py --all        # local + live

Exit 0 = pass, 1 = errors (CI-friendly).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent
HTML_PAGES = [
    "index.html",
    "gallery.html",
    "video.html",
    "privacy-policy.html",
    "categories.html",
    "series.html",
]
MAX_HTML_KB = 80
REQUIRE_GTAG = "G-1Z0TLKJZ9R"


class Finding:
    def __init__(self, level: str, page: str, message: str, fixable: bool = False):
        self.level = level
        self.page = page
        self.message = message
        self.fixable = fixable

    def __str__(self) -> str:
        icon = {"error": "✗", "warn": "!", "info": "·", "ok": "✓"}.get(self.level, "·")
        return f"  [{icon}] {self.page}: {self.message}"


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def audit_html(path: Path) -> List[Finding]:
    findings: List[Finding] = []
    name = path.name
    html = read(path)
    if not html:
        findings.append(Finding("error", name, "file missing or empty"))
        return findings

    size_kb = len(html.encode("utf-8")) / 1024
    if size_kb > MAX_HTML_KB:
        findings.append(Finding("warn", name, f"HTML large ({size_kb:.1f} KB > {MAX_HTML_KB} KB)"))
    else:
        findings.append(Finding("ok", name, f"HTML size OK ({size_kb:.1f} KB)"))

    if "upgrade-insecure-requests" not in html:
        findings.append(Finding("warn", name, "missing CSP upgrade-insecure-requests", fixable=True))
    else:
        findings.append(Finding("ok", name, "CSP / HTTPS hardening present"))

    if REQUIRE_GTAG not in html:
        findings.append(Finding("error", name, f"missing gtag {REQUIRE_GTAG}", fixable=True))
    else:
        findings.append(Finding("ok", name, "Google Analytics gtag present"))

    style_css = read(ROOT / "assets/css/style.css")
    if "scroll-behavior" not in html and "scroll-behavior" not in style_css:
        findings.append(Finding("warn", name, "smooth scroll not detected", fixable=True))
    else:
        findings.append(Finding("ok", name, "smooth scroll available"))

    blocking = re.findall(
        r'<script(?![^>]*(?:async|defer|type=["\']application/ld\+json))[^>]+src=["\'][^"\']+["\'][^>]*>',
        html,
        flags=re.I,
    )
    blocking = [b for b in blocking if "gtag" not in b.lower() and "googletagmanager" not in b.lower()]
    if blocking:
        findings.append(Finding("warn", name, f"{len(blocking)} script(s) without defer/async", fixable=True))
    else:
        findings.append(Finding("ok", name, "scripts use async/defer"))

    imgs = re.findall(r"<img\b[^>]*>", html, flags=re.I)
    lazy_missing = 0
    for tag in imgs:
        is_logo = "logo" in tag.lower()
        has_fetch_high = "fetchpriority" in tag.lower() and "high" in tag.lower()
        has_lazy = re.search(r'loading\s*=\s*["\']lazy["\']', tag, re.I)
        has_eager = re.search(r'loading\s*=\s*["\']eager["\']', tag, re.I)
        if not is_logo and not has_fetch_high and not has_lazy and not has_eager:
            lazy_missing += 1
    if lazy_missing:
        findings.append(Finding("warn", name, f"{lazy_missing} img without loading=lazy", fixable=True))
    else:
        findings.append(Finding("ok", name, "image loading attributes OK"))

    if "fonts.googleapis.com" in html and "preconnect" not in html:
        findings.append(Finding("warn", name, "fonts without preconnect", fixable=True))

    if "viewport" not in html:
        findings.append(Finding("error", name, "missing viewport meta"))
    else:
        findings.append(Finding("ok", name, "viewport present"))

    if 'rel="canonical"' not in html and "rel='canonical'" not in html:
        findings.append(Finding("warn", name, "missing canonical link"))
    else:
        findings.append(Finding("ok", name, "canonical present"))

    return findings


def audit_css_js() -> List[Finding]:
    findings: List[Finding] = []
    css_dir = ROOT / "assets" / "css"
    js_dir = ROOT / "assets" / "js"
    for p in sorted(css_dir.glob("*.css")) if css_dir.exists() else []:
        kb = p.stat().st_size / 1024
        findings.append(Finding("ok" if kb < 50 else "warn", p.name, f"CSS {kb:.1f} KB"))
    for p in sorted(js_dir.glob("*.js")) if js_dir.exists() else []:
        kb = p.stat().st_size / 1024
        findings.append(Finding("ok" if kb < 40 else "warn", p.name, f"JS {kb:.1f} KB"))
    for name in ("robots.txt", "sitemap.xml", "llms.txt"):
        p = ROOT / name
        findings.append(Finding("ok" if p.exists() else "warn", name, "present" if p.exists() else "missing – SEO"))
    return findings


def auto_fix() -> int:
    fixed = 0
    gtag_block = """  <!-- Google tag (gtag.js) Measurement ID: G-1Z0TLKJZ9R -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1Z0TLKJZ9R"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1Z0TLKJZ9R');
  </script>
"""
    csp_block = '  <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">\n'
    preconnect = (
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    )
    for name in HTML_PAGES:
        path = ROOT / name
        if not path.exists():
            continue
        html = read(path)
        original = html

        if REQUIRE_GTAG not in html and "<meta charset" in html:
            html = re.sub(
                r'(<meta charset="UTF-8"\s*/?>)',
                r"\1\n" + gtag_block,
                html,
                count=1,
                flags=re.I,
            )

        if "upgrade-insecure-requests" not in html and "<head>" in html:
            html = html.replace("<head>", "<head>\n" + csp_block, 1)

        if "scroll-behavior" not in html and "</head>" in html:
            html = html.replace("</head>", '  <style>html{scroll-behavior:smooth}</style>\n</head>', 1)

        if "fonts.googleapis.com" in html and "preconnect" not in html:
            html = html.replace(
                '<link href="https://fonts.googleapis.com',
                preconnect + '  <link href="https://fonts.googleapis.com',
                1,
            )

        def add_defer(m: re.Match) -> str:
            tag = m.group(0)
            if "defer" in tag or "async" in tag:
                return tag
            if "assets/js/" not in tag:
                return tag
            return tag.replace("<script ", "<script defer ", 1)

        html = re.sub(r"<script\s+[^>]*src=[\"']assets/js/[^\"']+[\"'][^>]*>", add_defer, html)

        def fix_img(m: re.Match) -> str:
            tag = m.group(0)
            if "logo" in tag.lower():
                return tag
            if "fetchpriority" in tag.lower() and "high" in tag.lower():
                return tag
            if re.search(r"loading\s*=", tag, re.I):
                return tag
            return tag[:-1] + ' loading="lazy" decoding="async">'

        html = re.sub(r"<img\b[^>]*>", fix_img, html, flags=re.I)

        if html != original:
            path.write_text(html, encoding="utf-8")
            fixed += 1
            print(f"  fixed: {name}")
    return fixed


def run_live_lighthouse(url: str) -> int:
    print(f"\n→ Live Lighthouse: {url}")
    cmd = [
        "npx", "--yes", "lighthouse", url,
        "--only-categories=performance,seo,accessibility,best-practices",
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
        "--output=json",
        "--output-path=" + str(ROOT / "lighthouse-report.json"),
        "--quiet",
    ]
    try:
        subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=180)
        report = ROOT / "lighthouse-report.json"
        if not report.exists():
            print("  Lighthouse report not generated.")
            return 1
        data = json.loads(report.read_text(encoding="utf-8"))
        cats = data.get("categories", {})
        print("\n  Live scores:")
        for key in ("performance", "seo", "accessibility", "best-practices"):
            c = cats.get(key) or {}
            score = c.get("score")
            if score is not None:
                pct = int(round(score * 100))
                mark = "✓" if pct >= 90 else ("~" if pct >= 70 else "✗")
                print(f"    [{mark}] {key}: {pct}")
        audits = data.get("audits", {})
        for aid in ("largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"):
            a = audits.get(aid) or {}
            if a.get("displayValue"):
                print(f"    · {aid}: {a['displayValue']}")
        return 0
    except Exception as e:
        print(f"  Lighthouse skip/error: {e}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="mahmuda.fun Lighthouse performance guardian")
    parser.add_argument("--fix", action="store_true", help="auto-fix common HTML issues")
    parser.add_argument("--url", default="", help="run live Lighthouse on URL")
    parser.add_argument("--all", action="store_true", help="local audit + live on https://mahmuda.fun")
    args = parser.parse_args()

    print("\n🌙 mahmuda.fun – Lighthouse Performance Guardian\n")
    print(f"  Root: {ROOT}\n")

    if args.fix:
        print("→ Auto-fix")
        n = auto_fix()
        print(f"  {n} file(s) updated\n")

    all_findings: List[Finding] = []
    print("→ Local HTML audit")
    for name in HTML_PAGES:
        path = ROOT / name
        if path.exists():
            all_findings.extend(audit_html(path))
        else:
            all_findings.append(Finding("warn", name, "not found in repo root"))

    print("→ Assets / SEO files")
    all_findings.extend(audit_css_js())

    errors = [f for f in all_findings if f.level == "error"]
    warns = [f for f in all_findings if f.level == "warn"]
    oks = [f for f in all_findings if f.level == "ok"]

    for f in all_findings:
        if f.level in ("error", "warn"):
            print(f)

    print(f"\n  Summary: {len(oks)} OK · {len(warns)} warnings · {len(errors)} errors")
    print(
        """
→ Always-on speed rules
  1. gtag async – never block first paint
  2. Local JS → defer
  3. LCP image → fetchpriority=high + loading=eager
  4. Below-fold images → loading=lazy
  5. scroll-behavior: smooth
  6. CSP upgrade-insecure-requests
  7. Canonical + viewport + robots/sitemap/llms.txt
  8. Keep HTML/CSS/JS lean
"""
    )

    live_code = 0
    url = args.url or ("https://mahmuda.fun" if args.all else "")
    if url:
        live_code = run_live_lighthouse(url)

    if errors:
        print("\n✗ FAILED – fix errors (or run --fix)\n")
        return 1
    if warns:
        print("\n~ PASSED WITH WARNINGS\n")
        return 0 if live_code == 0 else live_code
    print("\n✓ PASSED – ready for fast ranking\n")
    return live_code


if __name__ == "__main__":
    sys.exit(main())
