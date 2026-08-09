#!/usr/bin/env node
/**
 * Nights Blog Builder v3 (mahmuda.fun)
 * Markdown → JSON + auto sitemap.xml / robots.txt + per-story SEO metadata
 */
const fs = require('fs');
const path = require('path');
const { CATEGORIES } = require('./categories-data.js');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'story-post');
const OUTPUT_DIR = path.join(ROOT, 'stories');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');
const SITE_URL = 'https://mahmuda.fun';

// If script/imageoptimization.py --write-webp-siblings has already run
// (see Deploy.yml — it runs before this build script), a same-name .webp
// file sits next to the jpg/png source. Prefer it: smaller file, same
// content, no client-side format negotiation needed. Never touches a
// reference that isn't a local jpg/png (http(s) URLs, video, audio, and
// already-webp/svg/gif images pass through unchanged).
function preferWebpSibling(localRef) {
  if (!/\.(jpe?g|png)$/i.test(localRef)) return localRef;
  const onDisk = path.join(ROOT, localRef.replace(/^\/+/, ''));
  const webpOnDisk = onDisk.replace(/\.(jpe?g|png)$/i, '.webp');
  if (fs.existsSync(webpOnDisk)) {
    return localRef.replace(/\.(jpe?g|png)$/i, '.webp');
  }
  return localRef;
}

function resolveMediaUrl(ref) {
  if (!ref) return '';
  ref = ref.trim();
  if (!ref) return '';
  if (/^https?:\/\//i.test(ref) || ref.startsWith('data:')) return ref;
  const local = ref.startsWith('/') ? ref.substring(1) : ref;
  return preferWebpSibling(local);
}

function mdToHtml(md) {
  let html = md;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]*?\.(?:mp4|webm|ogg))(?:\s*"[^"]*")?\)/gi, function (m, alt, src) {
    const url = resolveMediaUrl(src);
    return '<video controls playsinline preload="metadata" alt="' + escapeAttr(alt) + '">' +
      '<source src="' + escapeAttr(url) + '" type="' + videoType(url) + '">Your browser does not support the video tag.</video>';
  });
  html = html.replace(/!\[([^\]]*)\]\(([^)]*?\.(?:mp3|m4a|wav|ogg))(?:\s*"[^"]*")?\)/gi, function (m, alt, src) {
    const url = resolveMediaUrl(src);
    return '<audio controls preload="metadata">' +
      '<source src="' + escapeAttr(url) + '" type="' + audioType(url) + '">Your browser does not support the audio tag.</audio>';
  });
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)(?:\s*"[^"]*")?\)/g, function (m, alt, src) {
    const url = resolveMediaUrl(src);
    return '<img src="' + escapeAttr(url) + '" alt="' + escapeAttr(alt) + '" loading="lazy" decoding="async" />';
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, text, href) {
    const url = resolveMediaUrl(href);
    const isStory = /[?&]story=/.test(url) || /\.json$/.test(url);
    const isInternal = !/^https?:\/\//i.test(url) || url.indexOf(SITE_URL) !== -1;
    if (isInternal || isStory) {
      return '<a href="' + escapeAttr(url) + '">' + text + '</a>';
    }
    return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer nofollow">' + text + '</a>';
  });
  html = html.replace(/^---$/gm, '<hr />');
  html = html.split(/\n{2,}/).map(function (block) {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|hr|div|figure|video|audio|img|iframe|p|ul|ol|li|table|blockquote)/i.test(block)) {
      return block;
    }
    return '<p>' + block.replace(/\n/g, '<br />\n') + '</p>';
  }).join('\n\n');
  return html;
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function videoType(url) {
  if (/\.webm$/i.test(url)) return 'video/webm';
  if (/\.ogg$/i.test(url)) return 'video/ogg';
  return 'video/mp4';
}

function audioType(url) {
  if (/\.ogg$/i.test(url)) return 'audio/ogg';
  if (/\.wav$/i.test(url)) return 'audio/wav';
  if (/\.m4a$/i.test(url)) return 'audio/mp4';
  return 'audio/mpeg';
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(function (s) {
          return s.trim().replace(/^["']|["']$/g, '');
        });
      } else {
        val = val.replace(/^["']|["']$/g, '');
      }
      meta[m[1].toLowerCase()] = val;
    }
  });
  return { meta: meta, body: match[2] };
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^\w\u0980-\u09FF]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80) || 'story';
}

function estimateReadTime(text) {
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)) + ' min';
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getFileDate(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const date = stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;
    return date.toISOString().slice(0, 10);
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

const CATEGORY_KEYWORDS = {
  'romance': ['romance', 'slow burn', 'love story', 'bengali romance story'],
  'forbidden': ['forbidden romance', 'taboo story', 'hot story', 'adult fiction'],
  'fantasy': ['adult fantasy', 'fantasy story', 'erotic fantasy', 'imagination'],
  'intimate': ['intimate stories', 'sensual fiction', 'bengali adult story'],
  'audio': ['audio story', 'bangla audio story', 'listen story', 'adult audio'],
  'video': ['video story', 'adult video fiction', 'watch story', 'series video'],
  'story': ['story', 'bengali story', 'gollpo', 'bengali fiction'],
  'series': ['story series', 'episodic story', 'bengali series', 'part series']
};

function buildKeywords(story) {
  const set = new Set();
  const cat = String(story.category || 'Story').toLowerCase();
  (CATEGORY_KEYWORDS[cat] || CATEGORY_KEYWORDS['story']).forEach(function (k) { set.add(k); });
  (story.tags || []).forEach(function (t) { set.add(String(t).toLowerCase()); });
  set.add('mahmuda.fun');
  set.add('premium adult stories');
  set.add('bengali adult story');
  set.add(story.language === 'bn' ? 'bangla golpo' : 'adult fiction');
  return Array.from(set).slice(0, 12);
}

function buildDescription(story) {
  const excerpt = String(story.excerpt || '').replace(/\n/g, ' ').trim();
  const cat = story.category || 'Story';
  const tail = excerpt.length > 120 ? excerpt.slice(0, 117) + '…' : excerpt;
  return (tail || story.title) + ' — ' + cat + ' story on mahmuda.fun. Read free premium adult fiction.';
}

function injectAdMarkers(htmlContent) {
  const marker = '<div data-ad-container="inline-native" class="ad-slot ad-inline" aria-hidden="true"></div>';
  const midMarker = '<div data-ad-container="mid-content" class="ad-slot ad-inline" aria-hidden="true"></div>';
  const endMarker = '<div data-ad-container="end-of-post" class="ad-slot ad-inline" aria-hidden="true"></div>';
  const blocks = htmlContent.split(/\n\n+/);
  const textBlocks = blocks.filter(function (b) { return /^<p>/i.test(b.trim()); });
  if (textBlocks.length === 0) return htmlContent + '\n\n' + marker + '\n' + endMarker;
  let out = htmlContent;
  const firstIdx = out.indexOf(textBlocks[0]) + textBlocks[0].length;
  out = out.slice(0, firstIdx) + '\n\n' + marker + out.slice(firstIdx);
  const plainLen = out.replace(/<[^>]*>/g, '').length;
  if (plainLen > 900 && textBlocks.length > 4) {
    const midBlock = textBlocks[Math.floor(textBlocks.length / 2)];
    const midIdx = out.indexOf(midBlock, firstIdx);
    if (midIdx !== -1) {
      out = out.slice(0, midIdx) + '\n\n' + midMarker + '\n' + out.slice(midIdx);
    }
  }
  out = out.trim() + '\n\n' + endMarker + '\n';
  return out;
}

function writeSitemap(stories) {
  const today = new Date().toISOString().slice(0, 10);
  const staticPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/category/', changefreq: 'weekly', priority: '0.8' },
    { path: '/gellery/', changefreq: 'weekly', priority: '0.7' },
    { path: '/video/', changefreq: 'weekly', priority: '0.8' },
    { path: '/series/', changefreq: 'weekly', priority: '0.8' },
    { path: '/top-rated/', changefreq: 'daily', priority: '0.8' },
    { path: '/trending/', changefreq: 'daily', priority: '0.8' },
    { path: '/new-releases/', changefreq: 'daily', priority: '0.8' },
    { path: '/faq.html', changefreq: 'monthly', priority: '0.4' },
    { path: '/premium.html', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy-policy.html', changefreq: 'monthly', priority: '0.3' },
    { path: '/llms.txt', changefreq: 'monthly', priority: '0.2' }
  ].concat(CATEGORIES.map(function (c) {
    return { path: '/category/' + c.slug + '/', changefreq: 'weekly', priority: '0.7' };
  }));
  const seen = new Set();
  const urls = [];
  const addUrl = function (loc, lastmod, changefreq, priority) {
    if (!loc || seen.has(loc)) return;
    seen.add(loc); urls.push({ loc: loc, lastmod: lastmod || today, changefreq: changefreq, priority: priority });
  };
  staticPages.forEach(function (p) { addUrl(SITE_URL + p.path, today, p.changefreq, p.priority); });

  (stories || []).forEach(function (s) {
    const slug = s.id || s.slug;
    if (!slug) return;
    addUrl(SITE_URL + '/?story=' + encodeURIComponent(slug), (s.date || today).slice(0, 10), 'weekly', '0.8');
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  urls.forEach(function (u) {
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(u.loc) + '</loc>\n';
    xml += '    <lastmod>' + escapeXml(u.lastmod) + '</lastmod>\n';
    xml += '    <changefreq>' + u.changefreq + '</changefreq>\n';
    xml += '    <priority>' + u.priority + '</priority>\n';
    const story = (stories || []).find(function (s) { return SITE_URL + '/?story=' + encodeURIComponent(s.id || s.slug) === u.loc; });
    if (story) {
      const media = [story.cover].concat(story.images || []).filter(Boolean);
      Array.from(new Set(media)).slice(0, 10).forEach(function (img) {
        if (/^https?:\/\//i.test(img) || /^\//.test(img)) {
          xml += '    <image:image><image:loc>' + escapeXml(img) + '</image:loc><image:title>' + escapeXml(story.title) + '</image:title></image:image>\n';
        }
      });
    }
    xml += '  </url>\n';
  });
  xml += '</urlset>\n';
  fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
  console.log('✓ sitemap.xml (' + urls.length + ' canonical URLs)');

  // Only /script/ (build tooling source) and /_site/ (local build output,
  // never actually published) are kept out of the crawl — everything else
  // is intentionally open. No search engine or AI crawler is singled out
  // for blocking; the entries below exist to make that explicit for the
  // crawlers site owners ask about most, not to restrict anyone not listed
  // (the wildcard rule at the top already allows every other bot by default).
  const openCrawlers = [
    'Googlebot', 'Googlebot-Image', 'Googlebot-Video', 'Googlebot-News',
    'Google-Extended', 'Bingbot', 'DuckDuckBot', 'Applebot', 'Applebot-Extended',
    'Amazonbot', 'YandexBot',
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
    'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User', 'CCBot', 'meta-externalagent'
  ];
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /script/',
    'Disallow: /_site/',
    'Disallow: /admin/',
    '',
    '# Public text, image, video and story paths remain crawlable.',
    'Allow: /llms.txt',
    'Allow: /stories/',
    'Allow: /assets/',
    '',
    '# Explicitly open to major search and AI crawlers — this is a content',
    '# site and wants to be found. Only build tooling stays disallowed, same',
    '# as for everyone else above; nothing here is more restrictive than the',
    "# wildcard rule. If a crawler you use isn't listed by name, it's still",
    '# allowed by the wildcard rule at the top of this file.'
  ]
    .concat(openCrawlers.reduce(function (lines, ua) {
      return lines.concat(['User-agent: ' + ua, 'Allow: /', 'Disallow: /script/', 'Disallow: /_site/', 'Disallow: /admin/', '']);
    }, []))
    .concat([
      'Sitemap: ' + SITE_URL + '/sitemap.xml',
      ''
    ])
    .join('\n');
  fs.writeFileSync(ROBOTS_FILE, robots, 'utf8');
  console.log('✓ robots.txt');
}

// Same loose "does this story belong to this category" match category/
// index.html's client-side filter already used (type/category/tags/
// series contain the slug as a case-insensitive substring) — kept
// consistent so a story that shows up under a tag on the hub page shows
// up on that category's real page too.
// Hyphens and spaces are treated as equivalent ("slow-burn" ~ "Slow
// Burn") — the canonical slugs in script/categories-data.js are
// hyphenated, but tags/categories are hand-typed free text almost always
// space-separated, and without this a canonical page would falsely show
// "no stories yet" for content that's clearly tagged for it.
function normCategoryText(value) {
  return String(value || '').toLowerCase().replace(/[-\s]+/g, ' ').trim();
}
const CATEGORY_MATCH_STOPWORDS = ['romance', 'and', 'the', 'a', 'to', 'of', '&'];

function storyMatchesCategory(story, slug, label) {
  const needle = normCategoryText(slug);
  const haystack = [story.type || 'text', story.category || '']
    .concat(story.tags || [])
    .concat(story.series ? [story.series] : [])
    .map(normCategoryText);
  if (haystack.indexOf(needle) !== -1 || haystack.join(' ').indexOf(needle) !== -1) return true;
  // Compound category names ("Bhabi Romance", "Affair & Cheating Romance")
  // won't substring-match a story tagged with just one plain word ("Bhabi",
  // "Cheating") — fall back to matching on the label's own significant
  // words, so the category page finds content that's clearly meant for it
  // instead of showing "no stories yet" over a naming technicality.
  if (label) {
    const words = normCategoryText(label).split(' ').filter((w) => w.length > 2 && CATEGORY_MATCH_STOPWORDS.indexOf(w) === -1);
    for (const word of words) {
      if (haystack.indexOf(word) !== -1) return true;
    }
  }
  return false;
}

// Resolves what art a category page's hero uses, so every category page
// always has *something* behind its title — never a blank/plain header.
// Resolution order: (1) a real uploaded photo on disk at
// assets/images/categories/<slug>.{webp,jpg,jpeg,png} — the file
// convention used when the site owner uploads a photo for that specific
// category; (2) an explicit `image` override in categories-data.js, for
// uploads that don't follow the <slug> naming convention (e.g.
// bhabi-romance's Bhabi-saree.jpg); (3) a non-photographic mood-art SVG
// (assets/images/categories/theme-<theme>.svg, one per palette) generated
// once and committed like any other static asset. `photo: true` tells the
// caller to lay a darker gradient overlay under the title text — a real
// photo needs more contrast help than the already-dark SVG art does.
const CATEGORY_IMAGE_EXTS = ['webp', 'jpg', 'jpeg', 'png'];
function resolveCategoryBackground(cat) {
  for (const ext of CATEGORY_IMAGE_EXTS) {
    const rel = 'assets/images/categories/' + cat.slug + '.' + ext;
    if (fs.existsSync(path.join(ROOT, rel))) return { path: rel, photo: true };
  }
  if (cat.image && fs.existsSync(path.join(ROOT, cat.image))) return { path: cat.image, photo: true };
  return { path: 'assets/images/categories/theme-' + cat.theme + '.svg', photo: false };
}

function categoryCardData(story) {
  const img = story.cover || (story.images && story.images.length ? story.images[0] : '') || null;
  return {
    id: story.id, title: story.title, excerpt: story.excerpt, date: story.date,
    readTime: story.readTime, series: story.series, category: story.category,
    type: story.type, cover: img, exclusive: !!story.exclusive,
  };
}

// Real, static, individually-crawlable landing pages — one per canonical
// category (script/categories-data.js) — replacing the old approach of a
// single category/?cat=slug page for these (category/index.html itself
// stays in place as a "browse everything, including tags outside this
// list" hub, linked from every category page here). Matching stories are
// computed and embedded at build time, not fetched client-side, so the
// page has real content on first paint with zero extra requests.
function writeCategoryPages(stories) {
  const publicStories = stories.map(publicStoryJson);
  let written = 0;
  CATEGORIES.forEach(function (cat) {
    const matches = publicStories.filter(function (s) { return storyMatchesCategory(s, cat.slug, cat.label); });
    const bg = resolveCategoryBackground(cat);
    // A real photo needs a darker overlay to keep the title/rating text
    // readable than the already-dark, low-contrast mood-art SVGs do.
    const heroOverlay = bg.photo
      ? 'linear-gradient(180deg, rgba(5,5,5,0.45), rgba(5,5,5,0.88))'
      : 'linear-gradient(180deg, rgba(5,5,5,0.25), rgba(5,5,5,0.7))';
    const heroStyle = 'background-image:' + heroOverlay + ', url(\'../../' + escapeAttr(bg.path) + '\');' +
      'background-size:cover;background-position:center;';
    // JSON.stringify does not escape "<" — a title/excerpt containing the
    // literal text "</script>" (increasingly plausible now that the
    // admin content manager lets those fields through with only a length
    // check) would otherwise close this tag early and let arbitrary HTML
    // execute on every visitor of the page. < is valid inside both
    // JSON strings and a <script> block, so this is safe either way.
    const cardsJson = JSON.stringify(matches.map(categoryCardData)).replace(/</g, '\\u003c');
    const canonical = SITE_URL + '/category/' + cat.slug + '/';
    const pageTitle = cat.title + ' | mahmuda.fun – Premium Adult Stories';
    const html = '<!DOCTYPE html>\n<html lang="en" data-theme="dark">\n<head>\n' +
      '<meta charset="UTF-8" />\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
      '<title>' + escapeXml(pageTitle) + '</title>\n' +
      '<meta name="description" content="' + escapeXml(cat.description) + '" />\n' +
      '<meta name="author" content="mahmuda.fun" />\n' +
      '<meta name="robots" content="index, follow, max-image-preview:large" />\n' +
      '<meta name="rating" content="adult" />\n' +
      '<meta name="theme-color" content="#050505" />\n' +
      '<link rel="canonical" href="' + escapeXml(canonical) + '" />\n' +
      '<meta property="og:type" content="website" /><meta property="og:site_name" content="mahmuda.fun" />' +
      '<meta property="og:title" content="' + escapeXml(pageTitle) + '" /><meta property="og:description" content="' + escapeXml(cat.description) + '" />' +
      '<meta property="og:url" content="' + escapeXml(canonical) + '" /><meta property="og:image" content="' + escapeXml(SITE_URL) + '/assets/logo.svg" />' +
      '<meta property="og:locale" content="en_US" />\n' +
      '<meta name="twitter:card" content="summary" /><meta name="twitter:title" content="' + escapeXml(pageTitle) + '" /><meta name="twitter:description" content="' + escapeXml(cat.description) + '" />\n' +
      '<link rel="icon" type="image/svg+xml" href="../../assets/logo.svg" />\n' +
      '<link rel="stylesheet" href="../../assets/css/style.css" />\n' +
      '<link rel="stylesheet" href="../../assets/css/navigation.css" />\n' +
      '<link rel="stylesheet" href="../../assets/css/blog.css" />\n' +
      '<link rel="stylesheet" href="../../assets/css/ads.css" />\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />\n' +
      '</head>\n<body class="cat-theme-' + cat.theme + '">\n' +
      '<header class="navbar"><div class="nav-container">' +
      '<a href="../../index.html" class="logo" aria-label="mahmuda.fun home"><img class="logo-svg" src="../../assets/logo.svg" alt="mahmuda.fun logo" width="160" height="42" fetchpriority="high" decoding="async" /></a>' +
      '<nav class="nav-links" id="navLinks" aria-label="Main navigation">' +
      '<a href="../../index.html" class="nav-item"><span class="nav-icon">🏠</span>Home</a>' +
      '<a href="../../video/" class="nav-item"><span class="nav-icon">▶</span>Video</a>' +
      '<a href="../../category/" class="nav-item active"><span class="nav-icon">◈</span>Category</a>' +
      '<a href="../../gellery/" class="nav-item"><span class="nav-icon">🖼</span>Gallery</a>' +
      '<a href="../../series/" class="nav-item"><span class="nav-icon">▣</span>Series</a><a href="../../premium.html" class="nav-item"><span class="nav-icon">★</span>Premium</a>' +
      '<a href="../../account/" class="nav-item" id="navAccountLink"><span class="nav-icon">👤</span><span id="navAccountLabel">Log in</span></a></nav>' +
      '<div class="nav-actions"><button class="theme-toggle" id="themeToggle" aria-label="Toggle theme"><span class="icon-moon">☾</span><span class="icon-sun">☀</span></button>' +
      '<button class="menu-toggle" id="menuToggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button></div>' +
      '</div></header>\n' +
      '<div class="category-ticker" id="categoryTicker" aria-label="Browse categories"></div>\n' +
      '<div class="ad-leaderboard-wrap"><div data-ad="leaderboard" class="ad-slot"></div></div>\n' +
      '<div class="ad-mobile-wrap"><div data-ad="mobile-banner" class="ad-slot"></div></div>\n' +
      '<main class="section" style="padding-top: 80px;"><div class="container">' +
      '<div class="section-header cat-hero" style="' + heroStyle + '"><h1 class="section-title">' + (cat.emoji ? escapeXml(cat.emoji) + ' ' : '') + escapeXml(cat.label) + '</h1>' +
      '<p class="section-desc">' + matches.length + ' ' + (matches.length === 1 ? 'story' : 'stories') + '</p></div>' +
      '<div class="cat-intro"><p>' + escapeXml(cat.intro) + '</p></div>' +
      '<p style="margin:0 0 24px;"><a href="../" style="color:var(--accent);text-decoration:none;">← Browse all categories</a></p>' +
      '<div class="regular-stories-grid" id="catGrid"><div class="loading-state"><p>Loading…</p></div></div>' +
      '</div></main>\n' +
      '<div class="ad-between-sections"><div data-ad="mid" class="ad-slot"></div></div>\n' +
      writeCategoryFooterHtml() +
      '<script>var CATEGORY_STORIES = ' + cardsJson + ';</script>\n' +
      '<script>(function(){\n' +
      '  "use strict";\n' +
      '  function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#039;");}\n' +
      '  function coverUrl(s){var p=s.cover;if(!p)return "../../assets/images/default-cover.svg";if(/^https?:\\/\\//i.test(p))return p;if(p.charAt(0)==="/")return "../.."+p;return "../../"+p;}\n' +
      '  var grid=document.getElementById("catGrid");\n' +
      '  if(!CATEGORY_STORIES.length){grid.innerHTML="<div class=\\"loading-state\\"><p>No stories in this category yet — check back soon.</p></div>";}\n' +
      '  else{grid.innerHTML=CATEGORY_STORIES.map(function(s){\n' +
      '    var img=coverUrl(s);\n' +
      '    var badge=s.exclusive?"🔒 Members":(s.series?esc(s.series):esc(s.category||s.type||"Story"));\n' +
      '    return "<a class=\\"feed-card\\" href=\\"../../index.html?story="+encodeURIComponent(s.id)+"\\" style=\\"text-decoration:none\\">"+\n' +
      '      "<div class=\\"feed-card-media\\"><img src=\\""+esc(img)+"\\" alt=\\""+esc(s.title)+"\\" loading=\\"lazy\\" decoding=\\"async\\" onerror=\\"this.style.display=\'none\'\\"></div>"+\n' +
      '      "<div class=\\"feed-card-header\\"><div class=\\"feed-avatar\\">N</div><div class=\\"feed-meta\\"><div class=\\"feed-author\\">SecretChapters</div><div class=\\"feed-time\\">"+esc(s.date||"")+" · "+esc(s.readTime||"")+"</div></div>"+\n' +
      '      "<span class=\\"feed-type-badge\\">"+badge+"</span><span data-rating-slot=\\""+esc(s.id)+"\\"></span></div>"+\n' +
      '      "<h2 class=\\"feed-title\\">"+esc(s.title)+"</h2><p class=\\"feed-excerpt\\">"+esc(s.excerpt||"")+"</p></a>";\n' +
      '  }).join("");}\n' +
      '  if(window.NightsRatingReview&&window.NightsRatingReview.getSummaryMap){\n' +
      '    window.NightsRatingReview.getSummaryMap().then(function(map){\n' +
      '      grid.querySelectorAll("[data-rating-slot]").forEach(function(slot){\n' +
      '        var summary=map[slot.getAttribute("data-rating-slot")];\n' +
      '        if(summary&&summary.count)slot.outerHTML=window.NightsRatingReview.badgeHtml(summary);\n' +
      '      });\n' +
      '    });\n' +
      '  }\n' +
      '})();</script>\n' +
      '<script src="../../assets/js/auth.js" defer></script>\n' +
      '<script src="../../assets/js/category-ticker.js" defer></script>\n' +
      '<script src="../../assets/js/navigation.js" defer></script>\n' +
      '<script src="../../assets/js/site-components.js" defer></script>\n' +
      '<script src="../../assets/js/rating-review.js" defer></script>\n' +
      '<script src="../../assets/js/ads.js" defer></script>\n' +
      '</body>\n</html>\n';

    const dir = path.join(ROOT, 'category', cat.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    written++;
  });
  console.log('✓ ' + written + ' category/<slug>/index.html pages (' + CATEGORIES.length + ' categories)');
}

// Same resolution the per-category pages use, exported as a small static
// JSON manifest so client-side card grids (homepage "Popular Categories",
// the category/ hub page) can show the identical background per slug
// without duplicating the disk-existence-check logic in the browser.
function writeCategoryBackgroundsManifest() {
  const manifest = {};
  CATEGORIES.forEach(function (cat) {
    const bg = resolveCategoryBackground(cat);
    manifest[cat.slug] = { path: bg.path, photo: bg.photo };
  });
  const outDir = path.join(ROOT, 'assets', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'category-backgrounds.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✓ assets/data/category-backgrounds.json');
}

function writeCategoryFooterHtml() {
  return '<footer class="footer"><div class="container"><div class="footer-inner">' +
    '<div class="footer-brand"><img class="logo-svg" src="../../assets/logo.svg" alt="mahmuda.fun" width="140" height="37" loading="lazy" decoding="async" style="height:30px;width:auto;" />' +
    '<p class="footer-tagline">Premium Adult Fiction • 18+ Only</p>' +
    '<div class="footer-social">' +
    '<a href="https://www.facebook.com/share/1HCyEtHHvN/?mibextid=wwXIfr" rel="noopener noreferrer" target="_blank" aria-label="Facebook">Facebook</a>' +
    '<a href="https://x.com/jennydufun" rel="noopener noreferrer" target="_blank" aria-label="X (Twitter)">X / Twitter</a>' +
    '<a href="https://xhamster.com/users/profiles/safejenny69" rel="noopener noreferrer" target="_blank" aria-label="xHamster">xHamster</a>' +
    '</div></div>' +
    '<nav class="footer-links" aria-label="Footer">' +
    '<div class="footer-col"><h4>Explore</h4><a href="../../index.html">Feed</a><a href="../../category/">Categories</a><a href="../../series/">Series</a><a href="../../gellery/">Gallery</a><a href="../../video/">Video</a><a href="../../premium.html">Premium</a><a href="../../become-creator.html">Become a Creator</a></div>' +
    '<div class="footer-col"><h4>Support</h4><a href="../../faq.html">FAQ</a><a href="mailto:support@mahmuda.fun">Help</a><a href="mailto:support@mahmuda.fun">Contact us</a><a href="../../advertising.html">Advertising</a><a href="../../content-removal.html">Content Removal</a></div>' +
    '<div class="footer-col"><h4>Legal</h4><a href="../../terms.html">Terms of Use</a><a href="../../privacy-policy.html">Privacy Policy</a><a href="../../cookies.html">Cookies Policy</a><a href="../../dmca.html">DMCA / Copyright</a><a href="../../dmca.html#2257">18 U.S.C. 2257</a><a href="../../parental-controls.html">Parental Controls</a><a href="../../eu-dsa.html">EU DSA</a><a href="../../trust-safety.html">Trust &amp; Safety</a><a href="../../sitemap.xml">Sitemap</a></div>' +
    '</nav></div>' +
    '<p class="footer-copy">Premium Adult Fiction • Audio • Video • Series • 18+ Only • mahmuda.fun<br>© <span class="footer-year">2026</span> mahmuda.fun. All rights reserved.</p>' +
    '</div></footer>\n';
}

function buildStory(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontMatter(raw);
  const meta = parsed.meta;
  const body = parsed.body;
  const htmlContent = mdToHtml(body);
  const baseName = path.basename(filePath, path.extname(filePath));
  const id = meta.id || baseName;
  const title = meta.title || baseName.replace(/[-_]/g, ' ');
  const cover = meta.cover || meta.image ||
    (Array.isArray(meta.images) && meta.images.length ? meta.images[0] : null) || null;
  const images = (Array.isArray(meta.images) ? meta.images : (meta.image ? [meta.image] : []))
    .map(resolveMediaUrl).filter(Boolean);
  const video = meta.video ? resolveMediaUrl(meta.video) : null;
  const audio = meta.audio ? resolveMediaUrl(meta.audio) : null;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];

  const story = {
    id: id,
    title: title,
    slug: meta.slug || slugify(title),
    excerpt: meta.excerpt || body.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').substring(0, 160).trim() + '…',
    category: meta.category || 'Story',
    tags: tags,
    type: meta.type || 'text',
    series: meta.series || null,
    episode: meta.episode != null ? Number(meta.episode) : null,
    cover: cover ? resolveMediaUrl(cover) : null,
    audio: audio,
    video: video,
    images: images,
    date: meta.date || getFileDate(filePath),
    readTime: meta.readTime || estimateReadTime(body),
    language: meta.language || 'en',
    author: meta.author || 'SecretChapters',
    content: injectAdMarkers(htmlContent),
    // Members-only story: full text is stripped from the public JSON (see
    // writeStoryJson/publicStoryJson below) and instead synced into the D1
    // exclusive_content table, served only to logged-in verified accounts
    // via GET /api/stories/{id}/content.
    exclusive: meta.exclusive === true || meta.exclusive === 'true',
    nextEpisodeId: null,
    seo: {
      title: (title + ' | mahmuda.fun – Premium Adult Stories').slice(0, 60),
      description: buildDescription({ title: title, excerpt: meta.excerpt, category: meta.category, language: meta.language }),
      keywords: buildKeywords({ category: meta.category, tags: tags, language: meta.language }),
      ogImage: images[0] || cover ? resolveMediaUrl(images[0] || cover) : null,
      canonical: SITE_URL + '/?story=' + encodeURIComponent(id)
    },
    ads: {
      enabled: true,
      slots: ['inline-native', 'mid-content', 'end-of-post']
    }
  };

  writeStoryJson(story);
  console.log('  ✓ ' + id + '.json');
  return story;
}

// Public JSON must never carry the body text of an exclusive story — the
// full text only ever lives in D1 (exclusive_content), gated behind login.
// Everything else (title, excerpt, cover, tags…) stays public so the
// story still shows up as a locked card in feeds/category/series.
function publicStoryJson(story) {
  if (!story.exclusive) return story;
  return Object.assign({}, story, { content: null });
}

function writeStoryJson(story) {
  fs.writeFileSync(path.join(OUTPUT_DIR, story.id + '.json'), JSON.stringify(publicStoryJson(story), null, 2), 'utf8');
}

function sqlString(value) {
  return "'" + String(value == null ? '' : value).replace(/'/g, "''") + "'";
}

// Syncs full body text for every exclusive story into a SQL file applied
// to D1 on each Worker deploy (see .github/workflows/cloudflare-worker.yml).
// Markdown stays the single source of truth; D1 is just the runtime
// serving layer for the gated content.
function writeExclusiveContentSeed(stories) {
  const genDir = path.join(ROOT, 'cloudflare', 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
  const sqlFile = path.join(genDir, 'exclusive-content.sql');
  const exclusiveStories = stories.filter(function (s) { return s.exclusive; });
  if (!exclusiveStories.length) {
    fs.writeFileSync(sqlFile, '-- No exclusive stories in this build.\n', 'utf8');
    console.log('✓ cloudflare/generated/exclusive-content.sql (0 exclusive stories)');
    return;
  }
  const lines = exclusiveStories.map(function (s) {
    return 'INSERT INTO exclusive_content (story_id, content, updated_at) VALUES (' +
      sqlString(s.id) + ', ' + sqlString(s.content) + ", datetime('now'))" +
      ' ON CONFLICT(story_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at;';
  });
  fs.writeFileSync(sqlFile, lines.join('\n') + '\n', 'utf8');
  console.log('✓ cloudflare/generated/exclusive-content.sql (' + exclusiveStories.length + ' exclusive stories)');
}

function linkEpisodes(stories) {
  const bySeries = {};
  stories.forEach(function (s) {
    if (!s.series || s.episode == null) return;
    if (!bySeries[s.series]) bySeries[s.series] = [];
    bySeries[s.series].push(s);
  });
  Object.keys(bySeries).forEach(function (k) {
    const eps = bySeries[k];
    eps.sort(function (a, b) { return a.episode - b.episode; });
    for (let i = 0; i < eps.length - 1; i++) {
      eps[i].nextEpisodeId = eps[i + 1].id;
      writeStoryJson(eps[i]);
    }
  });
}

function build() {
  console.log('\n🌙 Nights Blog Builder v3 (Media + SEO + Auto Ads)\n');
  if (!fs.existsSync(SOURCE_DIR)) fs.mkdirSync(SOURCE_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(SOURCE_DIR).filter(function (f) {
    return f.endsWith('.md') || f.endsWith('.markdown');
  });

  const stories = [];
  console.log('Building:');
  files.forEach(function (file) {
    try {
      stories.push(buildStory(path.join(SOURCE_DIR, file)));
    } catch (err) {
      console.error('  ✗ ' + file + ': ' + err.message);
    }
  });

  linkEpisodes(stories);
  writeExclusiveContentSeed(stories);
  stories.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(stories.map(publicStoryJson), null, 2), 'utf8');

  console.log('\n✓ stories/index.json (' + stories.length + ' stories)');
  writeCategoryPages(stories);
  writeCategoryBackgroundsManifest();
  writeSitemap(stories);
  console.log('Done.\n');
}

function watch() {
  build();
  console.log('Watching story-post/ …\n');
  fs.watch(SOURCE_DIR, { recursive: false }, function (e, f) {
    if (f && (f.endsWith('.md') || f.endsWith('.markdown'))) {
      console.log('Changed: ' + f);
      build();
    }
  });
}

const args = process.argv.slice(2);
if (args.indexOf('--watch') !== -1 || args.indexOf('-w') !== -1) watch();
else build();
