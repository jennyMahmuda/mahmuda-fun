/**
 * Nights – Shared Navigation v3 (single source of truth)
 * navigation.js (mahmuda.fun)
 * Theme toggle · Mobile menu · Active page highlight · Scroll state
 * Safe to load on every page. Does not overwrite existing markup.
 * NOTE: apps.js must NOT be loaded together with this file —
 * this module owns theme + menu + scroll behaviour.
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var THEME_KEY = 'nights-theme';

  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function updateMetaThemeColor(theme) {
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = theme === 'light' ? '#fcfbf9' : '#050505';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
    updateMetaThemeColor(theme);
    try {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
    } catch (e) {}
  }

  function toggleTheme() {
    var current = html.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  setTheme(getPreferredTheme());

  function markActiveNav() {
    var path = (window.location.pathname || '').toLowerCase();
    var file = path.split('/').pop() || 'index.html';
    if (file === '' || file === '/') file = 'index.html';
    var query = (window.location.search || '').toLowerCase();
    // Was declared *inside* the forEach below, so the "Story page →
    // highlight Feed" block further down threw "isStoryPage is not
    // defined" on every story page (?story=... is only ever set on
    // index.html) — an uncaught ReferenceError that aborted the rest of
    // this function, silently skipping that highlight block every time.
    var isStoryPage = query.indexOf('story=') !== -1;

    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.classList.remove('active');
      var href = (item.getAttribute('href') || '').toLowerCase();
      var hrefFile = href.split('/').pop().split('#')[0].split('?')[0] || '';

      if (hrefFile === 'index.html' || hrefFile === '' || href === '/') {
        if ((file === 'index.html' || file === '') && !isStoryPage) item.classList.add('active');
      } else if ((href.indexOf('video/') !== -1 && path.indexOf('/video/') !== -1) || (hrefFile === 'video.html' && file === 'video.html')) {
        item.classList.add('active');
      } else if ((href.indexOf('gellery/') !== -1 && path.indexOf('/gellery/') !== -1) || (hrefFile === 'gallery.html' && file === 'gallery.html')) {
        item.classList.add('active');
      } else if ((href.indexOf('category/') !== -1 && path.indexOf('/category/') !== -1) || (hrefFile === 'categories.html' && file === 'categories.html')) {
        item.classList.add('active');
      } else if ((href.indexOf('series/') !== -1 && path.indexOf('/series/') !== -1) || (hrefFile === 'series.html' && file === 'series.html')) {
        item.classList.add('active');
      } else if (hrefFile === 'privacy-policy.html' && file === 'privacy-policy.html') {
        item.classList.add('active');
      } else if (href.indexOf('#') === 0 && (file === 'index.html' || file === '')) {
        // Same-page anchors (feed/category/series sections on home)
        item.classList.add('active');
      }
    });

    // Story page → highlight Feed
    if ((file === 'index.html' || file === '') && isStoryPage) {
      // .nav-item is this site's usual nav-link class; .sc-nav-link is the
      // new home page redesign's — support both so this keeps working on
      // every page without the redesign needing to match old naming.
      document.querySelectorAll('.nav-item, .sc-nav-link').forEach(function (item) {
        var hrefFile = (item.getAttribute('href') || '').toLowerCase().split('/').pop().split('?')[0];
        if (hrefFile === 'index.html' || hrefFile === '' || hrefFile === '/') {
          item.classList.add('active');
        }
      });
    }
  }

  function initMobileMenu() {
    var menuToggle = document.getElementById('menuToggle');
    var navLinks = document.getElementById('navLinks');
    if (!menuToggle || !navLinks) return;

    var toggle = function (e) {
      if (e) e.preventDefault();
      var isOpen = navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    };

    menuToggle.addEventListener('click', toggle);

    navLinks.querySelectorAll('.nav-item, .sc-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!navLinks.classList.contains('open')) return;
      if (navLinks.contains(e.target) || menuToggle.contains(e.target)) return;
      navLinks.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  }

  function initThemeToggle() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleTheme();
    });
  }

  function initScrollState() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;
    function onScroll() {
      if (window.scrollY > 12) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --nav-h was referenced by a couple of stylesheets (.category-ticker's
  // sticky offset, .reader-modal's top offset) but never actually set
  // anywhere — everything relied on a hardcoded fallback value that
  // didn't match the real header height once an announcement bar
  // (.sc-topline) sat above the nav (and, on index.html, body's own
  // top padding — meant to clear a *different* page's fixed .navbar —
  // adds still more space above that). That mismatch let the reader's
  // sticky close button end up positioned *underneath* the real navbar,
  // where the navbar (a higher stacking element) silently absorbed
  // every click meant for it.
  //
  // Reading the navbar's own rect.bottom (rather than summing each
  // element's own height) sidesteps all of that — measured while the
  // page is scrolled to the very top, it's exactly the on-screen offset
  // everything below the header needs to clear, whatever is stacked
  // above the nav and however it's spaced. Only updates at scrollY===0:
  // .sc-topline isn't sticky (it scrolls away) while the nav is, so the
  // "safe" height shrinks once scrolled past it — freezing the
  // measurement at the top avoids the CSS var chasing that shrinking
  // value back down while a reader has the page scrolled.
  function updateNavHeightVar() {
    if (window.scrollY > 0) return;
    var nav = document.querySelector('.sc-navbar, .navbar');
    if (!nav) return;
    var bottom = nav.getBoundingClientRect().bottom;
    if (bottom > 0) {
      document.documentElement.style.setProperty('--nav-h', Math.ceil(bottom) + 'px');
    }
  }

  function initNavHeightVar() {
    updateNavHeightVar();
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateNavHeightVar, 150);
    }, { passive: true });
    // Fonts/wrapping can settle a frame or two after load.
    window.addEventListener('load', updateNavHeightVar);
  }

  function init() {
    initThemeToggle();
    initMobileMenu();
    markActiveNav();
    initScrollState();
    initNavHeightVar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NightsNav = {
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    getTheme: function () {
      return html.getAttribute('data-theme') || 'dark';
    },
    markActiveNav: markActiveNav
  };
})();
