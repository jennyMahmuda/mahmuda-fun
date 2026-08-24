#!/usr/bin/env node
'use strict';

/**
 * Turns 'published' rows in D1's admin_stories table (written by the
 * /admin/ content manager — see cloudflare/worker/src/index.js's
 * handleAdmin* functions) into real story-post/<id>.md files committed to
 * the repo, then marks them synced so this never re-writes the same
 * story twice.
 *
 * Why a file at all, instead of the Worker reading admin_stories
 * directly on every page view? Consistency with how every other story on
 * this site works: story-post/*.md, built once by script/blog-builder.js
 * into static JSON, served with zero per-request database queries. An
 * admin-submitted story becomes a completely normal story the moment
 * it's synced — indistinguishable from one authored by hand, and it
 * keeps working even if this admin system is ever removed.
 *
 * Runs via `npx wrangler d1 execute ... --json` (needs
 * CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID, same as every other D1
 * command in this repo) rather than a direct HTTP call, so it shares
 * exactly the same auth path as npm run cf:migrate:remote.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STORY_POST_DIR = path.join(ROOT, 'story-post');
const DB_NAME = 'mahmuda_fun_reviews';

function log(msg) {
  console.log('[sync-admin] ' + msg);
}

function runD1(sql) {
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 32 }
  );
  // wrangler prints occasional non-JSON status lines before the JSON
  // array on some versions/environments — find the JSON payload robustly.
  const start = out.indexOf('[');
  const parsed = JSON.parse(start >= 0 ? out.slice(start) : out);
  return (parsed[0] && parsed[0].results) || [];
}

function yamlScalar(value) {
  const s = String(value);
  // Only quote when needed — keeps the frontmatter readable/diffable,
  // matching the plain style every hand-authored story-post/*.md uses.
  if (/^[\w .,'!?…"’“”—–-]*$/u.test(s) && !/^\s|\s$/.test(s)) return s;
  return '"' + s.replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
}

function yamlList(arr) {
  return '[' + (arr || []).map((v) => yamlScalar(v)).join(', ') + ']';
}

function buildFrontMatter(row) {
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch { tags = []; }
  const lines = ['---'];
  lines.push('title: ' + yamlScalar(row.title));
  if (row.series) lines.push('series: ' + yamlScalar(row.series));
  if (row.episode) lines.push('episode: ' + row.episode);
  lines.push('category: ' + yamlScalar(row.category));
  let categories = [];
  try { categories = JSON.parse(row.categories_json || '[]'); } catch { categories = []; }
  if (categories.length) lines.push('categories: ' + yamlList(categories));
  if (tags.length) lines.push('tags: ' + yamlList(tags));
  // Was hardcoded to 'text' regardless of content_type — meaning an
  // admin-created video/gallery post could never actually be typed as
  // one, and /video/ and /gellery/ (which key off this exact field, see
  // guideline.md) would never pick it up. content_type now comes from
  // the "Content type" field in the admin story editor.
  lines.push('type: ' + (row.content_type === 'video' || row.content_type === 'image' ? row.content_type : 'text'));
  lines.push('date: ' + new Date().toISOString().slice(0, 10));
  lines.push('language: ' + yamlScalar(row.language || 'bn'));
  lines.push('excerpt: ' + yamlScalar(row.excerpt));
  if (row.seo_title) lines.push('seoTitle: ' + yamlScalar(row.seo_title));
  if (row.meta_description) lines.push('metaDescription: ' + yamlScalar(row.meta_description));
  let seoKeywords = [];
  try { seoKeywords = JSON.parse(row.seo_keywords || '[]'); } catch { seoKeywords = []; }
  if (seoKeywords.length) lines.push('seoKeywords: ' + yamlList(seoKeywords));
  if (row.cover_url || row.thumbnail_url) lines.push('cover: ' + yamlScalar(row.thumbnail_url || row.cover_url));
  if (row.cover_alt) lines.push('coverAlt: ' + yamlScalar(row.cover_alt));
  if (row.thumbnail_alt) lines.push('thumbnailAlt: ' + yamlScalar(row.thumbnail_alt));
  if (row.video_url) lines.push('video: ' + yamlScalar(row.video_url));
  if (row.audio_url) lines.push('audio: ' + yamlScalar(row.audio_url));
  if (row.exclusive) lines.push('exclusive: true');
  lines.push('---');
  return lines.join('\n');
}

function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    log('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set — skipping (nothing to sync without D1 access).');
    return;
  }

  let rows;
  try {
    rows = runD1("SELECT * FROM admin_stories WHERE ((status = 'published' AND synced_at IS NULL) OR ((status = 'deleted' OR status = 'hidden') AND synced_at IS NOT NULL)) ORDER BY created_at ASC LIMIT 50");
  } catch (err) {
    log('Could not query D1 (' + err.message + ') — skipping this run without failing the build.');
    return;
  }

  if (!rows.length) {
    log('No newly published admin stories to sync.');
    return;
  }
  log(rows.length + ' newly published story/ies to sync.');

  if (!fs.existsSync(STORY_POST_DIR)) fs.mkdirSync(STORY_POST_DIR, { recursive: true });

  const syncedIds = [];
  for (const row of rows) {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(row.id)) {
      log('Skipping "' + row.id + '" — not a safe filename (this should be impossible; the Worker validates this on write).');
      continue;
    }
    const filePath = path.join(STORY_POST_DIR, row.id + '.md');
    if (row.status === 'deleted' || row.status === 'hidden') {
      if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); log('Removed story-post/' + row.id + '.md'); }
      syncedIds.push(row.id);
      continue;
    }
    const content = buildFrontMatter(row) + '\\n\\n' + row.content.trim() + '\\n';
    fs.writeFileSync(filePath, content, 'utf8');
    log((fs.existsSync(filePath) ? 'Wrote' : 'Created') + ' story-post/' + row.id + '.md');
    syncedIds.push(row.id);
  }

  if (!syncedIds.length) {
    log('Nothing written — no files to mark synced.');
    return;
  }

  const idList = syncedIds.map((id) => "'" + id.replace(/'/g, "''") + "'").join(',');
  try {
    runD1("UPDATE admin_stories SET synced_at = CASE WHEN status = 'hidden' THEN NULL ELSE datetime('now') END, status = CASE WHEN status = 'deleted' THEN 'removed' ELSE status END WHERE id IN (" + idList + ')');
    log('Marked ' + syncedIds.length + ' story/ies as synced in D1.');
  } catch (err) {
    log('WARNING: wrote the file(s) but failed to mark them synced in D1 (' + err.message + '). ' +
      'The next run will try to write them again and skip since the file already exists — check admin_stories manually.');
  }
}

main();
