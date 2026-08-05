/**
 * Nights / mahmuda.fun – Ad Manager
 * Placement map:
 *  728x90  → Desktop leaderboard (below nav)
 *  320x50  → Mobile top banner
 *  160x600 → Desktop sticky sidebar (wide screens)
 *  160x300 → Mid-feed (every N cards) + reader footer
 *  SocialBar → Sticky bottom (all pages)
 *
 * New posts: feed re-render calls NightsAds.onFeedRendered()
 * Reader open: NightsAds.onReaderOpen()
 */
(function () {
  'use strict';

  const ADS = {
    leaderboard: {
      key: 'f0fe1484de0d45f16650e5fca59e1a9b',
      width: 728,
      height: 90,
      script: 'https://www.highperformanceformat.com/f0fe1484de0d45f16650e5fca59e1a9b/invoke.js'
    },
    mobileBanner: {
      key: '02c8c64e8ec246933001a36807bcdd12',
      width: 320,
      height: 50,
      script: 'https://www.highperformanceformat.com/02c8c64e8ec246933001a36807bcdd12/invoke.js'
    },
    sky: {
      key: '9d2c5f5aa1439a721db4d755392fd934',
      width: 160,
      height: 600,
      script: 'https://www.highperformanceformat.com/9d2c5f5aa1439a721db4d755392fd934/invoke.js'
    },
    mid: {
      key: '273da8332344d6fc1a2bf05ed7bb975f',
      width: 160,
      height: 300,
      script: 'https://www.highperformanceformat.com/273da8332344d6fc1a2bf05ed7bb975f/invoke.js'
    },
    socialBar: 'https://pl30691116.effectivecpmnetwork.com/2d/ce/92/2dce92dedc17227889cf9319e3234751.js'
  };

  const MID_FEED_EVERY = 3;
  let socialLoaded = false;

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function isWide() {
    return window.matchMedia('(min-width: 1200px)').matches;
  }

  function injectAtOptions(container, cfg) {
    if (!container || container.dataset.adLoaded === '1') return;
    container.dataset.adLoaded = '1';
    container.classList.add('ad-slot', 'ad-loaded');
    container.style.minHeight = cfg.height + 'px';
    container.style.minWidth = cfg.width + 'px';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Advertisement');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.style.width = cfg.width + 'px';
    iframe.style.height = cfg.height + 'px';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.style.margin = '0 auto';
    iframe.style.display = 'block';
    iframe.style.maxWidth = '100%';

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:transparent;display:flex;justify-content:center;}</style></head><body>' +
      '<script>atOptions={' +
      "key:'" + cfg.key + "'," +
      "format:'iframe'," +
      'height:' + cfg.height + ',' +
      'width:' + cfg.width + ',' +
      'params:{}' +
      '};<\/script>' +
      '<script src="' + cfg.script + '"><\/script>' +
      '</body></html>';

    container.innerHTML = '';
    container.appendChild(iframe);
    iframe.srcdoc = html;
  }

  function loadSocialBar() {
    if (socialLoaded) return;
    socialLoaded = true;
    const s = document.createElement('script');
    s.src = ADS.socialBar;
    s.async = true;
    document.body.appendChild(s);
  }

  function fillStaticSlots() {
    document.querySelectorAll('[data-ad]').forEach(function (el) {
      const type = el.getAttribute('data-ad');
      if (type === 'leaderboard') {
        if (!isMobile()) injectAtOptions(el, ADS.leaderboard);
        else el.style.display = 'none';
      } else if (type === 'mobile-banner') {
        if (isMobile()) injectAtOptions(el, ADS.mobileBanner);
        else el.style.display = 'none';
      } else if (type === 'sky') {
        if (isWide()) injectAtOptions(el, ADS.sky);
        else el.style.display = 'none';
      } else if (type === 'mid') {
        injectAtOptions(el, ADS.mid);
      }
    });
  }

  function createMidFeedShell() {
    const wrap = document.createElement('div');
    wrap.className = 'feed-ad-card ad-slot ad-mid';
    wrap.setAttribute('data-ad-dynamic', 'mid');
    wrap.innerHTML = '<div class="ad-label">Ad</div><div class="ad-inner"></div>';
    return wrap;
  }

  function onFeedRendered(feedEl) {
    if (!feedEl) feedEl = document.getElementById('storyFeed');
    if (!feedEl) return;

    feedEl.querySelectorAll('.feed-ad-card').forEach(function (n) { n.remove(); });

    const cards = Array.from(feedEl.querySelectorAll('.feed-card'));
    if (!cards.length) return;

    for (let i = MID_FEED_EVERY - 1; i < cards.length; i += MID_FEED_EVERY) {
      const shell = createMidFeedShell();
      const card = cards[i];
      if (card && card.parentNode) {
        card.parentNode.insertBefore(shell, card.nextSibling);
      }
    }

    feedEl.querySelectorAll('.feed-ad-card .ad-inner').forEach(function (inner, idx) {
      setTimeout(function () {
        injectAtOptions(inner, ADS.mid);
      }, 80 * idx);
    });
  }

  function onReaderOpen(readerContent) {
    if (!readerContent) readerContent = document.getElementById('readerContent');
    if (!readerContent) return;

    let slot = readerContent.querySelector('.reader-ad-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'reader-ad-slot ad-slot ad-mid';
      slot.innerHTML = '<div class="ad-label">Ad</div><div class="ad-inner"></div>';
      readerContent.appendChild(slot);
    }
    const inner = slot.querySelector('.ad-inner');
    if (inner) {
      inner.dataset.adLoaded = '';
      inner.innerHTML = '';
      injectAtOptions(inner, ADS.mid);
    }
  }

  function init() {
    fillStaticSlots();
    loadSocialBar();

    window.addEventListener('resize', function () {
      document.querySelectorAll('[data-ad="leaderboard"]').forEach(function (el) {
        el.style.display = isMobile() ? 'none' : '';
        if (!isMobile() && el.dataset.adLoaded !== '1') injectAtOptions(el, ADS.leaderboard);
      });
      document.querySelectorAll('[data-ad="mobile-banner"]').forEach(function (el) {
        el.style.display = isMobile() ? '' : 'none';
        if (isMobile() && el.dataset.adLoaded !== '1') injectAtOptions(el, ADS.mobileBanner);
      });
      document.querySelectorAll('[data-ad="sky"]').forEach(function (el) {
        el.style.display = isWide() ? '' : 'none';
        if (isWide() && el.dataset.adLoaded !== '1') injectAtOptions(el, ADS.sky);
      });
    });
  }

  window.NightsAds = {
    init: init,
    onFeedRendered: onFeedRendered,
    onReaderOpen: onReaderOpen,
    injectAtOptions: injectAtOptions,
    ADS: ADS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
