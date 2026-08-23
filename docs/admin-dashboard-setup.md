# mahmuda.fun Admin Dashboard Setup

The redesigned admin workspace follows the Musfiq R. Farhan-style dark studio layout. The sidebar includes Dashboard, Publish story, All stories, Subscribers, Reviews, Analytics and an expandable list of all 30 live content destinations from the supplied navigation PDF.

## GitHub Secrets

Add these repository secrets under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `ADMIN_USERNAME` | The username you will type on `/admin/` |
| `ADMIN_PASSWORD` | A strong password of at least 10 characters |
| `CLOUDFLARE_API_TOKEN` | Existing Worker deployment token |
| `CLOUDFLARE_ACCOUNT_ID` | Existing Cloudflare account ID |

The repository variable `ENABLE_CLOUDFLARE_DEPLOY` must remain `true` for the Worker deployment job to run. The workflow never writes either admin credential into the static site. During deployment, the password is converted to a salted PBKDF2-SHA-256 hash and stored in D1, while the Worker receives the username/password as protected secrets. The browser receives only an opaque, expiring Bearer session token after a successful login.

## Publishing pipeline

The story editor replaces free-form category entry with the 22 canonical category destinations. Before saving, the editor shows the exact live destination, such as `/category/forbidden-romance/`, so an editor can verify the route before submitting. The same editor provides text, video, image-gallery, series, episode and members-only controls. The existing Worker API remains the authorization boundary, and the build process remains the source of public static pages.

## SEO live preview

The editor now previews the title, URL and excerpt in a search-result style card while typing. The preview is advisory and does not replace server-side metadata generation. The story ID is shown as the detail slug and the selected category is shown as the canonical category destination.

## Live route safety

The dashboard exposes all destinations from the PDF: Home, Categories, all 22 category routes, New Releases, Series, Trending, Top Rated, Video and the compatibility Gallery route `/gellery/`. The historical spelling `/gellery/` is intentionally preserved because it is the existing public route.

## Validation

Run `npm run validate`, `npm run build`, `node --check assets/js/admin-pipeline.js`, `node --check assets/js/auth.js`, `node --check cloudflare/worker/src/index.js` and `node --check script/bootstrap-admin.js` before deployment. The Worker deployment workflow also validates the Worker, applies migrations, provisions the configured admin, deploys the Worker and configures the protected runtime secrets.
