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