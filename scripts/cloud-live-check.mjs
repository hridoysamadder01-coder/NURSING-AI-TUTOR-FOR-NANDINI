// Real-key check of the online strong mode and the voice conversation, using the app's own modules.
// Run: GEMINI_API_KEY=… GROQ_API_KEY=… node scripts/cloud-live-check.mjs [outDir]
// A: every model in the route answers verified-RAG Bangla questions (plus a "বুঝিনি" round and a friend chat).
// B: Gemini TTS speaks a Bangla question; C: Groq Whisper writes it back as text (round trip).
// D: Gemini Live hears that recorded question, looks it up with lookup_nursing, and answers by voice;
//    the spoken answer is written back with Whisper, so the evidence is readable text.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const mem=new Map();globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const cloud=await import('../src/cloud-ai.js');
const {retrieve,chunkBooks,buildIndex,buildMessages,buildChatMessages,lookupText}=await import('../src/rag.js');
const {LiveTalk,toBase64,fromBase64,wav}=await import('../src/live-talk.js');
const out=process.argv[2]||'live-check-out';mkdirSync(out,{recursive:true});
const G=process.env.GEMINI_API_KEY||'',Q=process.env.GROQ_API_KEY||'';
if(!G&&!Q){console.error('Set GEMINI_API_KEY and/or GROQ_API_KEY.');process.exit(2)}
cloud.setKeys({gemini:G,groq:Q});
const books=['fundamentals','skills','terminology','mentalhealth'].map(id=>JSON.parse(readFileSync('data/books/'+id+'.json','utf8')));
const index=buildIndex(chunkBooks(books));
const report=[],fail=[];const log=s=>{console.log(s);report.push(s)};
const secs=ms=>(ms/1000).toFixed(1)+' s';

log('# Strong mode and voice check · '+new Date().toISOString()+'\n');
log('## A. Bangla questions through each model (verified RAG prompt)\n');
const QUESTIONS=['হৃদ্‌যন্ত্র কীভাবে কাজ করে?','ধমনি আর শিরার পার্থক্য কী?','Osmosis কী?','ভাইটাল সাইনের স্বাভাবিক মান কত?','হাইপোক্সিয়ার লক্ষণ কী কী?'];
const all=[...cloud.ROUTE];
for(const route of all){
 if(!cloud.hasKey(route.provider)){log('- '+route.label+': skipped (no key)');continue}
 cloud.ROUTE.splice(0,cloud.ROUTE.length,route);
 log('### '+route.label+'\n');
 for(const q of QUESTIONS){
  const ctx=retrieve(q,index);
  try{const t0=Date.now();let first=0;const r=await cloud.generate(buildMessages(q,ctx,{cloud:true}),{onToken:()=>{first||=Date.now()-t0}});
   log('**'+q+'** · first words '+secs(first)+', full '+secs(r.ms)+'\n\n'+r.text.trim()+'\n')}
  catch(e){log('**'+q+'** · ❌ '+e.message+' '+JSON.stringify(e.tried||[]));fail.push(route.id+': '+q)}
 }
}
cloud.ROUTE.splice(0,cloud.ROUTE.length,...all);
log('### Full route: "বুঝিনি" round and friend chat\n');
{
 const q='ধমনি আর শিরার পার্থক্য কী?',ctx=retrieve(q,index);
 try{const first=await cloud.generate(buildMessages(q,ctx,{cloud:true}));
  const again=await cloud.generate(buildMessages(q,ctx,{cloud:true,followUp:'simpler',attempt:0,previous:first.text}));
  log('**'+q+' → বুঝিনি** ('+again.route.label+')\n\n'+again.text.trim()+'\n')}catch(e){log('❌ follow-up: '+e.message);fail.push('follow-up')}
 try{const r=await cloud.generate(buildChatMessages('amar khub tens hoitase, kal exam'),{temperature:0.8,maxTokens:300});log('**chat: amar khub tens hoitase, kal exam** ('+r.route.label+')\n\n'+r.text.trim()+'\n')}
 catch(e){log('❌ chat: '+e.message);fail.push('chat')}
}

log('## B/C. Gemini TTS → Groq Whisper round trip\n');
const spoken='হৃদ্‌যন্ত্র কীভাবে কাজ করে? সহজ করে বলো।';let questionWav=null;
if(G){try{const t0=Date.now();const r=await cloud.speechAudio(spoken);questionWav=r.wav;writeFileSync(join(out,'question.wav'),r.wav);
 log('- TTS '+r.model+': '+r.wav.length+' bytes in '+secs(Date.now()-t0)+' → question.wav')}catch(e){log('- ❌ TTS: '+e.message+' '+JSON.stringify(e.tried||[]));fail.push('tts')}}
if(Q&&questionWav){try{const t0=Date.now();const text=await cloud.transcribe(new Blob([questionWav],{type:'audio/wav'}));
 log('- Whisper heard: "'+text+'" ('+secs(Date.now()-t0)+')')}catch(e){log('- ❌ Whisper: '+e.message);fail.push('whisper')}}

log('\n## D. Gemini Live: voice in → voice out\n');
if(G&&questionWav){
 // 16 kHz mono 16-bit PCM for Live, from the TTS recording.
 writeFileSync(join(out,'q.wav'),questionWav);
 execFileSync('ffmpeg',['-loglevel','error','-y','-i',join(out,'q.wav'),'-ar','16000','-ac','1','-f','s16le',join(out,'q16.raw')]);
 const pcm=readFileSync(join(out,'q16.raw'));
 const replyChunks=[],lookups=[];let userText='',aiText='',firstAudioAt=0,endedAt=0;
 try{
  const talk=new LiveTalk({key:G,lookup:async query=>{lookups.push(query);return lookupText(query,index)},
   onAudio:b64=>{firstAudioAt||=Date.now();replyChunks.push(fromBase64(b64))},onUserText:t=>userText+=t,onAiText:t=>aiText+=t,onError:c=>log('- live error: '+c)});
  const t0=Date.now();await talk.connect();log('- connected and set up in '+secs(Date.now()-t0));
  const turn=new Promise((resolve,reject)=>{talk.events.onTurnEnd=resolve;talk.events.onState=(s,code,reason)=>{if(s==='closed')reject(new Error('closed '+code+' '+reason))};setTimeout(()=>reject(new Error('no_reply_in_60s')),60000)});
  // Stream like a microphone: 100 ms chunks in real time, then a little silence.
  for(let i=0;i<pcm.length;i+=3200){talk.sendAudio(toBase64(pcm.subarray(i,i+3200)));await new Promise(r=>setTimeout(r,100))}
  for(let i=0;i<15;i++){talk.sendAudio(toBase64(new Uint8Array(3200)));await new Promise(r=>setTimeout(r,100))}
  endedAt=Date.now();talk.endAudio();
  await turn;talk.close();
  const reply=new Uint8Array(replyChunks.reduce((n,c)=>n+c.length,0));let o=0;for(const c of replyChunks){reply.set(c,o);o+=c.length}
  writeFileSync(join(out,'live-reply.wav'),wav(reply,24000));
  log('- Live heard: "'+userText.trim()+'"');
  log('- lookup_nursing calls: '+(lookups.length?lookups.map(x=>'"'+x+'"').join(', '):'none'));
  log('- first reply audio '+secs(firstAudioAt-endedAt)+' after she stopped talking; reply '+(reply.length/48000).toFixed(1)+' s of audio → live-reply.wav');
  log('- Live\'s own transcript of its answer: "'+aiText.trim()+'"');
  if(Q){const heard=await cloud.transcribe(new Blob([wav(reply,24000)],{type:'audio/wav'}));log('- Whisper on the spoken answer: "'+heard+'"')}
  if(!reply.length)fail.push('live: no audio');
 }catch(e){log('- ❌ Live: '+e.message);fail.push('live')}
}else log('- skipped (needs the Gemini key and the TTS recording)');

log('\n## Result: '+(fail.length?'❌ '+fail.length+' failed: '+fail.join('; '):'✅ everything answered'));
writeFileSync(join(out,'report.md'),report.join('\n')+'\n');
process.exit(fail.length?1:0);
