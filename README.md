# mahmuda.fun – Premium Adult Story Platform

Reader-first premium adult story website with Day/Night mode, immersive Read Mode, full image & video support, SEO metadata, and automatic ad injection in every new post.

Live: [mahmuda.fun](https://mahmuda.fun)

## Architecture

```
/
├── index.html                 ← Home / Feed + Read Mode
├── categories.html            ← Browse by category (?cat=Romance)
├── series.html                ← All series with episode lists
├── video.html / gallery.html  ← Media pages
├── assets/
│   ├── logo.svg               ← Playful SVG logo (moon + wink)
│   ├── css/
│   │   ├── style.css          ← Design tokens & base
│   │   ├── navigation.css     ← Premium glass navbar + SVG logo
│   │   ├── blog.css           ← Feed, cards, Read Mode typography
│   │   ├── ads.css            ← Ad slots & mobile reading fix
│   │   └── pages.css          ← Video / gallery pages
│   ├── js/
│   │   ├── navigation.js      ← Theme · menu · active nav (single source)
│   │   ├── blog.js            ← Feed, media rendering, Read Mode, SEO
│   │   └── ads.js             ← Ad manager + auto in-post injection
│   ├── images/gallery/        ← Story scene SVG art
│   └── video/                 ← Local story videos (optional)
├── story-post/                ← Drop raw .md stories here
│   ├── image/                 ← Local story images (optional)
│   └── video/                 ← Local story videos (optional)
├── script/blog-builder.js     ← Markdown → JSON + sitemap + SEO + ad markers
└── stories/                   ← Generated JSON (live data)
```

## Features

- **Reader-first design** — large comfortable type, wide column, Read Mode panel with progress bar
- **Dark / Light theme** (Day–Night toggle, persists, respects system preference)
- **Premium navigation** — playful SVG logo, Home · Video · Category · Gallery · Series
- **Full media support** — local & external images, videos, audio in every post
- **All link types** — story deep links (?story=id), categories, safe external links
- **SEO** — per-story title/description/keywords, sitemap.xml, robots.txt, JSON-LD, canonical URLs
- **Automatic ad injection** — every new post gets inline-native, mid-content & end-of-post ad slots at build time, zero manual work
- **Series navigation** — automatic next/previous episode links
- Fully static — works on any host (GitHub Pages, Netlify, Vercel)

## How to publish a new story

1. Create a markdown file in `story-post/`:

```markdown
---
title: Your Story Title
category: Forbidden
tags: [Intimate, Fantasy, University]
series: Senior Apu
episode: 5
excerpt: Short teaser text…
date: 2026-08-07
language: bn
author: You
cover: https://i.ibb.co/xxx/cover.jpg     # external cover
# OR cover: image/cover.jpg               # local file in story-post/image/
video: video/teaser.mp4                    # local or absolute URL
audio: https://example.com/audio.mp3
images: [image/scene1.jpg, image/scene2.jpg]
---

Your full story content in **markdown** here…

Use images anywhere: ![Scene](image/scene1.jpg)
Use videos: ![Teaser](video/teaser.mp4)
Link episodes: [Next episode](?story=senior-apu-ep06)
External links get target=_blank + nofollow automatically.
```

Supported media fields in front matter: `cover` (or legacy `image`), `images[]`, `video`, `audio`.

2. Run the builder:

```bash
node script/blog-builder.js        # or: npm run build
node script/blog-builder.js --watch
```

3. Refresh the website – the new story appears automatically **with ads already injected**.

## Navigation & Pages

| Page | Purpose |
|------|---------|
| `index.html` | Feed (hero + grid) + Read Mode |
| `categories.html` | Category grid, `?cat=` deep links |
| `series.html` | All series, episode cards |
| `video.html` | Video teasers |
| `gallery.html` | Story scene gallery |
| `privacy-policy.html` | Privacy policy |

## Theme Logic

- Default: **Dark** (Night mood)
- Toggle button in navbar
- Respects `prefers-color-scheme` on first visit
- Saved preference in `localStorage`

## Tech Notes

- No framework – pure HTML/CSS/JS
- CSS variables for instant theme switching
- Glassmorphism navbar, playful SVG logo, soft gold glow accents
- Accessible Read Mode (Esc to close, stop media on close)
- Bangla + English friendly typography (Playfair Display + Inter)
- `blog-builder.js` converts markdown → JSON, updates sitemap.xml / robots.txt, computes per-story SEO keywords, and injects ad markers into every new post

---

**18+ only.** Pure fantasy content.
