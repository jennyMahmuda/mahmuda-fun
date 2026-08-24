const https=require('https');
const fs=require('fs');
const urls=[
 ['story','https://mahmuda.fun/story/northsouth-university-senior-apu-viral-video/'],
 ['video','https://mahmuda.fun/video/'],
 ['gallery','https://mahmuda.fun/gellery/'],
 ['series','https://mahmuda.fun/series/'],
 ['category-forbidden','https://mahmuda.fun/category/forbidden/'],
 ['category-college','https://mahmuda.fun/category/college/'],
 ['category-spicy','https://mahmuda.fun/category/spicy/'],
 ['privacy','https://mahmuda.fun/privacy-policy.html'],
 ['terms','https://mahmuda.fun/terms.html'],
 ['dmca','https://mahmuda.fun/dmca.html'],
 ['content-removal','https://mahmuda.fun/content-removal.html']
];
function get(url){return new Promise((resolve,reject)=>https.get(url,{headers:{'user-agent':'mahmuda-public-audit/1.0'}},r=>{let b='';r.setEncoding('utf8');r.on('data',d=>b+=d);r.on('end',()=>resolve({status:r.statusCode,body:b,url:r.responseUrl||url}));}).on('error',reject));}
(async()=>{const out=[];for(const [name,url] of urls){const x=await get(url);const title=(x.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';const desc=(x.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)||[])[1]||'';const canon=(x.body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)||[])[1]||'';out.push({name,url,status:x.status,title:title.trim(),description:desc.trim(),canonical:canon.trim(),loading:(x.body.match(/Loading(?:…|\.\.\.)/gi)||[]).length,storyLinks:(x.body.match(/href=["'][^"']*story\/[^"']+/gi)||[]).length,categoryLinks:(x.body.match(/href=["'][^"']*category\/[^"']+/gi)||[]).length,hasLogo:/logo\.svg/i.test(x.body),hasJsonLd:/application\/ld\+json/i.test(x.body),hasOg:/property=["']og:title["']/i.test(x.body)});}console.log(JSON.stringify(out,null,2));})();
