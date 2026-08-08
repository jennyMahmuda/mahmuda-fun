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

  function addSharedLinks() {
    document.querySelectorAll('.nav-links').forEach(function (nav) {
      if (!nav.querySelector('[data-premium-link]')) {
        var premium = document.createElement('a');
        premium.href = root + 'premium.html';
        premium.className = 'nav-item premium-nav';
        premium.setAttribute('data-premium-link', '1');
        premium.textContent = 'Premium';
        nav.appendChild(premium);
      }
    });
    document.querySelectorAll('.footer-copy').forEach(function (footer) {
      if (footer.querySelector('[data-legal-links]')) return;
      var sep = document.createTextNode(' · ');
      var links = document.createElement('span');
      links.setAttribute('data-legal-links', '1');
      links.innerHTML = '<a href="' + root + 'terms.html">Terms</a> · <a href="' + root + 'faq.html">FAQ</a> · <a href="' + root + 'cookies.html">Cookies</a> · <a href="' + root + 'premium.html">Premium</a>';
      footer.appendChild(sep);
      footer.appendChild(links);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    addSharedLinks();
    var consent = null;
    try { consent = localStorage.getItem(CONSENT_KEY); } catch (e) {}
    if (consent === 'accepted') loadAnalytics();
    else if (!consent) showConsent();
  });

  window.NightsConsent = { accept: function () { setConsent('accepted'); }, reject: function () { setConsent('rejected'); } };
})();
