/**
 * Nights / mahmuda.fun – Ad Manager v3
 * =====================================
 * Placements:
 *  728x90  → Desktop leaderboard (below nav)
 *  320x50  → Mobile top banner
 *  160x600 → Desktop sticky sidebar (wide screens)
 *  160x300 → Mid-feed (every N cards) + reader footer
 *  Native  → INSIDE every new post automatically:
 *            [data-ad-container="inline-native"]   after 1st paragraph
 *            [data-ad-container="mid-content"]     middle of long posts
 *            [data-ad-container="end-of-post"]     end of every post
 *  SocialBar → DISABLED (see loadSocialBar() below) — this format renders
 *              a fake "message notification" overlay that covered the
 *              site navigation; it is not called from init() anymore.
 *
 * The blog builder (blog-builder.js) injects these marker containers
 * into EVERY new post at build time, so ads appear automatically in
 * new stories with zero extra work.
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
    rectangle: {
      key: '69d8bf2cd9393fcc93c970b18794623a',
      width: 300,
      height: 250,
      script: 'https://www.highperformanceformat.com/69d8bf2cd9393fcc93c970b18794623a/invoke.js'
    },
    compact: {
      key: '044c64ab2a94fddc6c1342270517ad48',
      width: 468,
      height: 60,
      script: 'https://www.highperformanceformat.com/044c64ab2a94fddc6c1342270517ad48/invoke.js'
    },
    native: {
      src: 'https://pl30754545.effectivecpmnetwork.com/338427ef031554fb69be13a7ebed5b7b/invoke.js',
      containerId: 'container-338427ef031554fb69be13a7ebed5b7b'
    },
    smartLink: 'https://www.effectivecpmnetwork.com/kg1dg8q0c2?key=43cfb175f776514c54c4c87294d1718d',
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

  /**
   * Loads an AT-options ad (iframe) into a container, idempotent.
   */
  function injectAtOptions(container, cfg) {
    if (!container || container.closest('.navbar, nav')) return;
    if (container.dataset.adLoaded === '1') return;
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

  // Disabled: this ad format renders a fixed-position overlay that mimics an
  // OS/app message notification (a fake "New message from Anna" popup) to
  // bait clicks, and it positions itself using the ad network's own script
  // rather than anything in our DOM/CSS — so it can render on top of the
  // navbar regardless of where loadSocialBar() is called from. That's not a
  // placement bug we can fix by moving code around; it's the ad format
  // itself. Kept here (unused) in case a non-deceptive replacement is
  // wanted later — do not re-enable this as-is.
  function loadSocialBar() {
    if (socialLoaded) return;
    socialLoaded = true;
    const s = document.createElement('script');
    s.src = ADS.socialBar;
    s.async = true;
    s.setAttribute('data-ad-network', 'socialbar');
    document.body.appendChild(s);
  }

  function loadNativeBanner() {
    let slot = document.querySelector('[data-ad="native"]');
    if (!slot) {
      const anchor = document.querySelector('.section-header, .feed-header, main .container');
      if (anchor && anchor.closest('.navbar, nav')) return;
      if (!anchor) return;
      slot = document.createElement('aside');
      slot.className = 'ad-slot ad-native-slot';
      slot.setAttribute('data-ad', 'native');
      slot.setAttribute('aria-label', 'Advertisement');
      slot.innerHTML = '<div class="ad-label">Advertisement</div><div id="' + ADS.native.containerId + '"></div>';
      anchor.parentNode.insertBefore(slot, anchor.nextSibling);
    }
    if (slot.dataset.adLoaded === '1') return;
    slot.dataset.adLoaded = '1';
    const container = slot.querySelector('#' + ADS.native.containerId);
    if (!container) return;
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = ADS.native.src;
    container.appendChild(script);
  }

  // Deliberately never falls back to <footer> — the footer is reserved for
  // site credit/links/newsletter, not a sponsored-link unit. Only renders
  // next to feed "next episode" actions or inside the reader nav, where an
  // ad placement is expected.
  function addSmartLinkNotice(root) {
    root = root || document;
    if (root.querySelector('.ad-smartlink')) return;
    const target = root.querySelector('.feed-actions, .reader-nav');
    if (!target) return;
    const wrap = document.createElement('div');
    wrap.className = 'ad-smartlink';
    wrap.innerHTML = '<span>Sponsored</span> <a href="' + ADS.smartLink + '" target="_blank" rel="sponsored nofollow noopener noreferrer">Continue with partner</a>';
    target.appendChild(wrap);
  }

  /**
   * Fills static page-level ad slots: [data-ad="leaderboard|mobile-banner|sky|mid"]
   */
  function fillStaticSlots() {
    document.querySelectorAll('[data-ad]').forEach(function (el) {
      if (el.closest('.navbar, nav')) { el.removeAttribute('data-ad'); el.style.display = 'none'; return; }
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
      } else if (type === 'rectangle') {
        injectAtOptions(el, ADS.rectangle);
      } else if (type === 'compact') {
        injectAtOptions(el, ADS.compact);
      } else if (type === 'native') {
        loadNativeBanner();
      }
    });
  }

  /**
   * Automatic in-content ad injection (NEW POSTS).
   * The builder places marker containers inside every story HTML:
   *   [data-ad-container="inline-native"]
   *   [data-ad-container="mid-content"]
   *   [data-ad-container="end-of-post"]
   * We find them inside any feed card / reader body and load ads into them.
   */
  function fillInlineAdContainers(root) {
    if (!root) return;
    root.querySelectorAll('[data-ad-container]').forEach(function (marker) {
      if (marker.dataset.bound) return;
      marker.dataset.bound = '1';
      const slot = document.createElement('div');
      slot.className = 'ad-slot ad-inline-slot';
      slot.setAttribute('aria-hidden', 'true');
      slot.innerHTML = '<div class="ad-label">Advertisement</div>';
      const inner = document.createElement('div');
      inner.className = 'ad-inner';
      slot.appendChild(inner);
      marker.parentNode.insertBefore(slot, marker.nextSibling);
      // Remove the invisible marker once wired
      marker.remove();
      injectAtOptions(inner, ADS.mid);
    });
  }

  function createMidFeedShell() {
    const wrap = document.createElement('div');
    wrap.className = 'feed-ad-card ad-slot ad-mid';
    wrap.setAttribute('data-ad-dynamic', 'mid');
    wrap.innerHTML = '<div class="ad-label">Advertisement</div><div class="ad-inner"></div>';
    return wrap;
  }

  /**
   * Feed re-render: inserts mid-feed ads between cards AND wires up
   * the inline ad containers that the builder placed inside each story.
   * Called by blog.js after every render / expand.
   */
  function onFeedRendered(feedEl) {
    if (!feedEl) feedEl = document.getElementById('storyFeed');
    if (!feedEl) return;

    // 1. Wire inline ad containers inside every loaded story (auto ad injection)
    feedEl.querySelectorAll('.feed-full-content, .feed-card').forEach(function (block) {
      fillInlineAdContainers(block);
    });

    // 2. Mid-feed ads between cards
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

  /**
   * Reader open: wires inline ad containers inside the reader body
   * and appends an end-of-post ad slot.
   */
  function onReaderOpen(readerContent) {
    if (!readerContent) readerContent = document.getElementById('readerContent');
    if (!readerContent) return;

    fillInlineAdContainers(readerContent);
    addSmartLinkNotice(readerContent);

    let slot = readerContent.querySelector('.reader-ad-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'reader-ad-slot ad-slot ad-mid';
      slot.innerHTML = '<div class="ad-label">Advertisement</div><div class="ad-inner"></div>';
      const nav = readerContent.querySelector('.reader-nav');
      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(slot, nav);
      } else {
        readerContent.appendChild(slot);
      }
    }
    const inner = slot.querySelector('.ad-inner');
    if (inner && inner.dataset.adLoaded !== '1') {
      inner.dataset.adLoaded = '';
      inner.innerHTML = '';
      injectAtOptions(inner, ADS.rectangle);
    }
  }

  function init() {
    fillStaticSlots();
    loadNativeBanner();
    // loadSocialBar() intentionally not called — see comment above its
    // definition. It rendered a fake "message notification" overlay that
    // covered the navigation.
    addSmartLinkNotice(document);

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

    // Any story content injected later (AJAX) also gets its ads wired
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.querySelector && node.querySelector('[data-ad-container]')) {
              fillInlineAdContainers(node);
            }
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.NightsAds = {
    init: init,
    onFeedRendered: onFeedRendered,
    onReaderOpen: onReaderOpen,
    fillInlineAdContainers: fillInlineAdContainers,
    injectAtOptions: injectAtOptions,
    ADS: ADS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
