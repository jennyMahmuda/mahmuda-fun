const fs=require('fs');
const files=['category/index.html','video/index.html','gellery/index.html','series/index.html','top-rated/index.html','trending/index.html'];
let changed=0; for(const f of files){const before=fs.readFileSync(f,'utf8'); const after=before.replace(/(<\/a><\/article><\/div>)(?:<\/a><\/article><\/div>)+/g,'$1').replace(/<\/div><\/a><\/article>(?=<article)/g,'<\/div>'); if(after!==before){fs.writeFileSync(f,after,'utf8'); changed++;}}
console.log(JSON.stringify({changed,files},null,2));
