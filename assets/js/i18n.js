/**
 * Hushed Chapters — reader-facing language switcher.
 *
 * Zero extra infrastructure: everything this reads is a static JSON file
 * (assets/i18n/<lang>.json for UI chrome, stories/i18n-index.json +
 * stories/i18n/<id>/<lang>.json for story text) already sitting on
 * GitHub Pages / Cloudflare's edge like any other asset — no database
 * query, no Worker call, just fetch() + cache. The choice itself lives in
 * localStorage, so it survives reloads and follows the reader across
 * every page and every chapter without ever touching the URL.
 *
 * Consistency rule this file exists to satisfy: once a language is
 * selected, EVERY page (not just nav chrome) renders in it — see
 * translateTitleExcerpt()/fetchTranslatedStory() below, which assets/js/
 * blog.js calls for feed cards and the reader. If a specific story has no
 * translation yet for the chosen language, that is shown honestly (a
 * small notice + the original text) rather than silently reverting the
 * UI to a different language than the one the reader picked.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'hc_lang';
  var NATIVE_FALLBACK = 'bn'; // matches every story's current frontmatter `language`

  // Metadata only (names for the dropdown, RTL flag) — kept separate from
  // the full UI dictionaries so the switcher can render before any
  // dictionary has loaded. Order here is the order shown in the menu.
  var LANGS = [
    { code: 'bn', native: 'বাংলা', label: 'Bengali', rtl: false },
    { code: 'en', native: 'English', label: 'English', rtl: false },
    { code: 'ru', native: 'Русский', label: 'Russian', rtl: false },
    { code: 'hi', native: 'हिन्दी', label: 'Hindi', rtl: false },
    { code: 'zh', native: '中文', label: 'Chinese', rtl: false },
    { code: 'es', native: 'Español', label: 'Spanish', rtl: false },
    { code: 'fr', native: 'Français', label: 'French', rtl: false },
    { code: 'ar', native: 'العربية', label: 'Arabic', rtl: true },
  ];
  var LANG_CODES = LANGS.map(function (l) { return l.code; });
  var LANG_BY_CODE = {};
  LANGS.forEach(function (l) { LANG_BY_CODE[l.code] = l; });

  var dictCache = {};      // code -> parsed assets/i18n/<code>.json (or a Promise while loading)
  var storyIndexPromise = null; // stories/i18n-index.json, loaded once, shared by every page
  var storyContentCache = {};   // "<id>:<lang>" -> Promise<translated story JSON | null>

  function root() {
    // Same convention as the site's other shared scripts (category-ticker.js,
    // site-components.js): one directory level up from the /section/ pages.
    return /\/(category|series|gellery|video|account)\/?$/.test(window.location.pathname) ? '../' : '';
  }

  function getLang() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && LANG_CODES.indexOf(stored) !== -1) return stored;
    } catch (e) {}
    return NATIVE_FALLBACK;
  }

  function isRtl(code) {
    var meta = LANG_BY_CODE[code || getLang()];
    return !!(meta && meta.rtl);
  }

  function loadDict(code) {
    if (dictCache[code]) return dictCache[code];
    var p = fetch(root() + 'assets/i18n/' + code + '.json', { cache: 'force-cache' })
      .then(function (res) { if (!res.ok) throw new Error('missing dict'); return res.json(); })
      .catch(function () { return null; });
    dictCache[code] = p;
    return p;
  }

  function dig(obj, dotted) {
    if (!obj) return undefined;
    var parts = dotted.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  // Synchronous-feeling translate: uses whatever dictionary is already
  // cached for the current language, falling back to English, then the
  // raw key. Dictionaries are tiny (a few KB) and loaded on init, so by
  // the time the page has rendered this is effectively instant.
  function t(key, vars) {
    var lang = getLang();
    var dict = dictCache[lang];
    // dictCache holds a settled value once loaded (see applyLang) — a
    // Promise still in flight just means "not ready yet", fall through.
    var value = (dict && typeof dict.then !== 'function') ? dig(dict, key) : undefined;
    if (value === undefined) {
      var enDict = dictCache.en;
      value = (enDict && typeof enDict.then !== 'function') ? dig(enDict, key) : undefined;
    }
    if (value === undefined) value = key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        value = String(value).replace('{' + k + '}', vars[k]);
      });
    }
    return value;
  }

  function applyDataI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = t(key);
      if (text !== key) el.textContent = text;
    });
  }

  function renderSwitchers() {
    var mounts = document.querySelectorAll('.lang-switcher-mount');
    if (!mounts.length) return;
    var current = getLang();
    var currentMeta = LANG_BY_CODE[current] || LANG_BY_CODE[NATIVE_FALLBACK];
    var menuHtml = LANGS.map(function (l) {
      return '<li><button type="button" class="lang-option' + (l.code === current ? ' active' : '') + '" data-lang="' + l.code + '" lang="' + l.code + '">' +
        l.native + '</button></li>';
    }).join('');
    mounts.forEach(function (mount) {
      mount.innerHTML =
        '<div class="lang-switcher">' +
          '<button type="button" class="lang-switcher-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="' + t('lang.label') + '">' +
            '<span aria-hidden="true">🌐</span><span class="lang-current">' + currentMeta.native + '</span>' +
          '</button>' +
          '<ul class="lang-switcher-menu" role="listbox" hidden>' + menuHtml + '</ul>' +
        '</div>';
    });
  }

  function bindSwitcherEvents() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.lang-switcher-btn');
      if (btn) {
        var menu = btn.parentElement.querySelector('.lang-switcher-menu');
        var willOpen = menu.hasAttribute('hidden');
        document.querySelectorAll('.lang-switcher-menu').forEach(function (m) { m.setAttribute('hidden', ''); });
        document.querySelectorAll('.lang-switcher-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        if (willOpen) { menu.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); }
        return;
      }
      var option = e.target.closest('.lang-option');
      if (option) {
        setLang(option.getAttribute('data-lang'));
        return;
      }
      if (!e.target.closest('.lang-switcher')) {
        document.querySelectorAll('.lang-switcher-menu').forEach(function (m) { m.setAttribute('hidden', ''); });
        document.querySelectorAll('.lang-switcher-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.lang-switcher-menu').forEach(function (m) { m.setAttribute('hidden', ''); });
      }
    });
  }

  function applyLang(code, opts) {
    opts = opts || {};
    document.documentElement.setAttribute('lang', code);
    if (isRtl(code)) document.documentElement.setAttribute('dir', 'rtl');
    else document.documentElement.removeAttribute('dir');

    document.documentElement.className = document.documentElement.className.replace(/\blang-\S+/g, '').trim();
    document.documentElement.classList.add('lang-' + code);

    loadDict(code).then(function () {
      applyDataI18n();
      renderSwitchers();
      if (!opts.silent) {
        document.dispatchEvent(new CustomEvent('hc:langchange', { detail: { lang: code } }));
      }
    });
    // English is the fallback for missing keys/translations — always warm.
    if (code !== 'en') loadDict('en');
  }

  function setLang(code) {
    if (LANG_CODES.indexOf(code) === -1) return;
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    applyLang(code);
  }

  // ---- Story-content translation lookups (consumed by assets/js/blog.js) --

  function loadStoryIndex() {
    if (!storyIndexPromise) {
      storyIndexPromise = fetch(root() + 'stories/i18n-index.json', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : {}; })
        .catch(function () { return {}; });
    }
    return storyIndexPromise;
  }
  // Fires eagerly so translateTitleExcerpt() below can answer synchronously
  // by the time renderFeed() actually needs it.
  loadStoryIndex();

  var storyIndexCache = null;
  loadStoryIndex().then(function (data) { storyIndexCache = data; });

  // Synchronous by design (feed cards render in a tight loop) — returns the
  // native title/excerpt until the index has loaded and/or no translation
  // exists for this story+language, which is always a safe fallback.
  function translateTitleExcerpt(story) {
    var lang = getLang();
    var nativeLang = (story && story.language) || NATIVE_FALLBACK;
    if (!story || lang === nativeLang || !storyIndexCache) {
      return { title: story ? story.title : '', excerpt: story ? story.excerpt : '' };
    }
    var entry = storyIndexCache[story.id] && storyIndexCache[story.id][lang];
    return entry ? { title: entry.title, excerpt: entry.excerpt } : { title: story.title, excerpt: story.excerpt };
  }

  // Async — fetches the full translated body the first time a story is
  // opened in a given language, then caches it for the rest of the visit.
  function fetchTranslatedStory(id, lang) {
    var key = id + ':' + lang;
    if (!storyContentCache[key]) {
      storyContentCache[key] = fetch(root() + 'stories/i18n/' + encodeURIComponent(id) + '/' + lang + '.json', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });
    }
    return storyContentCache[key];
  }

  function init() {
    applyLang(getLang(), { silent: true });
    renderSwitchers();
    bindSwitcherEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.NightsI18n = {
    LANGS: LANGS,
    getLang: getLang,
    setLang: setLang,
    isRtl: isRtl,
    t: t,
    translateTitleExcerpt: translateTitleExcerpt,
    fetchTranslatedStory: fetchTranslatedStory,
    NATIVE_FALLBACK: NATIVE_FALLBACK,
  };
})();
