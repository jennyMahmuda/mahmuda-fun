/* Per-category SEO copy + themed background for category/index.html.
   Client-side only: title/meta/intro update when ?cat= changes, which
   helps JS-executing crawlers (Google) but not simpler ones — true
   static per-category landing pages would be a stronger SEO upgrade if
   this site wants to go further down the topic-cluster route later.
   All copy here is written fresh for this site, not copied from any
   external taxonomy/marketing source. */
(function () {
  'use strict';

  // theme = a mood palette applied as a body class (see style.css
  // .cat-theme-*) — CSS gradients only, deliberately no photographic
  // imagery (no licensed source for it, and it would cut against this
  // site's own Content Removal/DMCA commitments not to use real people's
  // images without rights).
  var CATEGORY_SEO = {
    'dark-romance': {
      title: 'Dark Romance Stories',
      description: 'Dark romance stories on mahmuda.fun: morally grey characters, high-stakes tension and intense emotional stakes. 18+ fiction.',
      intro: 'Dark romance leans into morally complicated characters and high tension — love that comes with real risk attached. Every story here is fiction, written for adult readers.',
      theme: 'danger',
    },
    'mafia-romance': {
      title: 'Mafia Romance Stories',
      description: 'Mafia romance stories on mahmuda.fun: dangerous men, loyalty, and love that breaks every rule. 18+ fiction.',
      intro: 'Mafia romance pairs danger with devotion — power, loyalty, and a love interest who answers to no one but themselves.',
      theme: 'danger',
    },
    'paranormal-fantasy-romance': {
      title: 'Paranormal & Fantasy Romance Stories',
      description: 'Paranormal and fantasy romance stories on mahmuda.fun featuring otherworldly connections and impossible desire. 18+ fiction.',
      intro: 'Paranormal & fantasy romance steps outside the ordinary world entirely — supernatural pulls, fated connections, and desire that defies explanation.',
      theme: 'mystic',
    },
    'billionaire-romance': {
      title: 'Billionaire Romance Stories',
      description: 'Billionaire romance stories on mahmuda.fun: wealth, power and the one thing money can’t buy. 18+ fiction.',
      intro: 'Billionaire romance is about the gap between what money can buy and what it can’t — and the tension that fills it.',
      theme: 'luxury',
    },
    'alpha-males': {
      title: 'Alpha Male Romance Stories',
      description: 'Alpha male romance stories on mahmuda.fun: commanding, protective heroes and the readers who love them. 18+ fiction.',
      intro: 'Confident, commanding, protective — the alpha male archetype at the center of some of our most-read stories.',
      theme: 'luxury',
    },
    'high-school-romance': {
      title: 'High School Romance Stories',
      description: 'High school romance stories on mahmuda.fun for adult readers (18+). All characters are written as adults.',
      intro: 'High school as a setting, written for adult readers — all characters depicted are adults. First crushes, rivalries and everything in between.',
      theme: 'warm',
    },
    'spicy-romance': {
      title: 'Spicy Romance Stories',
      description: 'Spicy romance stories on mahmuda.fun: heat-forward fiction for adult readers. 18+ only.',
      intro: 'For readers who want the temperature turned up — heat-forward romance fiction, 18+ only.',
      theme: 'rose',
    },
    'age-gap-romance': {
      title: 'Age Gap Romance Stories',
      description: 'Age gap romance stories on mahmuda.fun featuring a meaningful difference in life experience between leads. 18+ fiction — all characters are adults.',
      intro: 'Age gap romance explores connection across a real difference in life stage and experience. All characters depicted are adults.',
      theme: 'rose',
    },
    'vampire-romance': {
      title: 'Vampire Romance Stories',
      description: 'Vampire romance stories on mahmuda.fun: immortal desire and gothic tension. 18+ fiction.',
      intro: 'Immortal, dangerous, magnetic — vampire romance brings a gothic edge to the usual rules of attraction.',
      theme: 'mystic',
    },
    'cowboy-romance': {
      title: 'Cowboy Romance Stories',
      description: 'Cowboy romance stories on mahmuda.fun: small-town charm and rugged heroes. 18+ fiction.',
      intro: 'Wide-open country, small-town charm, and heroes who work with their hands — cowboy romance at its most grounded.',
      theme: 'earthy',
    },
    'forbidden-romance': {
      title: 'Forbidden Romance Stories',
      description: 'Forbidden romance stories on mahmuda.fun: love that isn’t supposed to happen. 18+ fiction.',
      intro: 'The oldest hook in romance for a reason — connection that crosses a line it shouldn’t, and can’t look away from.',
      theme: 'accent',
    },
    'second-chance-romance': {
      title: 'Second Chance Romance Stories',
      description: 'Second chance romance stories on mahmuda.fun: old love, new stakes. 18+ fiction.',
      intro: 'Second chance romance is about what’s left unfinished — old feelings resurfacing with everything now on the line.',
      theme: 'accent',
    },
    'clean-wholesome': {
      title: 'Clean & Wholesome Romance Stories',
      description: 'Clean and wholesome romance stories on mahmuda.fun: sweet, low-heat fiction for readers who want tension without explicit content.',
      intro: 'For readers who want the slow build and the swoon without the heat — clean and wholesome romance.',
      theme: 'warm',
    },
    'fated-mates': {
      title: 'Fated Mates Romance Stories',
      description: 'Fated mates romance stories on mahmuda.fun: connections written in the stars. 18+ fiction.',
      intro: 'Some pairings feel inevitable from the first page — fated mates stories lean fully into that pull.',
      theme: 'mystic',
    },
    'comedy': {
      title: 'Romantic Comedy Stories',
      description: 'Romantic comedy stories on mahmuda.fun: banter, chemistry and a lot of laughs. 18+ fiction.',
      intro: 'Romance doesn’t have to be all tension — these stories lead with banter, chemistry, and a sense of humor.',
      theme: 'warm',
    },
    'bad-boys': {
      title: 'Bad Boy Romance Stories',
      description: 'Bad boy romance stories on mahmuda.fun: rule-breakers who make terrible decisions look good. 18+ fiction.',
      intro: 'The bad boy archetype, done right — rule-breakers with a soft spot they’ll never admit to.',
      theme: 'danger',
    },
    'slow-burn': {
      title: 'Slow Burn Romance Stories',
      description: 'Slow burn romance stories on mahmuda.fun: tension that builds patiently before it pays off. 18+ fiction.',
      intro: 'No instant sparks here — slow burn romance rewards patience with tension that builds page by page.',
      theme: 'accent',
    },
    'enemies-to-lovers': {
      title: 'Enemies to Lovers Romance Stories',
      description: 'Enemies to lovers romance stories on mahmuda.fun: rivalry that turns into something else entirely. 18+ fiction.',
      intro: 'They started as rivals. Enemies-to-lovers is the trope that turns that friction into something neither of them expected.',
      theme: 'danger',
    },
    'sports': {
      title: 'Sports Romance Stories',
      description: 'Sports romance stories on mahmuda.fun: athletes, rivalry, and off-the-field chemistry. 18+ fiction.',
      intro: 'Competition, discipline, and the chemistry that happens once the game is over — sports romance.',
      theme: 'earthy',
    },
    'college': {
      title: 'College Romance Stories',
      description: 'College romance stories on mahmuda.fun for adult readers (18+). All characters are written as adults.',
      intro: 'The freedom, chaos and firsts of college life, written for adult readers — all characters depicted are adults.',
      theme: 'warm',
    },
  };

  function applySeo(catKey) {
    var entry = CATEGORY_SEO[catKey];
    document.body.className = document.body.className.replace(/\bcat-theme-\S+/g, '').trim();

    var introEl = document.getElementById('catIntro');
    if (!entry) {
      if (introEl) introEl.hidden = true;
      return;
    }

    document.title = entry.title + ' | mahmuda.fun';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', entry.description);
    var og = document.querySelector('meta[property="og:description"]');
    if (og) og.setAttribute('content', entry.description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', entry.title + ' | mahmuda.fun');

    document.body.classList.add('cat-theme-' + entry.theme);

    if (introEl) {
      introEl.hidden = false;
      introEl.innerHTML = '<h2>' + entry.title + '</h2><p>' + entry.intro + '</p>';
    }
  }

  function currentCat() {
    var m = (window.location.search || '').match(/[?&]cat=([^&]+)/);
    return m ? decodeURIComponent(m[1]).toLowerCase() : null;
  }

  function init() {
    applySeo(currentCat());
    // category/index.html's own script filters by clicking a pill without
    // touching the URL (currentCat stays a local JS var there, not
    // reflected in location.search) — read the clicked pill's data-cat
    // directly rather than re-reading the URL, so this stays in sync.
    var pills = document.getElementById('catPills');
    if (pills) {
      pills.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cat]');
        if (!btn) return;
        var cat = btn.getAttribute('data-cat');
        applySeo(cat === 'all' ? null : cat.toLowerCase());
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.NightsCategorySeo = { CATEGORY_SEO: CATEGORY_SEO };
})();
