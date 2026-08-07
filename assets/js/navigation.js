/**
 * Nights – Shared Navigation
 * navigation.js
 * Theme toggle · Mobile menu · Active page highlight · Scroll state
 * Safe to load on every page. Does not overwrite existing markup.
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

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
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

    var items = document.querySelectorAll('.nav-item');
    items.forEach(function (item) {
      item.classList.remove('active');
      var href = (item.getAttribute('href') || '').toLowerCase();
      var hrefFile = href.split('/').pop().split('#')[0] || '';

      if (
        (file === 'index.html' || file === '') &&
        (hrefFile === 'index.html' || href === '/' || href === 'index.html' || href.indexOf('?view=feed') !== -1)
      ) {
        if (href.indexOf('#') === -1 || href === 'index.html' || href === '/') {
          item.classList.add('active');
        }
      } else if (file === 'video.html' && hrefFile === 'video.html') {
        item.classList.add('active');
      } else if (file === 'gallery.html' && hrefFile === 'gallery.html') {
        item.classList.add('active');
      } else if (file === 'privacy-policy.html' && hrefFile === 'privacy-policy.html') {
        item.classList.add('active');
      }
    });

    if ((file === 'index.html' || file === '') && window.location.search.indexOf('story=') !== -1) {
      items.forEach(function (item) {
        var href = (item.getAttribute('href') || '').toLowerCase();
        if (href === 'index.html' || href === '/' || href.indexOf('?view=feed') !== -1) {
          if (href.indexOf('#') === -1) item.classList.add('active');
        }
      });
    }
  }

  function initMobileMenu() {
    var menuToggle = document.getElementById('menuToggle');
    var navLinks = document.getElementById('navLinks');
    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    navLinks.querySelectorAll('.nav-item').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });

    document.addEventListener('click', function (e) {
      if (!navLinks.classList.contains('open')) return;
      if (navLinks.contains(e.target) || menuToggle.contains(e.target)) return;
      navLinks.classList.remove('open');
      menuToggle.classList.remove('active');
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

  function init() {
    initThemeToggle();
    initMobileMenu();
    markActiveNav();
    initScrollState();
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

  if (!window.NightsApp) {
    window.NightsApp = window.NightsNav;
  }
})();
