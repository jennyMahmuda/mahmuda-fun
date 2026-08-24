const fs=require('fs'),cp=require('child_process');
for(const file of ['admin/story.html','admin/premium.html']){
 const html=fs.readFileSync(file,'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.includes('function renderForm'));
 if(scripts.length!==1) throw new Error(file+': expected one inline editor script');
 const out='/tmp/'+file.replace(/[\\/]/g,'-')+'.js'; fs.writeFileSync(out,scripts[0]); cp.execFileSync(process.execPath,['--check',out],{stdio:'inherit'});
 for(const key of ['contentType','videoFile','thumbnailFile','coverFile','data-editor-type="story"','data-editor-type="video"','data-editor-type="audio"']) if(!html.includes(key)) throw new Error(file+': missing '+key);
 if((html.match(/name="audioUrl"/g)||[]).length>1) throw new Error(file+': duplicate audioUrl');
 console.log(file,'OK');
}
