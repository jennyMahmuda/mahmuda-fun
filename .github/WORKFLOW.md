# 🌙 Nights – GitHub Actions Map

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER                                  │
│  • push to main                                             │
│  • manual (workflow_dispatch)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  JOB 1: Build Stories                                       │
│  ─────────────────────                                      │
│  1. Checkout repo                                           │
│  2. Setup Node.js 20                                        │
│  3. Run: node script/blog-builder.js                        │
│     story-post/*.md  →  stories/*.json + index.json         │
│     (auto nextEpisodeId linking)                            │
│  4. Copy site files → _site/                                │
│  5. Upload Pages artifact                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  JOB 2: Deploy                                              │
│  ─────────────                                              │
│  Deploy artifact → GitHub Pages                             │
│  Live URL: https://jennyMahmuda.github.io/mahmuda-fun/      │
│  (or custom domain mahmuda.fun if configured)               │
└─────────────────────────────────────────────────────────────┘
```

## Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Save

After first successful run, site will be live.
