/* First-party account client (mahmuda.fun) — no third-party login provider.
   Session token is a Bearer token in localStorage, not a cookie: the API
   lives on a different registrable domain (workers.dev) than the site, so
   a cross-site cookie would be silently dropped by Safari/Firefox/Brave
   tracking protection for a real share of visitors. */
(function () {
  'use strict';

  var API_BASE = 'https://mahmuda-fun-api.mahmudajenny6.workers.dev';
  var TOKEN_KEY = 'nights_session_token';
  var meCache = null; // { authenticated, email, emailVerified } | null, cached per page load
  // Must match the ID in assets/js/site-components.js — used only to read
  // gtag's own client_id, never to load/re-init analytics from here.
  var GA_ID = 'G-1Z0TLKJZ9R';

  // Resolves to gtag's client_id, or null. Deliberately returns null (not
  // a fallback generated ID) when analytics wasn't consented to — window.
  // gtag only exists after the visitor accepted the cookie banner (see
  // site-components.js), so this naturally respects that choice without
  // auth.js needing to know about consent state itself.
  function getGaClientId() {
    return new Promise(function (resolve) {
      if (typeof window.gtag !== 'function') { resolve(null); return; }
      var settled = false;
      var timer = setTimeout(function () { if (!settled) { settled = true; resolve(null); } }, 300);
      try {
        window.gtag('get', GA_ID, 'client_id', function (clientId) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(typeof clientId === 'string' ? clientId : null);
        });
      } catch (e) {
        if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
      }
    });
  }

  function getToken() {
    try { return window.localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function setToken(token) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    meCache = null;
  }

  function authedFetch(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    var token = getToken();
    if (token) headers.authorization = 'Bearer ' + token;
    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
  }

  function apiFetch(path, options) {
    return authedFetch(path, options).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  function signup(email, password) {
    return getGaClientId().then(function (gaClientId) {
      return apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, password: password, gaClientId: gaClientId }),
      });
    });
  }

  function login(email, password) {
    return getGaClientId().then(function (gaClientId) {
      return apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, password: password, gaClientId: gaClientId }),
      });
    }).then(function (data) {
      if (data && data.sessionToken) setToken(data.sessionToken);
      return data;
    });
  }

  function verifyEmail(token) {
    return apiFetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: token }),
    }).then(function (data) {
      if (data && data.sessionToken) setToken(data.sessionToken);
      return data;
    });
  }

  function requestPasswordReset(email) {
    return apiFetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email }),
    });
  }

  function resetPassword(token, password) {
    return apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: token, password: password }),
    });
  }

  function logout() {
    return apiFetch('/api/auth/logout', { method: 'POST' }).catch(function () {}).then(function () {
      setToken(null);
    });
  }

  function me() {
    if (!getToken()) return Promise.resolve({ authenticated: false });
    if (meCache) return Promise.resolve(meCache);
    return apiFetch('/api/auth/me').then(function (data) {
      meCache = data || { authenticated: false };
      return meCache;
    }).catch(function () {
      return { authenticated: false };
    });
  }

  function fetchExclusiveContent(storyId) {
    return apiFetch('/api/stories/' + encodeURIComponent(storyId) + '/content');
  }

  // ---- Admin content manager (assets/js/admin.js) ----
  // Every call here 401s/403s server-side for a non-admin session — these
  // are thin wrappers, not the actual access control.
  function adminListStories() {
    return apiFetch('/api/admin/stories');
  }
  function adminCreateStory(story) {
    return apiFetch('/api/admin/stories', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(story),
    });
  }
  function adminUpdateStory(id, story) {
    return apiFetch('/api/admin/stories/' + encodeURIComponent(id) + '/update', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(story),
    });
  }
  function adminPublishStory(id) {
    return apiFetch('/api/admin/stories/' + encodeURIComponent(id) + '/publish', { method: 'POST' });
  }
  function adminDeleteStory(id) {
    return apiFetch('/api/admin/stories/' + encodeURIComponent(id) + '/delete', { method: 'POST' });
  }

  // ---- Admin review moderation ----
  // Reviews always insert as 'pending' and the public reviews endpoint
  // only ever returns 'approved' ones — these two calls are the only way
  // a submitted review can ever become visible on the site.
  function adminListReviews() {
    return apiFetch('/api/admin/reviews');
  }
  function adminModerateReview(id, action) {
    return apiFetch('/api/admin/reviews/' + encodeURIComponent(id) + '/' + action, { method: 'POST' });
  }

  // ---- Admin newsletter subscriber list ----
  // Emails are the only PII this site collects outside of accounts —
  // admin-gated, no public endpoint reads the list.
  function adminListNewsletter() {
    return apiFetch('/api/admin/newsletter');
  }

  // Updates the shared #navAccountLink / #navAccountLabel present on every
  // page's nav (points at /account/ either way — that page itself shows a
  // login form or an account summary depending on session state).
  function paintNavState() {
    var label = document.getElementById('navAccountLabel');
    if (!label) return;
    me().then(function (data) {
      label.textContent = data.authenticated ? 'Account' : 'Log in';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintNavState);
  } else {
    paintNavState();
  }

  window.NightsAuth = {
    signup: signup,
    login: login,
    logout: logout,
    verifyEmail: verifyEmail,
    requestPasswordReset: requestPasswordReset,
    resetPassword: resetPassword,
    me: me,
    getToken: getToken,
    fetchExclusiveContent: fetchExclusiveContent,
    adminListStories: adminListStories,
    adminCreateStory: adminCreateStory,
    adminUpdateStory: adminUpdateStory,
    adminPublishStory: adminPublishStory,
    adminDeleteStory: adminDeleteStory,
    adminListReviews: adminListReviews,
    adminModerateReview: adminModerateReview,
    adminListNewsletter: adminListNewsletter,
  };
})();
