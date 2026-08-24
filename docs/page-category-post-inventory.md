# mahmuda.fun Page, Category and Post Inventory

## Audit summary

The repository currently contains **22 declared and generated romance categories**, **40 story records in `stories/index.json`**, **41 Markdown source posts**, **12 gallery-post image assets**, **5 video-story-post assets**, and a set of special hubs for new releases, series, trending, top-rated, video and gallery content. The build and validation commands succeed, but the audit found several taxonomy and data-consistency issues that should be addressed before expanding the admin pipeline.

The most important finding is that the category configuration uses full canonical labels such as `Forbidden Romance`, `Spicy Romance`, `Age Gap Romance` and `College`, while many story records use shortened or different values such as `Forbidden`, `Spicy`, `Age-Gap`, `College romance`, `Story` and `video`. The current generator uses loose category matching in places, so some pages still populate, but the data model is not yet strict enough for a reliable new dashboard pipeline.

## 1. Public page inventory

### 1.1 Core and account pages

| Page | Path | Function |
|---|---|---|
| Home | `/index.html` | Main feed and landing page |
| Account | `/account/index.html` | Login/account state |
| Forgot password | `/account/forgot.html` | Password reset request |
| Reset password | `/account/reset.html` | Password reset completion |
| Verify account | `/account/verify.html` | Email/account verification |
| Admin dashboard | `/admin/index.html` | Story management, reviews, newsletter and analytics |
| Admin story editor | `/admin/story.html` | Create/edit, draft and publish story |

### 1.2 Discovery and collection pages

| Page | Path | Function |
|---|---|---|
| Category hub | `/category/index.html` | Browse all categories |
| New releases | `/new-releases/index.html` | Recently published stories |
| Series hub | `/series/index.html` | Group stories by series and episodes |
| Trending | `/trending/index.html` | Trending/recommended stories and reactions |
| Top rated | `/top-rated/index.html` | Rating-based discovery |
| Video hub | `/video/index.html` | Content filtered as video |
| Gallery hub | `/gellery/index.html` | Content filtered as image gallery |

> **Route spelling issue:** The public gallery route is `gellery`, not `gallery`. It is already used in navigation and validation, so changing it requires a redirect or compatibility route rather than a silent rename.

### 1.3 Policy, trust and creator pages

The repository also contains these static pages:

| Page | Path |
|---|---|
| Advertising | `/advertising.html` |
| Become a creator | `/become-creator.html` |
| Content removal | `/content-removal.html` |
| Cookies | `/cookies.html` |
| DMCA | `/dmca.html` |
| EU DSA | `/eu-dsa.html` |
| FAQ | `/faq.html` |
| Guidelines | `/guideline.md` |
| LLM information | `/llms.txt` |
| Parental controls | `/parental-controls.html` |
| Privacy policy | `/privacy-policy.html` |
| Terms | `/terms.html` |
| Trust and safety | `/trust-safety.html` |

## 2. Category inventory

The canonical category source is [`script/categories-data.js`](../script/categories-data.js). It declares 22 categories, and the build currently generates 22 corresponding `category/<slug>/index.html` pages.

| # | Label | Slug | Theme | Current generated page |
|---:|---|---|---|---|
| 1 | Dark Romance | `dark-romance` | danger | Yes |
| 2 | Mafia Romance | `mafia-romance` | danger | Yes |
| 3 | Paranormal & Fantasy Romance | `paranormal-fantasy-romance` | mystic | Yes |
| 4 | Billionaire Romance | `billionaire-romance` | luxury | Yes |
| 5 | Alpha Males | `alpha-males` | luxury | Yes |
| 6 | High School Romance | `high-school-romance` | warm | Yes |
| 7 | Spicy Romance | `spicy-romance` | rose | Yes |
| 8 | Age Gap Romance | `age-gap-romance` | rose | Yes |
| 9 | Vampire Romance | `vampire-romance` | mystic | Yes |
| 10 | Cowboy Romance | `cowboy-romance` | earthy | Yes |
| 11 | Forbidden Romance | `forbidden-romance` | accent | Yes |
| 12 | Second Chance Romance | `second-chance-romance` | accent | Yes |
| 13 | Clean & Wholesome | `clean-wholesome` | warm | Yes |
| 14 | Fated Mates | `fated-mates` | mystic | Yes |
| 15 | Comedy | `comedy` | warm | Yes |
| 16 | Bad Boys | `bad-boys` | danger | Yes |
| 17 | Slow Burn | `slow-burn` | accent | Yes |
| 18 | Enemies to Lovers | `enemies-to-lovers` | danger | Yes |
| 19 | Sports | `sports` | earthy | Yes |
| 20 | College | `college` | warm | Yes |
| 21 | Bhabi Romance | `bhabi-romance` | accent | Yes |
| 22 | Affair & Cheating Romance | `affair-romance` | rose | Yes |

### 2.1 Generated category route list

```text
/category/affair-romance/
/category/age-gap-romance/
/category/alpha-males/
/category/bad-boys/
/category/bhabi-romance/
/category/billionaire-romance/
/category/clean-wholesome/
/category/college/
/category/comedy/
/category/cowboy-romance/
/category/dark-romance/
/category/enemies-to-lovers/
/category/fated-mates/
/category/forbidden-romance/
/category/high-school-romance/
/category/mafia-romance/
/category/paranormal-fantasy-romance/
/category/second-chance-romance/
/category/slow-burn/
/category/spicy-romance/
/category/sports/
/category/vampire-romance/
```

## 3. Story and post inventory

The build currently reports **40 story JSON records** in `stories/index.json`. The source directory contains **41 files** because it includes `stories/index.json` in addition to the 40 individual story records. The Markdown source directory contains 41 story-post files, including the builder’s source posts.

### 3.1 Records by current metadata category

| Current record category | Records | Canonical category relationship |
|---|---:|---|
| Forbidden | 24 | Likely maps to Forbidden Romance |
| Spicy | 8 | Likely maps to Spicy Romance |
| Affair & Cheating Romance | 3 | Matches canonical label |
| Age-Gap | 1 | Likely maps to Age Gap Romance |
| College romance | 1 | Likely maps to College |
| Story | 1 | No canonical category match |
| video | 1 | No canonical category match; appears to be a legacy value |
| **Total** | **40** | |

The record distribution is highly concentrated: **24 of 40 records are marked `Forbidden`**, and **8 of 40 are marked `Spicy`**. The remaining categories have only one to three records. This is not necessarily a content problem, but it means category pages such as Dark Romance, Mafia Romance, Comedy or Sports may currently be empty or nearly empty.

### 3.2 Content-type metadata

All 40 inspected JSON records currently return a missing or null `contentType` value, represented in the audit as **default text**. This conflicts with the existence of `/video/`, `/gellery/`, video assets and the admin editor’s Content type field.

| Content type in records | Count | Consequence |
|---|---:|---|
| Missing/null/default text | 40 | Video and gallery filters cannot rely on this field consistently |
| Explicit video | 0 | Existing video assets are not represented consistently in story metadata |
| Explicit image | 0 | Gallery route may depend on older fields or separate content logic |

The new dashboard should normalize this field at save time and validate it server-side. A story with `contentType: video` must have a valid direct video URL; a story with `contentType: image` must have a cover or gallery image; a text story should not be silently treated as a video merely because a file exists in `video-story-post/`.

## 4. Series and episode inventory

Four series names are currently present in story metadata.

| Series | Records | Audit observation |
|---|---:|---|
| Senior Apu | 14 | Main long-running sequence; duplicate episode number 1 appears |
| Bhabhi Devar Rain | 3 | Episode numbers are 1, 3 and 3; episode 2 is missing or mislabeled |
| Wife-exchange | 2 | Episodes 1 and 2 present |
| Cheating Wife | 1 | Single-record series |

### 4.1 Episode anomalies

The **Senior Apu** series contains both `senior-apu-ep01` and `university-senior-secret-hotel-story-north-south-university` with episode number 1. The **Bhabhi Devar Rain** series contains one episode 1 and two episode 3 records, with no episode 2. These anomalies can break next/previous episode navigation, canonical series ordering and analytics.

The admin pipeline should therefore validate:

```text
series + episode number must be unique
nextEpisodeId must point to an existing story
previousEpisodeId must point to an existing story when used
episode numbers should be positive integers
```

## 5. Source asset inventory

| Source area | Count | Role |
|---|---:|---|
| `story-post/` | 41 files | Markdown story source files |
| `stories/` | 40 records plus index | Generated/public story metadata |
| `gallery-post/` | 12 files | Gallery/poster image assets |
| `video-story-post/` | 5 files | Video assets and one workflow note |
| `category/` | 22 generated pages | Canonical category pages |
| `admin/` | 2 pages | Dashboard and story editor |
| `cloudflare/` | Worker/schema configuration | Backend API and D1 integration |

## 6. Route and pipeline findings

### 6.1 What is working

The repository has a clear build pipeline: Markdown source posts are processed by `script/blog-builder.js`, story metadata is written to `stories/`, category pages are generated from `categories-data.js`, and the final site is validated by `script/validate-site.js`. The admin dashboard has distinct story, review, newsletter and analytics responsibilities. The authentication layer exposes separate admin methods for listing, creating, updating, publishing and deleting stories.

The admin editor also correctly distinguishes three content modes: text story, video and image gallery. It performs client-side checks for required video/image URLs and has a draft versus publish action. The API layer separately exposes review moderation, newsletter listing and GA4 status diagnostics.

### 6.2 What needs normalization

The category vocabulary is not normalized between `categories-data.js`, generated page filters and story JSON records. The `contentType` field is missing from every inspected generated story record even though the editor and public hubs depend on it. The gallery URL uses the historical typo `/gellery/`. The episode metadata contains duplicates and gaps. The admin guide says that post-publication editing updates a draft record but does not update the live Markdown file, so editors need a visible status model that distinguishes **draft record**, **published/sync pending** and **live source file**.

The category system is also duplicated in comments and client scripts. `categories-data.js` explicitly notes that `category-ticker.js` and `category-seo.js` carry their own copies. That creates a future drift risk. The second dashboard should use one shared JSON/module contract for category options, public filters and admin pipeline presets.

## 7. Recommended admin pipeline matrix

The redesigned admin should present publishing actions as presets rather than asking editors to type arbitrary category values.

| Admin action | Stored `contentType` | Canonical category | Required field |
|---|---|---|---|
| Text story | `text` | Selected canonical category | Story content |
| Video story | `video` | Selected canonical category | Direct video URL |
| Image gallery | `image` | Selected canonical category | Cover/gallery image |
| Series episode | Same as content mode | Selected category + series | Unique episode number |
| Premium story | Same as content mode | Premium flag/section | Access mode |

The save pipeline should canonicalize aliases before persistence. For example, `Forbidden`, `forbidden`, and `Forbidden Romance` should resolve to the same category object and route slug. The stored record should retain the canonical label and slug, while optional aliases may be used only for migration.

## 8. Admin redesign implications

For the MRF-style dashboard redesign, the sidebar should expose **Overview**, **Create**, **Library** and **Community** groups. The current target repository already has the underlying responsibilities needed for this model, but they are presented as a long single page. The recommended views are:

| Group | View | Existing functionality to preserve |
|---|---|---|
| Overview | Dashboard | Story counts, sync status, reviews, subscribers, analytics |
| Create | Publish story | Existing `admin/story.html` editor |
| Library | All stories | Search, category/status filtering, edit links |
| Library | Media/assets | Existing image/video source areas and future upload support |
| Library | Categories and series | Category counts, alias normalization, episode integrity |
| Community | Reviews | Approve/reject queue |
| Community | Subscribers | Email list and copy action |
| Community | Analytics | Ratings, recommendations, views and GA4 status |

The dashboard must not expose a free-form category field without a canonical resolver. The story editor should show the selected pipeline destination visibly, for example: `This story will publish to /category/forbidden-romance/`. For a series episode, it should also show the expected neighboring episode IDs and warn about duplicates.

## 9. Priority fixes

1. Normalize all existing story categories to the 22 canonical category labels and slugs.
2. Populate and validate `contentType` for every record.
3. Decide whether `/gellery/` remains the compatibility URL or whether `/gallery/` should be added with a redirect.
4. Repair series episode duplicates, gaps and invalid next-episode links.
5. Remove duplicated category lists from client modules by importing or generating them from one source.
6. Add a generated route contract test that verifies every category page, every story link and every special hub.
7. Make the admin dashboard show sync lifecycle clearly: Draft, Published/Sync pending and Live.
8. Add a first-class Categories/Series management view to the redesigned dashboard.

## References

| # | Repository reference | Evidence |
|---:|---|---|
| 1 | [`script/categories-data.js`](../script/categories-data.js) | Canonical category labels, slugs, descriptions and themes |
| 2 | [`script/blog-builder.js`](../script/blog-builder.js) | Markdown-to-JSON build process, category page generation and sitemap routes |
| 3 | [`admin/index.html`](../admin/index.html) | Current dashboard sections, story list, reviews, newsletter and analytics |
| 4 | [`admin/story.html`](../admin/story.html) | Story editor fields, content type checks and draft/publish flow |
| 5 | [`assets/js/auth.js`](../assets/js/auth.js) | Authentication and admin API method surface |
| 6 | [`stories/index.json`](../stories/index.json) | Generated public story index |
| 7 | [`story-post/`](../story-post/) | Markdown source post collection |
| 8 | [`video-story-post/`](../video-story-post/) | Video source assets and related workflow material |
| 9 | [`script/validate-site.js`](../script/validate-site.js) | Current static route and asset validation |
