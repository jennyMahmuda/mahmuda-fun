/**
 * Nights – Feed + Media + Series Engine
 * X-style scrolling feed, Read More, Audio/Video, Episode linking
 */
(function () {
  'use strict';

  const feedEl = document.getElementById('storyFeed');
  const seriesGrid = document.getElementById('seriesGrid');
  const readerModal = document.getElementById('readerModal');
  const readerContent = document.getElementById('readerContent');
  const readerClose = document.getElementById('readerClose');
  const readerBackdrop = document.getElementById('readerBackdrop');
  const feedFilters = document.getElementById('feedFilters');
  const feedEnd = document.getElementById('feedEnd');

  let allStories = [];
  let currentFilter = 'all';

  const SAMPLE = [
    {
      id: 'bristir-rate-ep1',
      title: 'বৃষ্টির রাতে – পর্ব ১',
      slug: 'bristir-rate-ep1',
      excerpt: 'এক নিঃশব্দ দুপুরে বাড়িতে শুধু তারা দুজন। একটা অপ্রত্যাশিত চুমু থেকে শুরু হয় গভীর, রোমান্টিক ও উত্তপ্ত এক রাত।',
      category: 'Forbidden',
      tags: ['Romance', 'Fantasy', 'Intimate'],
      type: 'text',
      series: 'Bhabhi Devar Rain',
      episode: 1,
      cover: null, audio: null, video: null, images: [],
      date: '2026-08-01', readTime: '8 min', language: 'bn',
      content: '<p>আকাশ ভরা মেঘ। দুপুরের রোদ নরম হয়ে এসেছে। বাড়িতে কেউ নেই। শুধু সে।</p><p>রিয়া। তার দেবরের বউ। সুন্দর, শান্ত, আর চোখে একটা গভীর নীরবতা।</p><p>হঠাৎ দরজার শব্দ। আদিত্য দাঁড়িয়ে। চোখে অন্য রকমের উত্তাপ।</p><p>দুজনের চোখ মিলল। সময় থেমে গেল।</p><p>রিয়া ধীরে এগিয়ে গেল। আদিত্যও এক পা এগিয়ে এল।</p><p>“তুমি… একা?” আদিত্যের গলা ভাঙা ভাঙা।</p><p>রিয়া মাথা নেড়ে হ্যাঁ বলল। “হ্যাঁ… একা।”</p><p>আদিত্যের হাত তার কোমরে। প্রথম চুমুটা অত্যন্ত নরম। দ্বিতীয় চুমুতেই সব বাঁধন খুলে গেল।</p><p>আর তারপর শুরু হল এক নিষিদ্ধ, মিষ্টি ফ্যান্টাসি…</p>'
    },
    {
      id: 'bristir-rate-ep2',
      title: 'বৃষ্টির রাতে – পর্ব ২',
      slug: 'bristir-rate-ep2',
      excerpt: 'পরের দিন সকাল। রিয়া একা নয়। আদিত্যের চোখে এখন আর লুকানো নেই।',
      category: 'Forbidden',
      tags: ['Romance', 'Intimate'],
      type: 'text',
      series: 'Bhabhi Devar Rain',
      episode: 2,
      cover: null, audio: null, video: null, images: [],
      date: '2026-08-02', readTime: '7 min', language: 'bn',
      content: '<p>সকালের আলো জানালা দিয়ে ঢুকছে। রিয়া চোখ খুলল। পাশে আদিত্য।</p><p>কোনো কথা নেই। শুধু চোখের ভাষা।</p><p>সে তার বুকে মাথা রাখল। আদিত্যের হাত তার চুলে।</p><p>“আজ আর কেউ নেই…” রিয়া ফিসফিস করল।</p><p>আদিত্য তাকে আরও কাছে টেনে নিল। আবার শুরু হল…</p>'
    },
    {
      id: 'midnight-audio',
      title: 'Midnight Whisper (Audio)',
      slug: 'midnight-whisper',
      excerpt: 'Close your eyes. Let the voice take you. Soft, dark, intimate.',
      category: 'Intimate',
      tags: ['Audio', 'Sensual'],
      type: 'audio',
      series: null, episode: null,
      cover: null, audio: null, video: null, images: [],
      date: '2026-07-28', readTime: '6 min', language: 'en',
      content: '<p>She whispered against his ear. The city was far away. Only the sound of rain and her breath remained.</p><p>Listen. Feel. Fall.</p>'
    },
    {
      id: 'silk-shadow',
      title: 'Silk & Shadow',
      slug: 'silk-and-shadow',
      excerpt: 'A chance meeting in a dim hotel corridor. One shared elevator.',
      category: 'Fantasy',
      tags: ['Strangers', 'Intense'],
      type: 'text',
      series: null, episode: null,
      cover: null, audio: null, video: null, images: [],
      date: '2026-07-20', readTime: '7 min', language: 'en',
      content: '<p>She almost didn’t take the elevator. The doors were already closing when a hand stopped them.</p><p>He stepped in. Tall. Dark coat. Eyes that held too much quiet intensity.</p><p>“Wrong floor?” she asked.</p><p>“No,” he said. “Right moment.”</p>'
    }
  ];

  async function loadStories() {
    try {
      const res = await fetch('stories/index.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allStories = Array.isArray(data) ? data : (data.stories || []);
      } else allStories = SAMPLE;
    } catch { allStories = SAMPLE; }
    allStories = allStories.map(s => ({
      type: s.type || 'text',
      series: s.series || null,
      episode: s.episode != null ? Number(s.episode) : null,
      audio: s.audio || null,
      video: s.video || null,
      images: s.images || [],
      ...s
    }));
    renderFeed();
    renderSeries();
  }

  function getFiltered() {
    if (currentFilter === 'all') return allStories;
    if (currentFilter === 'series') return allStories.filter(s => s.series);
    return allStories.filter(s => (s.type || 'text') === currentFilter);
  }

  function renderFeed() {
    if (!feedEl) return;
    const list = getFiltered();
    if (!list.length) {
      feedEl.innerHTML = '<div class="loading-state"><p>No stories in this filter.</p></div>';
      if (feedEnd) feedEnd.hidden = true;
      return;
    }
    feedEl.innerHTML = list.map(story => {
      const mediaHtml = buildMediaPreview(story);
      const typeLabel = (story.type || 'text').toUpperCase();
      const seriesBadge = story.series
        ? '<span class="feed-type-badge">' + escapeHtml(story.series) + ' · Ep ' + (story.episode || '?') + '</span>'
        : '<span class="feed-type-badge">' + typeLabel + '</span>';
      return '<article class="feed-card" data-id="' + story.id + '">' +
        '<div class="feed-card-header"><div class="feed-avatar">N</div>' +
        '<div class="feed-meta"><div class="feed-author">Nights</div>' +
        '<div class="feed-time">' + (story.date || '') + ' · ' + (story.readTime || '') + '</div></div>' +
        seriesBadge + '</div>' +
        '<h3 class="feed-title">' + escapeHtml(story.title) + '</h3>' +
        '<p class="feed-excerpt">' + escapeHtml(story.excerpt || '') + '</p>' +
        '<div class="feed-full-content">' + (story.content || '') + '</div>' +
        mediaHtml +
        '<div class="feed-actions"><button class="read-more-btn" data-id="' + story.id + '">Read more →</button></div>' +
        '<div class="feed-tags">' +
        (story.tags || []).map(t => '<span class="feed-tag"><a href="#" data-cat="' + escapeHtml(t) + '">#' + escapeHtml(t) + '</a></span>').join('') +
        (story.category ? '<span class="feed-tag"><a href="#" data-cat="' + escapeHtml(story.category) + '">#' + escapeHtml(story.category) + '</a></span>' : '') +
        '</div></article>';
    }).join('');

    feedEl.querySelectorAll('.read-more-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openReader(btn.dataset.id); });
    });
    feedEl.querySelectorAll('.feed-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.read-more-btn') || e.target.closest('a') || e.target.closest('audio') || e.target.closest('video')) return;
        openReader(card.dataset.id);
      });
    });
    if (feedEnd) feedEnd.hidden = false;
  }

  function buildMediaPreview(story) {
    if (story.video) return '<div class="feed-media"><video controls preload="metadata" src="' + escapeHtml(story.video) + '"></video></div>';
    if (story.audio) return '<div class="feed-media"><audio controls preload="metadata" src="' + escapeHtml(story.audio) + '"></audio></div>';
    if (story.images && story.images.length) return '<div class="feed-media"><img src="' + escapeHtml(story.images[0]) + '" alt="" loading="lazy" /></div>';
    if (story.cover) return '<div class="feed-media"><img src="' + escapeHtml(story.cover) + '" alt="" loading="lazy" /></div>';
    return '';
  }

  function buildMediaFull(story) {
    let html = '';
    if (story.video) html += '<div class="reader-media"><video controls src="' + escapeHtml(story.video) + '"></video></div>';
    if (story.audio) html += '<div class="reader-media"><audio controls src="' + escapeHtml(story.audio) + '"></audio></div>';
    if (story.images && story.images.length) story.images.forEach(img => { html += '<div class="reader-media"><img src="' + escapeHtml(img) + '" alt="" /></div>'; });
    else if (story.cover) html += '<div class="reader-media"><img src="' + escapeHtml(story.cover) + '" alt="" /></div>';
    return html;
  }

  function findNextEpisode(story) {
    if (!story.series || story.episode == null) return null;
    const nextNum = Number(story.episode) + 1;
    return allStories.find(s => s.series === story.series && Number(s.episode) === nextNum) || null;
  }

  function getRelated(story, limit) {
    limit = limit || 4;
    return allStories.filter(s => s.id !== story.id && (
      s.category === story.category ||
      (story.tags || []).some(t => (s.tags || []).includes(t)) ||
      (story.series && s.series === story.series)
    )).slice(0, limit);
  }

  function openReader(id) {
    const story = allStories.find(s => s.id === id);
    if (!story || !readerModal || !readerContent) return;
    const next = findNextEpisode(story);
    const related = getRelated(story);
    let nextHtml = '';
    if (next) {
      nextHtml = '<a href="#" class="next-episode" data-id="' + next.id + '">' +
        '<span>Next Episode → ' + escapeHtml(next.title) + '</span><span class="arrow">→</span></a>';
    }
    let relatedHtml = '';
    if (related.length || story.category) {
      relatedHtml = '<div class="related-section"><h3>Related</h3><div class="related-cats">' +
        (story.category ? '<a href="#" class="related-cat" data-cat="' + escapeHtml(story.category) + '">#' + escapeHtml(story.category) + '</a>' : '') +
        (story.tags || []).map(t => '<a href="#" class="related-cat" data-cat="' + escapeHtml(t) + '">#' + escapeHtml(t) + '</a>').join('') +
        '</div><div class="related-stories">' +
        related.map(r => '<div class="related-item" data-id="' + r.id + '"><strong>' + escapeHtml(r.title) + '</strong><span>' + (r.category || '') + ' · ' + (r.readTime || '') + '</span></div>').join('') +
        '</div></div>';
    }
    readerContent.innerHTML =
      '<h1>' + escapeHtml(story.title) + '</h1>' +
      '<div class="reader-meta"><span>' + escapeHtml(story.category || '') + '</span><span>•</span><span>' + (story.readTime || '') + '</span><span>•</span><span>' + (story.date || '') + '</span>' +
      (story.series ? '<span>• Series: ' + escapeHtml(story.series) + ' Ep ' + story.episode + '</span>' : '') + '</div>' +
      buildMediaFull(story) +
      '<div class="reader-body">' + (story.content || '<p>Content coming soon.</p>') + '</div>' +
      nextHtml + relatedHtml;

    readerContent.querySelectorAll('.next-episode, .related-item').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); if (el.dataset.id) openReader(el.dataset.id); });
    });
    readerModal.classList.add('open');
    readerModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeReader() {
    if (!readerModal) return;
    readerModal.classList.remove('open');
    readerModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderSeries() {
    if (!seriesGrid) return;
    const map = {};
    allStories.forEach(s => {
      if (!s.series) return;
      if (!map[s.series]) map[s.series] = { title: s.series, episodes: [], category: s.category };
      map[s.series].episodes.push(s);
    });
    const seriesList = Object.values(map).map(s => {
      s.episodes.sort((a, b) => (a.episode || 0) - (b.episode || 0));
      return s;
    });
    if (!seriesList.length) {
      seriesGrid.innerHTML = '<p style="color:var(--text-muted);text-align:center">No series yet.</p>';
      return;
    }
    seriesGrid.innerHTML = seriesList.map(s =>
      '<div class="series-card" data-series="' + escapeHtml(s.title) + '">' +
      '<h3>' + escapeHtml(s.title) + '</h3>' +
      '<div class="ep-count">' + s.episodes.length + ' episode' + (s.episodes.length > 1 ? 's' : '') + '</div>' +
      '<p>' + escapeHtml(s.category || '') + ' · Start from Ep 1</p></div>'
    ).join('');
    seriesGrid.querySelectorAll('.series-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.series;
        const first = allStories.filter(s => s.series === name).sort((a, b) => (a.episode || 0) - (b.episode || 0))[0];
        if (first) openReader(first.id);
      });
    });
  }

  if (feedFilters) {
    feedFilters.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        feedFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFeed();
      });
    });
  }

  if (readerClose) readerClose.addEventListener('click', closeReader);
  if (readerBackdrop) readerBackdrop.addEventListener('click', closeReader);

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  window.NightsBlog = { loadStories, openReader, closeReader, getStories: function () { return allStories; } };
  document.addEventListener('DOMContentLoaded', loadStories);
})();
