const fs = require('fs');
const account = fs.readFileSync('account/index.html', 'utf8');
const premium = fs.readFileSync('premium.html', 'utf8');
const blog = fs.readFileSync('assets/js/blog.js', 'utf8');
const builder = fs.readFileSync('script/blog-builder.js', 'utf8');
const checks = [
  ['account reads next=premium', account.includes('new URLSearchParams(window.location.search).get(\'next\')') || account.includes('new URLSearchParams(window.location.search).get("next")')],
  ['account redirects Premium members', account.includes('../premium.html') && account.includes('window.location.replace')],
  ['Premium account link carries next=premium', premium.includes('account/?next=premium')],
  ['Premium login returns to Premium', premium.includes("window.location.replace('premium.html')")],
  ['Premium IDs are rendered', premium.includes('Premium ID:')],
  ['Premium page uses strict exclusive filter', premium.includes('s.exclusive===true')],
  ['homepage feed excludes Premium records', blog.includes('story.exclusive !== true')],
  ['static ordinary feeds exclude Premium records', builder.includes('stories.filter(function (story) { return !story.exclusive; })')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log('Premium member workflow source checks passed.');
