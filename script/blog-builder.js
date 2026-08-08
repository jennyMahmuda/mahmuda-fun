#!/usr/bin/env node
/**
 * Nights Blog Builder v3 (mahmuda.fun)
 * Markdown → JSON + auto sitemap.xml / robots.txt + per-story SEO metadata
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'story-post');
const OUTPUT_DIR = path.join(ROOT, 'stories');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');
const SITE_URL = 'https://mahmuda.fun';

function resolveMediaUrl(ref) {
  if (!ref) return '';
  ref = ref.trim();
  if (!ref) return '';
  if (/^https?:\/\//i.test(ref) || ref.startsWith('data:')) return ref;
  if (ref.startsWith('/')) return ref.substring(1);
  return ref;
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
    { path: '/privacy-policy.html', changefreq: 'monthly', priority: '0.3' },
    { path: '/llms.txt', changefreq: 'monthly', priority: '0.2' }
  ];
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

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /script/',
    'Disallow: /_site/',
    '',
    '# Public text, image, video and story paths remain crawlable.',
    'Allow: /llms.txt',
    'Allow: /stories/',
    'Allow: /assets/',
    '',
    'Sitemap: ' + SITE_URL + '/sitemap.xml',
    ''
  ].join('\n');
  fs.writeFileSync(ROBOTS_FILE, robots, 'utf8');
  console.log('✓ robots.txt');
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
    author: meta.author || 'Nights',
    content: injectAdMarkers(htmlContent),
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

  fs.writeFileSync(path.join(OUTPUT_DIR, id + '.json'), JSON.stringify(story, null, 2), 'utf8');
  console.log('  ✓ ' + id + '.json');
  return story;
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
      fs.writeFileSync(path.join(OUTPUT_DIR, eps[i].id + '.json'), JSON.stringify(eps[i], null, 2), 'utf8');
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
  stories.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(stories, null, 2), 'utf8');

  console.log('\n✓ stories/index.json (' + stories.length + ' stories)');
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
