# SecretChapters (mahmuda.fun) — Premium Adult Story Platform

Reader-first 18+ fiction site: Day/Night theme, an in-page Read Mode, full
image/video/audio support in every story, SEO metadata, automatic ad
injection, reader ratings/reviews/reactions, optional accounts for
member-only stories, and a login-gated admin panel for publishing without
touching git directly.

Live: [mahmuda.fun](https://mahmuda.fun)

> **Publishing a story?** This file is the architecture map. For the
> day-to-day "how do I add a story / image / category" walkthrough (with
> the exact frontmatter fields and correct image-link formats), see
> **[guideline.md](guideline.md)**.

---

## 1. Architecture roadmap — how a piece of content becomes a live page

There are two independent ways content reaches the site, and they both
end up as the same kind of file:

```
                     ┌─────────────────────────────────────────┐
  A) Direct commit   │  story-post/<id>.md   (you write this)  │
                      └───────────────────┬───────────────────┘
                                           │
  B) Admin panel      admin/ (login,        │  script/blog-builder.js
     /admin/          is_admin account)     │  (npm run build)
       │                    │               │
       │  POST /api/admin/stories           │
       │  (Cloudflare Worker → D1,          ▼
       │   draft until "Save & publish")   stories/<id>.json
       │                    │               stories/index.json
       │  script/sync-admin-stories.js      category/<slug>/index.html (×22)
       │  (scheduled GitHub Action)          assets/data/category-backgrounds.json
       │  turns a published D1 row into      sitemap.xml, robots.txt
       │  a real story-post/<id>.md file  ───┘
       ▼
  story-post/<id>.md  ──────────────────────────────────────────┘
  (from here on, both paths are identical)
```

Everything below `stories/` and `category/*/index.html` is **generated,
not hand-edited** — `npm run build` regenerates it every time from the
`.md` files in `story-post/`. Editing a generated file directly works
until the next build silently overwrites it.

```
┌────────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│  story-post/*.md    │ ──▶ │ script/blog-builder.js│ ──▶ │ stories/*.json          │
│  (source of truth)  │     │  (npm run build)      │     │ category/*/index.html  │
└────────────────────┘     └──────────────────────┘     │ sitemap.xml / robots.txt│
                                                          └───────────────────────┘
                                                                     │
                                                                     ▼
                                                    assets/js/blog.js renders the
                                                    feed/reader client-side from
                                                    stories/index.json at runtime
```

Ratings, reviews, reactions, accounts and the newsletter are **not**
build-time data — they live in Cloudflare D1 and are read/written at
runtime through the Worker API (`assets/js/rating-review.js`,
`assets/js/auth.js`, `assets/js/site-reviews-marquee.js`,
`assets/js/newsletter-footer.js` all call it directly from the browser):

```
Browser  ──fetch──▶  Cloudflare Worker (cloudflare/worker/src/index.js)
                      https://mahmuda-fun-api.mahmudajenny6.workers.dev
                            │
                            ▼
                      D1 database: mahmuda_fun_reviews
                      (story_ratings, story_reviews, reactions,
                       accounts, newsletter_subscribers,
                       admin-authored draft stories, ...)
```

Deploys are two separate GitHub Actions, intentionally decoupled so a
content commit and a Worker/schema change each deploy on their own:

| Workflow | Trigger | Does |
|---|---|---|
| `.github/workflows/Deploy.yml` | push to `main` | `npm run build` + `npm run validate`, then deploys the static site to GitHub Pages |
| `.github/workflows/cloudflare-worker.yml` | push to `main` (touching `cloudflare/**`) | Applies new D1 migrations, syncs `exclusive_content`, deploys the Worker |
| `.github/workflows/sync-admin-stories.yml` | scheduled + manual dispatch | Turns admin-panel "published" drafts in D1 into real `story-post/<id>.md` files |
| `.github/workflows/grant-admin.yml` | manual dispatch | Flips `is_admin = 1` on an account, for onboarding a new content manager |

Full Cloudflare setup (secrets, migrations, endpoint list, accounts,
exclusive-content sync) is documented separately in
**[cloudflare/README.md](cloudflare/README.md)** — it's the deploy/ops
doc, this README is the map of how the pieces fit together.

---

## 2. Repository layout

```
/
├── index.html                  ← Home feed (hero, mood/category rows, marquees, CTA)
├── admin/                      ← Login-gated Content Manager (is_admin accounts only)
│   ├── index.html              ←   story list + "+ New story" + pending-reviews moderation
│   └── story.html              ←   story editor (create/edit/publish/delete)
├── account/                    ← Email+password auth (no third-party login)
│   ├── index.html              ←   login / signup / account summary
│   ├── verify.html · forgot.html · reset.html
├── category/                   ← Category hub + one real static page per category
│   └── <slug>/index.html       ←   ×22, regenerated by `npm run build` — do not hand-edit
├── series/  video/  gellery/   ← Thin listing pages filtered from stories/index.json
├── top-rated/ trending/ new-releases/   ← Ranked/recent listing pages
├── faq.html · premium.html · become-creator.html · advertising.html
├── terms.html · privacy-policy.html · cookies.html · dmca.html · eu-dsa.html
├── parental-controls.html · trust-safety.html · content-removal.html
│
├── story-post/                 ← Source of truth: one Markdown file per story
│   ├── image/                  ←   optional local images referenced by relative path
│   └── <id>.md                 ←   frontmatter + Markdown body (see guideline.md §3–4)
├── gallery-post/                ← Gallery-only post notes (not yet a separate builder path)
├── video-story-post/            ← Video-story post notes (not yet a separate builder path)
│
├── stories/                    ← GENERATED: per-story JSON + stories/index.json
├── sitemap.xml · robots.txt    ← GENERATED
│
├── assets/
│   ├── logo.svg                ← Lips-mark + wordmark logo
│   ├── css/
│   │   ├── style.css               ← Design tokens, base layout, old-style footer
│   │   ├── secretchapters-home.css ← Home page + side-drawer nav + sc-footer
│   │   ├── navigation.css          ← Legacy fixed navbar (non-home pages)
│   │   ├── blog.css                ← Feed cards, reader modal, ratings/reviews/marquees
│   │   ├── ads.css                 ← Ad slot styling
│   │   └── pages.css               ← Video/gallery listing pages
│   ├── js/
│   │   ├── navigation.js           ← Theme toggle, active-nav highlighting
│   │   ├── side-drawer.js          ← Slide-out nav drawer (open/close/Escape/backdrop)
│   │   ├── blog.js                 ← Feed rendering, reader modal, SEO tags
│   │   ├── auth.js                 ← Account + admin API client (thin fetch wrappers)
│   │   ├── rating-review.js        ← Per-story ratings/reactions + reviews marquee + reply form
│   │   ├── site-reviews-marquee.js ← Homepage "What readers are saying" (all stories)
│   │   ├── story-promo.js          ← Mid-page "You might also like" grid (every page)
│   │   ├── newsletter-footer.js    ← Footer "Get new stories first" email capture
│   │   ├── category-ticker.js / category-seo.js / media-index.js / site-components.js
│   │   └── ads.js                  ← Ad manager + automatic in-post ad injection
│   ├── images/ · video/            ← Uploaded media (hero, category backgrounds, covers)
│   └── data/category-backgrounds.json  ← GENERATED
│
├── script/
│   ├── blog-builder.js         ← Markdown → JSON/HTML/sitemap (the actual build logic)
│   ├── build.js                ← npm run build entry point (calls blog-builder + friends)
│   ├── builder.js              ← --watch mode wrapper
│   ├── validate-site.js        ← npm run validate — link/asset/page sanity checks
│   ├── sync-admin-stories.js   ← D1 published drafts → real story-post/*.md files
│   ├── grant-admin.js          ← CLI to set is_admin=1 on an account
│   ├── imageoptimization.py    ← npm run images:* — report/optimize/webp helpers
│   └── categories-data.js      ← The 22-category taxonomy (slugs, labels, tags)
│
├── cloudflare/
│   ├── worker/src/index.js     ← The Worker: every /api/* route in one file
│   ├── migrations/000N_*.sql   ← D1 schema history, applied in order
│   ├── schema.sql              ← Full current schema, for reference
│   └── README.md               ← Cloudflare setup, secrets, endpoint list (ops doc)
│
├── guideline.md                 ← Bangla A–Z: folders, categories, image formats, checklist
└── wrangler.toml                 ← Worker + D1 binding config
```

---

## 3. Every page — what it is and how it's reached

| Page | Path | Reached from | Purpose |
|---|---|---|---|
| Home | `/` | — (entry point) | Hero, Continue Reading, Trending, Browse by Mood, Popular Categories, New Releases, Top Rated, Series, Story Feed, reviews marquee, Why SecretChapters, FAQ, CTA |
| Side-drawer nav | home page only (`<header>` menu button) | menu button on `/` | Slide-out drawer: category accordion, Series/Video/Gallery, Premium, account link. Every other page keeps the simpler fixed `.navbar` (see §7) — it's a two/three-link nav with no mega-menu, so there was nothing to convert to a drawer there. |
| Category hub | `/category/` | nav drawer, footer | Grid of all 22 categories |
| A single category | `/category/<slug>/` | category hub, home mood/category rows, story tags | Real static page per category, its own SEO metadata |
| Series | `/series/` | nav drawer, footer | All series, grouped by episode |
| Video | `/video/` | nav drawer, footer | Stories with `type: video` |
| Gallery | `/gellery/` | nav drawer, footer | Stories with `type: image` |
| Top Rated | `/top-rated/` | home, footer | Ranked by rating (≥3 ratings to qualify) |
| Trending | `/trending/` | home, footer | Recent reader activity (GA4-informed) |
| New Releases | `/new-releases/` | home, footer | Today / this week / this month |
| Premium | `/premium.html` | nav drawer, footer | Product-guideline placeholder — no payment collected yet |
| Become a Creator | `/become-creator.html` | footer | Creator-application form → `/api/contact` |
| Advertising | `/advertising.html` | footer | Advertising inquiry info |
| FAQ | `/faq.html` | nav drawer, footer, home | Common questions |
| Terms / Privacy / Cookies / DMCA / EU DSA / Parental Controls / Trust & Safety / Content Removal | `/*.html` | footer (Legal + Support columns) | Standalone legal pages |
| Account | `/account/` | header, nav drawer | Login / signup (email+password only) |
| Verify / Forgot / Reset | `/account/verify.html` etc. | emailed links, account page | Email verification + password reset flow |
| Admin — Content Manager | `/admin/` | not linked from public nav (direct URL, `is_admin` account required) | Story list, "+ New story", pending-reviews moderation |
| Admin — Story editor | `/admin/story.html?id=<id>` | admin index "Edit"/"+ New story" | Create/edit/publish/delete one story |
| A story reader | `/index.html?story=<id>` (or from any listing page) | every story card everywhere | Reader modal: full story, ratings, reactions, reviews marquee, "Leave a Reply" form |

Every page also carries, at the bottom, the same footer (see §5) and —
except `/admin/` and `/account/*` — the mid-page "You might also like"
story grid (`assets/js/story-promo.js`), so there's always a next click
into another story regardless of which page a reader landed on.

---

## 4. Post management

Full walkthrough (Bangla, with the exact frontmatter table and correct
vs. incorrect image-link examples) lives in **[guideline.md](guideline.md)**.
Short version:

1. Write `story-post/<id>.md` — frontmatter (`title`, `category`, `tags`,
   `cover`, `images`, `video`, `audio`, `series`, `episode`, `exclusive`,
   …) + Markdown body. Or use `/admin/` if you have an `is_admin`
   account — same end result, just through a form instead of git.
2. `npm run build` — regenerates `stories/*.json`, all 22
   `category/<slug>/index.html`, `sitemap.xml`, `robots.txt`.
3. `npm run validate` — catches missing media references, dead links,
   malformed frontmatter before it ships.
4. Commit + push (or, from `/admin/`, "Save & publish" — a scheduled
   Action syncs it into a real `.md` file within ~20 minutes, or trigger
   "Sync admin-submitted stories" manually for right away).

Image links must be either a path relative to the repo root
(`assets/images/...`) or a full `https://` URL to an already-uploaded
file — never a bare filename or a path that was never actually
committed. See guideline.md §3 for the exact failure mode this causes
(a broken `<img>`'s alt text bleeding into the layout) and how every
`<img>` in the feed/reader/related-stories/promo-grid now has an
`onerror` fallback so a bad reference degrades to "no image" instead of
a broken-looking page.

### The 22 categories

Defined once in `script/categories-data.js` and consumed by the builder,
the side-drawer accordion, and the category hub. Full list in
guideline.md §5 — adding a 23rd category means adding it there, not
hand-editing any generated page.

---

## 5. Reader features (ratings, reviews, reactions, newsletter)

All of this is live traffic to the Cloudflare Worker + D1, not build-time
data — see §1's second diagram.

- **Star rating + ❤ recommend reaction** — per story, one per
  `anonymousKey` (or account, if logged in). `assets/js/rating-review.js`.
- **Reviews** — a WordPress-style "Leave a Reply" form (name, email,
  website, comment, two notify checkboxes, a Cookies/Privacy consent
  line) under a marquee of that story's existing reviews. New reviews
  insert as `pending` and only appear publicly once approved from
  `/admin/`'s "Pending reviews" section — there is intentionally no way
  for a review to go live without moderation.
- **Site-wide reviews marquee** — the home page also shows recent
  *approved* reviews across every story (`GET /api/reviews/recent`),
  each one linking back to its story.
- **Newsletter** — checking "notify me of new posts" on a review, or
  using the footer's "Get new stories first" box on any page, stores an
  email in `newsletter_subscribers`. **This is capture-only** — there is
  no send pipeline yet that actually emails new-story notifications; the
  table exists so building that pipeline later doesn't require touching
  the frontend again. Likewise the "notify me of follow-up comments"
  checkbox is stored but inert, since there's no reply/comment-thread
  system yet for a follow-up to exist on. Neither is presented to
  readers as doing more than it does.
- **Accounts** — optional, email+password only (no third-party login),
  used for member-only ("exclusive") stories and for the admin panel.
  Full setup/secrets in `cloudflare/README.md`.

---

## 6. Build & local verification

```bash
npm install
npm run build          # story-post/*.md → stories/*.json, category pages, sitemap
npm run validate        # link/asset/page sanity checks
node --check assets/js/blog.js            # spot-check any JS you touched
node --check cloudflare/worker/src/index.js
npm run images:report   # optional: oversized/missing-webp image report
```

To preview locally:

```bash
python3 -m http.server 4173
```

The Worker itself can be run locally with `npm run cf:dev` (see
`cloudflare/README.md` for D1 migration commands and required secrets).

There is no live-network access to `mahmuda.fun` or the `*.workers.dev`
Worker from every environment this repo gets edited in — when that's the
case, the pattern used throughout this project is a local static server
plus a headless-browser pass (Playwright/Chromium) to catch rendering
and JS-console errors that a code read-through alone would miss, not to
skip verification.

---

## 7. Theme & tech notes

- No framework — plain HTML/CSS/JS, static-hosted (GitHub Pages).
- CSS custom properties drive instant Day/Night theme switching; default
  is dark, respects `prefers-color-scheme` on first visit, then persists
  in `localStorage`.
- Home page uses its own `secretchapters-home.css` design system
  (`sc-*` classes, slide-out side-drawer nav); every other page uses the
  older `navigation.css` fixed navbar + `style.css` footer — both share
  `blog.css` for cards/reader/reviews so the reading experience is
  consistent either way.
- Bangla + English typography (Playfair Display + Inter).
- `assets/js/ads.js` never places the sponsored/affiliate link unit
  inside `<footer>` — it only appears next to feed "next episode"
  actions and inside the reader nav, where an ad placement is expected.

---

**18+ only.** Fictional content.
