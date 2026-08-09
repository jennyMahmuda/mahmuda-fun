/* Horizontal auto-scrolling category strip — sits below the navbar as its
   own section (never touches <nav class="nav-links">). Same category list
   feeds both the ticker and each category page's SEO intro copy
   (assets/js/category-seo.js) so they stay in sync from one place. */
(function () {
  'use strict';

  var CATEGORIES = [
    { slug: 'dark-romance', label: 'Dark Romance', emoji: '' },
    { slug: 'mafia-romance', label: 'Mafia Romance', emoji: '🐴' },
    { slug: 'paranormal-fantasy-romance', label: 'Paranormal & Fantasy Romance', emoji: '🧙' },
    { slug: 'billionaire-romance', label: 'Billionaire Romance', emoji: '💰' },
    { slug: 'alpha-males', label: 'Alpha Males', emoji: '💪' },
    { slug: 'high-school-romance', label: 'High School Romance', emoji: '✏️' },
    { slug: 'spicy-romance', label: 'Spicy Romance', emoji: '🌶️' },
    { slug: 'age-gap-romance', label: 'Age Gap Romance', emoji: '👨‍🦳' },
    { slug: 'vampire-romance', label: 'Vampire Romance', emoji: '🧛' },
    { slug: 'cowboy-romance', label: 'Cowboy Romance', emoji: '🤠' },
    { slug: 'forbidden-romance', label: 'Forbidden Romance', emoji: '💔' },
    { slug: 'second-chance-romance', label: 'Second Chance Romance', emoji: '🔁' },
    { slug: 'clean-wholesome', label: 'Clean & Wholesome', emoji: '✨' },
    { slug: 'fated-mates', label: 'Fated Mates', emoji: '💘' },
    { slug: 'comedy', label: 'Comedy', emoji: '😂' },
    { slug: 'bad-boys', label: 'Bad Boys', emoji: '🏍️' },
    { slug: 'slow-burn', label: 'Slow Burn', emoji: '🔥' },
    { slug: 'enemies-to-lovers', label: 'Enemies to Lovers', emoji: '⚔️' },
    { slug: 'sports', label: 'Sports', emoji: '🏈' },
    { slug: 'college', label: 'College', emoji: '🎓' },
  ];

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function itemsHtml(prefix) {
    return CATEGORIES.map(function (c) {
      return '<a class="category-ticker-item" href="' + prefix + 'category/' + encodeURIComponent(c.slug) + '/">' +
        (c.emoji ? '<span aria-hidden="true">' + c.emoji + '</span> ' : '') + escapeHtml(c.label) + '</a>';
    }).join('');
  }

  function init() {
    var slot = document.getElementById('categoryTicker');
    if (!slot) return;
    // category/<slug>/ pages are two directories deep — check that before
    // the one-deep case (see the same fix in site-components.js).
    var path = window.location.pathname;
    var prefix = /\/category\/[^/]+\/?$/.test(path) ? '../../'
      : /\/(category|series|gellery|video|account)\/?$/.test(path) ? '../' : '';
    // Rendered twice back-to-back; the CSS animation scrolls exactly -50%
    // of the track width, so the loop point is visually seamless.
    var html = itemsHtml(prefix);
    slot.innerHTML = '<div class="category-ticker-track">' + html + html + '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NightsCategoryTicker = { CATEGORIES: CATEGORIES };
})();
