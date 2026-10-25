// Real headless Chromium smoke test at Android viewport; not a substitute for physical phone.
import {chromium} from 'playwright';
import {server} from '../server.mjs';
import assert from 'node:assert/strict';
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await listen();const port=server.address().port;const base='http://127.0.0.1:'+port;
// Fake microphone and no autoplay block, for the voice tests.
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});let failed=false;
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
 await page.locator('#askForm button[type=submit]').click();
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
   stop:async()=>{},cancelDownload:async()=>{},deleteModel:async()=>{files=[]},unload:async()=>{}},
   NandiniVoice:{addListener:async(ev,fn)=>{(l[ev]??=[]).push(fn);return {remove:()=>{l[ev]=l[ev].filter(f=>f!==fn)}}},
    status:async()=>({tts:true,bangla:true,stt:true,onDevice:true,mic:true,engine:'com.google.android.googlequicksearchbox',engines:['com.vivo.voice','com.google.android.googlequicksearchbox']}),
    listen:async()=>{emit('partial',{text:'হৃদ্‌যন্ত্র'});return {text:'হৃদ্‌যন্ত্র কীভাবে কাজ করে?'}},
    speak:async({text})=>{window.__spoken.push(text);const id='u'+window.__spoken.length;setTimeout(()=>emit('speakDone',{id}),30);return {id}},stopSpeaking:async()=>{},stopListening:async()=>{},installVoice:async()=>{},keepAwake:async({on})=>{window.__awake=on}}}};
  window.__spoken=[];
 });
 const app=await nativeCtx.newPage();app.on('pageerror',e=>errors.push(String(e)));
 await app.goto(base+'/settings.html#local-ai',{waitUntil:'networkidle'});
 await app.waitForFunction(()=>document.querySelector('#aiDevice')?.textContent.includes('Test Phone'));
 await app.locator('#aiModels button',{hasText:'নামাও'}).first().click();
 await app.waitForFunction(()=>document.querySelector('#aiModels h3')?.textContent.includes('✅'));
 await app.waitForFunction(()=>document.querySelector('#voiceStatus')?.textContent.includes('বাংলা কণ্ঠ: আছে'));
 assert.match(await app.locator('#voiceStatus').innerText(),/শোনার ইঞ্জিন: com\.google\.android\.googlequicksearchbox/);
 assert.ok(await app.locator('#aiAuto').isVisible());
 await app.goto(base+'/ask.html?q='+encodeURIComponent('ধমনি আর শিরার পার্থক্য কী?'),{waitUntil:'networkidle'});
 await app.waitForFunction(()=>document.querySelector('.aibox .out')?.textContent.includes('দূরে নেয়'),null,{timeout:10000});
 await app.waitForFunction(()=>document.querySelector('.aibox .meta')?.textContent.includes('AI ভুল করতে পারে'));
 const sent=await app.evaluate(()=>window.__gen[0]);
 assert.equal(sent[0].role,'system');assert.match(sent[1].content,/তথ্য:/);assert.match(sent[1].content,/বাম নিলয়/);
 // Natural chat: "বুঝিনি" re-explains the previous question, a greeting gets a friendly reply without the model.
 await app.locator('#chat .quick button',{hasText:'বুঝিনি'}).click();
 await app.waitForFunction(()=>window.__gen.length===2&&document.querySelectorAll('.aibox .meta').length===2,null,{timeout:10000});
 assert.match(await app.locator('#chat .msg.bot').last().innerText(),/আবার সহজ করে বলছি/);
 const again=await app.evaluate(()=>window.__gen[1][1].content);
 assert.match(again,/ধমনি \(Artery\) হৃদ্‌যন্ত্র থেকে রক্ত দূরে নেয়/);assert.match(again,/বুঝতে পারেনি/);
 // A second "বুঝিনি" must not repeat: another explaining style and another part of the verified topic.
 await app.locator('#chat .quick button',{hasText:'বুঝিনি'}).click();
 await app.waitForFunction(()=>window.__gen.length===3&&document.querySelectorAll('.aibox .meta').length===3,null,{timeout:10000});
 const third=await app.evaluate(()=>window.__gen[2][1].content);
 assert.match(third,/ধাপে ধাপে/);assert.notEqual(third,again);
 assert.match(await app.locator('#chat .msg.bot').last().innerText(),/ধাপে ধাপে দেখো/);
 await app.locator('#q').fill('bondhu');await app.locator('#askForm button[type=submit]').click();
 await app.waitForFunction(()=>document.querySelector('#chat .msg.bot:last-child')?.textContent.includes('বন্ধু'));
 await app.locator('#q').fill('amar khub tens hoitase');await app.locator('#askForm button[type=submit]').click();
 await app.waitForFunction(()=>window.__gen.length===4,null,{timeout:10000});
 assert.match(await app.evaluate(()=>window.__gen[3][0].content),/পড়ার বন্ধু/,'feelings get the friendly chat prompt, not a book search');
 assert.doesNotMatch(await app.locator('#chat .msg.bot').last().innerText(),/Tense|ভালো প্রশ্ন/,'"tens" (tension) must not show the grammar topic');
 await app.locator('#q').fill('hi mama');await app.locator('#askForm button[type=submit]').click();
 await app.waitForFunction(()=>document.querySelector('#chat .msg.bot:last-child')?.textContent.includes('হ্যালো নন্দিনী'));
 assert.equal(await app.locator('#chat .quick').count(),1,'only the latest answer keeps the quick replies');
 await app.locator('#q').fill('বাংলাদেশের ক্রিকেট অধিনায়ক কে?');await app.locator('#askForm button[type=submit]').click();
 await app.waitForFunction(()=>[...document.querySelectorAll('.aibox .out')].some(o=>o.textContent.includes('পাইনি')),null,{timeout:20000});
 await app.locator('#q').fill('জ্বরের রোগীকে প্যারাসিটামল কত mg দেব?');await app.locator('#askForm button[type=submit]').click();
 await app.waitForFunction(()=>[...document.querySelectorAll('.aibox .out')].some(o=>o.textContent.includes('ডোজ রোগী অনুযায়ী')),null,{timeout:20000});
 assert.equal(await app.evaluate(()=>window.__gen.length),4,'greetings, off-topic and dose questions must not reach the model');
 // Voice to voice: 🎤 asks the spoken question, and the AI answer is read aloud when it is complete.
 await app.locator('#mic').click();
 await app.waitForFunction(()=>window.__gen.length===5&&window.__spoken.some(t=>t.includes('দূরে নেয়')),null,{timeout:10000});
 assert.match(await app.locator('#chat .msg.me').last().innerText(),/🎤 হৃদ্‌যন্ত্র কীভাবে কাজ করে/);
 assert.ok(await app.locator('#chat .msg.bot').last().locator('.aibox button',{hasText:'শোনো'}).count());
 // Talk mode offline: the phone listens, the phone model answers in spoken style, the phone's voice speaks it.
 const spokenBefore=await app.evaluate(()=>window.__spoken.length),gensBefore=await app.evaluate(()=>window.__gen.length);
 await app.locator('#talk').click();
 await app.waitForFunction(n=>window.__spoken.length>n,spokenBefore,{timeout:10000});
 assert.match(await app.locator('#talkEngine').innerText(),/ফোনের কণ্ঠ/);assert.equal(await app.evaluate(()=>window.__awake),true,'the screen stays on while talking');
 assert.match(await app.evaluate(n=>window.__gen[n][0].content,gensBefore),/কণ্ঠে পড়ে শোনানো হবে/,'talk mode asks for a spoken-style answer');
 await app.locator('#talkEnd').click();assert.ok(await app.locator('#talkView').isHidden());assert.equal(await app.evaluate(()=>window.__awake),false);
 await nativeCtx.close();
 // Strong mode on the website (no phone model): fake Gemini/Groq servers. The first Gemini model is at its free limit,
 // the second answers; then all of Gemini is down and Groq answers.
 const webCtx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'};
 let geminiDown=false;const seen=[];
 const stream=(chunks)=>chunks.map(c=>'data: '+JSON.stringify(c)+'\n\n').join('');
 await webCtx.route(/generativelanguage\.googleapis\.com/,async route=>{const r=route.request();if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const body=JSON.parse(r.postData()||'{}');seen.push({url:r.url(),body,key:r.headers()['x-goog-api-key']});
  const tiny=JSON.stringify(body).includes('শুধু লেখো');
  if(geminiDown)return route.fulfill({status:503,headers:cors,body:'{}'});
  // Listening: a recording sent to Gemini to be written down (not streamed, JSON reply).
  if(body.contents?.[0]?.parts?.[0]?.inlineData&&!r.url().includes('gemini-3.5-flash-lite'))return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({transcript:'Osmosis কী?'})}]}}]})});
  if(r.url().includes('gemini-3.5-flash-lite')&&!tiny)return route.fulfill({status:429,headers:{...cors,'retry-after':'60'},body:'{"error":{"code":429}}'});
  return route.fulfill({status:200,headers:{...cors,'content-type':'text/event-stream'},body:stream([{candidates:[{content:{parts:[{text:tiny?'ঠিক আছে':'শক্তিশালী উত্তর: ধমনি রক্ত '}]}}]},{candidates:[{content:{parts:[{text:tiny?'':'হৃদ্‌যন্ত্র থেকে দূরে নেয়।'}]}}]}])})});
 await webCtx.route(/api\.groq\.com/,async route=>{const r=route.request();if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(r.url().includes('audio/transcriptions')){seen.push({url:r.url(),whisper:(r.postDataBuffer()||Buffer.alloc(0)).length,auth:r.headers()['authorization']});return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:JSON.stringify({text:'Osmosis কী?'})})}
  seen.push({url:r.url(),body:JSON.parse(r.postData()||'{}'),auth:r.headers()['authorization']});
  return route.fulfill({status:200,headers:{...cors,'content-type':'text/event-stream'},body:stream([{choices:[{delta:{content:'Groq-এর উত্তর।'}}]}])+'data: [DONE]\n\n'})});
 const web=await webCtx.newPage();web.on('pageerror',e=>errors.push(String(e)));
 await web.goto(base+'/settings.html#cloud',{waitUntil:'networkidle'});
 await web.locator('#geminiKey').fill('AIza-test-key');await web.locator('#groqKey').fill('gsk_test');
 await web.locator('#cloudSave').click();assert.match(await web.locator('#cloudResult').innerText(),/সেভ হয়েছে/);
 await web.locator('#cloudTest').click();
 await web.waitForFunction(()=>/Gemini[^]*কাজ করছে[^]*Groq[^]*কাজ করছে/.test(document.querySelector('#cloudResult')?.textContent||''),null,{timeout:10000});
 await web.goto(base+'/ask.html',{waitUntil:'networkidle'});
 await web.locator('#q').fill('ধমনি আর শিরার পার্থক্য কী?');await web.locator('#askForm button[type=submit]').click();
 await web.waitForFunction(()=>document.querySelector('.aibox .meta')&&document.querySelector('.aibox .out')?.textContent.includes('দূরে নেয়'),null,{timeout:10000});
 assert.match(await web.locator('.aibox b').innerText(),/শক্তিশালী AI · Gemini 3\.1 Flash-Lite/);
 const asked=seen.filter(s=>s.body?.systemInstruction);
 assert.ok(asked.length>=2&&asked[0].url.includes('gemini-3.5-flash-lite')&&asked.at(-1).url.includes('gemini-3.1-flash-lite'),'429 moved the question to the next model');
 assert.equal(asked[0].key,'AIza-test-key');assert.match(asked[0].body.systemInstruction.parts[0].text,/আন্দাজ করবে না/);
 assert.match(asked[0].body.contents[0].parts[0].text,/ধমনি \(Artery\) হৃদ্‌যন্ত্র থেকে রক্ত দূরে নেয়/,'the cloud model gets the verified topic text');
 geminiDown=true;
 await web.locator('#q').fill('Osmosis কী?');await web.locator('#askForm button[type=submit]').click();
 await web.waitForFunction(()=>document.querySelectorAll('.aibox .meta').length===2,null,{timeout:10000});
 assert.match(await web.locator('.aibox b').last().innerText(),/Groq/);assert.match(await web.locator('.aibox .out').last().innerText(),/Groq-এর উত্তর/);
 assert.equal(seen.at(-1).auth,'Bearer gsk_test');
 // Not in the notes: the online model decides (her subjects from general knowledge, saying so; others back to study).
 await web.locator('#q').fill('বাংলাদেশের ক্রিকেট অধিনায়ক কে?');await web.locator('#askForm button[type=submit]').click();
 await web.waitForFunction(()=>document.querySelectorAll('.aibox .meta').length===3,null,{timeout:20000});
 const offTopic=seen.at(-1).body;assert.match(offTopic.messages[0].content,/বিষয়ের বাইরে হলে[^]*পড়ায় ফেরাবে/);assert.match(offTopic.messages[1].content,/\(কিছু নেই\)/);
 await web.locator('#q').fill('তোমাকে মূলত তৈরি করেছে কে?');await web.locator('#askForm button[type=submit]').click();
 await web.waitForFunction(()=>document.querySelector('#chat .msg.bot:last-child')?.textContent.includes('হৃদয় সমাদ্দার স্যার'));
 // Talk mode with a fake Gemini Live server: setup, microphone audio, a lookup_nursing tool call answered from the
 // verified notes, spoken audio back, transcripts on screen and kept in the chat.
 const live={setup:null,setups:[],audio:0,toolResult:null,quota:false};
 await webCtx.routeWebSocket(/BidiGenerateContent/,ws=>{ws.onMessage(raw=>{const m=JSON.parse(String(raw));
  if(m.setup&&live.quota){ws.close({code:1011,reason:'Quota exceeded'});return}
  if(m.setup){live.setup??=m.setup;live.setups.push(m.setup);ws.send(JSON.stringify({setupComplete:{}}));if(live.setups.length===1)ws.send(JSON.stringify({sessionResumptionUpdate:{resumable:true,newHandle:'h1'}}));return}
  if(m.realtimeInput?.audio){live.audio++;if(live.audio===4){ws.send(JSON.stringify({serverContent:{inputTranscription:{text:'ধমনি আর শিরার পার্থক্য কী?'}}}));ws.send(JSON.stringify({toolCall:{functionCalls:[{id:'c1',name:'lookup_nursing',args:{query:'ধমনি আর শিরার পার্থক্য'}}]}}))}}
  // The first reply slips into Hindi: the app must cut it off and ask for it again in Bangla.
  if(m.toolResponse){live.toolResult=m.toolResponse.functionResponses[0];
   ws.send(JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(4800).toString('base64')}}]},outputTranscription:{text:'धमनी रक्त को दूर ले जाती है'}}}));
   ws.send(JSON.stringify({serverContent:{turnComplete:true}}));return}
  if(m.realtimeInput?.text){live.redo=m.realtimeInput.text;
   ws.send(JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(4800).toString('base64')}}]},outputTranscription:{text:'ধমনি রক্ত হৃদ্‌যন্ত্র থেকে দূরে নেয়। বুঝেছ?'}}}));
   ws.send(JSON.stringify({serverContent:{turnComplete:true}}));
   // The server's ~10 minute connection limit: it warns, and the app must continue the same conversation.
   setTimeout(()=>ws.send(JSON.stringify({goAway:{timeLeft:'5s'}})),200)}
 })});
 await web.goto(base+'/ask.html',{waitUntil:'networkidle'});
 assert.ok(await web.locator('#talk').isVisible(),'talk mode button is shown with a Gemini key');
 await web.locator('#talk').click();
 await web.waitForFunction(()=>document.querySelector('#capAi')?.textContent.includes('দূরে নেয়'),null,{timeout:15000});
 assert.equal(live.setup.model,'models/gemini-3.8-live');assert.deepEqual(live.setup.generationConfig.responseModalities,['AUDIO']);
 assert.equal(live.setup.tools[0].functionDeclarations[0].name,'lookup_nursing');assert.match(live.setup.systemInstruction.parts[0].text,/lookup_nursing/);
 assert.ok(live.audio>=4,'microphone audio is streamed');
 assert.deepEqual(live.setup.contextWindowCompression,{slidingWindow:{}},'long sessions are allowed');
 for(let i=0;i<50&&live.setups.length<2;i++)await web.waitForTimeout(100);
 assert.equal(live.setups.length,2,'after goAway the app reconnects');assert.deepEqual(live.setups[1].sessionResumption,{handle:'h1'},'and resumes the same conversation');
 assert.match(live.setup.systemInstruction.parts[0].text,/শায়নি[^]*হৃদয় সমাদ্দার স্যার/);assert.match(await web.locator('#talkEngine').innerText(),/আজ/);
 assert.match(live.toolResult.response.result,/ধমনি \(Artery\) হৃদ্‌যন্ত্র থেকে রক্ত দূরে নেয়/,'facts come from the verified notes');
 assert.match(await web.locator('#capUser').innerText(),/ধমনি আর শিরার পার্থক্য/);
 await web.locator('#talkEnd').click();assert.ok(await web.locator('#talkView').isHidden());
 assert.match(await web.locator('#chat .msg.me').last().innerText(),/🗣️ ধমনি আর শিরার পার্থক্য/);
 assert.match(await web.locator('#chat .msg.bot.talklog').last().innerText(),/দূরে নেয়/);
 assert.match(live.redo,/বাংলায় বলো/,'a Hindi reply is asked again in Bangla');assert.doesNotMatch(await web.locator('#chat').innerText(),/[\u0900-\u0963]/,'no Hindi is shown');
 // 🎤 dictation online: the recording goes to (fake) Gemini, which writes it down (the first model is at its limit), and
 // the written question is asked; with Gemini down, Whisper writes it.
 const dictated=()=>web.evaluate(()=>[...document.querySelectorAll('#chat .msg.me')].filter(m=>m.textContent.includes('🎤 Osmosis কী?')).length);
 geminiDown=false;
 await web.locator('#mic').click();await web.waitForTimeout(1500);await web.locator('#mic').click();
 await web.waitForFunction(()=>[...document.querySelectorAll('#chat .msg.me')].some(m=>m.textContent.includes('🎤 Osmosis কী?')),null,{timeout:15000});
 const ears=seen.filter(s=>s.body?.contents?.[0]?.parts?.[0]?.inlineData);
 assert.ok(ears.length===2&&ears[0].url.includes('gemini-3.5-flash-lite')&&ears[1].url.includes('gemini-3.1-flash-lite:generateContent'),'Gemini writes it down, the next model when one is at its limit');
 assert.ok(ears[1].body.contents[0].parts[0].inlineData.data.length>1000);assert.match(ears[1].body.systemInstruction.parts[0].text,/শ্রুতিলেখক/);
 assert.ok(!seen.some(s=>s.whisper),'Whisper is not needed while Gemini listens');
 await web.waitForFunction(()=>[...document.querySelectorAll('.aibox')].at(-1)?.querySelector('.meta'),null,{timeout:15000});
 geminiDown=true;
 await web.locator('#mic').click();await web.waitForTimeout(1500);await web.locator('#mic').click();
 await web.waitForFunction(n=>[...document.querySelectorAll('#chat .msg.me')].filter(m=>m.textContent.includes('🎤 Osmosis কী?')).length>n,1,{timeout:15000});
 assert.equal(await dictated(),2);
 const w=seen.find(s=>s.whisper);assert.ok(w&&w.whisper>1000&&w.auth==='Bearer gsk_test','with Gemini down the recorded audio is sent to Whisper');
 // Gemini Live's free limit is used up: talk mode goes on at level 2 (Whisper ears + online text AI) instead of stopping.
 live.quota=true;
 await web.locator('#talk').click();
 await web.waitForFunction(()=>/স্তর ২/.test(document.querySelector('#talkEngine')?.textContent||''),null,{timeout:10000});
 await web.waitForTimeout(1500);await web.locator('#orb').click();
 await web.waitForFunction(()=>document.querySelector('#capAi')?.textContent.includes('Groq-এর উত্তর'),null,{timeout:15000});
 assert.match(await web.locator('#capUser').innerText(),/Osmosis/);
 await web.locator('#talkEnd').click();

 await webCtx.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: Mobile Chrome home -> coach -> local progress/reload -> server-owned cross-book search -> secure AI settings -> 4-book shelf -> cited chapter reader -> simple-Bangla topics -> instant offline Tutor -> local AI setup, streamed RAG answer, follow-up, small talk and voice (stand-in engines) -> online strong mode with Gemini 429 → next model → Groq -> Gemini Live talk mode with lookup tool (fake servers, fake mic)');
}finally{await browser.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
