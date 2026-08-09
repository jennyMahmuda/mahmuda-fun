# mahmuda.fun Content & Deployment Guideline

Wrangler, Cloudflare Worker, D1 migration এবং GitHub Secrets setup-এর জন্য [`cloudflare/README.md`](cloudflare/README.md) পড়ুন।

এই ফাইলটি repository-তে content যোগ করার প্রধান নির্দেশিকা। সব content অবশ্যই 18+ audience-এর জন্য আইনসম্মত, fictional এবং consent-respecting হতে হবে। ব্যক্তিগত তথ্য, বাস্তব ব্যক্তির পরিচয়, non-consensual sexual content বা minor-related content কখনো যোগ করবেন না।

## 1. কোন folder-এ কী রাখবেন

| Content | Source folder | Build output | কীভাবে ব্যবহার হবে |
|---|---|---|---|
| Story text | `story-post/*.md` | `stories/<id>.json` | Home feed, reader, category, series |
| Cover / gallery image | `story-post/image/` | একই path deploy হবে | Story cover, gallery card, image sitemap |
| Video | `story-post/video/` | একই path deploy হবে | Video card ও story reader |
| Audio | `story-post/audio/` | একই path deploy হবে | Audio story / reader |
| Shared UI JavaScript | `assets/js/` | একই path deploy হবে | Navigation, consent, ads, reader |
| Shared CSS | `assets/css/` | একই path deploy হবে | All pages |
| Future Cloudflare schema | `cloudflare/schema.sql` | deploy artifact-এ প্রয়োজন নেই | D1 database setup-এর reference |

**নিয়ম:** filename-এ lowercase English letters, numbers ও hyphen ব্যবহার করুন। যেমন `university-madam-ep-01.md`, `madam-ep-01-cover.webp`, `rain-ep-01.mp4`। একই filename-এর `.JPG` ও `.jpg` রাখবেন না, কারণ GitHub Pages case-sensitive path তৈরি করতে পারে।

## 2. Story post format

`story-post/university-madam-ep-01.md` ফাইলে এই front matter ব্যবহার করুন:

```markdown
---
id: university-madam-ep-01
title: "University Madam — Episode 01"
slug: university-madam-ep-01
excerpt: "একটি সংক্ষিপ্ত, spoiler-light description..."
category: forbidden
tags: [teacher, university, series]
type: text
series: University Madam
episode: 1
cover: story-post/image/university-madam-ep-01-cover.webp
images: [story-post/image/university-madam-ep-01-cover.webp]
video: ""
audio: ""
date: 2026-08-08
language: bn
author: SecretChapters
exclusive: false
---

### Recommended tags

Category/story pages auto-derive their filter pills from whatever `tags`/`category` values actually appear across published stories — there's no separate tag database to edit. Use tags from this list where they fit, so the category filters and footer "Popular tags" stay meaningful instead of fragmenting into one-off tags:

`Bhabi`, `House wife`, `Wife`, `Cheating`, `Husband`, `Bangladeshi`, `Desi`, `Romantic`, `MILF`, `Couple`, `Girlfriend`, `First Time`, `Forbidden`, `Chemistry`, `Tension`, `Teasing`, `College`, `University`, `Senior`, `Junior`, `Beauty`, `Cute`

**Deliberately not on this list, and please don't add them:** nationality/ethnicity-as-browsable-category tags (e.g. tagging stories "Indian"/"Pakistani"/"Russian" etc. as a way to browse by ethnicity — a pattern from tube-video sites, not appropriate for fiction here), and any age-callout tag (`Teen`, `18 Year Old`, or similar). Age-callout tags are one of the most common patterns associated with actual exploitation content and are avoided industry-wide for that reason, regardless of the performers'/characters' actual ages.

`exclusive: true` marks a story as member-only — the build strips its full text from the public story JSON entirely (see `script/blog-builder.js`) and only serves it via the Worker to logged-in, email-verified accounts. Leave it `false` (or omit it) for regular public stories.

## Story heading

এখানে Markdown story লিখবেন। Paragraph-এর মধ্যে blank line রাখবেন।

[পরের পর্ব →](?story=university-madam-ep-02)
```

`id` একবার প্রকাশ করার পরে বদলাবেন না। `category`-তে আগে থেকে ব্যবহৃত valid category ব্যবহার করুন: `romance`, `forbidden`, `fantasy`, `intimate`, `audio`, `video`, `story` অথবা `series`। নতুন category দরকার হলে metadata-তে দেওয়ার আগে category page ও related algorithm-এ সেটির অর্থ যোগ করুন।

## 3. Image post format

Image-only content-এর জন্যও একটি Markdown file রাখুন, যাতে title, description ও category index-এ আসে:

```markdown
---
id: university-madam-classroom-image-01
title: "University Madam — Classroom Scene"
excerpt: "University Madam series-এর classroom scene image."
category: gallery
tags: [university-madam, classroom, gallery]
type: image
cover: story-post/image/university-madam-classroom-01.webp
images: [story-post/image/university-madam-classroom-01.webp]
date: 2026-08-08
language: en
author: SecretChapters
---

![University Madam classroom scene](story-post/image/university-madam-classroom-01.webp)

এই image-এর সংক্ষিপ্ত, non-sensitive description এখানে লিখুন।
```

Image file রাখবেন `story-post/image/`-এ। Source image overwrite না করে WebP derivative তৈরির জন্য `npm run images:report` এবং প্রয়োজন হলে `npm run images:optimize` ব্যবহার করুন। `cover`-এ যে path দেবেন, browser-এ সেটি সত্যিই খুলছে কি না build-এর পরে যাচাই করুন।

## 4. Video post format

ভিডিও file রাখবেন `story-post/video/`-এ। Story metadata-তে `video` path এবং thumbnail `cover` দিন:

```markdown
---
id: rain-night-video-01
title: "Rain Night — Video Story"
excerpt: "Rain Night series-এর একটি short video story."
category: video
tags: [rain, video, series]
type: video
series: Rain Night
episode: 1
cover: story-post/image/rain-night-video-01.webp
video: story-post/video/rain-night-video-01.mp4
date: 2026-08-08
language: bn
author: SecretChapters
---

ভিডিওটির সংক্ষিপ্ত description এখানে লিখুন।
```

MP4 হলে H.264/AAC, web-friendly resolution এবং reasonable file size ব্যবহার করুন। Autoplay যোগ করবেন না। Video card-এ thumbnail, title, category ও description থাকবে; reader-এ controls সহ video খুলবে।

## 5. Build ও local verification

নতুন বা পরিবর্তিত content commit করার আগে repository root থেকে চালান:

```bash
npm run build
npm run images:report
node --check assets/js/blog.js
node --check assets/js/ads.js
node --check assets/js/site-components.js
```

তারপর local server চালিয়ে এই URL-গুলো পরীক্ষা করুন:

```bash
python3 -m http.server 4173
```

পরীক্ষার তালিকা: `/`, `/category/`, `/gellery/`, `/video/`, `/series/`, `/privacy-policy.html`, `/terms.html`, `/faq.html`, `/cookies.html`, `/premium.html`। Read More story খুলছে কি না, Back button কাজ করছে কি না, header navigation-এর জায়গায় কোনো ad আছে কি না, cookie Accept/Reject persist করছে কি না এবং mobile menu ঢেকে যাচ্ছে কি না দেখুন।

## 6. Future rating ও review system

বর্তমানে কোনো rating/review data collect হয় না। Future Cloudflare D1 setup-এর জন্য `cloudflare/schema.sql` রাখা আছে। API তৈরি হলে অন্তত এই endpoints রাখুন:

```text
GET  /api/stories/:storyId/ratings
POST /api/stories/:storyId/ratings
GET  /api/stories/:storyId/reviews?status=approved
POST /api/stories/:storyId/reviews
POST /api/reviews/:reviewId/moderate
```

API-তে story ID allowlist, 1–5 rating validation, review length limit, rate limit, abuse key hashing, moderation status, CORS allowlist, server-side validation এবং no raw IP retention by default রাখুন। Approved review ছাড়া frontend-এ কোনো review দেখাবেন না। Feature চালুর আগে privacy policy, cookie notice, terms এবং consent text update করুন।

## 7. Analytics, Search Console এবং ads

Google Analytics এই release-এ consent Accept করার পরে load হয়। Google Search Console verification file/meta পরিবর্তন করবেন না। Ad script header-এর ভিতরে রাখবেন না; navigation-এর বাইরে আলাদা labelled slot ব্যবহার করুন। Read More, Back, menu বা Premium navigation-এর click path-এর সঙ্গে ad wrapper করবেন না।

## 8. Pull request checklist

নতুন post-এর সঙ্গে source Markdown, referenced image/video এবং metadata commit করুন। Broken relative path, duplicate `id`, invalid category, missing `alt` text, oversized image এবং minor/non-consensual content থাকলে publish করবেন না। GitHub Actions build fail করলে `stories/index.json`, `sitemap.xml`, `robots.txt` ও generated artifact inspect করুন।
