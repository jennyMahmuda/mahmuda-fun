/* Future rating/review UI shell. Deliberately no network or data collection until Cloudflare API is enabled. */
(function () {
  'use strict';
  function mount(storyId, target) {
    if (!target || !storyId || target.querySelector('[data-rating-review-shell]')) return;
    var shell = document.createElement('section');
    shell.className = 'rating-review-shell';
    shell.setAttribute('data-rating-review-shell', '1');
    shell.setAttribute('aria-label', 'Ratings and reviews');
    shell.innerHTML = '<h3>Ratings & reviews</h3><p>Coming soon. Ratings and reviews are not collected in this release.</p><div class="rating-placeholder" aria-hidden="true">☆ ☆ ☆ ☆ ☆</div>';
    target.appendChild(shell);
  }
  window.NightsRatingReview = { mount: mount };
})();
