#!/usr/bin/env node
/**
 * Nights Blog Builder v2
 * Markdown → JSON with Series / Episode support
 * Auto-detects next episode and sets nextEpisodeId
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'story-post');
const OUTPUT_DIR = path.join(ROOT, 'stories');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

function mdToHtml(md) {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^---$/gm, '<hr />');
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<hr')) return block;
    return '<p>' + block.replace(/\n/g, '<br />\n') + '</p>';
  }).join('\n\n');
  return html;
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split(/\r?\n/).forEach(line => {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else val = val.replace(/^["']|["']$/g, '');
      meta[m[1]] = val;
    }
  });
  return { meta, body: match[2] };
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^\w\u0980-\u09FF]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80) || 'story';
}

function estimateReadTime(text) {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) + ' min';
}

function buildStory(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const htmlContent = mdToHtml(body);
  const baseName = path.basename(filePath, path.extname(filePath));
  const id = meta.id || baseName;
  const title = meta.title || baseName.replace(/[-_]/g, ' ');
  const story = {
    id, title,
    slug: meta.slug || slugify(title),
    excerpt: meta.excerpt || body.substring(0, 160).replace(/\n/g, ' ').trim() + '…',
    category: meta.category || 'Story',
    tags: meta.tags || [],
    type: meta.type || 'text',
    series: meta.series || null,
    episode: meta.episode != null ? Number(meta.episode) : null,
    cover: meta.cover || null,
    audio: meta.audio || null,
    video: meta.video || null,
    images: meta.images || [],
    date: meta.date || new Date().toISOString().slice(0, 10),
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
  stories.forEach(s => {
    if (!s.series || s.episode == null) return;
    if (!bySeries[s.series]) bySeries[s.series] = [];
    bySeries[s.series].push(s);
  });
  Object.values(bySeries).forEach(eps => {
    eps.sort((a, b) => a.episode - b.episode);
    for (let i = 0; i < eps.length - 1; i++) {
      eps[i].nextEpisodeId = eps[i + 1].id;
      fs.writeFileSync(path.join(OUTPUT_DIR, eps[i].id + '.json'), JSON.stringify(eps[i], null, 2), 'utf8');
    }
  });
}

function build() {
  console.log('\n🌙 Nights Blog Builder v2 (Series + Media)\n');
  if (!fs.existsSync(SOURCE_DIR)) fs.mkdirSync(SOURCE_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
  const stories = [];
  console.log('Building:');
  files.forEach(file => {
    try { stories.push(buildStory(path.join(SOURCE_DIR, file))); }
    catch (err) { console.error('  ✗ ' + file + ': ' + err.message); }
  });
  linkEpisodes(stories);
  stories.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(stories, null, 2), 'utf8');
  console.log('\n✓ stories/index.json (' + stories.length + ' stories)');
  console.log('  Series episodes auto-linked.\nDone.\n');
}

function watch() {
  build();
  console.log('Watching story-post/ …\n');
  fs.watch(SOURCE_DIR, { recursive: false }, (e, f) => {
    if (f && (f.endsWith('.md') || f.endsWith('.markdown'))) { console.log('Changed: ' + f); build(); }
  });
}

const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) watch();
else build();
