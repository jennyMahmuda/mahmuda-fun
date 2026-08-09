# Cloudflare setup guide

## Exact repository paths

এই files-গুলো repository root থেকে ঠিক এই path-এ থাকবে:

| File | Repository path |
|---|---|
| Wrangler config | `/wrangler.toml` |
| D1 migration SQL | `/cloudflare/migrations/0001_rating_review.sql` |
| Worker source | `/cloudflare/worker/src/index.js` |
| Pages workflow | `/.github/workflows/Deploy.yml` |
| Cloudflare Worker workflow | `/.github/workflows/cloudflare-worker.yml` |

GitHub-এর **Add file → Upload files** ব্যবহার করলে প্রথমে `.github/workflows/` folder তৈরি করে workflow files upload করবেন। SQL file `cloudflare/migrations/` folder-এ এবং Worker JavaScript `cloudflare/worker/src/` folder-এ রাখবেন। Root-level `wrangler.toml` অবশ্যই repository root-এ থাকবে।

এই repository-তে Wrangler configuration, Cloudflare Worker API এবং D1 migration আগে থেকেই প্রস্তুত করা আছে। Worker-এর নাম `mahmuda-fun-api`; D1 database-এর নাম `mahmuda_fun_reviews`; database ID repository-এর `wrangler.toml`-এ আছে। Existing `zamil_shop` database স্পর্শ করা হয়নি।

## GitHub repository secrets

`Deploy.yml` GitHub Pages deploy করে। `cloudflare-worker.yml` Cloudflare D1 migration ও Worker deploy করে। এই দুই workflow আলাদা রাখা হয়েছে, যাতে একই commit থেকে Pages এবং Worker প্রত্যেকে একবার করে deploy হয়।

GitHub repository-এর **Settings → Secrets and variables → Actions → New repository secret** থেকে নিচের দুটি secret যোগ করুন। Secret value এখানে বা repository file-এ লিখবেন না।

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token, minimum permissions: Account → Workers Scripts → Edit এবং Account → D1 → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID: `0b1d4447f765e7fd26243f6a462d728a` |

এরপর **Settings → Secrets and variables → Actions → Variables** থেকে এই repository variable যোগ করুন:

| Name | Value |
|---|---|
| `ENABLE_CLOUDFLARE_DEPLOY` | `true` |

`ENABLE_CLOUDFLARE_DEPLOY` না দিলে বা `false` থাকলে GitHub Pages build চলবে, কিন্তু Worker deploy job skip হবে। এটি ইচ্ছাকৃত fail-safe behavior।

## Local Wrangler commands

Node dependencies install করার পর `npm run cf:dev` দিয়ে local Worker চালানো যায়। Local D1 migration চালাতে `npm run cf:migrate:local` ব্যবহার করুন। Remote D1 migration-এর জন্য আগে `wrangler login` করুন অথবা environment-এ `CLOUDFLARE_API_TOKEN` এবং `CLOUDFLARE_ACCOUNT_ID` দিন, তারপর `npm run cf:migrate:remote` চালান। Worker deploy করতে `npm run cf:deploy` ব্যবহার করুন।

Production deploy-এর আগে `npm run validate`, `node --check cloudflare/worker/src/index.js`, এবং `npm run cf:migrate:local` চালানো উচিত। GitHub Actions একই migration এবং deploy commands চালায়।

## Worker endpoints

Worker-এর public URL হলো `https://mahmuda-fun-api.mahmudajenny6.workers.dev` এবং health check হলো `https://mahmuda-fun-api.mahmudajenny6.workers.dev/health`। Worker-এর health endpoint হলো `/health`। Rating summary পড়তে `GET /api/stories/{storyId}/ratings`, approved reviews পড়তে `GET /api/stories/{storyId}/reviews`, rating লিখতে `POST /api/stories/{storyId}/ratings`, এবং review submit করতে `POST /api/stories/{storyId}/reviews` ব্যবহার করা হবে। Write request-এ `X-Anonymous-Key` header বা `anonymousKey` body field প্রয়োজন। Review প্রথমে `pending` status-এ থাকে; moderation ছাড়া public হবে না।

বর্তমান static site এই API-তে কোনো write request পাঠাচ্ছে না। তাই database প্রস্তুত থাকলেও এখন user rating/review data সংগ্রহ শুরু হয়নি। Frontend feature চালু করার আগে privacy policy, consent text, abuse prevention, moderation UI এবং rate limiting review করতে হবে।

## Cloudflare connector setup status

Cloudflare account read-only audit করে দেখা হয়েছে। Existing D1 `zamil_shop` এবং existing Worker/Page project অন্য application-এর, তাই সেগুলো পরিবর্তন করা হয়নি। আলাদা `mahmuda_fun_reviews` D1 database APAC primary location-এ তৈরি করা হয়েছে এবং rating/review schema apply করা হয়েছে। Wrangler configuration সেই database-এর সঙ্গে bound।

## Accounts + member-only stories (email/password, no third-party login)

`0002_accounts.sql` migration আসার পর Worker-এ প্রথম-পক্ষ (first-party) account system যোগ হয়েছে — কোনো Google/Facebook login নেই, শুধু email + password। Endpoints: `POST /api/auth/signup`, `POST /api/auth/verify`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/request-password-reset`, `POST /api/auth/reset-password`। Session token একটি Bearer token (localStorage-এ রাখা হয়, cookie নয় — কারণ API আলাদা domain-এ থাকায় cross-site cookie বহু browser-এ silently block হয়ে যায়)।

Frontend pages: `/account/` (login + signup), `/account/verify.html`, `/account/forgot.html`, `/account/reset.html`।

### Member-only ("exclusive") stories

কোনো story-কে member-only করতে তার markdown frontmatter-এ `exclusive: true` যোগ করুন (দেখুন `story-post/*.md`)। Build script (`script/blog-builder.js`) তখন:
- Public `stories/<id>.json` এবং `stories/index.json`-এ সেই story-র `content` বাদ দিয়ে দেয় (title/excerpt/cover ইত্যাদি থেকে যায়, card-এ 🔒 badge দেখায়)।
- পুরো body text `cloudflare/generated/exclusive-content.sql`-এ লেখে, যেটা প্রতি Worker deploy-এ D1-এর `exclusive_content` table-এ sync হয় (`cloudflare-worker.yml`-এর "Sync exclusive story content to D1" step)।
- শুধু logged-in + email-verified session `GET /api/stories/{id}/content`-এর মাধ্যমে সেই content পড়তে পারে।

### নতুন GitHub repository secrets (এই feature কাজ করার জন্য প্রয়োজন)

| Name | Value | কী হবে যদি না দেন |
|---|---|---|
| `AUTH_SECRET` | একটি random hex string (নিচে একটি generate করা আছে, চাইলে নিজেও `openssl rand -hex 32` দিয়ে বানাতে পারেন) | Login rate-limiting-এর IP hash pepper ছাড়া চলবে — কাজ করবে, কিন্তু কম private। Signup/login তবুও ঠিকমতো কাজ করবে। |
| `RESEND_API_KEY` | [resend.com](https://resend.com)-এ account খুলে API key নিন | **Signup verification email এবং password-reset email পাঠানো যাবে না** — account তৈরি হবে কিন্তু কেউ verify করতে পারবে না, তাই কেউ login করতে পারবে না। এই একটা secret ছাড়া পুরো accounts feature কার্যত অচল থাকবে। |
| `RESEND_FROM_EMAIL` | Resend-এ verify করা sending address, যেমন `noreply@mahmuda.fun` | উপরের মতোই — email পাঠানো বন্ধ থাকবে। |
| `GA_API_SECRET` | GA4 property → Admin → Data Streams → আপনার stream → Measurement Protocol API secrets | Server-side `sign_up`/`login` event GA4-তে পাঠানো যাবে না — সাইট বাকি সবকিছু normal-ই চলবে, শুধু এই দুটো event GA4-তে দেখা যাবে না। |

**Session-এ একটি `AUTH_SECRET` generate করা হয়েছিল, সেটা chat-এ দেওয়া আছে — সরাসরি GitHub secret হিসেবে paste করে দিতে পারেন, নতুন করে বানানোর দরকার নেই।**

### Server-side analytics (sign_up / login events)

`GA_API_SECRET` secret যোগ করলে Worker সরাসরি Google Analytics 4-এ (Measurement Protocol দিয়ে, `GA_MEASUREMENT_ID` — `wrangler.toml`-এ আগে থেকেই আছে, `assets/js/site-components.js`-এর client-side ID-র সাথে মিলিয়ে) `sign_up` এবং `login` event পাঠায়, একজন visitor সত্যিই account তৈরি বা login করলে। এটা client-side gtag-এর চেয়ে বেশি নির্ভরযোগ্য (ad-blocker-এ block হয় না), কিন্তু consent respect করেই কাজ করে — visitor cookie banner-এ "Reject analytics" চাপলে `window.gtag` load-ই হয় না, তাই `auth.js` কোনো client ID পাঠাতে পারে না, আর Worker সেক্ষেত্রে event পাঠায়ই না। **এই secret কখনো `wrangler.toml`, কোনো `.js` file বা commit-এ লিখবেন না** — শুধু GitHub repository secret হিসেবে রাখুন, উপরের অন্য secret-গুলোর মতোই।

`RESEND_API_KEY` এবং `RESEND_FROM_EMAIL` ছাড়া deploy fail হবে না (`cloudflare-worker.yml`-এর secret-configuration step সেগুলো না থাকলে শুধু skip করে) — কিন্তু ততক্ষণ পর্যন্ত signup করা account-গুলো কখনো verify হবে না। Resend account বানানো এবং domain verify করা এই session থেকে সম্ভব না — এটা manual step, নিজে করতে হবে।

### 🔥 Trending Now (GA4 Data API top-content section)

আপনি ইতিমধ্যে `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` — একটি Google service account-এর credentials — GitHub এবং Cloudflare উভয় জায়গায় secret হিসেবে যোগ করেছেন। Worker এখন এগুলো দিয়ে সরাসরি GA4 Data API থেকে সবচেয়ে বেশি-দেখা story pages পড়ে এবং home page-এর "🔥 Trending Now" section-এ দেখায় (`GET /api/analytics/top-content`)।

| Name | ব্যবহার হচ্ছে কি | Value কোথায় পাবেন |
|---|---|---|
| `GOOGLE_CLIENT_EMAIL` | হ্যাঁ — JWT sign করতে | Service account JSON key file-এর `client_email` field |
| `GOOGLE_PRIVATE_KEY` | হ্যাঁ — JWT sign করতে | Service account JSON key file-এর `private_key` field (পুরো PEM string, `-----BEGIN PRIVATE KEY-----` সহ) |
| `GOOGLE_PROJECT_ID` | **না** — এই feature-এ প্রয়োজন হয় না, শুধু ভবিষ্যতের জন্য secret হিসেবে রাখা আছে | — |
| `GA_PROPERTY_ID` | **হ্যাঁ, কিন্তু এখনো দেওয়া হয়নি** — এটা ছাড়া "Trending Now" section কখনো data দেখাবে না | GA4 Admin → Property Settings → **Property ID** (একটা plain number, যেমন `398765432` — measurement ID `G-XXXXXXX`-এর মতো নয়) |

আরও দুইটা জিনিস verify করে নেবেন:
1. **Service account-কে GA4 property access দেওয়া হয়েছে কিনা।** GA4 Admin → Property Access Management → Add users → `GOOGLE_CLIENT_EMAIL`-এর ঠিকানা (যেমন `xxx@yyy.iam.gserviceaccount.com`) → role: **Viewer**। এটা না করলে API call authenticate হলেও 403 error দেবে।
2. **`GA_PROPERTY_ID`** GitHub repository secret হিসেবে যোগ করুন (উপরের অন্য secret-গুলোর মতোই jagah থেকে)।

Result cache হয় D1-এ (১ ঘণ্টা পর্যন্ত) — তাই প্রতিটা visitor সরাসরি Google API hit করে না, শুধু cache পড়ে।

## Content Manager (/admin/) — no separate password, ever

`/admin/` browser page দিয়ে GitHub না ছুঁয়ে নতুন story লেখা/publish করা যায় (`cloudflare/migrations/0004_admin_content.sql`)। **কোনো আলাদা admin username/password এই feature-এ নেই** — যে account admin হবে সেটা প্রথমে normal signup দিয়ে তৈরি করতে হবে (`/account/`, real email + password, সেই একই PBKDF2-hashed accounts system যেটা আগে থেকেই আছে), তারপর সেই একটা account-কে flag করতে হবে:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';
```

এই query D1-এ চালাতে হবে (Cloudflare dashboard-এর D1 console থেকে, অথবা `npx wrangler d1 execute mahmuda_fun_reviews --remote --command "UPDATE users SET is_admin = 1 WHERE email = '...'"`)। এরপর সেই email দিয়ে `/account/`-এ normal login করলেই `/admin/` access পাওয়া যাবে — আলাদা কোনো credential মনে রাখতে হবে না।

**যদি login-ই না হয় (verification email আসছে না):** `RESEND_API_KEY`/`RESEND_FROM_EMAIL` configure না থাকলে signup হয় ঠিকই, কিন্তু verification email কখনো পাঠানো হয় না — আর email verify না হওয়া পর্যন্ত login-ই block থাকে (admin হোক বা না হোক)। এই একটা জায়গায় আটকে গেলে GitHub Actions থেকে **"Grant admin access"** workflow (`.github/workflows/grant-admin.yml`) manually run করুন, শুধু email address দিয়ে — এটা সেই account-এর `email_verified` এবং `is_admin` দুটোই একসাথে সেট করে দেয়। শর্ত একটাই: account-টা আগে `/account/`-এ normal signup দিয়ে তৈরি থাকতে হবে (real password সহ) — এই workflow কোনো password তৈরি করে না, শুধু আগে থেকে থাকা account-এর দুটো flag বদলায়।

**Flow:** `/admin/` → নতুন story লিখুন (title, excerpt, category, tags, cover/video/audio URL, plain-text body) → "Save draft" অথবা "Save & publish" → publish করলে সেটা D1-এর `admin_stories` table-এ যায় → `.github/workflows/sync-admin-stories.yml` (প্রতি ২০ মিনিটে চলে, চাইলে GitHub Actions থেকে manually run করা যায়) সেটাকে real `story-post/<id>.md` file বানিয়ে commit করে → normal Pages deploy সেটা live করে। একবার sync হয়ে গেলে সেই story আর যেকোনো hand-authored story-র মতোই — `/admin/`-এ পরে edit করলে সেটা শুধু D1-এর draft record বদলায়, live file বদলাতে চাইলে `story-post/<id>.md` সরাসরি repo-তে edit করতে হবে (ইচ্ছাকৃতভাবে — কেউ hand-edit করার পর panel সেটা silently overwrite করে না)।

**সম্পূর্ণ ধাপে-ধাপে গাইড** (story লেখা, image/video যোগ করা সহ) `/admin/` পেজেই আছে — "📖 কিভাবে নতুন Story লিখবেন..." অংশে ক্লিক করলে খুলবে। আলাদা করে এখানে duplicate করা হলো না, যাতে এক জায়গায় update রাখা যায়।

## Reactions ("Recommend this story")

`0005_reactions.sql` migration একটা simple, single reaction (❤ Recommend) যোগ করেছে — rating (১-৫ star)-এর মতো নয়, শুধু হ্যাঁ/না। একই anonymous key দিয়ে ratings/reviews-এর মতোই কাজ করে (কোনো account লাগে না)। আবার click করলে reaction সরে যায় (toggle)। Endpoints: `GET /api/stories/{id}/reactions` (count পড়তে), `POST /api/stories/{id}/reactions` (toggle করতে, `X-Anonymous-Key` লাগবে), `GET /api/reactions/summary` (সব story-র count একসাথে, card badge-এর জন্য)। Reader-দের কাছে "❤ Recommended by N readers" হিসেবে দেখা যায়, প্রতিটা story-র rating-review widget-এর ভেতরে এবং feed/category card-এ ছোট badge হিসেবে।

## Security rules

API token কখনো `wrangler.toml`, `.env`, Markdown, commit message বা frontend JavaScript-এ রাখবেন না। GitHub Actions secret-এই token রাখবেন। Token-এর permission প্রয়োজনের চেয়ে বেশি দেবেন না এবং সন্দেহ হলে Cloudflare Dashboard থেকে token rotate করবেন।
