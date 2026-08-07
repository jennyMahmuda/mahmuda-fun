/**
 * Nights – Core Application Logic
 * Theme (Day/Night), Navigation, UX helpers
 */

(function () {
  'use strict';

  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  /* ---------- Theme (Day / Night) ---------- */
  const THEME_KEY = 'nights-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const current = html.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Init theme
  setTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  /* ---------- Mobile Menu ---------- */
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    // Close on link click
    navLinks.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });
  }

  /* ---------- Active nav via IntersectionObserver (avoids forced reflow) ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  if (sections.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navItems.forEach(function (item) {
          const href = item.getAttribute('href') || '';
          const match = href === '#' + id || href.endsWith('#' + id);
          item.classList.toggle('active', match);
        });
      });
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Utility: Escape key closes modals ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('readerModal');
      if (modal && modal.classList.contains('open')) {
        window.NightsBlog && window.NightsBlog.closeReader();
      }
    }
  });

  /* ---------- Expose small API ---------- */
  window.NightsApp = {
    setTheme,
    toggleTheme,
    getTheme: () => html.getAttribute('data-theme')
  };

})();
