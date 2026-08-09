/* Ratings & reviews widget — talks to the Cloudflare Worker + D1 API.
   Mounted by blog.js into [data-rating-review-mount] each time a story reader opens. */
(function () {
  'use strict';

  var API_BASE = 'https://mahmuda-fun-api.mahmudajenny6.workers.dev';
  var ANON_KEY_STORAGE = 'nights_anonymous_key';

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
      // localStorage unavailable (private mode / blocked) — use a per-session key
      return 'anon-session-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function apiFetch(path, options) {
    return fetch(API_BASE + path, options).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var message = (data && data.error) || ('Request failed (' + res.status + ')');
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function starsMarkup(average, interactive) {
    var rounded = Math.round(Number(average) || 0);
    var out = '';
    for (var i = 1; i <= 5; i++) {
      if (interactive) {
        out += '<button type="button" class="rr-star" data-star="' + i + '" aria-label="Rate ' + i + ' out of 5">' +
          '<span aria-hidden="true">' + (i <= rounded ? '★' : '☆') + '</span></button>';
      } else {
        out += '<span class="rr-star-static" aria-hidden="true">' + (i <= rounded ? '★' : '☆') + '</span>';
      }
    }
    return out;
  }

  // Compact widget: Recommend (top), then star average + count, then
  // tap-to-rate. No per-story review list/form here — text reviews are
  // read-only and shown site-wide instead (assets/js/site-reviews-marquee.js,
  // home page only); this widget is just the two lightweight, one-tap
  // signals (star + recommend) every story keeps.
  function render(shell, state) {
    var avg = state.ratingSummary ? state.ratingSummary.average : 0;
    var count = state.ratingSummary ? state.ratingSummary.count : 0;
    var myRating = state.myRating || 0;
    var reactionCount = state.reactionSummary ? state.reactionSummary.count : 0;

    shell.innerHTML =
      '<h3>Ratings &amp; reviews</h3>' +

      '<div class="rr-reaction-block">' +
        '<button type="button" class="rr-reaction-btn' + (state.myReaction ? ' rr-reaction-active' : '') + '" data-role="reaction-btn"' + (state.reacting ? ' disabled' : '') + '>' +
          '<span aria-hidden="true">' + (state.myReaction ? '❤️' : '🤍') + '</span> ' +
          (state.myReaction ? 'Recommended' : 'Recommend this story') +
        '</button>' +
        '<span class="rr-reaction-count">' + (reactionCount ? 'Recommended by ' + reactionCount + (reactionCount === 1 ? ' reader' : ' readers') : 'Be the first to recommend this') + '</span>' +
        (state.reactStatus ? '<p class="rr-hint' + (state.reactStatus.error ? ' rr-error' : ' rr-success') + '">' + escapeHtml(state.reactStatus.message) + '</p>' : '') +
      '</div>' +

      '<div class="rr-summary">' +
        '<div class="rr-stars" data-role="static-stars">' + starsMarkup(avg, false) + '</div>' +
        '<span class="rr-average">' + (count ? Number(avg).toFixed(1) : '—') + '</span>' +
        '<span class="rr-count">' + (count ? count + (count === 1 ? ' rating' : ' ratings') : 'No ratings yet') + '</span>' +
      '</div>' +

      '<div class="rr-rate-block">' +
        '<p class="rr-label">' + (myRating ? 'Your rating' : 'Tap to rate') + '</p>' +
        '<div class="rr-stars rr-stars-interactive" data-role="my-stars">' + starsMarkup(myRating, true) + '</div>' +
        (state.rateStatus ? '<p class="rr-hint' + (state.rateStatus.error ? ' rr-error' : ' rr-success') + '">' + escapeHtml(state.rateStatus.message) + '</p>' : '') +
      '</div>';

    // Wire the recommend/reaction button
    var reactionBtn = shell.querySelector('[data-role="reaction-btn"]');
    if (reactionBtn) {
      reactionBtn.addEventListener('click', function () {
        submitReaction(shell, state);
      });
    }

    // Wire star buttons
    var starsWrap = shell.querySelector('[data-role="my-stars"]');
    if (starsWrap) {
      starsWrap.querySelectorAll('.rr-star').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = Number(btn.getAttribute('data-star'));
          submitRating(shell, state, value);
        });
      });
    }
  }

  function loadSummary(shell, state) {
    apiFetch('/api/stories/' + encodeURIComponent(state.storyId) + '/ratings')
      .then(function (data) {
        state.ratingSummary = data;
        render(shell, state);
      })
      .catch(function () {
        state.ratingSummary = { count: 0, average: 0 };
        render(shell, state);
      });
  }

  function loadReactionSummary(shell, state) {
    apiFetch('/api/stories/' + encodeURIComponent(state.storyId) + '/reactions')
      .then(function (data) {
        state.reactionSummary = data;
        render(shell, state);
      })
      .catch(function () {
        state.reactionSummary = { count: 0 };
        render(shell, state);
      });
  }

  function submitReaction(shell, state) {
    if (state.reacting) return;
    state.reacting = true;
    state.reactStatus = null;
    render(shell, state);
    apiFetch('/api/stories/' + encodeURIComponent(state.storyId) + '/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-anonymous-key': state.anonymousKey },
      body: JSON.stringify({ anonymousKey: state.anonymousKey }),
    })
      .then(function (data) {
        state.reacting = false;
        state.myReaction = !!(data && data.reacted);
        state.reactionSummary = { count: (data && data.count) || 0 };
        state.reactStatus = { message: state.myReaction ? 'Thanks for recommending!' : 'Removed.', error: false };
        render(shell, state);
      })
      .catch(function (err) {
        state.reacting = false;
        state.reactStatus = { message: err.message || 'Could not save that. Try again.', error: true };
        render(shell, state);
      });
  }

  function submitRating(shell, state, value) {
    state.myRating = value;
    state.rateStatus = null;
    render(shell, state);
    apiFetch('/api/stories/' + encodeURIComponent(state.storyId) + '/ratings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-anonymous-key': state.anonymousKey },
      body: JSON.stringify({ rating: value, anonymousKey: state.anonymousKey }),
    })
      .then(function () {
        state.rateStatus = { message: 'Thanks for rating!', error: false };
        loadSummary(shell, state);
      })
      .catch(function (err) {
        state.rateStatus = { message: err.message || 'Could not save your rating. Try again.', error: true };
        render(shell, state);
      });
  }

  var summaryMapPromise = null;

  // Fetches every story's {count, average} in one request and caches the
  // result for the lifetime of the page. Used by feed/category/series
  // listings to show a rating badge on each card without one fetch per card.
  function getSummaryMap() {
    if (summaryMapPromise) return summaryMapPromise;
    summaryMapPromise = apiFetch('/api/ratings/summary')
      .then(function (data) {
        var map = {};
        ((data && data.ratings) || []).forEach(function (row) {
          map[row.storyId] = { count: Number(row.count) || 0, average: Number(row.average) || 0 };
        });
        return map;
      })
      .catch(function () {
        return {};
      });
    return summaryMapPromise;
  }

  // Small inline "★ 4.5 (12)" badge for a listing card. Returns '' when the
  // story has no ratings yet so unrated cards stay clean.
  function badgeHtml(summary) {
    if (!summary || !summary.count) return '';
    return '<span class="rr-inline-badge" title="' + summary.count + (summary.count === 1 ? ' rating' : ' ratings') + '">' +
      '<span class="rr-inline-star" aria-hidden="true">★</span>' + summary.average.toFixed(1) +
      '<span class="rr-inline-count">(' + summary.count + ')</span></span>';
  }

  function mount(storyId, target) {
    if (!target || !storyId || target.querySelector('[data-rating-review-shell]')) return;
    var shell = document.createElement('section');
    shell.className = 'rating-review-shell';
    shell.setAttribute('data-rating-review-shell', '1');
    shell.setAttribute('aria-label', 'Ratings and reviews');
    target.appendChild(shell);

    var state = {
      storyId: storyId,
      anonymousKey: getAnonymousKey(),
      ratingSummary: null,
      myRating: 0,
      rateStatus: null,
      reactionSummary: null,
      myReaction: false,
      reacting: false,
      reactStatus: null,
    };

    render(shell, state);
    loadSummary(shell, state);
    loadReactionSummary(shell, state);
  }

  var reactionSummaryMapPromise = null;

  // Same one-request-for-everything pattern as getSummaryMap(), for a
  // "❤ 12" style badge on listing cards.
  function getReactionSummaryMap() {
    if (reactionSummaryMapPromise) return reactionSummaryMapPromise;
    reactionSummaryMapPromise = apiFetch('/api/reactions/summary')
      .then(function (data) {
        var map = {};
        ((data && data.reactions) || []).forEach(function (row) {
          map[row.storyId] = { count: Number(row.count) || 0 };
        });
        return map;
      })
      .catch(function () {
        return {};
      });
    return reactionSummaryMapPromise;
  }

  // Small inline "❤ 12" badge for a listing card. Returns '' when nobody
  // has recommended the story yet so untouched cards stay clean.
  function reactionBadgeHtml(summary) {
    if (!summary || !summary.count) return '';
    return '<span class="rr-inline-badge rr-inline-reaction" title="Recommended by ' + summary.count + (summary.count === 1 ? ' reader' : ' readers') + '">' +
      '<span aria-hidden="true">❤️</span> ' + summary.count + '</span>';
  }

  window.NightsRatingReview = {
    mount: mount,
    getSummaryMap: getSummaryMap,
    badgeHtml: badgeHtml,
    getReactionSummaryMap: getReactionSummaryMap,
    reactionBadgeHtml: reactionBadgeHtml,
  };
})();
