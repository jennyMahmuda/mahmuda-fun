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

  // Helper dynamic function to check and resolve image path or external URL
  function resolveImage(story) {
    if (!story) return '';
    let imgPath = story.cover || (story.images && story.images.length > 0 ? story.images[0] : '');
    
    if (!imgPath) return '';

    // If it's already an external absolute url, return it directly
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('data:image')) {
      return imgPath;
    }
    
    // Fallback normalization logic if hosted relative inside project structures
    if (imgPath.startsWith('/')) {
      return imgPath.substring(1);
    }
    return imgPath;
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
        type: s.type || 'text',
        series: s.series || null,
        episode: s.episode != null ? Number(s.episode) : null,
        audio: s.audio || null,
        video: s.video || null,
        images: s.images || [],
        cover: s.cover || null
      }, s);
    });

    // Sort by latest
    allStories.sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    renderFeed();
    if (typeof renderSeries === 'function') renderSeries();
    if (typeof renderFooterCats === 'function') renderFooterCats();
    if (typeof bindCategoryCards === 'function') bindCategoryCards();
    if (typeof openDeepLink === 'function') openDeepLink();
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderFeed() {
    if (!feedEl) return;
    var list = getFiltered();
    if (!list.length) {
      feedEl.innerHTML = '<div class="loading-state"><p>কোনো স্টোরি নেই। একটু পর আবার চেষ্টা করুন।</p></div>';
      if (feedEnd) feedEnd.hidden = true;
      return;
    }

    // Separate First Post (Hero) and Rest of the Posts
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

    var heroCover = resolveImage(heroStory);
    var heroCoverHtml = heroCover 
      ? '<div style="width: 100%; height: 350px; overflow: hidden; border-radius: 12px; margin-bottom: 20px;"><img src="' + escapeHtml(heroCover) + '" style="width: 100%; height: 100%; object-fit: cover;" alt="Hero Cover" onerror="this.style.display=\'none\'"></div>' 
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
        
        var coverImg = resolveImage(story);
        var coverHtml = (coverImg && !isExpanded) 
          ? '<div style="height: 160px; overflow: hidden; border-radius: 8px 8px 0 0; margin: -15px -15px 15px -15px;"><img src="' + escapeHtml(coverImg) + '" style="width: 100%; height: 100%; object-fit: cover;" alt="Cover" onerror="this.style.display=\'none\'"></div>' 
          : '';

        var bodyPlaceholder = isExpanded ? '<div class="feed-full-content" id="content-' + story.id + '" style="margin-top:15px;"><p style="color: #888;">লোড হচ্ছে...</p></div>' : '';
        var nextBtn = (isExpanded && story.nextEpisodeId) ? '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>' : '';

        var gridStyle = isExpanded ? 'grid-column: 1 / -1; transform: scale(1);' : 'display: flex; flex-direction: column;';

        return (
          '<article class="feed-card ' + (isExpanded ? 'expanded' : '') + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '" style="' + gridStyle + '">' +
            coverHtml +
            '<div class="feed-card-header">' +
              '<div class="feed-avatar">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author">Nights</div>' +
                '<div class="feed-time">' + escapeHtml(story.date || '') + '</div>' +
              '</div>' + badge +
            '</div>' +
            '<h2 class="feed-title">' + escapeHtml(story.title) + '</h2>' +
            (isExpanded ? '' : '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>') +
            bodyPlaceholder +
            '<div class="feed-actions">' +
              '<button class="read-more-btn">' + (isExpanded ? 'ছোট করে দেখুন ↑' : 'সবটুকু পড়ুন →') + '</button>' +
              nextBtn +          ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
          : '<span class="feed-type-badge">' + typeLabel(t) + '</span>';
        
        var coverImg = resolveImage(story);
        var coverHtml = (coverImg && !isExpanded) 
          ? '<div style="height: 160px; overflow: hidden; border-radius: 8px 8px 0 0; margin: -15px -15px 15px -15px;"><img src="' + escapeHtml(coverImg) + '" style="width: 100%; height: 100%; object-fit: cover;" alt="Cover" onerror="this.style.display=\'none\'"></div>' 
          : '';

        var bodyPlaceholder = isExpanded ? '<div class="feed-full-content" id="content-' + story.id + '" style="margin-top:15px;"><p style="color: #888;">লোড হচ্ছে...</p></div>' : '';
        var nextBtn = (isExpanded && story.nextEpisodeId) ? '<button class="inline-next" data-next="' + escapeHtml(story.nextEpisodeId) + '">পরের পর্ব →</button>' : '';

        var gridStyle = isExpanded ? 'grid-column: 1 / -1; transform: scale(1);' : 'display: flex; flex-direction: column;';

        return (
          '<article class="feed-card ' + (isExpanded ? 'expanded' : '') + '" data-id="' + escapeHtml(story.id) + '" id="story-' + escapeHtml(story.id) + '" style="' + gridStyle + '">' +
            coverHtml +
            '<div class="feed-card-header">' +
              '<div class="feed-avatar">N</div>' +
              '<div class="feed-meta">' +
                '<div class="feed-author">Nights</div>' +
                '<div class="feed-time">' + escapeHtml(story.date || '') + '</div>' +
              '</div>' + badge +
            '</div>' +
            '<h2 class="feed-title">' + escapeHtml(story.title) + '</h2>' +
            (isExpanded ? '' : '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>') +
            bodyPlaceholder +
            '<div class="feed-actions">' +
              '<button class="read-more-btn">' + (isExpanded ? 'ছোট করে দেখুন ↑' : 'সবটুকু পড়ুন →') + '</button>' +
              nextBtn +
            '</div>' +
          '</article>'
        );
      }).join('');
      
      html += '</div>';
    }

    feedEl.innerHTML = html;
    if (feedEnd) feedEnd.hidden = false;

    // Immediately trigger content load for the Featured Hero Post
    ensureContent(heroStory.id).then(content => {
      const targetEl = document.getElementById('content-' + heroStory.id);
      if (targetEl) targetEl.innerHTML = '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
    });

    // Re-trigger content load if any other card was already expanded
    if (expandedId) {
      ensureContent(expandedId).then(content => {
        const targetEl = document.getElementById('content-' + expandedId);
        if (targetEl) targetEl.innerHTML = '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
      });
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', loadStories);

  // Global handler setup for clicks inside feed
  if (feedEl) {
    feedEl.addEventListener('click', function (e) {
      const card = e.target.closest('.feed-card');
      if (!card) return;
      const id = card.getAttribute('data-id');

      if (e.target.classList.contains('read-more-btn')) {
        if (expandedId === id) {
          expandedId = null;
        } else {
          expandedId = id;
        }
        renderFeed();
        if (expandedId) {
          const element = document.getElementById('story-' + expandedId);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

})();

