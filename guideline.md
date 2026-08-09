# SecretChapters (mahmuda.fun) — Content & Deployment Guideline

Wrangler, Cloudflare Worker, D1 migration এবং GitHub Secrets setup-এর জন্য [`cloudflare/README.md`](cloudflare/README.md) পড়ুন।

এই ফাইলটি repository-তে content যোগ করার প্রধান, up-to-date নির্দেশিকা — কোন folder-এ কী রাখতে হয়, category system কীভাবে কাজ করে, image/video/audio-এর সঠিক format কী, আর পুরো site-এ কোন কোন page আসলে আছে। সব content অবশ্যই 18+ audience-এর জন্য আইনসম্মত, fictional এবং consent-respecting হতে হবে। ব্যক্তিগত তথ্য, বাস্তব ব্যক্তির পরিচয়, non-consensual sexual content বা minor-related content (age-callout tag সহ) কখনো যোগ করবেন না।

---

## 1. Content যোগ করার দুইটা পথ

| পথ | কোথায় | কখন ব্যবহার করবেন |
|---|---|---|
| **সরাসরি `story-post/*.md`** | GitHub repo-তে সরাসরি file commit | আপনি এখন এইভাবেই কাজ করছেন — full control, git history-তে থাকে |
| **Admin panel (`/admin/`)** | Browser থেকে login করে | কোনো code/git ছাড়া লিখতে চাইলে; draft save করে পরে publish করা যায় |

দুটো পথই শেষ পর্যন্ত `story-post/*.md` file-এ গিয়েই মিশে — Admin panel-এ publish করলে `script/sync-admin-stories.js` (প্রতি ~২০ মিনিটে GitHub Actions-এ চলে) সেটাকে `story-post/<id>.md` বানিয়ে repo-তে commit করে দেয়। তাই এই পুরো guide দুই পথের জন্যই সমান প্রযোজ্য।

---

## 2. কোন folder-এ কী রাখবেন (বর্তমান, আসল অবস্থা)

| Content | Source folder | কীভাবে ব্যবহার হয় |
|---|---|---|
| Story text (সব ধরনের: text/image/video/audio) | `story-post/*.md` | `npm run build` চালালে `stories/<id>.json` তৈরি হয় → Home feed, reader, category page, series page, top-rated, trending, new-releases সব জায়গায় দেখা যায় |
| Story-এর নিজস্ব cover/gallery image | `story-post/image/` | build অপরিবর্তিত রেখে সরাসরি deploy হয় |
| Category page-এর background photo | `assets/images/categories/<slug>.{webp,jpg,jpeg,png}` অথবা `categories-data.js`-এ manual override | না থাকলে auto-generated mood-art SVG দেখাবে (কখনো blank/broken হবে না) |
| সাধারণ gallery/story photo | `assets/images/gallery/` | `cover`/`images`/inline `![...]()`-এ reference করুন |
| Homepage hero/featured background | `assets/images/hero/` | শুধু homepage design-এর জন্য |
| Shared UI JavaScript | `assets/js/` | Navigation, reader, ratings, ads, category system |
| Shared CSS | `assets/css/` | সব page |
| Cloudflare Worker + D1 backend | `cloudflare/` | Ratings, reviews, reactions, accounts, admin API, GA4 analytics — দেখুন `cloudflare/README.md` |
| Build tooling | `script/` | মূল script হলো `script/blog-builder.js` (`npm run build` এটাই চালায়) |

**⚠️ এখনো কাজ শুরু হয়নি এমন ৩টা folder — এখানে file রাখলে এখনো কিছু হবে না:**

- `gallery-post/` — আপনার নোট (`guidelines need This.md`) অনুযায়ী একটা Pinterest-style standalone image gallery builder চাওয়া হয়েছে (আলাদা `builder.js`/`build.js`/CSS/navigation সহ)। এটা এখনো build করা হয়নি।
- `video-story-post/` — আপনার নোট (`video upload need video post builder.md`) অনুযায়ী একটা আলাদা video-post builder চাওয়া হয়েছে (auto webp thumbnail, auto sitemap entry সহ)। এটাও এখনো build করা হয়নি।
- `category-api/` — একটা "related category" suggestion algorithm-এর নোট আছে; এটাও এখনো build করা হয়নি।

এই তিনটা আলাদা, বড় feature request — আলাদাভাবে জানালে এগুলো নিয়ে কাজ শুরু করা যাবে। এখন পর্যন্ত **সব story (text/image/video/audio) `story-post/*.md`-এর মাধ্যমেই publish হয়** (নিচের section ৪ দেখুন — `type:` field দিয়েই video/audio/image আলাদা করা হয়, আলাদা folder লাগে না)।

**Filename নিয়ম:** lowercase English letters, numbers ও hyphen ব্যবহার করুন। যেমন `gorom-bhabi-orange-5.md`, `my-cover-photo.jpg`। একই filename-এর `.JPG` ও `.jpg` একসাথে রাখবেন না — GitHub Pages case-sensitive path তৈরি করে, আর এটাই আগে একবার broken image bug তৈরি করেছিল।

---

## 3. ছবি/ভিডিও/অডিও-এর সঠিক Format (⚠️ সবচেয়ে গুরুত্বপূর্ণ অংশ)

এইটা আগে একবার সমস্যা করেছিল — একটা ফাইলের নাম ভুল লেখা ছিল যেটা আসলে কখনো upload-ই হয়নি, ফলে live site-এ broken image icon দেখাচ্ছিল। সেটা এড়াতে এই নিয়ম মেনে চলুন:

### ধাপে ধাপে (নতুন ছবি যোগ করার সময়):

1. GitHub repo খুলুন → `assets/images/gallery/` folder-এ যান (অথবা `story-post/image/`)।
2. **Add file → Upload files** ক্লিক করে ছবি upload করুন, commit করুন।
3. Upload হওয়ার পর ছবির উপর ক্লিক করে **ঠিক path/filename** দেখে নিন — capital/lowercase letter, extension (`.jpg`/`.JPG`/`.webp`) সব হুবহু মিলতে হবে।
4. এই ঠিক path-টা কপি করে `cover:`/`images:`/inline `![...]()`-এ বসান।

### দুই ধরনের সঠিক format — দুটোই কাজ করে:

```yaml
# ১. Relative path (সবচেয়ে recommended — .jpg/.png upload করলে
#    website নিজে থেকে .webp version থাকলে সেটা ব্যবহার করে,
#    ছবি দ্রুত load হয়)
cover: assets/images/gallery/my-photo.jpg

# ২. Full URL (আগে যেভাবে লিখতেন, এটাও চলবে)
cover: https://mahmuda.fun/assets/images/gallery/my-photo.jpg
```

### ❌ যা ভুল হয়ে যায় (এবং কীভাবে ধরবেন):

- ফাইল আপলোড করার **আগেই** `cover:`-এ path বসিয়ে দেওয়া — path যত সঠিক দেখতে লাগুক, ফাইল আসলে না থাকলে browser-এ 404/broken icon দেখাবে।
- Filename-এ typo বা ভুল extension (`.jpg` লিখেছেন কিন্তু আসলে `.JPG` আপলোড হয়েছে)।
- ভুল folder-এ path লেখা (`assets/images/gallery/` লিখেছেন কিন্তু আসলে `assets/images/categories/`-এ আছে)।

**✅ এখন থেকে `npm run build` চালালেই (বা GitHub Actions build চললেই) এটা automatically ধরা পড়বে** — কোনো `cover`/`images`/`video`/`audio`/inline image ফাইল হিসেবে না পেলে build log-এ এমন warning দেখাবে:

```
⚠️  1 missing media reference(s) — file was referenced but never uploaded:
   - my-story-id (cover): assets/images/gallery/typo-name.jpg
```

Build পুরোপুরি fail হবে না (অন্য সব story ঠিকমতো deploy হবে), কিন্তু GitHub Actions-এর log-এ এই warning স্পষ্ট দেখা যাবে — সেটা দেখেই বুঝবেন কোন story-তে ছবি ঠিক করতে হবে।

---

## 4. Story post format (text/image/video/audio — সবই এই একই system দিয়ে)

`story-post/my-story-id.md` ফাইলে:

```markdown
---
id: my-story-id
title: "গল্পের শিরোনাম"
slug: my-story-id
excerpt: "২-৩ লাইনের ছোট preview, পুরো গল্প বলে দেবেন না।"
category: Forbidden
tags: [Bhabi, Neighbor, Tension]
type: text
series: My Series Name
episode: 1
cover: assets/images/gallery/my-cover.jpg
images: ["assets/images/gallery/my-cover.jpg"]
video: ""
audio: ""
date: 2026-08-09
readTime: 12 min
language: bn
author: Mahmudajenny69
exclusive: false
---

এখানে গল্প লিখুন। Paragraph-এর মাঝে blank line রাখবেন।

![বিবরণ](assets/images/gallery/আরেকটা-ছবি.jpg)

**[পরের পর্ব →](?story=my-story-id-2)**
```

### Field-এর ব্যাখ্যা:

| Field | বাধ্যতামূলক? | নোট |
|---|---|---|
| `id` | হ্যাঁ | একবার publish হওয়ার পর কখনো বদলাবেন না — এটাই URL-এর অংশ |
| `title` | হ্যাঁ | গল্পের আসল নাম |
| `excerpt` | না (থাকলে ভালো) | না দিলে গল্পের প্রথম কিছু লাইন থেকে auto-generate হয় |
| `category` | হ্যাঁ | নিচের section ৫-এর তালিকা থেকে দিন, তাহলেই category page-এ দেখাবে |
| `tags` | না | `[Tag1, Tag2, ...]` format-এ। Category page matching এই tags-ও দেখে |
| `type` | না (default `text`) | `text`, `image`, `video`, `audio` — কোনটা তা বলে দেয়, আলাদা folder লাগে না |
| `series` / `episode` | না | সিরিজের অংশ হলে দিন — auto পরের/আগের পর্ব link হয়ে যায় |
| `cover` | না (থাকলে ভালো) | Section ৩ দেখুন — সঠিক, বিদ্যমান file path |
| `images` | না | Array — `["path1", "path2"]` |
| `video` / `audio` | না | `type: video`/`audio` হলে এখানে file path দিন |
| `date` | না | না দিলে file-এর commit date ব্যবহার হয় |
| `exclusive` | না (default `false`) | `true` দিলে শুধু logged-in, verified account পড়তে পারবে |

---

## 5. Category system — সব ২২টা category (আসল, কাজ করা তালিকা)

`category:` field-এ নিচের যেকোনো একটার **label** (বা কাছাকাছি শব্দ/tag) লিখলে সেই category page-এ auto দেখাবে — কোনো আলাদা category তৈরি করার দরকার নেই, শুধু মিলিয়ে লিখুন। সম্পূর্ণ তালিকা `script/categories-data.js`-এ (single source of truth):

| Slug (URL: `/category/<slug>/`) | Label |
|---|---|
| `dark-romance` | Dark Romance |
| `mafia-romance` | Mafia Romance |
| `paranormal-fantasy-romance` | Paranormal & Fantasy Romance |
| `billionaire-romance` | Billionaire Romance |
| `alpha-males` | Alpha Males |
| `high-school-romance` | High School Romance |
| `spicy-romance` | Spicy Romance |
| `age-gap-romance` | Age Gap Romance |
| `vampire-romance` | Vampire Romance |
| `cowboy-romance` | Cowboy Romance |
| `forbidden-romance` | Forbidden Romance |
| `second-chance-romance` | Second Chance Romance |
| `clean-wholesome` | Clean & Wholesome |
| `fated-mates` | Fated Mates |
| `comedy` | Comedy |
| `bad-boys` | Bad Boys |
| `slow-burn` | Slow Burn |
| `enemies-to-lovers` | Enemies to Lovers |
| `sports` | Sports |
| `college` | College |
| `bhabi-romance` | Bhabi Romance |
| `affair-romance` | Affair & Cheating Romance |

**Matching কীভাবে কাজ করে:** `category:` অথবা `tags:`-এর ভেতর slug/label-এর সাথে মিললেই (hyphen/space একই ধরা হয়, বড় compound নাম যেমন "Bhabi Romance"-এর জন্য শুধু "Bhabi" tag থাকলেও মিলে যায়) সেই story সেই category page-এ দেখাবে। প্রতিটা category-র নিজের static page আছে (`category/<slug>/index.html`) — `npm run build` চালালে সব ২২টাই নতুন করে তৈরি হয়, real content সহ।

**নতুন category চাইলে:** `script/categories-data.js`-এ নতুন entry যোগ করলেই সেটার real page তৈরি হয়ে যায় — শুধু বললেই আমি যোগ করে দিতে পারি।

---

## 6. পুরো site-এ কোন কোন page আছে

| Page | Path | কী দেখায় |
|---|---|---|
| Home | `/` (`index.html`) | Continue Reading, Trending, Editor's Pick, Browse by Mood, Popular Categories, New Releases, Top Rated, Series, Why SecretChapters, FAQ, CTA |
| Category hub | `/category/` | সব category-র filter/browse |
| একটা category | `/category/<slug>/` | Section ৫-এর ২২টা page, প্রতিটা real static, SEO-ready |
| Series | `/series/` | সব series preview |
| Video | `/video/` | `type: video` story গুলো |
| Gallery | `/gellery/` | `type: image` story গুলো |
| Top Rated | `/top-rated/` | সব ranked list (কমপক্ষে ৩টা rating থাকলে) |
| Trending | `/trending/` | সাম্প্রতিক reader activity (GA4 data) |
| New Releases | `/new-releases/` | Today/This week/This month |
| Premium | `/premium.html` | Premium tier info |
| FAQ | `/faq.html` | সাধারণ প্রশ্ন |
| Account | `/account/` | Login/signup/verify/reset |
| Admin (Content Manager) | `/admin/` | Login-gated, `is_admin` account লাগবে — story লেখা/edit/publish |

---

## 7. Build ও local verification

নতুন content commit করার আগে repository root থেকে চালান:

```bash
npm run build
npm run validate
npm run images:report
node --check assets/js/blog.js
node --check script/blog-builder.js
```

`npm run build`-এর শেষে দেখুন কোনো `⚠️ missing media reference` warning আছে কিনা — থাকলে section ৩ অনুযায়ী ঠিক করুন।

Local server চালিয়ে দেখতে চাইলে:

```bash
python3 -m http.server 4173
```

তারপর `/`, `/category/`, `/category/<নতুন-story-র-category>/`, `/top-rated/`, `/trending/`, `/new-releases/` — এগুলো খুলে দেখুন নতুন story/ছবি ঠিকমতো দেখাচ্ছে কিনা, Read More/reader খুলছে কিনা, navigation বন্ধ হয়ে যাচ্ছে না তো।

---

## 8. Ratings, Reviews ও Reactions (এখন live, আর "future" না)

Cloudflare D1-ব্যাকড, এখন সরাসরি কাজ করছে — কোনো আলাদা setup লাগে না নতুন story-র জন্য, automatic:

- `GET/POST /api/stories/:id/ratings` — ১-৫ star rating
- `GET/POST /api/stories/:id/reviews` — approved হওয়ার পরই public-এ দেখা যায় (moderation queue আছে)
- `GET/POST /api/stories/:id/reactions` — "Recommended by N readers" badge

প্রতিটা নতুন story publish হওয়ার সাথে সাথেই এইসব widget কাজ করবে — আলাদা কিছু করার দরকার নেই।

---

## 9. Analytics, Search Console এবং Ads

Google Analytics consent accept করার পরে load হয় (cookie banner)। GA4 "Trending" section-এর জন্য server-side credentials লাগে — `cloudflare/README.md`-এ details আছে। Google Search Console verification file/meta পরিবর্তন করবেন না। Ad script navigation/header-এর ভেতরে রাখবেন না।

---

## 10. Publish করার আগে checklist

- [ ] `category:` field section ৫-এর তালিকার সাথে মিলছে (নইলে category page-এ দেখাবে না)
- [ ] `cover`/`images`/inline ছবি — file আগে থেকেই upload করা আছে, path হুবহু মিলছে
- [ ] `npm run build` চালিয়ে কোনো `⚠️ missing media` warning আসেনি
- [ ] `npm run validate` পাস করেছে
- [ ] duplicate `id` নেই, minor/non-consensual content নেই
- [ ] GitHub Actions build fail করলে Actions log-এর warning/error পড়ুন
