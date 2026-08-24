const fs=require('fs');
const data=JSON.parse(fs.readFileSync('/home/ubuntu/mahmuda-fun/stories/index.json','utf8'));
const count=(fn)=>data.filter(fn).length;
const series=[...new Set(data.map(x=>x.series).filter(Boolean))];
console.log(JSON.stringify({total:data.length,text:count(x=>x.type==='text'),video:count(x=>x.type==='video'),image:count(x=>x.type==='image'),videoUrl:count(x=>!!x.video),cover:count(x=>!!x.cover),seriesCount:series.length,series,videoIds:data.filter(x=>x.type==='video'||x.video).map(x=>x.id).slice(0,10),imageIds:data.filter(x=>x.type==='image').map(x=>x.id).slice(0,10),seriesIds:data.filter(x=>x.series).map(x=>x.id).slice(0,10)},null,2));
