from pathlib import Path
from bs4 import BeautifulSoup
pages={'category/index.html':'catGrid','video/index.html':'videoGrid','gellery/index.html':'galleryGrid','series/index.html':'seriesList','top-rated/index.html':'rankGrid','trending/index.html':'trendGrid','new-releases/index.html':'releaseGroups'}
out=[]
for fn,ident in pages.items():
    soup=BeautifulSoup(Path(fn).read_text(encoding='utf-8'),'html.parser')
    el=soup.find(id=ident)
    out.append({'file':fn,'container':bool(el),'articles':len(el.find_all('article')) if el else 0,'storyLinks':len(el.select('a[href*="/story/"]')) if el else 0,'visibleLoading':bool(el and 'Loading' in el.get_text(' ',strip=True)),'malformedNestedArticles':len(el.select('article article')) if el else 0})
print(out)
