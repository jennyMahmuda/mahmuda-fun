/* Shared admin pipeline helpers for mahmuda.fun. No credentials live here. */
(function () {
  'use strict';
  var CATEGORIES = [
    ['dark-romance','Dark Romance'],['mafia-romance','Mafia Romance'],['paranormal-fantasy-romance','Paranormal & Fantasy Romance'],['billionaire-romance','Billionaire Romance'],['alpha-males','Alpha Males'],['high-school-romance','High School Romance'],['spicy-romance','Spicy Romance'],['age-gap-romance','Age Gap Romance'],['vampire-romance','Vampire Romance'],['cowboy-romance','Cowboy Romance'],['forbidden-romance','Forbidden Romance'],['second-chance-romance','Second Chance Romance'],['clean-wholesome','Clean & Wholesome'],['fated-mates','Fated Mates'],['comedy','Comedy'],['bad-boys','Bad Boys'],['slow-burn','Slow Burn'],['enemies-to-lovers','Enemies to Lovers'],['sports','Sports'],['college','College'],['bhabi-romance','Bhabi Romance'],['affair-romance','Affair & Cheating Romance']
  ];
  var byLabel = {};
  CATEGORIES.forEach(function (item) { byLabel[item[1].toLowerCase()] = item; });
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function canonicalCategory(value) {
    var raw = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
    if (byLabel[raw]) return byLabel[raw];
    for (var i = 0; i < CATEGORIES.length; i++) {
      var label = CATEGORIES[i][1].toLowerCase();
      if (label === raw || label.replace(' romance','') === raw || raw.indexOf(label) !== -1 || label.indexOf(raw) !== -1) return CATEGORIES[i];
    }
    return null;
  }
  function enhanceEditor() {
    var form = document.getElementById('storyForm');
    if (!form || form.dataset.pipelineEnhanced === 'true') return;
    form.dataset.pipelineEnhanced = 'true';
    var category = form.querySelector('[name="category"]');
    if (category && category.tagName === 'INPUT') {
      var select = document.createElement('select');
      select.name = 'category'; select.id = category.id || 'storyCategory'; select.required = true;
      select.innerHTML = '<option value="">Select canonical destination…</option>' + CATEGORIES.map(function (item) { return '<option value="' + esc(item[1]) + '">' + esc(item[1]) + '</option>'; }).join('');
      var existing = canonicalCategory(category.value); if (existing) select.value = existing[1];
      category.parentNode.replaceChild(select, category); category = select;
    }
    var field = document.createElement('div'); field.className = 'admin-pipeline-panel';
    field.innerHTML = '<div class="admin-pipeline-kicker">Publishing pipeline</div><strong id="pipelineDestination">Choose a category to see the live destination</strong><span id="pipelineRoute">No route selected</span><p>Saving this story will use the selected canonical category. The live route is shown here to prevent accidental misfiling.</p>';
    form.insertBefore(field, form.querySelector('.admin-actions'));
    var seo = document.createElement('aside'); seo.className = 'admin-seo-preview'; seo.innerHTML = '<div class="admin-pipeline-kicker">SEO live preview</div><div class="seo-preview-title" id="seoPreviewTitle">Story title preview</div><div class="seo-preview-url" id="seoPreviewUrl">mahmuda.fun/story.html</div><div class="seo-preview-description" id="seoPreviewDescription">Your excerpt will appear here as the search description.</div>';
    form.parentNode.insertBefore(seo, form);
    var title = form.querySelector('[name="title"]'), excerpt = form.querySelector('[name="excerpt"]'), id = form.querySelector('[name="id"]');
    function update() {
      var cat = canonicalCategory(category && category.value); var slug = id && id.value.trim();
      var dest = document.getElementById('pipelineDestination'), route = document.getElementById('pipelineRoute');
      if (dest) dest.textContent = cat ? 'This story will publish under ' + cat[1] : 'Choose a category to see the live destination';
      if (route) route.textContent = cat ? '/category/' + cat[0] + '/' : 'No route selected';
      var pt = document.getElementById('seoPreviewTitle'), pu = document.getElementById('seoPreviewUrl'), pd = document.getElementById('seoPreviewDescription');
      if (pt) pt.textContent = (title && title.value.trim()) || 'Story title preview';
      if (pu) pu.textContent = 'mahmuda.fun/' + (slug || 'story.html');
      if (pd) pd.textContent = (excerpt && excerpt.value.trim()) || 'Your excerpt will appear here as the search description.';
    }
    [category, title, excerpt, id].forEach(function (el) { if (el) el.addEventListener('input', update); });
    update();
  }
  window.MahmudaAdminPipeline = { categories: CATEGORIES, canonicalCategory: canonicalCategory, enhanceEditor: enhanceEditor };
  function boot() { enhanceEditor(); window.setTimeout(enhanceEditor, 50); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
