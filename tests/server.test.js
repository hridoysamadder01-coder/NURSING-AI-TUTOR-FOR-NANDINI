import test from 'node:test';import assert from 'node:assert/strict';process.env.NODE_ENV='test'; const {server}=await import('../server.mjs');
test('static app and health endpoints do not need an API key',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();const origin='http://127.0.0.1:'+address.port;
 try{
  const health=await fetch(origin+'/healthz');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
  const stat=await fetch(origin+'/api/status');assert.equal(stat.status,200);assert.equal((await stat.json()).ai_enabled,false);
  const page=await fetch(origin+'/tutor.html');assert.equal(page.status,200);assert.match(await page.text(),/বইভিত্তিক/);
  const asset=await fetch(origin+'/src/lesson-data.js');assert.equal(asset.status,200);
  const easy=await fetch(origin+'/topics.html');assert.equal(easy.status,200);assert.equal((await fetch(origin+'/src/easy-topics.js')).status,200);assert.equal((await fetch(origin+'/ask.html')).status,200);assert.equal((await fetch(origin+'/src/tutor-core.js')).status,200);for(const f of ['/src/rag.js','/src/local-llm.js','/src/voice.js','/src/cloud-ai.js'])assert.equal((await fetch(origin+f)).status,200,f);
  const css=await fetch(origin+'/src/app.css');assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);
  const forbidden=await fetch(origin+'/package.json');assert.equal(forbidden.status,404);
  const ai=await fetch(origin+'/api/ask',{method:'POST'});assert.equal(ai.status,503);
  const coach=await fetch(origin+'/coach.html');assert.equal(coach.status,200);assert.match(await coach.text(),/Study Coach/);
  const found=await fetch(origin+'/api/books/search?q='+encodeURIComponent('hand hygiene')+'&book=fundamentals');assert.equal(found.status,200);const res=await found.json();assert.ok(res.matches.length>0);assert.equal(res.citation_type,'publisher_chapter_not_pdf_page');assert.ok(res.matches.every(x=>x.sourceUrl.startsWith('https://wtcs.pressbooks.pub/nursingfundamentals/')));
  const badId=await fetch(origin+'/api/books/search?q=hand&book=../../.env');assert.equal(badId.status,400);
  const noAi=await fetch(origin+'/api/books/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'hand hygiene',bookId:'fundamentals'})});assert.equal(noAi.status,503);
  process.env.NANDINI_ALLOW_ANDROID_ORIGIN='true';
  try{
   const options=await fetch(origin+'/api/books/ask',{method:'OPTIONS',headers:{Origin:'https://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type,X-Student-Code'}});
   assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'https://localhost');
   const reject=await fetch(origin+'/api/books/ask',{method:'OPTIONS',headers:{Origin:'https://evil.example'}});
   assert.equal(reject.status,405);
  }finally{delete process.env.NANDINI_ALLOW_ANDROID_ORIGIN}


 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
});
