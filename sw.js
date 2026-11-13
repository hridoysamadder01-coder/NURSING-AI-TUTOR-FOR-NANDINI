const CACHE='nandini-study-v31';const FILES=['./','./index.html','./tutor.html','./library.html','./coach.html','./settings.html','./src/api-config.js','./src/study-plan.js','./faridpur-first-year.html','./src/lesson-data.js','./src/answer-core.js','./manifest.webmanifest','./icon.svg','./src/app.css','./topics.html','./src/easy-topics.js','./ask.html','./scan.html','./src/page-ocr.js','./vendor/tesseract/tesseract.min.js','./vendor/tesseract/worker.min.js','./src/tutor-core.js','./src/rag.js','./src/local-llm.js','./src/voice.js','./src/cloud-ai.js','./src/live-talk.js','./src/talk-audio.js','./src/persona.js','./src/library-catalog.js','./src/book-finder.js'];
// The ~6 MB offline OCR assets (Scan & Explain). Kept out of the required precache so a weak connection on a
// cheap phone can't fail the whole install over them; they are fetched best-effort here and, failing that,
// cached the first time Scan is used (the fetch handler below caches every successful same-origin GET).
const HEAVY=['./vendor/tesseract/tesseract-core-simd-lstm.wasm.js','./vendor/tesseract/tessdata/eng.traineddata.gz','./vendor/tesseract/tessdata/ben.traineddata.gz'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).then(()=>{c.addAll(HEAVY).catch(()=>{})})).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));// Cache-first for the app shell: instant on low-end phones, no repeat downloads (saves mobile data),
// and fully usable offline. Live AI endpoints are never cached. A cached page is reused even with a
// ?query (ask.html?q=…, library.html?book=…) so those journeys work with no internet; a navigation
// that misses everything falls back to the home shell instead of a browser error page.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/')||url.pathname==='/healthz')return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(e.request)||await cache.match(e.request,{ignoreSearch:true});
  if(cached)return cached;
  try{const r=await fetch(e.request);if(r.ok&&!url.search)cache.put(e.request,r.clone());return r;}
  catch{
   if(e.request.mode==='navigate'){const shell=await cache.match(e.request,{ignoreSearch:true})||await cache.match('./index.html');if(shell)return shell;}
   return Response.error();
  }
 })());
});