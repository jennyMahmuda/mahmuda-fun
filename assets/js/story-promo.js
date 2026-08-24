/**
 * SecretChapters – Mid-page story promo widget (mahmuda.fun)
 * Inserts a small "You might also like" story grid before the footer
 * on every public content page, so every page (not just the home feed)
 * gives readers a next click into another story. Skipped on /admin/
 * (internal tool, not reader-facing) and /account/ (auth flows — a
 * promo mid-signup/verify/reset would be a distraction, not a help).
 */
(function () {
  'use strict';

  var path = window.location.pathname;
  if (/\/admin\//.test(path) || /\/account\//.test(path)) return;

  // Depth-based relative-path prefix — works for any folder depth without
  // needing a hand-maintained list of folder names (category/<slug>/ is
  // two deep, video/ or top-rated/ etc. are one deep, root pages are
  // zero) so a newly added folder never silently breaks this like a
  // fixed regex allowlist would.
  function relativeRoot() {
    var segments = path.split('/').filter(Boolean);
    if (segments.length && /\.[a-z0-9]+$/i.test(segments[segments.length - 1])) segments.pop();
    return segments.map(function () { return '../'; }).join('');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function coverUrl(story, root) {
    var p = story.cover || (story.images && story.images.length ? story.images[0] : '');
    if (!p) return root + 'assets/images/default-cover.svg';
    if (/^https?:\/\//i.test(p)) return p;
    return root + p.replace(/^\/+/, '');
  }

  function pickRandom(list, n) {
    var pool = list.slice();
    var out = [];
    while (pool.length && out.length < n) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  function render(stories) {
    if (!stories.length) return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    // Already on this exact page (e.g. it re-fired) — don't duplicate.
    if (document.getElementById('storyPromoWidget')) return;

    var root = relativeRoot();
    var picks = pickRandom(stories, 4);
    var section = document.createElement('section');
    section.id = 'storyPromoWidget';
    section.className = 'story-promo';
    section.setAttribute('aria-label', 'Recommended stories');
    section.innerHTML =
      '<div class="story-promo-inner">' +
        '<div class="story-promo-head">' +
          '<span class="story-promo-eyebrow">Keep reading</span>' +
          '<h2>You might also like</h2>' +
        '</div>' +
        '<div class="story-promo-grid">' +
          picks.map(function (s) {
            var img = coverUrl(s, root);
            return '<a class="story-promo-card" href="' + root + 'story/' + encodeURIComponent(s.id) + '/">' +
              '<div class="story-promo-media"><img src="' + escapeHtml(img) + '" alt="' + escapeHtml(s.title) + '" loading="lazy" decoding="async" onerror="this.remove()"></div>' +
              '<div class="story-promo-body">' +
                '<span class="story-promo-cat">' + escapeHtml(s.category || 'Story') + '</span>' +
                '<h3>' + escapeHtml(s.title) + '</h3>' +
              '</div>' +
            '</a>';
          }).join('') +
        '</div>' +
      '</div>';
    footer.parentNode.insertBefore(section, footer);
  }

  function init() {
    fetch(relativeRoot() + 'stories/index.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) { render(Array.isArray(data) ? data : (data.stories || [])); })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
