/**
 * Nights – Blog Feed v3 (mahmuda.fun)
 * - First story = HERO POST (cover with fetchpriority=high)
 * - Other stories = card grid (lazy images)
 */
(function () {
  'use strict';

  const feedEl = document.getElementById('storyFeed');
  const seriesGrid = document.getElementById('seriesGrid');
  const feedFilters = document.getElementById('feedFilters');
  const feedEnd = document.getElementById('feedEnd');

  let allStories = [];
  let currentFilter = 'all';
  let expandedId = null;
  let currentStoryId = null;
  const contentCache = {};
  let openedFromHistory = false;

  function storyUrl(id) {
    return 'index.html?story=' + encodeURIComponent(id);
  }

  function normalizeCategory(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getRelatedStories(story) {
    if (!story) return [];
    var category = normalizeCategory(story.category);
    var related = allStories.filter(function (candidate) {
      if (!candidate || candidate.id === story.id) return false;
      var sameCategory = category && normalizeCategory(candidate.category) === category;
      var sameSeries = story.series && candidate.series && candidate.series === story.series;
      return sameCategory || sameSeries;
    });
    return related.sort(function (a, b) {
      var aSame = normalizeCategory(a.category) === category ? 1 : 0;
      var bSame = normalizeCategory(b.category) === category ? 1 : 0;
      return bSame - aSame || String(b.date || '').localeCompare(String(a.date || ''));
    }).slice(0, 4);
  }

  function renderRelatedStories(story) {
    var related = getRelatedStories(story);
    if (!related.length) return '';
    return '<section class="related-section" aria-label="Related stories">' +
      '<div class="related-heading"><span>Related in ' + escapeHtml(story.category || 'this category') + '</span></div>' +
      '<div class="related-grid">' + related.map(function (item) {
        var image = resolveImage(item);
        return '<a class="related-card" href="' + storyUrl(item.id) + '" data-story-link="' + escapeHtml(item.id) + '">' +
          (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">' : '<div class="related-placeholder">N</div>') +
          '<span class="related-card-body"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.category || 'Story') + '</small></span>' +
        '</a>';
      }).join('') + '</div></section>';
  }

  const KNOWN_IDS = [
    'senior-apu-ep01','senior-apu-ep02','senior-apu-ep03','senior-apu-ep04',
    'senior-apu-ep05','senior-apu-ep06','senior-apu-ep07','senior-apu-ep08',
    'senior-apu-ep09','senior-apu-ep10','senior-apu-ep11','senior-apu-ep12',
    'university-madam-eyes','university-mam-playful',
    'bristir-rate-ep1','bristir-rate-ep2','bristir-rate-ep3'
  ];

  function resolveMediaUrl(ref) {
    if (!ref) return '';
    ref = String(ref).trim();
    if (!ref) return '';
    if (/^https?:\/\//i.test(ref) || ref.startsWith('data:')) return ref;
    if (ref.startsWith('/')) return ref.substring(1);
    return ref;
  }

  var DEFAULT_COVER = 'assets/images/default-cover.svg';

  // Falls back to a branded placeholder ONLY when a story genuinely has no
  // cover/images set — never overrides a manually-provided image.
  function resolveImage(story) {
    if (!story) return DEFAULT_COVER;
    let imgPath = story.cover || (story.images && story.images.length > 0 ? story.images[0] : '');
    return imgPath ? resolveMediaUrl(imgPath) : DEFAULT_COVER;
  }

  async function loadStories() {
    try {
      const res = await fetch('stories/index.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('index missing');
      const data = await res.json();
      allStories = Array.isArray(data) ? data : (data.stories || []);
      if (!allStories.length) throw new Error('empty');
    } catch (e) {
      allStories = await loadByIds(KNOWN_IDS);
    }

    if (allStories.length < 8) {
      var extra = await loadByIds(KNOWN_IDS);
      var seen = {};
      allStories.forEach(function (s) { if (s && s.id) seen[s.id] = true; });
      extra.forEach(function (s) {
        if (s && s.id && !seen[s.id]) { allStories.push(s); seen[s.id] = true; }
      });
    }

    allStories = allStories.map(function (s) {
      return Object.assign({
        type: 'text', series: null, episode: null, audio: null, video: null,
        images: [], cover: null, tags: [], category: 'Story', language: 'en', seo: null, ads: null
      }, s);
    });

    allStories.sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    renderFeed();
    renderSeries();
    renderFooterCats();
    bindCategoryCards();
    renderTopStories();
    openDeepLink();
  }

  // Home-page "★ Top Stories" — same ranking approach as the category page:
  // stories with at least one rating, sorted by average (ties by count).
  function renderTopStories() {
    if (!window.NightsRatingReview || typeof window.NightsRatingReview.getSummaryMap !== 'function') return;
    var section = document.getElementById('topStoriesSection');
    var grid = document.getElementById('topStoriesGrid');
    if (!section || !grid) return;
    window.NightsRatingReview.getSummaryMap().then(function (map) {
      var byId = {};
      allStories.forEach(function (s) { byId[s.id] = s; });
      var ranked = Object.keys(map)
        .filter(function (id) { return byId[id] && map[id].count > 0; })
        .sort(function (a, b) { return map[b].average - map[a].average || map[b].count - map[a].count; })
        .slice(0, 6);
      if (!ranked.length) { section.hidden = true; return; }
      grid.innerHTML = ranked.map(function (id) {
        var s = byId[id];
        var img = resolveImage(s);
        return '<a class="top-rated-card" href="' + storyUrl(id) + '" data-story-link="' + escapeHtml(id) + '">' +
          (img ? '<img src="' + escapeHtml(img) + '" alt="" loading="lazy" decoding="async" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.remove()">' : '') +
          window.NightsRatingReview.badgeHtml(map[id]) +
          '<div class="top-rated-name">' + escapeHtml(s.title) + '</div>' +
          '</a>';
      }).join('');
      section.hidden = false;
      wireMediaButtons(grid); // intercepts the ?story= links for in-page SPA navigation
    });
  }

  // Home page "Categories" section ships as static cards with data-cat
  // attributes and href="#" placeholders — wires each to the real category
  // page filter (or straight to /series/ for the "Series" card).
  function bindCategoryCards() {
    document.querySelectorAll('.category-card[data-cat]').forEach(function (card) {
      var cat = card.getAttribute('data-cat');
      if (!cat) return;
      card.href = cat === 'series' ? 'series/' : 'category/?cat=' + encodeURIComponent(cat);
    });
  }

  // Home page "Series" preview — lightweight version of series/index.html's
  // grouping (name + episode count), linking through to the full page.
  function renderSeries() {
    var grid = document.getElementById('seriesGrid');
    if (!grid) return;
    var bySeries = {};
    allStories.forEach(function (s) {
      if (!s.series) return;
      (bySeries[s.series] = bySeries[s.series] || []).push(s);
    });
    var names = Object.keys(bySeries).slice(0, 6);
    if (!names.length) { grid.innerHTML = ''; return; }
    grid.innerHTML = names.map(function (name) {
      var eps = bySeries[name];
      return '<a class="feed-card" href="series/" style="text-decoration:none;">' +
        '<h3 class="feed-title">' + escapeHtml(name) + '</h3>' +
        '<p class="feed-excerpt">' + eps.length + ' episode' + (eps.length > 1 ? 's' : '') + '</p>' +
        '</a>';
    }).join('');
  }

  // Footer "Popular tags" — same aggregation the category page's filter
  // pills already use, so the footer only ever links to tags/categories
  // that genuinely exist in current content.
  function renderFooterCats() {
    var list = document.getElementById('footerCatsList');
    if (!list) return;
    var counts = {};
    allStories.forEach(function (s) {
      [s.type || 'text', s.category || ''].concat(s.tags || []).forEach(function (raw) {
        var key = String(raw || '').toLowerCase().trim();
        if (!key || key === 'text' || key === 'story') return;
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 14);
    list.innerHTML = top.map(function (key) {
      var label = key.charAt(0).toUpperCase() + key.slice(1);
      return '<a href="category/?cat=' + encodeURIComponent(key) + '">' + escapeHtml(label) + '</a>';
    }).join('');
  }

  async function loadByIds(ids) {
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      try {
        var r = await fetch('stories/' + ids[i] + '.json', { cache: 'no-store' });
        if (r.ok) out.push(await r.json());
      } catch (err) {}
    }
    return out;
  }

  // Renders a locked-story message instead of body text. Never cached in
  // contentCache — the auth check must be re-evaluated each time (e.g. the
  // reader can be reopened right after the visitor logs in elsewhere).
  function lockedTeaserHtml(story, isLoggedIn) {
    var body = isLoggedIn
      ? '<p class="rr-hint">Please verify your email to unlock this story.</p>'
      : '<p class="rr-hint">This story is free for logged-in members — just create an account.</p>' +
        '<a class="rr-submit" style="display:inline-block;text-decoration:none;margin-top:10px;" href="account/">Log in or create a free account</a>';
    return '<div class="locked-story-teaser"><div class="locked-story-icon" aria-hidden="true">🔒</div>' +
      '<p>' + escapeHtml(story.excerpt || '') + '</p>' + body + '</div>';
  }

  // Exclusive stories carry no `content` in the public JSON (see
  // script/blog-builder.js) — full text only exists in D1, behind a
  // logged-in + verified session, served by GET /api/stories/{id}/content.
  async function ensureExclusiveContent(id, story) {
    if (!window.NightsAuth) return lockedTeaserHtml(story, false);
    var session = await window.NightsAuth.me();
    if (!session.authenticated) return lockedTeaserHtml(story, false);
    if (!session.emailVerified) return lockedTeaserHtml(story, true);
    try {
      var data = await window.NightsAuth.fetchExclusiveContent(id);
      contentCache[id] = data.content || '';
      return contentCache[id];
    } catch (err) {
      return lockedTeaserHtml(story, true);
    }
  }

  async function ensureContent(id) {
    if (contentCache[id]) return contentCache[id];
    var story = allStories.find(function (s) { return s.id === id; });
    if (story && story.exclusive) {
      return ensureExclusiveContent(id, story);
    }
    if (story && story.content && String(story.content).length > 120) {
      contentCache[id] = story.content;
      return story.content;
    }
    try {
      var r = await fetch('stories/' + id + '.json', { cache: 'no-store' });
      if (r.ok) {
        var full = await r.json();
        contentCache[id] = full.content || '';
        if (story) {
          Object.assign(story, { content: full.content, video: full.video || story.video,
            audio: full.audio || story.audio, images: full.images || story.images,
            cover: full.cover || story.cover });
        }
        return contentCache[id];
      }
    } catch (err) {}
    return story ? (story.content || '') : '';
  }

  function getFiltered() {
    if (currentFilter === 'all') return allStories;
    if (currentFilter === 'series') return allStories.filter(function (s) { return s.series; });
    return allStories.filter(function (s) { return (s.type || 'text') === currentFilter; });
  }

  function typeLabel(t) {
    if (t === 'audio') return 'Audio';
    if (t === 'video') return 'Video';
    return 'Text';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  function renderMediaBlocks(story) {
    var html = '';
    var videoSrc = story.video ? resolveMediaUrl(story.video) : '';
    var audioSrc = story.audio ? resolveMediaUrl(story.audio) : '';

    if (videoSrc) {
      html += '<div class="feed-media-block feed-video-block">' +
        '<video controls playsinline preload="metadata" poster="" style="width:100%; max-height:520px;">' +
        '<source src="' + escapeHtml(videoSrc) + '">' +
        'Your browser does not support the video tag.' +
        '</video>' +
        '<span class="media-label">▶ Video</span>' +
        '</div>';
    }
    if (audioSrc) {
      html += '<div class="feed-media-block feed-audio-block">' +
        '<audio controls preload="metadata" style="width:100%">' +
        '<source src="' + escapeHtml(audioSrc) + '">' +
        'Your browser does not support the audio tag.' +
        '</audio>' +
        '<span class="media-label">♫ Audio</span>' +
        '</div>';
    }
    if (Array.isArray(story.images) && story.images.length > 1) {
      story.images.slice(1).forEach(function (img) {
        html += '<div class="feed-media-block feed-img-block">' +
          '<img src="' + escapeHtml(resolveMediaUrl(img)) + '" alt="' + escapeHtml(story.title + ' story image') + '" loading="lazy" decoding="async" onerror="this.parentElement.style.display=\'none\'" />' +
          '</div>';
      });
    }
    return html;
  }

  function updateSeoForStory(story) {
    if (!story) return;
    var seo = story.seo || {};
    try {
      if (seo.title) document.title = seo.title;
      if (seo.description) {
        var md = document.querySelector('meta[name="description"]');
        if (md) md.setAttribute('content', seo.description);
        var og = document.querySelector('meta[property="og:description"]');
        if (og) og.setAttribute('content', seo.description);
      }
      if (seo.keywords) {
        var mk = document.querySelector('meta[name="keywords"]');
        if (mk) mk.setAttribute('content', seo.keywords.join(', '));
      }
      if (seo.canonical) {
        var cl = document.querySelector('link[rel="canonical"]');
        if (cl) cl.setAttribute('href', seo.canonical);
        history.replaceState && history.replaceState(null, '', seo.canonical);
      }
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && seo.title) ogTitle.setAttribute('content', seo.title);
      if (seo.ogImage) {
        var ogImg = document.querySelector('meta[property="og:image"]');
        if (!ogImg) {
          ogImg = document.createElement('meta');
          ogImg.setAttribute('property', 'og:image');
          document.head.appendChild(ogImg);
        }
        ogImg.setAttribute('content', seo.ogImage);
      }
    } catch (e) {}
  }

  function updateStoryStructuredData(story) {
    if (!story) return;
    var seo = story.seo || {};
    var script = document.getElementById('storyStructuredData');
    if (!script) {
      script = document.createElement('script');
      script.id = 'storyStructuredData';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    var image = seo.ogImage || resolveImage(story);
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': story.title,
      'description': seo.description || story.excerpt || story.title,
      'url': seo.canonical || (location.origin + '/?story=' + encodeURIComponent(story.id)),
      'datePublished': story.date || undefined,
      'image': image ? [image] : undefined,
      'articleSection': story.category || 'Story',
      'keywords': Array.isArray(story.tags) ? story.tags : [],
      'isFamilyFriendly': false,
      'inLanguage': story.language || 'en'
    });
  }

  // Mounts the ratings/reviews widget into every [data-rating-review-mount]
  // placeholder currently in the feed — the hero card (always expanded) and
  // any grid card the reader has expanded inline via "সবটুকু পড়ুন". The
  // modal reader (openReader()) mounts its own copy separately. mount() is
  // idempotent, so calling this on every render is safe.
  function mountRatingReviews(container) {
    if (!container || !window.NightsRatingReview || typeof window.NightsRatingReview.mount !== 'function') return;
    container.querySelectorAll('[data-rating-review-mount]').forEach(function (mountEl) {
      var card = mountEl.closest('[data-id]');
      var id = card && card.getAttribute('data-id');
      if (id) window.NightsRatingReview.mount(id, mountEl);
    });
  }

  // Fills in the [data-rating-slot] placeholders left in each feed card
  // with a "★ 4.5 (12)" badge, once ratings are available. Non-blocking —
  // cards render immediately and badges pop in when the API responds.
  function applyRatingBadges(container) {
    if (!container || !window.NightsRatingReview || typeof window.NightsRatingReview.getSummaryMap !== 'function') return;
    window.NightsRatingReview.getSummaryMap().then(function (map) {
      container.querySelectorAll('[data-rating-slot]').forEach(function (slot) {
        var id = slot.getAttribute('data-rating-slot');
        var summary = map[id];
        if (summary && summary.count) {
          slot.outerHTML = window.NightsRatingReview.badgeHtml(summary);
        }
      });
    });
  }

  function renderFeed() {
    if (!feedEl) return;
    var list = getFiltered();
    if (!list.length) {
      feedEl.innerHTML = '<div class="loading-state"><p>কোনো স্টোরি নেই। একটু পর আবার চেষ্টা করুন।</p></div>';
      if (feedEnd) feedEnd.hidden = true;
      return;
    }

    var heroStory = list[0];
    var otherStories = list.slice(1);
    var html = '';

    var heroType = heroStory.type || 'text';
    var heroBadge = (heroStory.series
      ? '<span class="feed-type-badge">' + escapeHtml(heroStory.series) + ' · Ep ' + (heroStory.episode || '?') + '</span>'
      : '<span class="feed-type-badge">' + typeLabel(heroType) + '</span>') +
      (heroStory.exclusive ? '<span class="feed-type-badge feed-exclusive-badge">🔒 Members</span>' : '');

    var heroCover = resolveImage(heroStory);
    // LCP: discoverable in HTML, fetchpriority=high, NO lazy-load
    var heroCoverHtml = heroCover
      ? '<figure class="feed-hero-cover"><img src="' + escapeHtml(heroCover) + '" alt="' + escapeHtml(heroStory.title) + '" width="1200" height="675" fetchpriority="high" loading="eager" decoding="async" onerror="this.closest(\'figure\').style.display=\'none\'"></figure>'
      : '';

    html += '<div class="hero-section">';
    html += '<article class="feed-card expanded hero-card" data-id="' + escapeHtml(heroStory.id) + '" id="story-' + escapeHtml(heroStory.id) + '">';
    html += heroCoverHtml;
    html += '<div class="feed-card-header">' +
              '<div class="feed-avatar">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author">Nights (Featured)</div>' +
                '<div class="feed-time">' + escapeHtml(heroStory.date || '') + ' · ' + escapeHtml(heroStory.readTime || '') + '</div>' +
              '</div>' + heroBadge +
              '<span data-rating-slot="' + escapeHtml(heroStory.id) + '"></span>' +
            '</div>';
    html += '<h1 class="feed-title hero-title">' + escapeHtml(heroStory.title) + '</h1>';
    html += '<div class="feed-full-content" id="content-' + heroStory.id + '"><p class="loading-text">ফুল স্টোরি লোড হচ্ছে...</p></div>';
    if (heroStory.nextEpisodeId) {
      html += '<div class="feed-actions"><button class="inline-next" data-next="' + escapeHtml(heroStory.nextEpisodeId) + '">পরের পর্ব →</button></div>';
    }
    html += '<div class="feed-tags">' +
              (heroStory.tags || []).map(function (tg) { return '<span class="feed-tag">#' + escapeHtml(tg) + '</span>'; }).join('') +
            '</div>';
    html += '<div class="rating-review-mount" data-rating-review-mount></div>';
    html += '</article></div>';

    if (otherStories.length > 0) {
      html += '<div class="regular-stories-grid">';
      html += otherStories.map(function (story) {
        var t = story.type || 'text';
        var isExpanded = expandedId === story.id;

        var badge = (story.series
          ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
          : '<span class="feed-type-badge">' + typeLabel(t) + '</span>') +
          (story.exclusive ? '<span class="feed-type-badge feed-exclusive-badge">🔒 Members</span>' : '');

        var coverImg = resolveImage(story);
        var coverHtml = (coverImg && !isExpanded)
          ? '<div class="feed-card-media"><img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(story.title) + ' কভার" width="600" height="338" loading="lazy" decoding="async" onerror="this.style.display=\'none\'"></div>'
          : '';

        var mediaIcons = [];
        if (story.video) mediaIcons.push('<span title="ভিডিও আছে">▶</span>');
        if (story.audio) mediaIcons.push('<span title="অডিও আছে">♫</span>');
        var mediaChips = mediaIcons.length
          ? '<div class="media-chips">' + mediaIcons.join('') + '</div>'
          : '';

        var bodyPlaceholder = isExpanded
          ? '<div class="feed-full-content" id="content-' + story.id + '"><p class="loading-text">লোড হচ্ছে...</p></div>'
          : '';
        var nextBtn = (isExpanded && story.nextEpisodeId)
          ? '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>'
          : '';

        var gridStyle = isExpanded ? 'grid-column: 1 / -1;' : '';

        return (
          '<article class="feed-card ' + (isExpanded ? 'expanded' : '') + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '" style="' + gridStyle + '">' +
            coverHtml +
            mediaChips +
            '<div class="feed-card-header">' +
              '<div class="feed-avatar">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author">Nights</div>' +
                '<div class="feed-time">' + escapeHtml(story.date || '') + ' · ' + escapeHtml(story.readTime || '') + '</div>' +
              '</div>' + badge +
              '<span data-rating-slot="' + escapeHtml(story.id) + '"></span>' +
            '</div>' +
            '<h2 class="feed-title">' + escapeHtml(story.title) + '</h2>' +
            (isExpanded ? '' : '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>') +
            bodyPlaceholder +
            '<div class="feed-actions">' +
              '<button class="read-more-btn">' + (isExpanded ? 'ছোট করে দেখুন ↑' : 'সবটুকু পড়ুন →') + '</button>' +
              nextBtn +
            '</div>' +
            (isExpanded ? '<div class="rating-review-mount" data-rating-review-mount></div>' : '') +
          '</article>'
        );
      }).join('');
      html += '</div>';
    }

    feedEl.innerHTML = html;
    if (feedEnd) feedEnd.hidden = false;
    applyRatingBadges(feedEl);
    mountRatingReviews(feedEl);

    ensureContent(heroStory.id).then(function (content) {
      var targetEl = document.getElementById('content-' + heroStory.id);
      if (targetEl) {
        targetEl.innerHTML = renderMediaBlocks(heroStory) + content;
        wireMediaButtons(targetEl);
        if (window.NightsAds && window.NightsAds.onFeedRendered) window.NightsAds.onFeedRendered(feedEl);
      }
    });

    if (expandedId) {
      ensureContent(expandedId).then(function (content) {
        var targetEl = document.getElementById('content-' + expandedId);
        var story = allStories.find(function (s) { return s.id === expandedId; });
        if (targetEl) {
          targetEl.innerHTML = (story ? renderMediaBlocks(story) : '') + content;
          wireMediaButtons(targetEl);
          if (window.NightsAds && window.NightsAds.onFeedRendered) window.NightsAds.onFeedRendered(feedEl);
        }
      });
    }
  }

  function openDeepLink() {
    var m = (window.location.search || '').match(/[?&]story=([^&]+)/);
    if (m) {
      var id = decodeURIComponent(m[1]);
      var story = allStories.find(function (s) { return s.id === id; });
      if (story) {
        expandedId = null;
        renderFeed();
        openReader(id, { silent: true });
      }
    }
  }

  async function openReader(id, options) {
    options = options || {};
    if (!options.silent) {
      history.pushState({ story: id }, '', storyUrl(id));
    }
    var story = allStories.find(function (s) { return s.id === id; });
    if (!story) return;
    currentStoryId = id;
    var content = await ensureContent(id);
    updateSeoForStory(story);
    updateStoryStructuredData(story);

    var readerContent = document.getElementById('readerContent');
    var readerModal = document.getElementById('readerModal');
    if (readerContent) {
      readerContent.innerHTML =
        '<button class="reader-back" type="button" data-reader-back aria-label="Back to stories">← Back to stories</button>' +
        '<div class="reader-head">' +
          '<div class="reader-meta">' +
            (story.series ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>' : '<span class="feed-type-badge">' + typeLabel(story.type || 'text') + '</span>') +
            '<span class="reader-time">' + escapeHtml(story.date || '') + ' · ' + escapeHtml(story.readTime || '') + '</span>' +
          '</div>' +
          '<h2 class="reader-title">' + escapeHtml(story.title) + '</h2>' +
          (resolveImage(story) ? '<img class="reader-cover" src="' + escapeHtml(resolveImage(story)) + '" alt="' + escapeHtml(story.title) + '" loading="lazy" decoding="async">' : '') +
          (story.video ? '<div class="feed-media-block"><video controls playsinline preload="metadata" style="width:100%">' +
              '<source src="' + escapeHtml(resolveMediaUrl(story.video)) + '">Your browser does not support the video tag.</video></div>' : '') +
          (story.audio ? '<div class="feed-media-block"><audio controls preload="metadata" style="width:100%">' +
              '<source src="' + escapeHtml(resolveMediaUrl(story.audio)) + '">Your browser does not support the audio tag.</audio></div>' : '') +
        '</div>' +
        '<div class="reader-body">' + content + '</div>' +
        renderRelatedStories(story) +
        '<div class="reader-nav">' +
          '<button class="inline-next" data-next="' + escapeHtml(id) + '" data-prev="1">← আগের পর্ব</button>' +
          (story.nextEpisodeId ? '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>' : '') +
        '</div>' +
        '<div class="rating-review-mount" data-rating-review-mount></div>';
      wireMediaButtons(readerContent);
      if (window.NightsRatingReview && typeof window.NightsRatingReview.mount === 'function') {
        window.NightsRatingReview.mount(id, readerContent.querySelector('[data-rating-review-mount]'));
      }
      if (window.NightsAds && typeof window.NightsAds.onReaderOpen === 'function') {
        window.NightsAds.onReaderOpen(readerContent);
      }
    }
    if (readerModal) {
      readerModal.classList.add('open');
      readerModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      readerModal.scrollTop = 0;
    }
  }

  function closeReader() {
    var readerModal = document.getElementById('readerModal');
    if (readerModal) {
      readerModal.classList.remove('open');
      readerModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    currentStoryId = null;
    document.querySelectorAll('#readerContent video, #readerContent audio').forEach(function (m) {
      try { m.pause(); } catch (e) {}
    });
  }

  function wireMediaButtons(container) {
    if (!container) return;
      container.querySelectorAll('[data-reader-back]').forEach(function (btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
          if (window.history.length > 1 && window.history.state && window.history.state.story) {
            history.back();
          } else {
            history.replaceState({}, '', 'index.html');
            closeReader();
          }
        });
      });
      container.querySelectorAll('[data-next]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var nextId = btn.getAttribute('data-next');
        if (btn.hasAttribute('data-prev')) {
          var cur = allStories.find(function (s) { return s.id === nextId; });
          if (cur && cur.series) {
            var eps = allStories.filter(function (s) { return s.series === cur.series; })
              .sort(function (a, b) { return a.episode - b.episode; });
            var idx = eps.findIndex(function (s) { return s.id === cur.id; });
            if (idx > 0) nextId = eps[idx - 1].id;
            else return;
          } else return;
        }
        closeReader();
        expandedId = null;
        openReader(nextId);
      });
    });
      container.querySelectorAll('a[data-story-link], a[href*="story="]').forEach(function (a) {
      if (a.dataset.bound) return;
      a.dataset.bound = '1';
      a.addEventListener('click', function (e) {
        var m = (a.getAttribute('href') || '').match(/[?&]story=([^&]+)/);
        if (m) {
          e.preventDefault();
          expandedId = null;
          openReader(decodeURIComponent(m[1]));
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', loadStories);

  if (feedEl) {
    feedEl.addEventListener('click', function (e) {
      var nextBtn = e.target.closest('[data-next]');
      if (nextBtn) return;

      var card = e.target.closest('.feed-card');
      if (!card) return;
      var id = card.getAttribute('data-id');

      if (e.target.classList.contains('read-more-btn')) {
        openReader(id);
        return;
      }

      var isTitleArea = e.target.closest('.feed-card-header, .feed-title, .feed-excerpt, .feed-card-media');
      if (isTitleArea && id !== expandedId) {
        openReader(id);
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeReader();
  });

  window.addEventListener('popstate', function () {
    var match = (window.location.search || '').match(/[?&]story=([^&]+)/);
    if (match) openReader(decodeURIComponent(match[1]), { silent: true });
    else closeReader();
  });

  window.NightsBlog = {
    openReader: openReader,
    closeReader: closeReader,
    loadStories: loadStories
  };
})();
