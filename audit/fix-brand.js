const fs=require('fs'),path=require('path');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(f=>f.endsWith('.html'));}
const files=walk('.').filter(f=>!f.startsWith('admin/')&&!f.includes('node_modules/'));
let changed=0; for(const f of files){const before=fs.readFileSync(f,'utf8'); const after=before.replace(/SecretChapters/g,'mahmuda.fun'); if(after!==before){fs.writeFileSync(f,after,'utf8'); changed++;}}
console.log(JSON.stringify({scanned:files.length,changed},null,2));
