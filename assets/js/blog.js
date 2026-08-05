/**
 * Nights – Feed
 * - All stories from index / individual JSON
 * - Full text on expand (no popup)
 * - CSS decor, no heavy images
 * - Robust fallback so feed never empties after deploy
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
  const contentCache = {};

  const KNOWN_IDS = [
    'senior-apu-ep01','senior-apu-ep02','senior-apu-ep03','senior-apu-ep04',
    'senior-apu-ep05','senior-apu-ep06','senior-apu-ep07','senior-apu-ep08',
    'senior-apu-ep09','senior-apu-ep10','senior-apu-ep11','senior-apu-ep12',
    'university-madam-eyes','university-mam-playful',
    'bristir-rate-ep1','bristir-rate-ep2','bristir-rate-ep3'
  ];

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
        type: s.type || 'text',
        series: s.series || null,
        episode: s.episode != null ? Number(s.episode) : null,
        audio: s.audio || null,
        video: s.video || null,
        images: [],
        cover: null
      }, s);
    });

    allStories.sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    renderFeed();
    renderSeries();
    renderFooterCats();
    bindCategoryCards();
    openDeepLink();
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

  async function ensureContent(id) {
    if (contentCache[id]) return contentCache[id];
    var story = allStories.find(function (s) { return s.id === id; });
    if (story && story.content && String(story.content).length > 120) {
      contentCache[id] = story.content;
      return story.content;
    }
    try {
      var r = await fetch('stories/' + id + '.json', { cache: 'no-store' });
      if (r.ok) {
        var full = await r.json();
        contentCache[id] = full.content || '';
        if (story) story.content = contentCache[id];
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

  function typeIcon(t) {
    if (t === 'audio') return '♪';
    if (t === 'video') return '▶';
    return '✎';
  }

  function typeLabel(t) {
    if (t === 'audio') return 'Audio';
    if (t === 'video') return 'Video';
    return 'Text';
  }

  function renderFeed() {
    if (!feedEl) return;
    var list = getFiltered();
    if (!list.length) {
      feedEl.innerHTML = '<div class="loading-state"><p>কোনো স্টোরি নেই। একটু পর আবার চেষ্টা করুন।</p></div>';
      if (feedEnd) feedEnd.hidden = true;
      return;
    }

    feedEl.innerHTML = list.map(function (story) {
      var t = story.type || 'text';
      var openClass = expandedId === story.id ? ' expanded' : '';
      var badge = story.series
        ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
        : '<span class="feed-type-badge">' + typeLabel(t) + '</span>';
      var label = escapeHtml((story.category || 'Story').toUpperCase());
      var body = expandedId === story.id ? (contentCache[story.id] || story.content || '<p>লোড হচ্ছে…</p>') : '';
      var nextBtn = '';
      if (story.nextEpisodeId) {
        nextBtn = '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>';
      }
      return (
        '<article class="feed-card' + openClass + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '">' +
          '<div class="feed-card-header">' +
            '<div class="feed-avatar">N</div>' +
            '<div class="feed-meta">' +
              '<div class="feed-author">Nights</div>' +
              '<div class="feed-time">' + escapeHtml(story.date || '') + ' · ' + escapeHtml(story.readTime || '') + '</div>' +
            '</div>' +
            badge +
          '</div>' +
          '<h3 class="feed-title">' + escapeHtml(story.title) + '</h3>' +
          '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>' +
          '<div class="feed-full-content">' + body + '</div>' +
          '<div class="feed-actions">' +
            '<button class="read-more-btn">' + (expandedId === story.id ? 'বন্ধ করুন' : 'আরও পড়ুন') + '</button>' +
            nextBtn +
          '</div>' +
          '<div class="feed-tags">' +
            (story.tags || []).map(function (tg) {
              return '<span class="feed-tag">#' + escapeHtml(tg) + '</span>';
            }).join('') +
            (story.category ? '<span class="feed-tag">#' + escapeHtml(story.category) + '</span>' : '') +
          '</div>' +
        '</article>'
      );
    }).join('');

    feedEl.querySelectorAll('.read-more-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.feed-card');
        if (!card) return;
        toggleExpand(card.getAttribute('data-id'));
      });
    });

    feedEl.querySelectorAll('.inline-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nid = btn.getAttribute('data-next');
        if (nid) toggleExpand(nid);
      });
    });

    if (feedEnd) feedEnd.hidden = false;
    if (window.NightsAds) window.NightsAds.onFeedRendered(feedEl);

    if (expandedId) {
      ensureContent(expandedId).then(function (html) {
        var card = feedEl.querySelector('[data-id="' + expandedId + '"]');
        if (card) {
          var bodyEl = card.querySelector('.feed-full-content');
          if (bodyEl) bodyEl.innerHTML = html || '<p>কনটেন্ট পাওয়া যায়নি।</p>';
        }
      });
    }
  }

  function toggleExpand(id) {
    if (expandedId === id) {
      expandedId = null;
    } else {
      expandedId = id;
    }
    renderFeed();
    if (expandedId) {
      var el = document.getElementById('story-' + expandedId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSeries() {
    if (!seriesGrid) return;
    var bySeries = {};
    allStories.forEach(function (s) {
      if (!s.series) return;
      if (!bySeries[s.series]) bySeries[s.series] = [];
      bySeries[s.series].push(s);
    });
    var keys = Object.keys(bySeries);
    if (!keys.length) {
      seriesGrid.innerHTML = '<p style="color:var(--text-muted)">কোনো সিরিজ নেই।</p>';
      return;
    }
    seriesGrid.innerHTML = keys.map(function (name) {
      var eps = bySeries[name].sort(function (a, b) { return (a.episode || 0) - (b.episode || 0); });
      var first = eps[0];
      return (
        '<a class="series-card" href="?story=' + encodeURIComponent(first.id) + '">' +
          '<div class="series-card-title">' + escapeHtml(name) + '</div>' +
          '<div class="series-card-meta">' + eps.length + ' episodes</div>' +
        '</a>'
      );
    }).join('');
  }

  function renderFooterCats() {
    var listEl = document.getElementById('footerCatsList');
    if (!listEl || !allStories.length) return;
    var catMap = {}, tagMap = {};
    allStories.forEach(function (s) {
      var c = (s.category || 'Story').trim();
      if (c) { if (!catMap[c]) catMap[c] = { count: 0, desc: categoryDesc(c) }; catMap[c].count++; }
      (s.tags || []).forEach(function (t) {
        t = String(t).trim();
        if (t) { if (!tagMap[t]) tagMap[t] = 0; tagMap[t]++; }
      });
    });
    var html = '';
    Object.keys(catMap).sort().forEach(function (c) {
      html += '<a class="footer-cat-link" href="#feed" data-filter-cat="' + escapeHtml(c.toLowerCase()) + '" title="' + escapeHtml(catMap[c].desc) + '">' +
        escapeHtml(c) + ' <span class="footer-cat-count">' + catMap[c].count + '</span></a>';
    });
    Object.keys(tagMap).sort().forEach(function (t) {
      html += '<a class="footer-cat-link footer-tag-link" href="#feed" data-filter-tag="' + escapeHtml(t.toLowerCase()) + '">#' + escapeHtml(t) + '</a>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('[data-filter-cat]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); applyCategoryFilter(a.getAttribute('data-filter-cat')); });
    });
    listEl.querySelectorAll('[data-filter-tag]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); applyTagFilter(a.getAttribute('data-filter-tag')); });
    });
  }

  function categoryDesc(c) {
    var map = {
      'Forbidden': 'Taboo chemistry, senior-junior, madam-student, secret nights',
      'Romance': 'Slow burn, emotional tension, intimate connection',
      'Fantasy': 'Impossible desires and pure fantasy scenes',
      'Intimate': 'Close, sensual, body-focused moments',
      'Story': 'All stories'
    };
    return map[c] || (c + ' stories on Nights');
  }

  function applyCategoryFilter(cat) {
    currentFilter = 'all';
    var filtered = allStories.filter(function (s) { return String(s.category || '').toLowerCase() === cat; });
    if (!filtered.length) filtered = allStories;
    renderTemp(filtered);
  }

  function applyTagFilter(tag) {
    currentFilter = 'all';
    var filtered = allStories.filter(function (s) {
      return (s.tags || []).some(function (t) { return String(t).toLowerCase() === tag; });
    });
    if (!filtered.length) filtered = allStories;
    renderTemp(filtered);
  }

  function renderTemp(list) {
    if (!feedEl) return;
    var backup = allStories;
    allStories = list;
    renderFeed();
    allStories = backup;
    var feedSec = document.getElementById('feed');
    if (feedSec) window.scrollTo({ top: feedSec.offsetTop - 80, behavior: 'smooth' });
  }

  function bindCategoryCards() {
    document.querySelectorAll('.category-card[data-cat]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        var cat = card.getAttribute('data-cat');
        if (cat === 'series' || cat === 'audio' || cat === 'video') {
          currentFilter = cat;
          if (feedFilters) {
            feedFilters.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
            var btn = feedFilters.querySelector('[data-filter="' + cat + '"]');
            if (btn) btn.classList.add('active');
          }
          renderFeed();
        } else {
          applyCategoryFilter(cat);
        }
      });
    });
  }

  function openDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('story');
    if (id) {
      currentFilter = 'all';
      if (feedFilters) {
        feedFilters.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        var allBtn = feedFilters.querySelector('[data-filter="all"]');
        if (allBtn) allBtn.classList.add('active');
      }
      toggleExpand(id);
    }
  }

  if (feedFilters) {
    feedFilters.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        feedFilters.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        expandedId = null;
        renderFeed();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  window.NightsBlog = {
    loadStories: loadStories,
    openReader: function (id) { toggleExpand(id); },
    closeReader: function () { expandedId = null; renderFeed(); },
    getStories: function () { return allStories; }
  };

  document.addEventListener('DOMContentLoaded', loadStories);
})();
