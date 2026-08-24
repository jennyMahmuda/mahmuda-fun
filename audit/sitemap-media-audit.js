const fs=require('fs'),path=require('path');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(f=>f.endsWith('.html'));}
const html=walk('.').filter(f=>!f.startsWith('admin/')&&!f.includes('node_modules/'));
const rel=[]; for(const f of html){const h=fs.readFileSync(f,'utf8');for(const m of h.matchAll(/(?:property="og:image"|name="twitter:image")[^>]*content="([^"]+)"/gi)){if(!/^https?:\/\//i.test(m[1]))rel.push({file:f,url:m[1]});}}
const sitemap=fs.readFileSync('sitemap.xml','utf8'); const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]); const dates=[...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(x=>x[1]);
const expected=['/become-creator.html','/advertising.html','/terms.html','/cookies.html','/dmca.html','/eu-dsa.html','/parental-controls.html','/content-removal.html','/trust-safety.html'];
console.log(JSON.stringify({sitemapCount:locs.length,uniqueLastmods:[...new Set(dates)],missingExpected:expected.filter(p=>!locs.some(u=>u.endsWith(p))),relativeImages:rel},null,2));
