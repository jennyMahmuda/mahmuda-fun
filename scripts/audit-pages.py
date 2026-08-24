import json
from pathlib import Path
from collections import Counter, defaultdict

root = Path(__file__).resolve().parents[1]

def html_pages(pattern):
    return sorted(str(p.relative_to(root)) for p in root.glob(pattern) if p.is_file() and p.name == 'index.html')

print('CATEGORY_CONFIG')
config_text = (root / 'script/categories-data.js').read_text()
for line in config_text.splitlines():
    if 'slug:' in line and 'label:' in line:
        print(line.strip())

print('\nCATEGORY_PAGES')
for page in html_pages('category/*/index.html') + html_pages('category/*/*/index.html'):
    print(page)

print('\nSPECIAL_PAGES')
for page in html_pages('*') + html_pages('account/index.html') + html_pages('admin/index.html') + html_pages('gellery/index.html') + html_pages('new-releases/index.html') + html_pages('series/index.html') + html_pages('top-rated/index.html') + html_pages('trending/index.html') + html_pages('video/index.html'):
    print(page)

stories = []
for path in sorted((root / 'stories').glob('*.json')):
    if path.name == 'index.json':
        continue
    data = json.loads(path.read_text())
    stories.append(data)

print('\nSTORY_COUNTS')
print('total', len(stories))
for key, count in sorted(Counter((s.get('category') or '(uncategorized)') for s in stories).items()):
    print(f'{key}\t{count}')

print('\nCONTENT_TYPES')
for key, count in sorted(Counter((s.get('contentType') or '(default text)') for s in stories).items()):
    print(f'{key}\t{count}')

print('\nSERIES')
series = defaultdict(list)
for s in stories:
    if s.get('series'):
        series[s['series']].append((s.get('episode'), s.get('id')))
for name, rows in sorted(series.items()):
    print(name, sorted(rows, key=lambda x: (x[0] is None, x[0] or 0, x[1])))

print('\nROUTE_RELEVANT_DIRS')
for name in ['story-post', 'gallery-post', 'video-story-post', 'category', 'stories', 'new-releases', 'series', 'trending', 'top-rated', 'video', 'gellery', 'admin']:
    d = root / name
    print(name, len(list(d.glob('*'))) if d.exists() else 0)

print('\nSTORY_FIELDS')
for s in stories:
    print(json.dumps({k: s.get(k) for k in ['id', 'title', 'category', 'contentType', 'series', 'episode', 'nextEpisodeId', 'status', 'syncedAt']}, ensure_ascii=False))
