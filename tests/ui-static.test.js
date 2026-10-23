import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const file=async name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('browser inline script passes Node syntax check',async()=>{
 for(const path of ['index.html','tutor.html','library.html']){const html=await file(path);const m=html.match(/<script(?: type="module")?>([\s\S]*?)<\/script>/);assert.ok(m,'missing script in '+path);const parsed=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(parsed.status,0,path+' JavaScript syntax error: '+parsed.stderr)}
});
test('UI labels do not misrepresent search as verified generative AI',async()=>{
 const html=await file('tutor.html');
 assert.match(html,/এটি AI chat নয়/);assert.match(html,/AI সংযোগ থাকলেই/);assert.match(html,/PDF পৃষ্ঠা/);assert.match(html,/source\.url/);
});
test('publisher-imported bookshelf has substantial, source-linked complete source text',async()=>{
 const base=new URL('../data/books/',import.meta.url);
 const catalog=JSON.parse(await readFile(new URL('catalog.json',base),'utf8'));
 assert.equal(catalog.books.length,3);
 let count=0;
 for(const [id,min] of [['fundamentals',130],['skills',200],['terminology',140]]){
  const book=JSON.parse(await readFile(new URL(id+'.json',base),'utf8'));
  assert.ok(book.chapters.length>=min,id+' chapter count too small');
  assert.match(book.license,/CC BY 4.0/);assert.match(book.official_pdf,/open\/download\?type=pdf/);
  assert.ok(book.chapters.every(ch=>ch.title&&ch.url?.startsWith('https://wtcs.pressbooks.pub/')&&ch.sections?.some(s=>s.text.length>35)));
  assert.ok(book.chapters.some(ch=>ch.sections.some(s=>s.text.length>300)),id+' lacks substantial textbook passage');
  count+=book.chapters.length;
 }
 assert.ok(count>=470);
});
test('PWA caches verified learning module, without server-side secrets',async()=>{
 const sw=await file('sw.js');assert.match(sw,/tutor\.html/);assert.match(sw,/src\/lesson-data\.js/);
 const manifest=JSON.parse(await file('manifest.webmanifest'));assert.equal(manifest.display,'standalone');
 for(const path of ['index.html','tutor.html','src/answer-core.js','src/lesson-data.js'])assert.doesNotMatch(await file(path),/sk-[a-zA-Z0-9]{25,}/);
});
