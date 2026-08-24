(function () {
  'use strict';
  var videoGrid = document.getElementById('videoGrid');
  var galleryGrid = document.getElementById('galleryGrid') || document.getElementById('galleryMadam');
  if (!videoGrid && !galleryGrid) return;

  var base = window.location.pathname.indexOf('/video/') !== -1 || window.location.pathname.indexOf('/gellery/') !== -1 ? '../' : '';
  var stories = [];
  var esc = function (value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); };
  var mediaUrl = function (value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.indexOf('data:') === 0) return value;
    return base + String(value).replace(/^\//, '');
  };
  var storyImage = function (story) { return mediaUrl(story.cover || (story.images && story.images[0])); };
  var categoryKey = function (value) { return String(value || 'Uncategorized').trim().toLowerCase(); };

  function renderCard(story, kind) {
    var image = storyImage(story);
    var video = story.video ? mediaUrl(story.video) : '';
    var visual = kind === 'video' && video
      ? '<video muted playsinline preload="metadata" poster="' + esc(image) + '"><source src="' + esc(video) + '"></video>'
      : (image ? '<img src="' + esc(image) + '" alt="' + esc(story.title) + ' — ' + esc(story.excerpt || story.description || '') + '" loading="lazy" decoding="async" onerror="this.remove()">' : '<div class="media-empty">Nights</div>');
    return '<article class="media-pin" data-category="' + esc(categoryKey(story.category)) + '">' +
      '<a href="' + base + 'story/' + encodeURIComponent(story.id) + '/" class="media-pin-link">' +
      '<div class="media-pin-visual">' + visual + '<span class="media-pin-type">' + (kind === 'video' ? '▶ Video' : '▧ Image') + '</span></div>' +
      '<div class="media-pin-copy"><span class="media-pin-category">' + esc(story.category || 'Story') + '</span><h3>' + esc(story.title) + '</h3><p>' + esc(story.excerpt || story.description || '') + '</p></div>' +
      '</a></article>';
  }

  function render(target, list, kind) {
    if (!target) return;
    if (!list.length) { target.innerHTML = '<p class="loading-state">এই category-তে এখনো কোনো media নেই।</p>'; return; }
    target.innerHTML = list.map(function (story) { return renderCard(story, kind); }).join('');
  }

  fetch(base + 'stories/index.json', { cache: 'no-store' }).then(function (res) { return res.json(); }).then(function (data) {
    stories = Array.isArray(data) ? data : (data.stories || []);
    var kind = videoGrid ? 'video' : 'gallery';
    // Primarily keyed off the `type` frontmatter field (video/image — see
    // guideline.md), which is what a post is actually meant to be
    // filed under. Falls back to "has the relevant media field" for a
    // story that has a video/cover but its author forgot to set `type`
    // — same forgiving-by-default pattern used elsewhere on this site
    // rather than hiding content over a missed field.
    var list = stories.filter(function (story) {
      if (kind === 'video') return story.type === 'video' || !!story.video;
      return story.type === 'image' || (story.type !== 'text' && story.type !== 'video' && !!(story.cover || (story.images && story.images.length)));
    });
    render(videoGrid || galleryGrid, list, kind);
    var categories = Array.from(new Set(list.map(function (story) { return story.category || 'Uncategorized'; })));
    var heading = document.querySelector('.section-header');
    if (heading && categories.length) {
      var filter = document.createElement('div');
      filter.className = 'media-category-filter';
      filter.innerHTML = '<button class="media-filter active" data-category="all">All</button>' + categories.map(function (cat) { return '<button class="media-filter" data-category="' + esc(categoryKey(cat)) + '">' + esc(cat) + '</button>'; }).join('');
      heading.appendChild(filter);
      filter.addEventListener('click', function (event) {
        var button = event.target.closest('.media-filter');
        if (!button) return;
        filter.querySelectorAll('.media-filter').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
        var key = button.getAttribute('data-category');
        render(videoGrid || galleryGrid, key === 'all' ? list : list.filter(function (story) { return categoryKey(story.category) === key; }), kind);
      });
    }
  }).catch(function () {
    if (videoGrid || galleryGrid) (videoGrid || galleryGrid).innerHTML = '<p class="loading-state">Media লোড করা যায়নি।</p>';
  });
})();
