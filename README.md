# Nights – Premium Adult Story Platform

Dark glossy night-mood website with Day/Night mode, clean UX, and a simple story publishing system.
live Website [Night](https://jennymahmuda.github.io/mahmuda-fun/)

## Architecture

```
/
├── index.html                 ← Main entry (live website)
├── assets/
│   ├── css/style.css          ← Dark glossy + Day mode styles
│   ├── js/
│   │   ├── apps.js            ← Theme toggle, nav, UX logic
│   │   └── blog.js            ← Story loading & reader modal
│   └── images/                ← Optimized covers (from enhance.py)
├── script/
│   ├── blog-builder.js        ← Markdown → JSON/HTML converter
│   └── enhance.py             ← Image crop, resize, SEO, WebP
├── story-post/                ← Drop raw .md stories here
└── stories/                   ← Generated JSON (live data)
    ├── index.json
    └── *.json
```

## Features

- **Dark Glossy Premium UI** (default Night mode)
- **Day / Night toggle** (persists in localStorage)
- Clean navigation + mobile menu
- Story cards grid + full reader modal
- Markdown → JSON pipeline
- SEO-friendly image processing (crop, WebP, smart filenames)
- Fully static – works on any host (GitHub Pages, Netlify, Vercel, etc.)

## How to publish a new story

1. Create a markdown file in `story-post/`:

```markdown
---
title: Your Story Title
category: Romance
tags: [Intimate, Fantasy]
excerpt: Short teaser text…
date: 2026-08-02
language: bn
cover: /assets/images/your-cover-card-800x500.webp
---

Your full story content in **markdown** here…

Paragraphs, *emphasis*, etc.
```

2. Run the builder:

```bash
node script/blog-builder.js
```

   Or watch mode:

```bash
node script/blog-builder.js --watch
```

3. (Optional) Process cover image:

```bash
python script/enhance.py your-photo.jpg --all-sizes --out assets/images/
```

4. Refresh the website – the new story appears automatically.

## Theme Logic

- Default: **Dark** (Night mood)
- Toggle button in navbar
- Respects `prefers-color-scheme` on first visit
- Saved preference in `localStorage`

## Tech Notes

- No framework – pure HTML/CSS/JS
- CSS variables for instant theme switching
- Glassmorphism navbar + soft glow accents
- Accessible reader modal (Esc to close)
- Bangla + English friendly

---

**18+ only.** Pure fantasy content.
