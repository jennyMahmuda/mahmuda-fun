const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'category/index.html', 'gellery/index.html', 'video/index.html', 'series/index.html', 'privacy-policy.html', 'terms.html', 'faq.html', 'cookies.html', 'premium.html'];
const required = ['assets/js/navigation.js', 'assets/js/site-components.js', 'assets/js/ads.js', 'assets/css/ads.css', 'sitemap.xml', 'robots.txt'];
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
const workflow = path.join(root, '.github/workflows/workflow.yml');
if (!fs.existsSync(workflow)) errors.push('Missing canonical workflow.yml');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${pages.length} pages and ${required.length} required assets.`);
