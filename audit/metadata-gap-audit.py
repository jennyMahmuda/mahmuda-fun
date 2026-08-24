from pathlib import Path
from bs4 import BeautifulSoup

def walk(p):
    out=[]
    for x in p.rglob('*.html'):
        if 'admin' not in x.parts and 'node_modules' not in x.parts: out.append(x)
    return out
rows=[]
for f in walk(Path('.')):
    s=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser')
    title=s.title.get_text(' ',strip=True) if s.title else ''
    d=s.find('meta',attrs={'name':'description'}); desc=d.get('content','').strip() if d else ''
    c=s.find('link',attrs={'rel':lambda v:v and 'canonical' in v}); canonical=c.get('href','') if c else ''
    logo=bool(s.find('img',src=lambda v:v and 'logo.svg' in v))
    if len(title)<15 or len(title)>70 or len(desc)<70 or len(desc)>158 or not canonical or not logo:
        rows.append({'file':str(f),'titleLength':len(title),'descriptionLength':len(desc),'canonical':canonical,'logo':logo})
print({'scanned':len(walk(Path('.'))),'gaps':len(rows),'rows':rows})
