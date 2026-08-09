const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'category/index.html', 'gellery/index.html', 'video/index.html', 'series/index.html', 'top-rated/index.html', 'trending/index.html', 'new-releases/index.html', 'privacy-policy.html', 'terms.html', 'faq.html', 'cookies.html', 'premium.html', 'account/index.html', 'account/verify.html', 'account/forgot.html', 'account/reset.html', 'dmca.html', 'trust-safety.html', 'content-removal.html', 'parental-controls.html', 'eu-dsa.html', 'advertising.html', 'become-creator.html', 'admin/index.html', 'admin/story.html'];
const required = ['assets/js/navigation.js', 'assets/js/site-components.js', 'assets/js/ads.js', 'assets/js/auth.js', 'assets/css/ads.css', 'sitemap.xml', 'robots.txt', 'wrangler.toml', 'package-lock.json', 'cloudflare/migrations/0001_rating_review.sql', 'cloudflare/migrations/0002_accounts.sql', 'cloudflare/migrations/0004_admin_content.sql', 'cloudflare/migrations/0005_reactions.sql', 'cloudflare/worker/src/index.js', 'script/sync-admin-stories.js'];
const errors = [];
for (const file of pages.concat(required)) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing: ${file}`);
for (const file of pages) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, 'utf8');
  if (!html.includes('site-components.js')) errors.push(`${file}: missing consent/shared component`);
  const header = html.match(/<header[\s\S]*?<\/header>/i);
  if (header && /data-ad=|<iframe|<script[^>]+src=.*ad/i.test(header[0])) errors.push(`${file}: ad marker appears inside header`);
  if (!html.includes('privacy-policy.html') && !html.includes('site-components.js')) errors.push(`${file}: missing privacy/shared legal link`);
}
const workflows = ['.github/workflows/Deploy.yml', '.github/workflows/cloudflare-worker.yml'];
for (const workflow of workflows) if (!fs.existsSync(path.join(root, workflow))) errors.push(`Missing ${workflow}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${pages.length} pages and ${required.length} required assets/config files.`);
