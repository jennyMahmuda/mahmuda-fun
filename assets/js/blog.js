/**
 * Nights – Feed (Redesigned)
 * - First story shows FULL content as Hero Post.
 * - Rest of the stories show in a Grid (Image, Title, Excerpt).
 * - "Read More" button expands grid items to full story.
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

    // Sort by latest
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

    // 1. Separate First Post (Hero) and Rest of the Posts
    var heroStory = list[0];
    var otherStories = list.slice(1);

    var html = '';

    // ==========================================
    // HERO POST (Always fully expanded)
    // ==========================================
    var heroType = heroStory.type || 'text';
    var heroBadge = heroStory.series
      ? '<span class="feed-type-badge">' + escapeHtml(heroStory.series) + ' · Ep ' + (heroStory.episode || '?') + '</span>'
      : '<span class="feed-type-badge">' + typeLabel(heroType) + '</span>';

    var heroCover = heroStory.cover || (heroStory.images && heroStory.images[0]);
    var heroCoverHtml = heroCover 
      ? '<div style="width: 100%; height: 350px; overflow: hidden; border-radius: 12px; margin-bottom: 20px;"><img src="' + escapeHtml(heroCover) + '" style="width: 100%; height: 100%; object-fit: cover;" alt="Hero Cover"></div>' 
      : '';

    html += '<div class="hero-section" style="margin-bottom: 50px; border-bottom: 2px solid var(--border-color, #e0e0e0); padding-bottom: 30px;">';
    html += '<article class="feed-card expanded" data-id="' + escapeHtml(heroStory.id) + '" id="story-' + escapeHtml(heroStory.id) + '" style="border: none; padding: 0; box-shadow: none;">';
    html += heroCoverHtml;
    
    html += '<div class="feed-card-header">' +
              '<div class="feed-avatar">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author">Nights (Featured)</div>' +
                '<div class="feed-time">' + escapeHtml(heroStory.date || '') + ' · ' + escapeHtml(heroStory.readTime || '') + '</div>' +
              '</div>' + heroBadge +
            '</div>';
            
    html += '<h1 class="feed-title" style="font-size: 2.2em; margin-bottom: 15px; line-height: 1.3;">' + escapeHtml(heroStory.title) + '</h1>';
    
    // Injecting full content for Hero Post
    html += '<div class="feed-full-content" id="content-' + heroStory.id + '"><p style="color: #888;">ফুল স্টোরি লোড হচ্ছে...</p></div>';
    
    if (heroStory.nextEpisodeId) {
      html += '<div class="feed-actions"><button class="inline-next" data-next="' + escapeHtml(heroStory.nextEpisodeId) + '">পরের পর্ব →</button></div>';
    }
    
    html += '<div class="feed-tags">' +
              (heroStory.tags || []).map(function (tg) { return '<span class="feed-tag">#' + escapeHtml(tg) + '</span>'; }).join('') +
            '</div>';
    html += '</article></div>';

    // ==========================================
    // OTHER POSTS (Grid Layout)
    // ==========================================
    if (otherStories.length > 0) {
      html += '<div class="regular-stories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">';
      
      html += otherStories.map(function(story) {
        var t = story.type || 'text';
        var isExpanded = expandedId === story.id;
        
        var badge = story.series
          ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
          : '<span class="feed-type-badge">' + typeLabel(t) + '</span>';
        
        var coverImg = story.cover || (story.images && story.images[0]);
        var coverHtml = (coverImg && !isExpanded) 
          ? '<div style="height: 160px; overflow: hidden; border-radius: 8px 8px 0 0; margin: -15px -15px 15px -15px;"><img src="' + escapeHtml(coverImg) + '" style="width: 100%; height: 100%; object-fit: cover;" alt="Cover"></div>' 
          : '';

        var bodyPlaceholder = isExpanded ? '<div class="feed-full-content" id="content-' + story.id + '" style="margin-top:15px;"><p style="color: #888;">লোড হচ্ছে...</p></div>' : '';
        var nextBtn = (isExpanded && story.nextEpisodeId) ? '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>' : '';

        // If expanded, it takes full width of the grid row
        var gridStyle = isExpanded ? 'grid-column: 1 / -1; transform: scale(1);' : 'display: flex; flex-direction: column;';

        return (
          '<article class="feed-card ' + (isExpanded ? 'expanded' : '') + '" style="border: 1px solid var(--border-color, #e0e0e0); border-radius: 8px; padding: 15px; ' + gridStyle + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '">' +
            coverHtml +
            '<div class="feed-card-header">' +
              '<div class="feed-avatar" style="width:30px;height:30px;">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author" style="font-size:0.9em;">Nights</div>' +
                '<div class="feed-time" style="font-size:0.8em;">' + escapeHtml(story.date || '') + '</div>' +
              '</div>' + badge +
            '</div>' +
            '<h3 class="feed-title" style="margin: 10px 0; font-size: 1.2em;">' + escapeHtml(story.title) + '</h3>' +
            (!isExpanded ? '<p class="feed-excerpt" style="flex-grow: 1; font-size:0.9em; color: var(--text-muted, #666);">' + escapeHtml(story.excerpt || '') + '</p>' : '') +
            bodyPlaceholder +
            '<div class="feed-actions" style="margin-top: auto; padding-top:15px;">' +
              '<button class="read-more-btn" style="width: 100%; text-align: center;">' + (isExpanded ? 'বন্ধ করুন' : 'আরও পড়ুন') + '</button>' +
              nextBtn +
            '</div>' +
          '</article>'
        );
      }).join('');
      
      html += '</div>';
    }

    feedEl.innerHTML = html;

    // Attach Listeners
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
        if (nid) {
            expandedId = nid;
            renderFeed();
            var el = document.getElementById('story-' + nid);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Load FULL HTML content asynchronously for Hero Post
    ensureContent(heroStory.id).then(function(html) {
      var el = document.getElementById('content-' + heroStory.id);
      if (el) el.innerHTML = html || '<p>কনটেন্ট পাওয়া যায়নি।</p>';
    });

    // Load FULL HTML content asynchronously for Expanded Grid Posts
    if (expandedId && expandedId !== heroStory.id) {
      ensureContent(expandedId).then(function (html) {
        var el = document.getElementById('content-' + expandedId);
        if (el) el.innerHTML = html || '<p>কনটেন্ট পাওয়া যায়নি।</p>';
      });
    }

    if (feedEnd) feedEnd.hidden = false;
    if (window.NightsAds) window.NightsAds.onFeedRendered(feedEl);
  }

  function toggleExpand(id) {
    if (expandedId === id) {
      expandedId = null; // Close if already open
    } else {
      expandedId = id; // Open the clicked one
    }
    renderFeed();
    if (expandedId) {
      var el = document.getElementById('story-' + expandedId);
      // Wait slightly for DOM to render, then scroll to the expanded story
      setTimeout(function() {
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
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