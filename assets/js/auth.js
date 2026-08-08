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
    return apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });
  }

  function login(email, password) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
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
  };
})();
