const fs=require('fs');
const stories=JSON.parse(fs.readFileSync('stories/index.json','utf8'));
const {CATEGORIES}=require('../script/categories-data');
const norm=v=>String(v||'').toLowerCase().replace(/[-\s]+/g,' ').trim();
const aliases={'age gap':'agegap','age gap romance':'age-gap-romance','college romance':'college','story':'all'};
const canon=v=>aliases[norm(v)]||norm(v).replace(/ /g,'-');
const stop=['romance','and','the','a','to','of','&'];
function match(s,c){const hay=[s.type||'text',s.category||'',...(s.categories||[]),...(s.tags||[]),s.series||''].flatMap(v=>[norm(v),canon(v)]); if(hay.includes(c.slug)||hay.join(' ').includes(c.slug))return true; const words=norm(c.label).split(' ').filter(w=>w.length>2&&!stop.includes(w)); return words.some(w=>hay.includes(w));}
const auto=new Set(['forbidden','spicy','dirtytalk','senior','climax','agegap','tension','madam','university','chemistry','junior','neighbor']);
const rows=CATEGORIES.map(c=>({slug:c.slug,label:c.label,kind:auto.has(c.slug)?'auto':'curated',ids:stories.filter(s=>match(s,c)).map(s=>s.id)}));
const pairs=[]; rows.filter(x=>x.kind==='auto').forEach(a=>rows.filter(x=>x.kind==='curated').forEach(c=>{const A=new Set(a.ids), B=new Set(c.ids); const inter=[...A].filter(id=>B.has(id)); if(inter.length) pairs.push({auto:a.slug,curated:c.slug,autoCount:A.size,curatedCount:B.size,overlap:inter.length,autoOnly:[...A].filter(id=>!B.has(id)),curatedOnly:[...B].filter(id=>!A.has(id))});}));
console.log(JSON.stringify({rows,pairs},null,2));
