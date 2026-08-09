#!/usr/bin/env node
'use strict';

/**
 * Machine-translates each story's title/excerpt/content out of its native
 * language (frontmatter `language`, currently always `bn`) into every other
 * reader language the site supports, using the Google Cloud Translation API
 * (Basic/v2) — the SAME Google service account already configured for the
 * GA4 "Trending Now" section (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY /
 * GOOGLE_PROJECT_ID). See cloudflare/README.md for the one manual step this
 * still needs (enabling the Cloud Translation API + granting that service
 * account the "Cloud Translation API User" role) before this actually
 * produces output.
 *
 * Design goals — all load-bearing, not incidental:
 *
 *  - Genuinely $0, forever, not just "usually": Google Cloud Translation
 *    Basic's free tier is 500,000 characters/month, every month, not a
 *    one-time trial credit. MONTHLY_FREE_BUDGET below is set a little
 *    under that, and the spend is tracked in a small file committed back
 *    to the repo (stories/i18n/.usage-budget.json) so the cap survives
 *    across CI runs on ephemeral runners. Translation work that doesn't
 *    fit this month's remaining budget is simply left for next month —
 *    the pipeline never asks Google to bill anything.
 *  - One language fully done beats seven languages half done: the queue
 *    is ordered language-by-language (all 25 stories in English, THEN
 *    all 25 in Hindi, etc.) rather than story-by-story, so a reader who
 *    picks a language that's "in" sees every story in it, instead of a
 *    random subset across every language.
 *  - A hand-edited translation is permanent: any stories/i18n/<id>/<lang>.json
 *    with "manual": true is never touched again, even after the Bangla
 *    source changes — that's the "human tune the auto translation" hook
 *    the site owner asked for. Editing the JSON file directly (title/
 *    excerpt/content) and setting manual:true is the whole workflow.
 *  - Never blocks a build: missing credentials, a Google API error, or
 *    running out of budget all result in a clean no-op (exit 0) with a
 *    log line — never a thrown error that fails the calling workflow.
 *  - Runs after `npm run build` (needs stories/*.json to exist) and its
 *    own output (stories/i18n/**, stories/i18n-index.json,
 *    stories/i18n/.usage-budget.json) is committed to git exactly like
 *    stories/*.json already is — this project checks generated story
 *    JSON into the repo rather than only building it fresh in CI, and
 *    translations follow the same convention so the cache in
 *    .usage-budget.json actually persists between runs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const STORIES_DIR = path.join(ROOT, 'stories');
const I18N_DIR = path.join(STORIES_DIR, 'i18n');
const I18N_INDEX_FILE = path.join(STORIES_DIR, 'i18n-index.json');
const BUDGET_FILE = path.join(I18N_DIR, '.usage-budget.json');

// bn is the native authored language of every story today (frontmatter
// `language: bn`). Order matters — see "one language fully done" above.
// Keep this list in sync with SUPPORTED_LANGS in assets/js/i18n.js.
const TARGET_LANGS = ['en', 'ru', 'hi', 'zh', 'es', 'fr', 'ar'];

// Google Cloud Translation Basic (v2): free up to 500,000 chars/month,
// every month. Leaving real headroom below that on purpose — this number
// is deliberately conservative, not a "use it all up" target.
const MONTHLY_FREE_BUDGET = 450000;
// Also cap a single run so one CI job can't spend the whole month's
// budget in one shot (keeps runs fast and failures cheap to retry).
const MAX_CHARS_PER_RUN = 220000;

function log(msg) {
  console.log('[translate] ' + msg);
}

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function sourceHashFor(story) {
  return sha256(JSON.stringify({
    title: story.title || '',
    excerpt: story.excerpt || '',
    content: story.content || '',
  }));
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // "2026-08"
}

function loadBudget() {
  const raw = loadJson(BUDGET_FILE, null);
  const month = currentMonthKey();
  if (raw && raw.month === month) return { month, charsUsed: raw.charsUsed || 0 };
  return { month, charsUsed: 0 }; // new calendar month — fresh allowance
}

function saveBudget(budget) {
  fs.mkdirSync(I18N_DIR, { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2) + '\n', 'utf8');
}

// ---- Google service-account auth --------------------------------------
// Same account as cloudflare/worker/src/index.js's getGoogleAccessToken,
// different OAuth scope. Runs in plain Node (this is a build script, not
// a Worker), so it uses the classic `crypto` module's RSA-SHA256 signer
// instead of Web Crypto — simpler here, same RS256 JWT either way.

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGoogleAccessToken(clientEmail, privateKeyPem) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-translation',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const signingInput = base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(claims));

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();
  const normalizedKey = String(privateKeyPem || '').replace(/\\n/g, '\n');
  const signature = sign.sign(normalizedKey);
  const jwt = signingInput + '.' + signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt),
  });
  if (!res.ok) throw new Error('OAuth token exchange failed: HTTP ' + res.status);
  const data = await res.json();
  if (!data.access_token) throw new Error('OAuth token response had no access_token');
  return data.access_token;
}

// Google Cloud Translation - Basic (v2). `format` makes it HTML-aware so
// the <p> paragraph tags and the inline ad-slot <div> markup in
// story.content survive untouched — only real text nodes get translated.
async function translateText(accessToken, text, targetLang, sourceLang, format) {
  if (!text) return '';
  const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
    body: JSON.stringify({
      q: [text],
      target: targetLang,
      source: sourceLang,
      format: format || 'text',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Translate API HTTP ' + res.status + ': ' + body.slice(0, 300));
  }
  const data = await res.json();
  const t = data.data && data.data.translations && data.data.translations[0];
  return t ? t.translatedText : '';
}

function readAllStories() {
  if (!fs.existsSync(STORIES_DIR)) return [];
  return fs.readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => loadJson(path.join(STORIES_DIR, f), null))
    .filter((s) => s && s.id && s.content);
}

function buildQueue(stories) {
  const queue = [];
  // Language-outer ordering: one language complete before the next starts.
  for (const lang of TARGET_LANGS) {
    for (const story of stories) {
      const sourceLang = story.language || 'bn';
      if (lang === sourceLang) continue;
      const hash = sourceHashFor(story);
      const outFile = path.join(I18N_DIR, story.id, lang + '.json');
      const existing = loadJson(outFile, null);
      if (existing && existing.manual) continue; // hand-tuned — permanent
      if (existing && existing.sourceHash === hash) continue; // already current
      queue.push({ story, sourceLang, lang, hash, outFile });
    }
  }
  return queue;
}

function writeI18nIndex(stories) {
  const out = {};
  for (const story of stories) {
    const dir = path.join(I18N_DIR, story.id);
    if (!fs.existsSync(dir)) continue;
    const langs = {};
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const lang = file.replace(/\.json$/, '');
      const data = loadJson(path.join(dir, file), null);
      if (data) langs[lang] = { title: data.title, excerpt: data.excerpt };
    }
    if (Object.keys(langs).length) out[story.id] = langs;
  }
  fs.mkdirSync(STORIES_DIR, { recursive: true });
  fs.writeFileSync(I18N_INDEX_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  log('Wrote stories/i18n-index.json (' + Object.keys(out).length + ' stories with at least one translation).');
}

async function main() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    log('GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_PROJECT_ID not all set — skipping translation. ' +
      'The site still builds and deploys fine (readers just see the original language plus whatever is ' +
      'already cached in stories/i18n/). See cloudflare/README.md.');
    return;
  }

  const stories = readAllStories();
  if (!stories.length) {
    log('No stories with content found under stories/ — run `npm run build` first.');
    return;
  }

  const queue = buildQueue(stories);
  if (!queue.length) {
    log('Every story already has an up-to-date translation in every supported language. Nothing to do.');
    writeI18nIndex(stories);
    return;
  }
  log(queue.length + ' story/language translation(s) are missing or stale out of ' + (stories.length * TARGET_LANGS.length) + ' total.');

  const budget = loadBudget();
  const monthRemaining = Math.max(0, MONTHLY_FREE_BUDGET - budget.charsUsed);
  if (monthRemaining <= 0) {
    log('This calendar month\'s free-tier translation budget (' + MONTHLY_FREE_BUDGET + ' chars) is already used. ' +
      'Resuming automatically next month — nothing gets billed. (' + queue.length + ' translations still queued.)');
    return;
  }
  const runBudget = Math.min(monthRemaining, MAX_CHARS_PER_RUN);
  log('Budget: ' + budget.charsUsed + '/' + MONTHLY_FREE_BUDGET + ' chars used this month, ' +
    runBudget + ' available for this run.');

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  } catch (err) {
    log('Could not obtain a Google access token (' + err.message + ') — skipping this run. ' +
      'Check that the Cloud Translation API is enabled and the service account has the ' +
      '"Cloud Translation API User" role (cloudflare/README.md).');
    return;
  }

  let charsUsed = 0;
  let done = 0;
  let failed = 0;
  for (const job of queue) {
    const estChars = (job.story.title || '').length + (job.story.excerpt || '').length + (job.story.content || '').length;
    if (charsUsed + estChars > runBudget && done + failed > 0) break;
    try {
      const [title, excerpt, content] = await Promise.all([
        translateText(accessToken, job.story.title || '', job.lang, job.sourceLang, 'text'),
        translateText(accessToken, job.story.excerpt || '', job.lang, job.sourceLang, 'text'),
        translateText(accessToken, job.story.content || '', job.lang, job.sourceLang, 'html'),
      ]);
      charsUsed += estChars;
      fs.mkdirSync(path.dirname(job.outFile), { recursive: true });
      fs.writeFileSync(job.outFile, JSON.stringify({
        lang: job.lang,
        title, excerpt, content,
        sourceHash: job.hash,
        manual: false,
        translatedAt: new Date().toISOString(),
      }, null, 2) + '\n', 'utf8');
      done++;
    } catch (err) {
      failed++;
      log('Failed: ' + job.story.id + ' -> ' + job.lang + ': ' + err.message);
    }
  }

  budget.charsUsed += charsUsed;
  saveBudget(budget);

  const remaining = queue.length - done - failed;
  log('Translated ' + done + ' pair(s) this run (' + charsUsed + ' chars' +
    (failed ? ', ' + failed + ' failed' : '') +
    (remaining > 0 ? ', ' + remaining + ' left for a future run — budget or ordering, not an error' : '') + ').');

  writeI18nIndex(readAllStories());
}

main().catch((err) => {
  // This script must never fail the build/workflow that calls it.
  console.error('[translate] Unexpected error, continuing without failing the caller:', err && err.stack || err);
});
