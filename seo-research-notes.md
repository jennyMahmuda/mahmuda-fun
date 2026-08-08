# SEO implementation notes

## Official sources reviewed

1. Google Image SEO Best Practices: https://developers.google.com/search/docs/appearance/google-images
   - Use standard HTML `<img src>` elements; CSS background images are not reliably indexed.
   - Use an image sitemap for images that may otherwise be undiscovered.
   - Provide responsive images with a fallback `src`.
   - Optimize image size and quality for performance.
   - Use relevant `og:image` and schema image/primaryImageOfPage metadata.
   - Use descriptive filenames, captions, titles, and alt text.

2. Google Spam Policies: https://developers.google.com/search/docs/essentials/spam-policies
   - Do not use cloaking, doorway pages, hidden text/link abuse, keyword stuffing, or manipulative link spam.
   - Paid/ad links should be qualified with `rel="sponsored"` or `rel="nofollow"` where applicable.
   - SEO cannot safely promise a Top 1 ranking; implementation should prioritize user-visible, original, technically accessible content.

3. Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
   - Use canonical URLs, XML sitemaps, crawlable internal links, and freshness signals.
   - Consolidate duplicate URLs and keep sitemap entries canonical/current.
   - robots.txt controls crawl access but does not itself guarantee indexing.
   - Clear semantic HTML, title/meta descriptions, structured data, descriptive image alt text, and focused page topics help Bing/Copilot understanding.
   - Thin, ad-heavy, or affiliate-only URLs can lose ranking/grounding eligibility.

## Implementation direction

Build an automatic deduplicated sitemap from canonical static pages and generated stories, add image entries where valid, add JSON-LD and metadata generated from story fields, and preserve crawlable HTML links. Implement ads through the existing idempotent loader with responsive placement, frequency caps, and no forced redirects. Keep the user-provided ad scripts isolated in labelled containers and avoid injecting ads into buttons or misleading users into accidental clicks.
