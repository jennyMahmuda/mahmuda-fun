#!/usr/bin/env node
/**
 * Nights Blog Builder v2
 * Markdown → JSON + auto sitemap.xml / robots.txt
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

function mdToHtml(md) {
  let html = md;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Typography
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />');
  
  // Links: [text](url) - runs after images
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Horizontal Rule
  html = html.replace(/^---$/gm, '<hr />');
  
  // Paragraph formatting (avoids wrapping block-level HTML like <video> or <img> in <p>)
  html = html.split(/\n{2,}/).map(function (block) {
    block = block.trim();
    if (!block) return '';
    // Skip adding <p> tags if the block is already an HTML block element
    if (/^<(h[1-6]|hr|div|figure|video|audio|img|iframe|p|ul|ol|li|table|blockquote)/i.test(block)) {
      return block;
    }
    return '<p>' + block.replace(/\n/g, '<br />\n') + '</p>';
  }).join('\n\n');
  
  return html;
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(function (s) {
          return s.trim().replace(/^["']|["']$/g, '');
        });
      } else {
        val = val.replace(/^["']|["']$/g, '');
      }
      meta[m[1]] = val;
    }
  });
  return { meta: meta, body: match[2] };
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^\w\u0980-\u09FF]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80) || 'story';
}

function estimateReadTime(text) {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) + ' min';
}

// FIXED: Syntax error and missing entities corrected
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// NEW: Gets the original file creation date to prevent dates from changing on rebuild
function getFileDate(filePath) {
  try {
    const stats = fs.statSync(filePath);
    // Fallback to modified time if birthtime isn't supported by the OS
    const date = stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;
    return date.toISOString().slice(0, 10);
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

function writeSitemap(stories) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  urls.push({ loc: SITE_URL + '/', lastmod: today, changefreq: 'daily', priority: '1.0' });
  urls.push({ loc: SITE_URL + '/index.html', lastmod: today, changefreq: 'daily', priority: '1.0' });
  urls.push({ loc: SITE_URL + '/privacy-policy.html', lastmod: today, changefreq: 'monthly', priority: '0.3' });
  
  (stories || []).forEach(function (s) {
    const slug = s.id || s.slug;
    urls.push({
      loc: SITE_URL + '/?story=' + encodeURIComponent(slug),
      lastmod: (s.date || today).slice(0, 10),
      changefreq: 'weekly',
      priority: '0.8'
    });
  });
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  urls.forEach(function (u) {
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(u.loc) + '</loc>\n';
    xml += '    <lastmod>' + u.lastmod + '</lastmod>\n';
    xml += '    <changefreq>' + u.changefreq + '</changefreq>\n';
    xml += '    <priority>' + u.priority + '</priority>\n';
    xml += '  </url>\n';
  });
  xml += '</urlset>\n';
  
  fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
  console.log('✓ sitemap.xml (' + urls.length + ' URLs)');
  const robots = 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n';
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
  
  const story = {
    id: id,
    title: title,
    slug: meta.slug || slugify(title),
    excerpt: meta.excerpt || body.replace(/<[^>]*>?/gm, '').substring(0, 160).replace(/\n/g, ' ').trim() + '…',
    category: meta.category || 'Story',
    tags: meta.tags || [],
    type: meta.type || 'text',
    series: meta.series || null,
    episode: meta.episode != null ? Number(meta.episode) : null,
    cover: meta.cover || null,
    audio: meta.audio || null,
    video: meta.video || null,
    images: meta.images || [],
    date: meta.date || getFileDate(filePath), // Fixed: prevents overwriting dates
    readTime: meta.readTime || estimateReadTime(body),
    language: meta.language || 'en',
    content: htmlContent,
    nextEpisodeId: null
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
  console.log('\n🌙 Nights Blog Builder v2 (Media Support + Sitemap)\n');
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