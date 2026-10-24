// Real headless Chromium smoke test at Android viewport; not a substitute for physical phone.
import {chromium} from 'playwright';
import {server} from '../server.mjs';
import assert from 'node:assert/strict';
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await listen();const port=server.address().port;const base='http://127.0.0.1:'+port;
const browser=await chromium.launch({headless:true});let failed=false;
try{
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/index.html',{waitUntil:'networkidle'});
 assert.match(await page.title(),/Nandini/);
 await page.getByRole('link',{name:/Study Coach/}).first().click();
 await page.waitForURL(/coach\.html/);
 assert.match(await page.locator('#chosenSubject').innerText(),/নার্সিং/);
 assert.equal(await page.locator('.topic').count(),8);
 await page.locator('.topic button').first().click();
 assert.match(await page.locator('#doneStat').innerText(),/^(1|১)$/);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await page.locator('#doneStat').innerText(),/^(1|১)$/);
 await page.locator('#search').fill('hand hygiene');
 await page.locator('#searchBtn').click();
 await page.waitForFunction(()=>document.querySelectorAll('#sources .source').length>0,null,{timeout:20000});
 const src=await page.locator('#sources .source a').first().getAttribute('href');
 assert.match(src,/https:\/\/wtcs\.pressbooks\.pub\//);
 await page.goto(base+'/settings.html',{waitUntil:'networkidle'});
 await page.locator('#advanced summary').click();
 await page.locator('#apiBase').fill('http://invalid.example');
 await page.locator('#save').click();
 assert.match(await page.locator('#result').innerText(),/HTTPS/);
 await page.locator('#clear').click();
 await page.goto(base+'/library.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('#shelf .bookrow').length===4);
 await page.locator('#shelf .bookrow button').first().click();
 await page.waitForFunction(()=>document.querySelector('#chapters')?.options?.length>0);
 assert.ok((await page.locator('#chapters option').count())>=130);
 const listChapter=await page.evaluate(async()=>{const data=await (await fetch('./data/books/fundamentals.json')).json();return data.chapters.findIndex(ch=>ch.sections.some(s=>s.blocks?.some(b=>b.type==='bullet')))});
 assert.ok(listChapter>=0,'Publisher bullet formatting not found');
 await page.selectOption('#chapters',String(listChapter));
 await page.waitForFunction(()=>document.querySelectorAll('#article .source-list li').length>0);
 assert.ok((await page.locator('#article .source-list li').count())>=1);
 const orderedChapter=await page.evaluate(async()=>{const data=await (await fetch('./data/books/skills.json')).json();return data.chapters.findIndex(ch=>ch.sections.some(s=>s.blocks?.some(b=>b.type==='numbered')))});
 if(orderedChapter>=0){
   await page.goto(base+'/library.html?book=skills',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('#chapters')?.options.length>=200,null,{timeout:20000});
   await page.selectOption('#chapters',String(orderedChapter));
   await page.waitForFunction(()=>document.querySelectorAll('#article ol.source-list>li').length>0,null,{timeout:20000});
   assert.ok((await page.locator('#article ol.source-list>li').count())>0);
   const style=await page.locator('#article ol.source-list').first().evaluate(el=>getComputedStyle(el).listStyleType);
   assert.equal(style,'decimal','Numbered source procedures must render visible 1, 2, 3 numbering');
   await page.goto(base+'/library.html?book=fundamentals',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('#chapters')?.options.length>=130);
 }


 await page.locator('[data-mode="both"]').click();
 assert.equal(await page.locator('#article').getAttribute('class'),'mode-both');
 assert.ok((await page.locator('#article .paragraph').count())>5);
 assert.ok((await page.locator('#article .readsection').count())>=1);
 assert.ok((await page.locator('#article .original').first().innerText()).length>15);
 await page.waitForFunction(()=>document.querySelector('#translateStatus')?.textContent.includes('অনুচ্ছেদের বাংলা'),null,{timeout:10000});
 await page.locator('#translateChapter').click();
 await page.waitForFunction(()=>document.querySelector('#translateStatus')?.textContent.includes('Android APK'),null,{timeout:10000});
  await page.locator('#searchText').fill('hand hygiene');
 await page.locator('#searchBtn').click();
 assert.ok((await page.locator('#results').innerText()).length>40);
 await page.goto(base+'/topics.html',{waitUntil:'networkidle'});
 assert.ok((await page.locator('.tcard').count())>=30,'Simple-Bangla topics missing');
 await page.locator('#topicSearch').fill('osmosis');
 await page.locator('#osmosis summary').click();
 await page.locator('#osmosis .option').nth(1).click();
 assert.match(await page.locator('#osmosis .explain').innerText(),/সঠিক/);
 assert.match(await page.locator('#osmosis a[href*="library.html"]').getAttribute('href'),/book=fundamentals&q=/);
 await page.goto(base+'/coach.html',{waitUntil:'networkidle'});
 await page.locator('a[href="./topics.html#vital-signs"]').click();
 await page.waitForURL(/topics\.html#vital-signs/);
 assert.equal(await page.locator('#vital-signs').getAttribute('open'),'');
 await page.goto(base+'/index.html',{waitUntil:'networkidle'});
 await page.locator('.askhome input').fill('osmosis কী?');
 await page.locator('.askhome button').click();
 await page.waitForURL(/ask\.html/);
 await page.waitForFunction(()=>document.querySelector('#chat .msg.bot h3')?.textContent.includes('অভিস্রবণ'),null,{timeout:10000});
 await page.locator('#q').fill('ধমনি আর শিরার পার্থক্য কী?');
 await page.locator('#askForm button').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('#chat .msg.bot h3')].some(h=>h.textContent.includes('হৃদ্')),null,{timeout:10000});
 // Android app path with a stand-in for the native NandiniLlm plugin (the real engine is checked in the APK build).
 const nativeCtx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await nativeCtx.addInitScript(()=>{
  const l={},emit=(ev,d)=>(l[ev]||[]).forEach(f=>f(d));let files=JSON.parse(localStorage.getItem('test-model-files')||'[]');window.__gen=[];
  window.Capacitor={isNativePlatform:()=>true,Plugins:{NandiniLlm:{
   addListener:async(ev,fn)=>{(l[ev]??=[]).push(fn);return {remove:()=>{l[ev]=l[ev].filter(f=>f!==fn)}}},
   status:async()=>({files,loaded:null,totalRamMb:8000,availRamMb:4000,freeSpaceMb:20000,cores:8,threads:4,abi:'arm64-v8a',device:'Test Phone'}),
   download:async({fileName,bytes})=>{for(const r of [.25,.5,1])emit('downloadProgress',{received:bytes*r,total:bytes});files=[{name:fileName,bytes}];localStorage.setItem('test-model-files',JSON.stringify(files));return {done:true}},
   load:async()=>({ms:5,threads:4,system:'test'}),
   generate:async({messages})=>{window.__gen.push(messages);for(const t of ['ধমনি ','হৃদ্‌যন্ত্র ','থেকে ','রক্ত ','দূরে ','নেয়।'])emit('token',{text:t});return {promptTokens:300,generatedTokens:6,prefillMs:900,generateMs:600,stopped:false}},
   stop:async()=>{},cancelDownload:async()=>{},deleteModel:async()=>{files=[]},unload:async()=>{}}}};
 });
 const app=await nativeCtx.newPage();app.on('pageerror',e=>errors.push(String(e)));
 await app.goto(base+'/settings.html#local-ai',{waitUntil:'networkidle'});
 await app.waitForFunction(()=>document.querySelector('#aiDevice')?.textContent.includes('Test Phone'));
 await app.locator('#aiModels button',{hasText:'নামাও'}).first().click();
 await app.waitForFunction(()=>document.querySelector('#aiModels h3')?.textContent.includes('✅'));
 assert.ok(await app.locator('#aiAuto').isVisible());
 await app.goto(base+'/ask.html?q='+encodeURIComponent('ধমনি আর শিরার পার্থক্য কী?'),{waitUntil:'networkidle'});
 await app.waitForFunction(()=>document.querySelector('.aibox .out')?.textContent.includes('দূরে নেয়'),null,{timeout:10000});
 await app.waitForFunction(()=>document.querySelector('.aibox .meta')?.textContent.includes('AI ভুল করতে পারে'));
 const sent=await app.evaluate(()=>window.__gen[0]);
 assert.equal(sent[0].role,'system');assert.match(sent[1].content,/তথ্য:/);assert.match(sent[1].content,/বাম নিলয়/);
 await app.locator('#q').fill('বাংলাদেশের ক্রিকেট অধিনায়ক কে?');await app.locator('#askForm button').click();
 await app.waitForFunction(()=>[...document.querySelectorAll('.aibox .out')].some(o=>o.textContent.includes('পাইনি')),null,{timeout:20000});
 assert.equal(await app.evaluate(()=>window.__gen.length),1,'off-topic question must not reach the model');
 await nativeCtx.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: Mobile Chrome home -> coach -> local progress/reload -> server-owned cross-book search -> secure AI settings -> 4-book shelf -> cited chapter reader -> simple-Bangla topics -> instant offline Tutor -> local AI setup and streamed RAG answer (stand-in engine)');
}finally{await browser.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
