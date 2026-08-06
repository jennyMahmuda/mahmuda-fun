/**
 * Nights – Core Application Logic (Premium Edition)
 * Advanced Theme Management, Smooth Navigation, Performance Optimized UX
 */

(function () {
  'use strict';

  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  /* ---------- Theme Management (Cinematic Day/Night) ---------- */
  const THEME_KEY = 'nights-theme';
  
  // Matches the background colors from your new CSS for mobile status bar
  const THEME_COLORS = {
    dark: '#050505',
    light: '#fcfbf9'
  };

  function updateMetaThemeColor(theme) {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = THEME_COLORS[theme] || THEME_COLORS.dark;
  }

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateMetaThemeColor(theme);
    
    // Dispatch event so other scripts (like Ads or Canvas effects) know theme changed
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  function toggleTheme() {
    const current = html.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Initialize theme smoothly on load
  setTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  /* ---------- Mobile Navigation (Smooth UX) ---------- */
  if (menuToggle && navLinks) {
    const toggleMenu = () => {
      const isOpen = navLinks.classList.contains('open');
      navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', !isOpen);
    };

    menuToggle.addEventListener('click', toggleMenu);

    // Close when clicking a nav link
    navLinks.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('open')) toggleMenu();
      });
    });

    // Close menu when clicking outside of it (Premium UX)
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && !menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        toggleMenu();
      }
    });
  }

  /* ---------- Advanced Scrollspy (Zero-Lag Intersection Observer) ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  if (sections.length > 0 && navItems.length > 0) {
    // Offset margins to account for the fixed glass navbar
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -60% 0px', 
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${id}`) {
              item.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(sec => sectionObserver.observe(sec));
  }

  /* ---------- Smooth Anchor Scrolling (Fixes overlap with fixed header) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId.startsWith('#')) return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80; // Navbar height + padding
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ---------- Utility: Escape key to close expanded readers ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Closes the expanded story card in blog.js
      if (window.NightsBlog && typeof window.NightsBlog.closeReader === 'function') {
        window.NightsBlog.closeReader();
      }
    }
  });

  /* ---------- Expose Core API globally ---------- */
  window.NightsApp = {
    setTheme,
    toggleTheme,
    getTheme: () => html.getAttribute('data-theme')
  };

})();