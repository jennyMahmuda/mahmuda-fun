/**
 * Nights – Blog / Story Engine
 * Loads stories from JSON, renders cards & reader modal
 */

(function () {
  'use strict';

  const storyGrid = document.getElementById('storyGrid');
  const readerModal = document.getElementById('readerModal');
  const readerContent = document.getElementById('readerContent');
  const readerClose = document.getElementById('readerClose');
  const readerBackdrop = document.getElementById('readerBackdrop');

  // Fallback sample stories (used when no stories/index.json exists)
  const SAMPLE_STORIES = [
    {
      id: "bhabhi-devar-rain",
      title: "বৃষ্টির রাতে – এক নিষিদ্ধ ফ্যান্টাসি",
      slug: "bristir-rate",
      excerpt: "এক নিঃশব্দ দুপুরে বাড়িতে শুধু তারা দুজন। একটা অপ্রত্যাশিত চুমু থেকে শুরু হয় গভীর, রোমান্টিক ও উত্তপ্ত এক রাত।",
      category: "Forbidden",
      tags: ["Romance", "Fantasy", "Intimate"],
      cover: null,
      date: "2026-08-01",
      readTime: "8 min",
      language: "bn",
      content: `
        <p>আকাশ ভরা মেঘ। দুপুরের রোদ নরম হয়ে এসেছে। বাড়িতে কেউ নেই। শুধু সে।</p>
        <p>রিয়া। তার দেবরের বউ। সুন্দর, শান্ত, আর চোখে একটা গভীর নীরবতা। আজ তার শাড়ির আঁচল একটু ঢিলা, চুল খোলা, আর গলায় হালকা গোলাপের সুবাস।</p>
        <p>হঠাৎ দরজার শব্দ। আদিত্য দাঁড়িয়ে। চোখে অন্য রকমের উত্তাপ।</p>
        <p>দুজনের চোখ মিলল। সময় থেমে গেল।</p>
        <p>রিয়া ধীরে এগিয়ে গেল। আদিত্যও এক পা এগিয়ে এল। বাতাসে একটা অদ্ভুত মিষ্টি টান।</p>
        <p>“তুমি… একা?” আদিত্যের গলা ভাঙা ভাঙা।</p>
        <p>রিয়া মাথা নেড়ে হ্যাঁ বলল। তার ঠোঁট কেঁপে উঠল। “হ্যাঁ… একা।”</p>
        <p>আর তারপর আর কোনো কথা লাগল না।</p>
        <p>আদিত্যের হাত তার কোমরে। রিয়ার শরীর কেঁপে উঠল। প্রথম চুমুটা অত্যন্ত নরম। দ্বিতীয় চুমুতেই সব বাঁধন খুলে গেল।</p>
        <p>শাড়ির আঁচল সরে গেল। গলায় আদিত্যের ঠোঁট। নরম চুমু, তারপর হালকা কামড়। রিয়া একটা দীর্ঘশ্বাস ফেলল।</p>
        <p>“আদিত্য…”</p>
        <p>“বলো না থামতে… আজ শুধু তুমি আর আমি। কোনো বাস্তব নেই… শুধু এই মুহূর্ত।”</p>
        <p>রিয়া তার চোখের দিকে তাকাল। সেখানে শুধু ভালোবাসা, লোভ, আর একটা গভীর ক্ষুধা। সে নিজে থেকেই তার ঠোঁট আদিত্যের ঠোঁটে চেপে ধরল।</p>
        <p>আদিত্য তাকে তুলে নিয়ে শোবার ঘরে নিয়ে গেল। বিছানায় শুইয়ে ধীরে ধীরে তার শাড়ি খুলতে লাগল। প্রতিটা ইঞ্চি চুমু দিয়ে, প্রতিটা স্পর্শ যেন প্রার্থনা।</p>
        <p>রিয়ার শরীর কাঁপছিল। তার বুকের ওপর আদিত্যের হাত, তারপর ঠোঁট। স্তনের ডগায় জিভের নরম চাপ।</p>
        <p>“আরও…” সে ফিসফিস করল।</p>
        <p>আদিত্য তার পেট চুমু দিয়ে নামতে লাগল। যখন তার জিভ প্রথমবার স্পর্শ করল সেই গোপন জায়গায়, রিয়ার কোমর উঠে গেল। আদিত্য ধীরে ধীরে, গভীরভাবে চুষতে লাগল।</p>
        <p>তারপর আদিত্য উঠে এল। রিয়া নিজে থেকেই তার প্যান্ট খুলে দিল। আদিত্যের শক্ত লিঙ্গ তার হাতে এল।</p>
        <p>রিয়া তাকে টেনে নিল। দুজনের শরীর মিলল। আদিত্য ধীরে ধীরে ভিতরে ঢুকল। রিয়ার চোখ বড় হয়ে গেল। ব্যথা আর আনন্দ একসঙ্গে।</p>
        <p>ধীর, গভীর, রোমান্টিক চাপ। প্রতিটা ধাক্কায় রিয়ার নখ তার পিঠে বিঁধে যাচ্ছিল। আদিত্য তার কানে চুমু দিয়ে বলছিল, “তুমি আমার… শুধু আমার… এই মুহূর্তে শুধু তুমি।”</p>
        <p>গতি বাড়ল। রিয়ার পা আদিত্যের কোমরে জড়িয়ে গেল। সে আরও গভীরে চাইছিল।</p>
        <p>রিয়ার শরীর কেঁপে উঠল। একটা তীব্র ঢেউ এল। সে চোখ বন্ধ করে আদিত্যের নাম ডাকল। আদিত্যও আর ধরে রাখতে পারল না। দুজনে একসঙ্গে শেষ হল। গভীর, গরম, আর সম্পূর্ণ।</p>
        <p>কিছুক্ষণ তারা শুধু একে অপরকে জড়িয়ে ধরে শুয়ে রইল।</p>
        <p>আদিত্য তার কপালে চুমু দিয়ে ফিসফিস করল, “এটা স্বপ্ন হলেও… আমি আর জাগতে চাই না।”</p>
        <p>রিয়া তার বুকে মাথা রেখে মৃদু হাসল। “তাহলে আর জেগো না… আজ শুধু আমরা।”</p>
        <p>বাইরে বৃষ্টি শুরু হয়ে গেছে। ঘরের ভিতর শুধু দুজনের হৃদয়ের স্পন্দন।</p>
        <p>এবং সেই মুহূর্তে, সব বাস্তব হারিয়ে গিয়েছিল। শুধু রইল একটা নিষিদ্ধ, মিষ্টি, অনন্ত ফ্যান্টাসি।</p>
      `
    },
    {
      id: "midnight-confession",
      title: "Midnight Confession",
      slug: "midnight-confession",
      excerpt: "She never expected him to stay the night. One glass of wine, one honest look, and the air between them caught fire.",
      category: "Romance",
      tags: ["Intimate", "Slow Burn"],
      cover: null,
      date: "2026-07-28",
      readTime: "6 min",
      language: "en",
      content: `
        <p>The city lights blurred through the rain-streaked window. She stood by the glass, wine glass loose in her fingers, when she felt him behind her.</p>
        <p>Not touching. Just close enough that she could feel the heat of him.</p>
        <p>“You should go,” she whispered.</p>
        <p>“I know,” he answered. His voice was low, rough. “Tell me to leave and I will.”</p>
        <p>She turned. Their eyes met. The space between them disappeared.</p>
        <p>His hand found her waist. Hers rose to his chest. The first kiss was soft—almost careful. The second was not.</p>
        <p>Clothes became suggestions. Skin became the only language left. She led him to the bed, slow and deliberate, as if memorizing every second.</p>
        <p>When he finally entered her, she breathed his name like a secret. He moved with deep, rolling strokes, watching her face, matching every gasp with a quieter, darker one of his own.</p>
        <p>They came together in a long, shuddering silence. Afterward he stayed inside her, forehead against hers, neither willing to break the spell.</p>
        <p>“Stay,” she said.</p>
        <p>He kissed the corner of her mouth. “I’m not going anywhere.”</p>
      `
    },
    {
      id: "silk-and-shadow",
      title: "Silk & Shadow",
      slug: "silk-and-shadow",
      excerpt: "A chance meeting in a dim hotel corridor. One shared elevator. By morning, nothing would ever feel ordinary again.",
      category: "Fantasy",
      tags: ["Strangers", "Intense"],
      cover: null,
      date: "2026-07-20",
      readTime: "7 min",
      language: "en",
      content: `
        <p>She almost didn’t take the elevator. The doors were already closing when a hand stopped them.</p>
        <p>He stepped in. Tall. Dark coat. Eyes that held too much quiet intensity.</p>
        <p>They rode in silence. Floor numbers glowed and faded. On the 14th the lights flickered once. When they steadied, he was looking at her.</p>
        <p>“Wrong floor?” she asked, voice softer than she intended.</p>
        <p>“No,” he said. “Right moment.”</p>
        <p>The rest of the night unfolded like something written in advance. His room. The city glowing far below. Silk sheets. His mouth on her throat, then lower. She arched under him as he took his time, tasting, teasing, until she was trembling and begging without words.</p>
        <p>When he finally pushed inside, the world narrowed to the slow, deep rhythm they created together. She came first, sharp and bright. He followed, burying his face against her neck, whispering something she never quite caught.</p>
        <p>At dawn she left without waking him. But she kept the keycard.</p>
        <p>Just in case the night ever called again.</p>
      `
    }
  ];

  let stories = [];

  /* ---------- Load stories ---------- */
  async function loadStories() {
    try {
      const res = await fetch('stories/index.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        stories = Array.isArray(data) ? data : (data.stories || []);
      } else {
        stories = SAMPLE_STORIES;
      }
    } catch (err) {
      console.info('Using sample stories (no stories/index.json found)');
      stories = SAMPLE_STORIES;
    }
    renderStoryGrid();
  }

  /* ---------- Render cards ---------- */
  function renderStoryGrid() {
    if (!storyGrid) return;

    if (!stories.length) {
      storyGrid.innerHTML = `<div class="loading-state"><p>No stories yet.</p></div>`;
      return;
    }

    storyGrid.innerHTML = stories.map(story => `
      <article class="story-card" data-id="${story.id}" role="button" tabindex="0">
        <div class="story-card-image">
          ${story.cover
            ? `<img src="${story.cover}" alt="${escapeHtml(story.title)}" loading="lazy" />`
            : `<div class="placeholder">✦</div>`}
        </div>
        <div class="story-card-body">
          <div class="story-card-meta">
            <span class="tag">${escapeHtml(story.category || 'Story')}</span>
            <span>${story.readTime || ''}</span>
          </div>
          <h3 class="story-card-title">${escapeHtml(story.title)}</h3>
          <p class="story-card-excerpt">${escapeHtml(story.excerpt || '')}</p>
        </div>
      </article>
    `).join('');

    // Bind click
    storyGrid.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', () => openReader(card.dataset.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openReader(card.dataset.id);
        }
      });
    });
  }

  /* ---------- Reader Modal ---------- */
  function openReader(id) {
    const story = stories.find(s => s.id === id);
    if (!story || !readerModal || !readerContent) return;

    readerContent.innerHTML = `
      <h1>${escapeHtml(story.title)}</h1>
      <div class="reader-meta">
        <span>${escapeHtml(story.category || '')}</span>
        <span>•</span>
        <span>${story.readTime || ''}</span>
        <span>•</span>
        <span>${story.date || ''}</span>
      </div>
      <div class="reader-body">
        ${story.content || '<p>Content coming soon.</p>'}
      </div>
    `;

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

  if (readerClose) readerClose.addEventListener('click', closeReader);
  if (readerBackdrop) readerBackdrop.addEventListener('click', closeReader);

  /* ---------- Helpers ---------- */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Public API ---------- */
  window.NightsBlog = {
    loadStories,
    openReader,
    closeReader,
    getStories: () => stories
  };

  // Auto init
  document.addEventListener('DOMContentLoaded', loadStories);

})();
