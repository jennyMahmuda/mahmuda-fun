const fs=require('fs'),path=require('path');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(f=>f.endsWith('.html'));}
const all=files('.').filter(f=>!f.startsWith('admin/')&&!f.includes('node_modules/'));
const legal=['cookies.html','eu-dsa.html','parental-controls.html','dmca.html#2257','trust-safety.html'];
const out=all.map(f=>{const h=fs.readFileSync(f,'utf8');const title=(h.match(/<title>([^<]*)<\/title>/i)||[])[1]||'';const brand=(h.match(/SecretChapters|mahmuda\.fun/g)||[]).reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{});const missing=legal.filter(x=>!h.includes(x));const navPremium=/<nav[\s\S]{0,6000}premium\.html/i.test(h);return {file:f,title,brand,missingLegal:missing,navPremium};});
fs.writeFileSync('audit/brand-navigation-audit.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({pages:out.length,brandVariants:[...new Set(out.flatMap(x=>Object.keys(x.brand)))],withMissingLegal:out.filter(x=>x.missingLegal.length).length,withoutPremiumNav:out.filter(x=>!x.navPremium).length},null,2));
