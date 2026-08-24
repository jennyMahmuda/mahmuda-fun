const fs = require('fs');
const path = require('path');
const root = '/home/ubuntu/mahmuda-fun';
function files(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => { const p=path.join(dir,e.name); return e.isDirectory() ? files(p) : [p]; }); }
const html = files(root).filter(p => p.endsWith('.html') && !p.includes(`${path.sep}story${path.sep}`) && !p.includes(`${path.sep}story-post${path.sep}`));
const rows=[];
for (const file of html) {
  const rel='/' + path.relative(root,file).replaceAll(path.sep,'/').replace(/index\.html$/,'');
  const s=fs.readFileSync(file,'utf8');
  const title=(s.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
  const desc=(s.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)||[])[1]||'';
  const canonical=(s.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)||[])[1]||'';
  const logo=/assets\/logo\.svg|\.\/.*logo\.svg|\.\.\/.*logo\.svg/i.test(s);
  const loading=(s.match(/Loading(?:…|\.\.\.)/gi)||[]).length;
  const jsonld=/<script[^>]+type=["']application\/ld\+json["']/i.test(s);
  const og=/property=["']og:title["']/i.test(s)&&/property=["']og:description["']/i.test(s);
  rows.push({rel,file:path.relative(root,file),title:title.trim(),titleLen:title.trim().length,descLen:desc.trim().length,canonical,logo,loading,jsonld,og});
}
const problems=[];
for(const r of rows){
  if(!r.title) problems.push(`${r.rel}: missing title`);
  if(!r.canonical) problems.push(`${r.rel}: missing canonical`);
  if(!r.logo) problems.push(`${r.rel}: missing logo reference`);
  if(r.loading && !/admin|account/.test(r.rel)) problems.push(`${r.rel}: loading placeholder count ${r.loading}`);
  if(!/admin|account/.test(r.rel) && r.descLen<70) problems.push(`${r.rel}: short/missing meta description (${r.descLen})`);
  if(!/admin|account/.test(r.rel) && !r.og) problems.push(`${r.rel}: missing Open Graph title/description`);
}
console.log(JSON.stringify({count:rows.length,rows,problems},null,2));
process.exitCode=problems.length?1:0;
