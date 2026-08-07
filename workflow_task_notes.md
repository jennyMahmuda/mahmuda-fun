# Workflow fix task notes

Repo: /home/ubuntu/mahmuda-fun (cloned, branch main, pushed commit dd0b9af)
Site: mahmuda.fun, GitHub Pages static site (CNAME exists at repo root = mahmuda.fun)
User request: GitHub Action workflow fails to build. Check, fix pipeline matching build system, write new workflow, verify passes on every commit.

## Current build system (from redesign commit dd0b9af)
- Builder: `node script/blog-builder.js` (Node.js) — reads story-post/*.md front matter, writes stories/index.json, stories/*.json, sitemap.xml, robots.txt.
- Old workflow `.github/workflows/deploy.yml` was cleaned: removed stale `marked` loop, runs builder without ads. Need to re-check its current state — it may still reference removed tools (e.g., marked, old script paths) causing failure.
- Gallery images fixed: madam-01/02.jpg in assets/images/gallery/.
- Covers: story-post/image/*.jpg.

## Steps
1. Read .github/workflows/deploy.yml, check action logs via `gh run list -R jennyMahmuda/mahmuda-fun`.
2. Write new workflow: on push to main — checkout, node 20, install none (builder uses no deps? verify blog-builder.js requires), run `node script/blog-builder.js`, optionally run pages build + deploy (GitHub Pages with `actions/deploy-pages`).
3. Test locally first: run node script/blog-builder.js from clean check (check requires: fs, path, child_process? verify imports).
4. Commit, push, verify with gh run watch.
