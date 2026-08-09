/* Nights shared site components: consent-first analytics, legal links and premium CTA. */
(function () {
  'use strict';
  var GA_ID = 'G-1Z0TLKJZ9R';
  var CONSENT_KEY = 'nights_cookie_consent_v1';
  var root = /\/(category|gellery|video|series)\/?$/.test(location.pathname) ? '../' : '';

  function loadAnalytics() {
    if (window.__nightsAnalyticsLoaded) return;
    window.__nightsAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
    var banner = document.getElementById('cookieConsent');
    if (banner) banner.remove();
    if (value === 'accepted') loadAnalytics();
  }

  function showConsent() {
    if (document.getElementById('cookieConsent')) return;
    var banner = document.createElement('aside');
    banner.id = 'cookieConsent';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML = '<div class="cookie-consent__copy"><strong>Cookie notice</strong><p>এই সাইটের নিজস্ব কোনো account বা personal-data database নেই। আপনার সম্মতিতে শুধু Google Analytics ব্যবহার করা হয়; third-party ads তাদের নিজস্ব cookie ব্যবহার করতে পারে। <a href="' + root + 'cookies.html">Details</a></p></div><div class="cookie-consent__actions"><button type="button" data-cookie-accept>Accept analytics</button><button type="button" class="cookie-secondary" data-cookie-reject>Reject analytics</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('[data-cookie-accept]').addEventListener('click', function () { setConsent('accepted'); });
    banner.querySelector('[data-cookie-reject]').addEventListener('click', function () { setConsent('rejected'); });
  }

  // Nav's Premium link and the footer's full Legal/Support/Explore columns
  // are now real static markup on every page (see fix_footers.py-generated
  // output) — this used to inject a duplicate fallback copy of both, which
  // would now just create a second "Premium" nav item. Only the dynamic
  // copyright year still needs JS.
  function updateFooterYear() {
    var year = String(new Date().getFullYear());
    document.querySelectorAll('.footer-year').forEach(function (el) { el.textContent = year; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateFooterYear();
    var consent = null;
    try { consent = localStorage.getItem(CONSENT_KEY); } catch (e) {}
    if (consent === 'accepted') loadAnalytics();
    else if (!consent) showConsent();
  });

  window.NightsConsent = { accept: function () { setConsent('accepted'); }, reject: function () { setConsent('rejected'); } };
})();
