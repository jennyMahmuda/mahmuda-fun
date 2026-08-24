const fs=require('fs'),path=require('path'),cp=require('child_process');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(f=>f.endsWith('.html'));}
const pages=walk('.').filter(f=>!f.startsWith('admin/')&&!f.includes('node_modules/'));
const rows=pages.map(file=>{const h=fs.readFileSync(file,'utf8');const rendered=h.replace(new RegExp('<script[\\s\\S]*?<\\/script>','gi'),'').replace(new RegExp('<style[\\s\\S]*?<\\/style>','gi'),'');const title=(h.match(/<title>([^<]*)<\/title>/i)||[])[1]||'';const desc=(h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)||[])[1]||'';const canonical=(h.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)||[])[1]||'';return {file,titleLength:title.length,descriptionLength:desc.length,canonical,logo:/logo\.svg/i.test(h),jsonLd:/application\/ld\+json/i.test(h),visibleLoading:/<p[^>]*>Loading(…|\.\.\.)<\/p>/i.test(rendered),layoutRisk:/<\/div><\/a><\/article>(?=<article)/.test(h)};});
const canonicalOk=r=>r.canonical==='https://mahmuda.fun'||r.canonical==='https://mahmuda.fun/'||/^https:\/\/mahmuda\.fun\//.test(r.canonical);
const bad=rows.filter(r=>r.titleLength<15||r.descriptionLength<70||!canonicalOk(r)||!r.logo||r.visibleLoading||r.layoutRisk);
const sitemap=fs.readFileSync('sitemap.xml','utf8');
console.log(JSON.stringify({pageCount:rows.length,badCount:bad.length,bad,sitemapLocs:(sitemap.match(/<loc>/g)||[]).length,gitHead:cp.execSync('git rev-parse --short HEAD').toString().trim()},null,2));
