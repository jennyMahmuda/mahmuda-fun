/**
 * SecretChapters – Side-drawer navigation (mahmuda.fun)
 * Single nav pattern for mobile and desktop: the menu button slides a
 * full-height panel in from the right instead of a hover mega-menu on
 * desktop / a separate inline dropdown on mobile. Deliberately not part
 * of navigation.js's initMobileMenu() — that function toggles a plain
 * dropdown via an #navLinks + .open pattern that doesn't fit this
 * component's backdrop/lock-scroll/focus behavior, and it already no-ops
 * safely here since this page has no element matching its old
 * assumptions once .sc-side-drawer is in place elsewhere in the DOM.
 */
(function () {
  'use strict';

  function init() {
    var toggle = document.getElementById('menuToggle');
    var drawer = document.getElementById('sideDrawer');
    var backdrop = document.getElementById('drawerBackdrop');
    var closeBtn = document.getElementById('drawerClose');
    if (!toggle || !drawer || !backdrop) return;

    var open = function () {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    var close = function () {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('active');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', function () {
      if (drawer.classList.contains('open')) close();
      else open();
    });

    backdrop.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });

    // Close on navigating away — but not on the category accordion's own
    // <summary> toggle, which isn't a navigation.
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
