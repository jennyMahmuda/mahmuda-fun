/**
 * SecretChapters – footer newsletter signup (mahmuda.fun)
 * Wires the "Get new stories first" email form present in every page's
 * footer to POST /api/newsletter/subscribe. Capture-only: this stores the
 * email so it's ready for a future send pipeline, it does not itself
 * email anyone yet — the success message below is worded to match that.
 */
(function () {
  'use strict';

  var API_BASE = 'https://mahmuda-fun-api.mahmudajenny6.workers.dev';

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init() {
    var form = document.getElementById('footerNewsletterForm');
    if (!form) return;
    var hint = document.getElementById('footerNewsletterHint');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = input ? input.value.trim() : '';
      if (!email) return;
      var btn = form.querySelector('button');
      if (btn) btn.disabled = true;
      if (hint) hint.textContent = 'Subscribing…';

      fetch(API_BASE + '/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, source: 'footer' }),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error((data && data.error) || 'Could not subscribe');
            return data;
          });
        })
        .then(function () {
          if (hint) hint.textContent = "You're subscribed — new stories will reach that inbox first.";
          form.reset();
        })
        .catch(function (err) {
          if (hint) hint.textContent = escapeHtml(err.message || 'Could not subscribe right now.');
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
