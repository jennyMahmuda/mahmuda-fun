# Cloudflare setup guide

এই repository-তে Wrangler configuration, Cloudflare Worker API এবং D1 migration আগে থেকেই প্রস্তুত করা আছে। Worker-এর নাম `mahmuda-fun-api`; D1 database-এর নাম `mahmuda_fun_reviews`; database ID repository-এর `wrangler.toml`-এ আছে। Existing `zamil_shop` database স্পর্শ করা হয়নি।

## GitHub repository secrets

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

## Security rules

API token কখনো `wrangler.toml`, `.env`, Markdown, commit message বা frontend JavaScript-এ রাখবেন না। GitHub Actions secret-এই token রাখবেন। Token-এর permission প্রয়োজনের চেয়ে বেশি দেবেন না এবং সন্দেহ হলে Cloudflare Dashboard থেকে token rotate করবেন।
