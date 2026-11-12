import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const file=async name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('browser inline script passes Node syntax check',async()=>{
 for(const path of ['index.html','tutor.html','library.html','faridpur-first-year.html','coach.html','settings.html','topics.html','ask.html','scan.html']){const html=await file(path);const m=html.match(/<script(?: type="module")?>([\s\S]*?)<\/script>/);if(!m){assert.equal(path,'faridpur-first-year.html','unexpected missing script');continue}const parsed=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(parsed.status,0,path+' JavaScript syntax error: '+parsed.stderr)}
});
test('UI labels do not misrepresent search as verified generative AI',async()=>{
 const html=await file('tutor.html');
 assert.match(html,/এটি AI chat নয়/);assert.match(html,/AI সংযোগ থাকলেই/);assert.match(html,/PDF পৃষ্ঠা/);assert.match(html,/source\.url/);
});
test('publisher-imported bookshelf has substantial, source-linked complete source text',async()=>{
 const base=new URL('../data/books/',import.meta.url);
 const catalog=JSON.parse(await readFile(new URL('catalog.json',base),'utf8'));
 assert.equal(catalog.books.length,12);assert.deepEqual(catalog.books.slice(0,4).map(b=>b.id),['fundamentals','skills','terminology','mentalhealth']);
 let count=0;
 for(const [id,min] of [['fundamentals',130],['skills',200],['terminology',140],['mentalhealth',120]]){
  const book=JSON.parse(await readFile(new URL(id+'.json',base),'utf8'));
  assert.ok(book.chapters.length>=min,id+' chapter count too small');
  assert.match(book.license,/CC BY 4.0/);assert.match(book.official_pdf,/open\/download\?type=pdf/);
  assert.ok(book.chapters.every(ch=>ch.title&&ch.url?.startsWith('https://wtcs.pressbooks.pub/')&&ch.sections?.some(s=>s.text.length>35)));
  assert.ok(book.chapters.some(ch=>ch.sections.some(s=>s.text.length>300)),id+' lacks substantial textbook passage');
  assert.ok(book.chapters.some(ch=>ch.sections.some(s=>Array.isArray(s.blocks)&&s.blocks.length>0)),id+' lacks structured paragraph blocks');
  assert.ok(book.chapters.some(ch=>ch.sections.some(s=>s.blocks?.some(b=>b.type==='bullet'))),id+' lacks bullet lists');
  count+=book.chapters.length;
 }
 assert.ok(count>=620);
});
test('PWA caches verified learning module, without server-side secrets',async()=>{
 const sw=await file('sw.js');assert.match(sw,/tutor\.html/);assert.match(sw,/src\/lesson-data\.js/);
 const manifest=JSON.parse(await file('manifest.webmanifest'));assert.equal(manifest.display,'standalone');
 for(const path of ['index.html','tutor.html','src/answer-core.js','src/lesson-data.js'])assert.doesNotMatch(await file(path),/sk-[a-zA-Z0-9]{25,}/);
});

test('Faridpur list shows Nandini\'s six subjects, is attributed and commercial full texts are not bundled', async()=>{const page=await file('faridpur-first-year.html');const shelf=JSON.parse(await file('data/books/shelf.json'));assert.deepEqual(shelf.subjects.filter(s=>s.in_coach).map(s=>s.code),['D135','D123','D112','D124','D117','D116']);assert.deepEqual(shelf.subjects.filter(s=>!s.in_coach).map(s=>s.code),['D111']);for(const token of ['id="matrix"','id="pending"','subjectMatrix(catalog,shelf)'])assert.ok(page.includes(token),token);assert.match(page,/BNMC/);assert.match(page,/কলেজের/);assert.match(page,/OpenStax/);assert.match(page,/শুধু পড়া/);assert.match(page,/AI-তে দিতে নিষেধ/);assert.match(page,/মলাটের ছবি অনুমতি নয়/);assert.match(page,/eboighar/);const lib=await file('library.html');for(const token of ['id="owned"','অ্যাপে লেখা নেই','shelf.physical_titles','catalog.books','creditLine()','a.href=book.license_url','বদলানো কপি','wrapper.value=ps[pi].n'])assert.ok(lib.includes(token),token);assert.match(await file('index.html'),/faridpur-first-year\.html/)});

test('Nandini\'s six first-year subjects have unique trackable revision tasks', async()=>{const {SUBJECTS,TOTAL_TOPICS,taskId}=await import('../src/study-plan.js');assert.deepEqual(SUBJECTS.map(s=>s.name),['Fundamentals of Nursing','Anatomy & Physiology','Basic Science','Microbiology & Parasitology','ICT','English']);assert.equal(TOTAL_TOPICS,36);const ids=SUBJECTS.flatMap(s=>s.topics.map((t,i)=>taskId(s.code,i)));assert.equal(new Set(ids).size,36);for(const s of SUBJECTS)assert.ok(s.topics.length>=5&&s.topics.every(t=>t.length===2&&t[1].length>5));const page=await file('coach.html');assert.match(page,/localStorage/);assert.match(page,/api\/books\/ask/);assert.match(page,/api\/books\/search/);assert.match(await file('index.html'),/coach\.html/)});

test('Android bundle includes private AI host settings and no hardcoded paid API key',async()=>{const p=await file('scripts/prepare-android.mjs');assert.match(p,/settings\.html/);assert.match(p,/src\/api-config\.js/);const cfg=await file('src/api-config.js');assert.match(cfg,/https:/);assert.doesNotMatch(cfg,/OPENAI_API_KEY/);assert.match(await file('coach.html'),/settings\.html/)});

test('chapter reader uses structured paragraph typography and native bilingual translation only in Android',async()=>{const html=await file('library.html');for(const token of ['chapter-title','readsection','paragraph','data-mode="english"','data-mode="both"','data-mode="bangla"','translateChapter','translation-cache.js','native-translation.bundle.js'])assert.ok(html.includes(token),token);const wf=await file('.github/workflows/build-android.yml');assert.match(wf,/@capacitor-mlkit\/translation@8/);assert.match(wf,/esbuild src\/native-translation.js/);const prep=await file('scripts/prepare-android.mjs');assert.match(prep,/translation-cache\.js/)});

test('home is a clean three-path landing and keeps every feature reachable in the "আরও" menu',async()=>{
 const home=await file('index.html');
 // The three primary paths, in order, are the point of the home screen (owner clarification, 12 Nov).
 const paths=[...home.matchAll(/class="path" href="\.\/([a-z-]+\.html)"/g)].map(m=>m[1]);
 assert.deepEqual(paths,['topics.html','ask.html','scan.html']);
 for(const label of ['বিষয় ধরে পড়ি','শায়নিকে জিজ্ঞেস করি','পাতার ছবি বুঝি'])assert.ok(home.includes(label),label);
 // Nothing was deleted: the secondary features still have a door.
 for(const href of ['./library.html','./coach.html','#quiz','#notes','#pdf','./faridpur-first-year.html','./settings.html'])assert.ok(home.includes(href),'home lost '+href);
});

test('every main screen carries the same five-tab Bangla navigation',async()=>{
 const tabs=[['./index.html','হোম'],['./topics.html','পড়ি'],['./ask.html','শায়নি'],['./scan.html','পাতা'],['./library.html','বই']];
 for(const page of ['index.html','topics.html','ask.html','scan.html','library.html','coach.html','faridpur-first-year.html','settings.html','tutor.html']){
  const html=await file(page);
  const bar=html.slice(html.indexOf('<nav class="tabbar"'));
  for(const [href,label] of tabs)assert.ok(bar.includes('href="'+href+'"')&&bar.includes(label),page+' tab bar missing '+label);
  assert.equal((bar.match(/data-tab=/g)||[]).length,5,page+' must have exactly five tabs');
 }
});

test('"বিষয় ধরে পড়ি" is subject-first with a source chapter and an ask-Shayni button on every lesson',async()=>{
 const t=await file('topics.html');
 for(const token of ['id="subjectGrid"','subjectByCode','openSubject','শায়নিকে জিজ্ঞেস করি',"ask.html?q='+encodeURIComponent",'library.html?book='])assert.ok(t.includes(token),'topics.html missing '+token);
});

test('Scan & Explain is honest: on-device only, no invented reading yet',async()=>{
 const s=await file('scan.html');
 assert.match(s,/তৈরি হচ্ছে/);assert.match(s,/এখনো চালু হয়নি/);
 assert.match(s,/শুধু তোমার ফোনেই/);
 // It must not claim it extracted or read the page, and must not ship a server upload.
 assert.doesNotMatch(s,/fetch\(|XMLHttpRequest|upload/i);
 assert.ok(s.includes('./ask.html'),'scan page should route to Shayni');
});
