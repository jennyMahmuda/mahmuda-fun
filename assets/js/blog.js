/**
 * Nights – Feed engine
 * Inline expand reading (no popup) · all stories from index.json
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

  async function loadStories() {
    try {
      const res = await fetch('stories/index.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allStories = Array.isArray(data) ? data : (data.stories || []);
      } else {
        allStories = [];
      }
    } catch (e) {
      allStories = [];
    }

    allStories = allStories.map(function (s) {
      return Object.assign({
        type: s.type || 'text',
        series: s.series || null,
        episode: s.episode != null ? Number(s.episode) : null,
        audio: s.audio || null,
        video: s.video || null,
        images: s.images || [],
        cover: s.cover || null
      }, s);
    });

    allStories.sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    renderFeed();
    renderSeries();
    openDeepLink();
  }

  function getFiltered() {
    if (currentFilter === 'all') return allStories;
    if (currentFilter === 'series') return allStories.filter(function (s) { return s.series; });
    return allStories.filter(function (s) { return (s.type || 'text') === currentFilter; });
  }

  function typeIcon(type) {
    if (type === 'video') return '▶';
    if (type === 'audio') return '♪';
    if (type === 'picture-audio') return '◈';
    return '✦';
  }

  function buildDecor(story) {
    var t = (story.type || 'text');
    var label = escapeHtml((story.category || 'Story').toUpperCase());
    return (
      '<div class="feed-decor feed-decor-' + t + '" aria-hidden="true">' +
        '<span class="feed-decor-icon">' + typeIcon(t) + '</span>' +
        '<span class="feed-decor-label">' + label + '</span>' +
      '</div>'
    );
  }

  function buildMediaInline(story) {
    var html = '';
    if (story.video) {
      html += '<div class="feed-media"><video controls preload="metadata" playsinline src="' +
        escapeHtml(story.video) + '"></video></div>';
    }
    if (story.audio) {
      html += '<div class="feed-media"><audio controls preload="metadata" src="' +
        escapeHtml(story.audio) + '"></audio></div>';
    }
    return html;
  }

  function findNextEpisode(story) {
    if (!story.series || story.episode == null) return null;
    var nextNum = Number(story.episode) + 1;
    return allStories.find(function (s) {
      return s.series === story.series && Number(s.episode) === nextNum;
    }) || null;
  }

  function renderFeed() {
    if (!feedEl) return;
    var list = getFiltered();

    if (!list.length) {
      feedEl.innerHTML = '<div class="loading-state"><p>কোনো স্টোরি নেই এই ফিল্টারে।</p></div>';
      if (feedEnd) feedEnd.hidden = true;
      return;
    }

    feedEl.innerHTML = list.map(function (story) {
      var typeLabel = (story.type || 'text').toUpperCase();
      var seriesBadge = story.series
        ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
        : '<span class="feed-type-badge">' + typeLabel + '</span>';

      var next = findNextEpisode(story);
      var nextHtml = '';
      if (next) {
        nextHtml =
          '<button type="button" class="inline-next" data-next="' + escapeHtml(next.id) + '">' +
          'পরের পর্ব → ' + escapeHtml(next.title) +
          '</button>';
      }

      var isOpen = expandedId === story.id;
      var openClass = isOpen ? ' expanded' : '';
      var btnLabel = isOpen ? '↑ সংক্ষেপ' : 'Read more →';

      return (
        '<article class="feed-card' + openClass + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '">' +
          '<div class="feed-card-header">' +
            '<div class="feed-avatar">N</div>' +
            '<div class="feed-meta">' +
              '<div class="feed-author">Nights</div>' +
              '<div class="feed-time">' + escapeHtml(story.date || '') + ' · ' + escapeHtml(story.readTime || '') + '</div>' +
            '</div>' +
            seriesBadge +
          '</div>' +
          buildDecor(story) +
          '<h3 class="feed-title">' + escapeHtml(story.title) + '</h3>' +
          '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>' +
          '<div class="feed-full-content">' +
            buildMediaInline(story) +
            '<div class="story-body">' + (story.content || '<p>শীঘ্রই আসছে…</p>') + '</div>' +
            nextHtml +
            '<div class="feed-extra-links">' +
              (story.type === 'video' ? '<a href="video.html">সব ভিডিও →</a>' : '') +
              '<a href="gallery.html">Gallery →</a>' +
            '</div>' +
          '</div>' +
          '<div class="feed-actions">' +
            '<button type="button" class="read-more-btn" data-id="' + escapeHtml(story.id) + '">' + btnLabel + '</button>' +
          '</div>' +
          '<div class="feed-tags">' +
            (story.tags || []).map(function (t) {
              return '<span class="feed-tag">#' + escapeHtml(t) + '</span>';
            }).join('') +
            (story.category ? '<span class="feed-tag">#' + escapeHtml(story.category) + '</span>' : '') +
          '</div>' +
        '</article>'
      );
    }).join('');

    feedEl.querySelectorAll('.read-more-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleExpand(btn.dataset.id);
      });
    });

    feedEl.querySelectorAll('.feed-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.read-more-btn')) return;
        if (e.target.closest('a')) return;
        if (e.target.closest('audio')) return;
        if (e.target.closest('video')) return;
        if (e.target.closest('.inline-next')) return;
        if (!card.classList.contains('expanded')) {
          toggleExpand(card.dataset.id);
        }
      });
    });

    feedEl.querySelectorAll('.inline-next').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var nid = btn.getAttribute('data-next');
        if (nid) {
          toggleExpand(nid);
          var el = document.getElementById('story-' + nid);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    if (feedEnd) feedEnd.hidden = false;
    if (window.NightsAds) window.NightsAds.onFeedRendered(feedEl);
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
      if (el) {
        setTimeout(function () {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      try {
        history.replaceState(null, '', '?story=' + encodeURIComponent(expandedId));
      } catch (e) {}
    } else {
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch (e) {}
    }
  }

  function openDeepLink() {
    try {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('story');
      if (!id) return;
      var match = allStories.find(function (s) {
        return s.id === id || s.slug === id;
      });
      if (match) {
        expandedId = match.id;
        renderFeed();
        setTimeout(function () {
          var el = document.getElementById('story-' + match.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    } catch (e) {}
  }

  function renderSeries() {
    if (!seriesGrid) return;
    var map = {};
    allStories.forEach(function (s) {
      if (!s.series) return;
      if (!map[s.series]) map[s.series] = { title: s.series, episodes: [], category: s.category };
      map[s.series].episodes.push(s);
    });
    var seriesList = Object.keys(map).map(function (k) {
      var s = map[k];
      s.episodes.sort(function (a, b) { return (a.episode || 0) - (b.episode || 0); });
      return s;
    });
    if (!seriesList.length) {
      seriesGrid.innerHTML = '<p style="color:var(--text-muted);text-align:center">এখনো কোনো সিরিজ নেই।</p>';
      return;
    }
    seriesGrid.innerHTML = seriesList.map(function (s) {
      var first = s.episodes[0];
      return (
        '<div class="series-card" data-first="' + escapeHtml(first ? first.id : '') + '">' +
          '<h3>' + escapeHtml(s.title) + '</h3>' +
          '<div class="ep-count">' + s.episodes.length + ' episode' + (s.episodes.length > 1 ? 's' : '') + '</div>' +
          '<p>' + escapeHtml(s.category || '') + ' · Ep 1 থেকে পড়ুন</p>' +
        '</div>'
      );
    }).join('');

    seriesGrid.querySelectorAll('.series-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-first');
        if (!id) return;
        currentFilter = 'all';
        if (feedFilters) {
          feedFilters.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
          var allBtn = feedFilters.querySelector('[data-filter="all"]');
          if (allBtn) allBtn.classList.add('active');
        }
        expandedId = id;
        renderFeed();
        setTimeout(function () {
          var el = document.getElementById('story-' + id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      });
    });
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
