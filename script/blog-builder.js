#!/usr/bin/env node
/**
 * Nights Blog Builder
 * Converts Markdown stories → HTML + JSON
 *
 * Usage:
 *   node script/blog-builder.js
 *   node script/blog-builder.js --watch
 *
 * Expects:
 *   story-post/          ← place raw .md files here
 *   stories/             ← output folder (index.json + individual .json)
 *
 * Front-matter (optional YAML at top of .md):
 *   ---
 *   title: My Story
 *   category: Romance
 *   tags: [Intimate, Fantasy]
 *   excerpt: Short teaser...
 *   date: 2026-08-01
 *   cover: /assets/images/cover.jpg
 *   language: bn
 *   ---
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'story-post');
const OUTPUT_DIR = path.join(ROOT, 'stories');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

/* ---------- Simple Markdown → HTML (lightweight) ---------- */
function mdToHtml(md) {
  let html = md
    // Escape first
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs & line breaks
  html = html
    .split(/\n{2,}/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<hr') || block.startsWith('<ul') || block.startsWith('<ol')) {
        return block;
      }
      // Single newlines → <br>
      block = block.replace(/\n/g, '<br />\n');
      return `<p>${block}</p>`;
    })
    .join('\n\n');

  return html;
}

/* ---------- Front-matter parser ---------- */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const meta = {};
  const lines = match[1].split(/\r?\n/);
  lines.forEach(line => {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      // Array support: [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        val = val.replace(/^["']|["']$/g, '');
      }
      meta[m[1]] = val;
    }
  });

  return { meta, body: match[2] };
}

/* ---------- Slug helper ---------- */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\u0980-\u09FF]+/g, '-')  // keep Bangla chars
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'story';
}

/* ---------- Build one story ---------- */
function buildStory(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const htmlContent = mdToHtml(body);

  const baseName = path.basename(filePath, path.extname(filePath));
  const id = meta.id || baseName;
  const title = meta.title || baseName.replace(/[-_]/g, ' ');
  const slug = meta.slug || slugify(title);

  const story = {
    id,
    title,
    slug,
    excerpt: meta.excerpt || body.substring(0, 160).replace(/\n/g, ' ').trim() + '…',
    category: meta.category || 'Story',
    tags: meta.tags || [],
    cover: meta.cover || null,
    date: meta.date || new Date().toISOString().slice(0, 10),
    readTime: meta.readTime || estimateReadTime(body),
    language: meta.language || 'en',
    content: htmlContent
  };

  // Write individual JSON
  const outFile = path.join(OUTPUT_DIR, `${id}.json`);
  fs.writeFileSync(outFile, JSON.stringify(story, null, 2), 'utf8');
  console.log(`  ✓ ${id}.json`);

  return story;
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

/* ---------- Main build ---------- */
function build() {
  console.log('\n🌙 Nights Blog Builder\n');

  if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
    console.log(`Created ${SOURCE_DIR}`);
    console.log('→ Place your .md story files inside story-post/\n');
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.markdown'));

  if (files.length === 0) {
    console.log('No markdown files found in story-post/');
    console.log('Creating a sample story…\n');
    // sample creation omitted for brevity in this push - already have sample in story-post
  }

  const stories = [];
  console.log('Building stories:');
  files.forEach(file => {
    try {
      const story = buildStory(path.join(SOURCE_DIR, file));
      stories.push(story);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  });

  // Sort by date desc
  stories.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Write index
  fs.writeFileSync(INDEX_FILE, JSON.stringify(stories, null, 2), 'utf8');
  console.log(`\n✓ stories/index.json  (${stories.length} stories)`);
  console.log('Done.\n');
}

/* ---------- Watch mode ---------- */
function watch() {
  build();
  console.log('Watching story-post/ for changes… (Ctrl+C to stop)\n');
  fs.watch(SOURCE_DIR, { recursive: false }, (event, filename) => {
    if (filename && (filename.endsWith('.md') || filename.endsWith('.markdown'))) {
      console.log(`Changed: ${filename}`);
      build();
    }
  });
}

/* ---------- CLI ---------- */
const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
  watch();
} else {
  build();
}
