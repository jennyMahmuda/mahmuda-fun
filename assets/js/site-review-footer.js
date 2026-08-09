/**
 * SecretChapters – "Rate our site" footer form (mahmuda.fun, home page only)
 * A general website review — Name, Email, star Rating, and a free-text
 * "reader experience" box — distinct from the per-story rating widget in
 * rating-review.js. Reuses the exact same rating/review Worker endpoints
 * against a fixed pseudo-story id (SITE_STORY_ID) instead of a second
 * backend: the rating goes through POST /api/stories/:id/ratings and the
 * text through POST /api/stories/:id/reviews, so it's held for moderation
 * and shown the same way every other review is — see
 * site-reviews-marquee.js for how it's special-cased in the marquee.
 */
(function () {
  'use strict';

  var API_BASE = 'https://mahmuda-fun-api.mahmudajenny6.workers.dev';
  var SITE_STORY_ID = 'site-feedback';
  var ANON_KEY_STORAGE = 'nights_anonymous_key';

  var form = document.getElementById('siteReviewForm');
  if (!form) return;

  function getAnonymousKey() {
    try {
      var existing = window.localStorage.getItem(ANON_KEY_STORAGE);
      if (existing && /^[a-zA-Z0-9._:-]{16,160}$/.test(existing)) return existing;
      var fresh = 'anon-' + (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2));
      window.localStorage.setItem(ANON_KEY_STORAGE, fresh);
      return fresh;
    } catch (e) {
      return 'anon-session-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function apiPost(path, body, anonymousKey) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-anonymous-key': anonymousKey },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || 'Request failed');
        return data;
      });
    });
  }

  var rating = 0;
  var starsWrap = form.querySelector('[data-role="site-review-stars"]');

  function paintStars() {
    if (!starsWrap) return;
    starsWrap.querySelectorAll('.rr-star').forEach(function (btn) {
      var value = Number(btn.getAttribute('data-star'));
      btn.querySelector('span').textContent = value <= rating ? '★' : '☆';
    });
  }

  if (starsWrap) {
    starsWrap.querySelectorAll('.rr-star').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rating = Number(btn.getAttribute('data-star'));
        paintStars();
      });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = document.getElementById('siteReviewStatus');
    var fd = new FormData(form);
    var name = String(fd.get('name') || '').trim();
    var email = String(fd.get('email') || '').trim();
    var text = String(fd.get('experience') || '').trim();
    var submitBtn = form.querySelector('button[type="submit"]');

    if (text.length < 2) {
      status.className = 'rr-hint rr-error';
      status.textContent = 'Please write a little about your experience first.';
      return;
    }

    var anonymousKey = getAnonymousKey();
    submitBtn.disabled = true;
    status.className = 'rr-hint';
    status.textContent = 'Submitting…';

    var steps = [];
    if (rating > 0) {
      steps.push(apiPost('/api/stories/' + SITE_STORY_ID + '/ratings', { rating: rating, anonymousKey: anonymousKey }, anonymousKey));
    }
    steps.push(apiPost('/api/stories/' + SITE_STORY_ID + '/reviews', {
      displayName: name || undefined,
      reviewText: text,
      email: email || undefined,
      anonymousKey: anonymousKey,
    }, anonymousKey));

    Promise.all(steps).then(function () {
      status.className = 'rr-hint rr-success';
      status.textContent = 'Thanks for the feedback! It’ll appear above after a quick moderation check.';
      form.reset();
      rating = 0;
      paintStars();
    }).catch(function (err) {
      status.className = 'rr-hint rr-error';
      status.textContent = escapeHtml(err.message || 'Could not submit right now — please try again.');
    }).finally(function () {
      submitBtn.disabled = false;
    });
  });
})();
