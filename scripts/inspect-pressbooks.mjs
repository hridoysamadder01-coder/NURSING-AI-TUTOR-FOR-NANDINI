const books = [
['fundamentals','https://wtcs.pressbooks.pub/nursingfundamentals/'],
['skills','https://wtcs.pressbooks.pub/nursingskills/'],
['terminology','https://wtcs.pressbooks.pub/medterm/']
];
for (const [name,url] of books) {
  try {
    const r=await fetch(url,{headers:{'User-Agent':'NandiniNursingStudy/0.2 (+EducationalBookLinkDiscovery; respectful one-request)'},signal:AbortSignal.timeout(15000)});
    const body=await r.text();
    console.log('BOOK',name,'status',r.status,'size',body.length);
    const anchor=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;let count=0;
    while((m=anchor.exec(body))!==null&&count<18){
      const label=m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
      const dest=m[1].replace(/&amp;/g,'&');
      if(/\.pdf(\?|$)|\.epub(\?|$)|download|\/exports\/|\/(format|files)\//i.test(dest+' '+label)){
        console.log('LINK',name,JSON.stringify({label,url:dest.slice(0,450)}));count++;
      }
    }
  }catch(e){console.log('BOOK_ERROR',name,e.message)}
}
for (const name of ['nursingfundamentals','nursingskills','medterm']) {
 for (const type of ['wxr','xhtml']) {
   const url='https://wtcs.pressbooks.pub/'+name+'/open/download?type='+type;
   try {const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000)});console.log('EXPORT',name,type,'status',r.status,'length',r.headers.get('content-length'),'type',r.headers.get('content-type'))} catch(e){console.log('EXPORT_ERR',name,type,e.message)}
 }
}

for (const type of ['wxr','xhtml']){
 const u='https://wtcs.pressbooks.pub/nursingskills/open/download?type='+type;
 try {const r=await fetch(u,{signal:AbortSignal.timeout(12000)});const str=await r.text();console.log('SAMPLE',type,'prefix',JSON.stringify(str.slice(0,1200)),'post_type_count',(str.match(/post_type/g)||[]).length,'h1_count',(str.match(/<h1/g)||[]).length,'chapter_class_count',(str.match(/class="[^"]*chapter/g)||[]).length)}catch(e){console.log('SAMPLE_ERROR',type,e.message)}
}
