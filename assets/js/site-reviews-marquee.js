/**
 * SecretChapters – site-wide "What readers are saying" marquee (mahmuda.fun)
 * Homepage-only widget: pulls the latest *approved* reviews across every
 * story (GET /api/reviews/recent) and renders them as the same
 * auto-scrolling marquee used per-story in rating-review.js, each card
 * linking back to the story it's about. No-ops entirely if the mount
 * point isn't on the page, or if there are zero reviews yet — an empty
 * "reviews" section would look broken, not honest.
 */
(function () {
  'use strict';

  var API_BASE = 'https://mahmuda-fun-api.mahmudajenny6.workers.dev';

  // Reviews submitted through the footer's "Rate our site" form (see
  // site-review-footer.js) aren't about any one story — they're posted
  // against this pseudo-story id, reusing the same rating/review API and
  // moderation path as every real story instead of a second system.
  var SITE_STORY_ID = 'site-feedback';

  var mount = document.getElementById('siteReviewsMarqueeMount');
  if (!mount) return;
  var section = document.getElementById('siteReviewsSection');

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso.replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function render(reviews, storyMap) {
    if (!reviews.length) return;
    var cardsHtml = reviews.map(function (r) {
      var isSiteReview = r.storyId === SITE_STORY_ID;
      var story = storyMap[r.storyId];
      var href = isSiteReview ? 'index.html' : 'index.html?story=' + encodeURIComponent(r.storyId);
      var subLabel = isSiteReview ? '★ Site review' : 'on ' + escapeHtml(story ? story.title : r.storyId);
      return '<a class="rr-item" href="' + href + '">' +
        '<div class="rr-item-head">' +
          '<span class="rr-item-name">' + escapeHtml(r.displayName || 'Anonymous') + '</span>' +
          '<span class="rr-item-date">' + escapeHtml(formatDate(r.createdAt)) + '</span>' +
        '</div>' +
        '<p class="rr-item-text">' + escapeHtml(r.reviewText) + '</p>' +
        '<span class="rr-item-story">' + subLabel + '</span>' +
      '</a>';
    }).join('');

    var loop = reviews.length >= 3;
    mount.innerHTML = '<div class="rr-marquee' + (loop ? '' : ' rr-marquee-static') + '">' +
      '<div class="rr-marquee-track">' + cardsHtml + (loop ? cardsHtml : '') + '</div>' +
    '</div>';

    if (section) section.hidden = false;
  }

  function init() {
    Promise.all([
      fetch(API_BASE + '/api/reviews/recent').then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); }),
      fetch('stories/index.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return []; }),
    ]).then(function (results) {
      var reviews = (results[0] && results[0].reviews) || [];
      var stories = Array.isArray(results[1]) ? results[1] : (results[1].stories || []);
      var storyMap = {};
      stories.forEach(function (s) { storyMap[s.id] = s; });
      render(reviews, storyMap);
    }).catch(function () {
      // Stay hidden — no live reviews to show is not an error worth
      // surfacing to a reader, the section markup already ships `hidden`.
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
