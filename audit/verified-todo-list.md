# Verified Todo List — mahmuda.fun

**Source of truth:** User-provided `Pasted_content.txt`, cross-checked against the current repository and live public pages where possible. Each Todo must be completed as: inspect → change only confirmed issue → local validation → deploy → live verification → user update.

## Inventory baseline

The attached audit reports 85 sitemap URLs, including 12 static/legal/index URLs, 34 category URLs, and 39 story URLs. The current repository additionally contains standalone pages absent from the sitemap, including `/index.html`, `/account/`, legal pages, `/become-creator.html`, and `/advertising.html`. The repository currently contains 40 generated story directories, so counts must be reconciled before final delivery rather than assumed from the attachment.

## Ordered Todo items

1. **Listing first-paint and feed rendering.** Verify and fix `/category/`, curated category pages, auto-tag category pages, `/series/`, `/top-rated/`, `/trending/`, `/video/`, and `/gellery/` so real content is present in the initial HTML or a reliable static build output. Remove persistent “Loading…” states and confirm data paths, type filters, empty states and clean story links. Do not fabricate media entries when the dataset has none.

2. **Series canonical and episode routing.** Set `/series/` canonical and `og:url` to `https://mahmuda.fun/series/`, remove the confirmed `/series.html` dead canonical, and ensure episode cards use `/story/<id>/` clean URLs.

3. **Taxonomy duplication policy.** Compare curated and auto-tag route story sets after rendering works. Decide based on evidence whether each overlapping pair should merge, redirect/canonicalize, or remain indexable with genuinely distinct content. Improve auto-tag titles and descriptions; do not apply blanket `noindex` before comparing actual sets.

4. **Brand consistency.** Choose one public brand presentation, then align titles, `og:site_name`, author/meta copy, headings and footer wording across public pages. Keep legal/technical identifiers only where required.

5. **Shared navigation and footer.** Unify or normalize navigation/footer templates. Ensure `/top-rated/` and `/trending/` expose the complete legal/compliance links, including Cookies, EU DSA, Parental Controls, 2257 and Trust & Safety. Ensure `/series/` includes Premium in the top navigation.

6. **Sitemap coverage and dates.** Reconcile sitemap inclusion policy for public content and legal pages. Add verified indexable pages that should be discoverable, exclude utility/private pages where appropriate, and use real source/build modification dates instead of assigning the current date to every URL.

7. **Absolute social preview media.** Audit every `og:image` and Twitter image value, converting relative story media paths to absolute `https://mahmuda.fun/...` URLs while preserving valid external URLs.

8. **Gallery and page-copy cleanup.** Remove the developer/spec placeholder sentence from `/gellery/`; add missing `meta robots` to `/video/`; improve short auto-tag descriptions; review `/terms.html` description length; preserve unique category descriptions.

9. **URL spelling policy.** Decide whether to retain the established `/gellery/` route or introduce `/gallery/`. If changing, add a safe redirect and update all internal links, canonical URLs and sitemap entries; otherwise document that it is retained for backward compatibility.

10. **Story-page structure and orphan prevention.** Ensure individual story pages have category backlinks, series navigation where applicable, clean internal links, valid structured data, no literal escaped-newline artifacts, and absolute social images. Verify the Series hub links all available episodes.

11. **Full verification.** Run a complete route/status/canonical/title/meta/OG/JSON-LD audit, check duplicate titles/descriptions, validate sitemap XML, scan for loading placeholders, run responsive overflow checks, and capture screenshots where browser access is available. Then prepare the Search Console resubmission and URL Inspection checklist.
