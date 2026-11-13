import test from 'node:test';import assert from 'node:assert/strict';
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const cloud=await import('../src/cloud-ai.js');
const enc=new TextEncoder();
// A streamed reply split at awkward places, like a real network does.
function sse(events,{status=200,cutAfter=null}={}){
 const text=events.map(e=>'data: '+e+'\r\n\r\n').join('');
 // cutAfter: send that many whole events, then drop the connection.
 const pieces=cutAfter===null?[text.slice(0,7),text.slice(7,30),text.slice(30)]:[events.slice(0,cutAfter).map(e=>'data: '+e+'\r\n\r\n').join('')];
 return new Response(new ReadableStream({pull(c){
  const p=pieces.shift();if(p!==undefined){c.enqueue(enc.encode(p));return}
  if(cutAfter!==null)c.error(new TypeError('network'));else c.close()}}),{status,headers:{'content-type':'text/event-stream'}});
}
const geminiChunk=t=>JSON.stringify({candidates:[{content:{parts:[{text:'ভাবনা',thought:true},{text:t}]}}]});
const groqChunk=t=>JSON.stringify({choices:[{delta:{content:t}}]});
const calls=[];
function serve(handlers){calls.length=0;globalThis.fetch=async(url,opts)=>{const body=opts.body&&typeof opts.body==='string'?JSON.parse(opts.body):null;calls.push({url:String(url),body,headers:opts.headers});
 for(const [match,reply] of handlers)if(String(url).includes(match))return reply(body);throw new TypeError('offline')}}
const msgs=[{role:'system',content:'নিয়ম'},{role:'user',content:'প্রশ্ন'}];

test('server-sent events are read even when split across network chunks',async()=>{
 const got=[];await cloud.readSSE(sse(['{"a":1}','{"a":2}','[DONE]']).body,d=>got.push(d));
 assert.deepEqual(got,['{"a":1}','{"a":2}','[DONE]']);
 assert.equal(cloud.geminiText(JSON.parse(geminiChunk('উত্তর'))),'উত্তর','thought parts are not shown');
 const body=cloud.geminiBody(msgs,{maxTokens:100,temperature:0.3,thinking:'minimal'});
 assert.deepEqual(body.systemInstruction,{parts:[{text:'নিয়ম'}]});assert.equal(body.contents[0].role,'user');assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'minimal');
});
test('a model at its free limit (429) is skipped and the next one answers',async()=>{
 cloud.setKeys({gemini:'g-key',groq:'q-key'});cloud.setEnabled(true);
 serve([['gemini-3.5-flash-lite',()=>new Response('{"error":{"code":429}}',{status:429,headers:{'retry-after':'30'}})],
  ['gemini-3.1-flash-lite',()=>sse([geminiChunk('ধমনি '),geminiChunk('রক্ত দূরে নেয়।')])]]);
 const tokens=[];const r=await cloud.generate(msgs,{onToken:t=>tokens.push(t)});
 assert.equal(r.route.id,'gemini-3.1-flash-lite');assert.equal(r.text,'ধমনি রক্ত দূরে নেয়।');assert.deepEqual(tokens,['ধমনি ','রক্ত দূরে নেয়।']);
 assert.equal(calls[0].headers['x-goog-api-key'],'g-key');assert.ok(!calls[0].url.includes('g-key'),'the key is not put in the URL');
 // The limited model now cools down: the next question goes straight to the second one.
 serve([['gemini-3.1-flash-lite',()=>sse([geminiChunk('আবার')])]]);
 assert.equal((await cloud.generate(msgs)).route.id,'gemini-3.1-flash-lite');assert.equal(calls.length,1);
 assert.ok(cloud.routeStatus().find(r=>r.id==='gemini-3.5-flash-lite').until>Date.now());
});
test('a rejected Gemini key falls through to Groq; everything down means the phone model takes over',async()=>{
 cloud.setKeys({gemini:'bad',groq:'q-key'});
 serve([['generativelanguage',()=>new Response('{}',{status:403})],['api.groq.com',body=>{assert.equal(body.stream,true);assert.equal(body.include_reasoning,false);return sse([groqChunk('Groq '),groqChunk('উত্তর'),'[DONE]'])}]]);
 const r=await cloud.generate(msgs);assert.equal(r.route.provider,'groq');assert.equal(r.text,'Groq উত্তর');
 assert.equal(calls.filter(c=>c.url.includes('generativelanguage')).length,1,'other Gemini models are not tried with a rejected key');
 assert.equal(calls.at(-1).headers.Authorization,'Bearer q-key');
 cloud.setKeys({gemini:'g',groq:'q'});serve([]);
 // Only routes that have a key are tried (no OpenAI key here, so the OpenAI route is skipped).
 const keyed=cloud.ROUTE.filter(r=>cloud.hasKey(r.provider)).length;
 await assert.rejects(cloud.generate(msgs),e=>e.message==='cloud_unavailable'&&e.tried.length===keyed);
});
test('a model that rejects the thinking setting is asked again without it; a cut-off answer is not restarted',async()=>{
 cloud.setKeys({gemini:'g',groq:'q'});
 let first=true;
 serve([['gemini-3.5-flash-lite',body=>{if(first){first=false;assert.ok(body.generationConfig.thinkingConfig);return new Response('{"error":{"message":"thinking_level is not supported"}}',{status:400})}
  assert.equal(body.generationConfig.thinkingConfig,undefined);return sse([geminiChunk('ঠিক আছে')])}]]);
 assert.equal((await cloud.generate(msgs)).text,'ঠিক আছে');
 serve([['gemini-3.5-flash-lite',()=>sse([geminiChunk('অর্ধেক '),geminiChunk('বাকি')],{cutAfter:1})]]);
 await assert.rejects(cloud.generate(msgs),e=>e.message==='cut_off');
 assert.equal(calls.length,1,'no second model after words were already shown');
});
test('strong mode needs a key and can be switched off',()=>{
 cloud.setKeys({gemini:'',groq:''});assert.equal(cloud.ready(),false);
 cloud.setKeys({groq:'q'});assert.equal(cloud.ready(),true);
 cloud.setEnabled(false);assert.equal(cloud.ready(),false);cloud.setEnabled(true);
});
test('a model that no longer exists is not tried first on every question',async()=>{
 cloud.setKeys({gemini:'g2',groq:''});
 serve([['gemini-3.5-flash-lite',()=>new Response('{}',{status:404})],['gemini-3.1-flash-lite',()=>sse([geminiChunk('ঠিক')])]]);
 await cloud.generate(msgs);serve([['gemini-3.1-flash-lite',()=>sse([geminiChunk('আবার')])]]);
 assert.equal((await cloud.generate(msgs)).text,'আবার');assert.equal(calls.length,1);
});
test('her voice is written down by Gemini first, then Whisper large-v3; both down means the phone listens',async()=>{
 cloud.setKeys({gemini:'g-ears',groq:'q-ears'});
 const voice=new Blob([new Uint8Array(3000)],{type:'audio/webm;codecs=opus'});
 const geminiSaid=t=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'ভাবছি',thought:true},{text:JSON.stringify({transcript:t})}]}}]}),{status:200});
 serve([['gemini-3.5-flash-lite',()=>new Response('{}',{status:429})],['gemini-3.1-flash-lite',()=>geminiSaid(' Osmosis কী? ')]]);
 const r=await cloud.transcribe(voice);
 assert.deepEqual(r,{text:'Osmosis কী?',by:'Gemini 3.1 Flash-Lite'});
 const sent=calls.at(-1).body;assert.ok(calls.at(-1).url.endsWith('gemini-3.1-flash-lite:generateContent'));
 assert.equal(sent.contents[0].parts[0].inlineData.mimeType,'audio/webm');assert.ok(sent.contents[0].parts[0].inlineData.data.length>3000);
 assert.match(sent.systemInstruction.parts[0].text,/হুবহু লেখো[^]*উত্তর দেবে না, অনুবাদ করবে না/);assert.equal(sent.generationConfig.responseMimeType,'application/json');assert.equal(sent.generationConfig.temperature,0);
 // The model at its limit for listening is also skipped for answers (one shared free quota).
 serve([['gemini-3.1-flash-lite',()=>sse([geminiChunk('উত্তর')])]]);assert.equal((await cloud.generate(msgs)).route.id,'gemini-3.1-flash-lite');assert.equal(calls.length,1);
 // Gemini cannot take the audio: Whisper large-v3 writes it, in Bangla script with her English terms.
 cloud.setKeys({gemini:'g-ears2',groq:'q-ears'});
 serve([['generativelanguage',()=>new Response('{"error":{"message":"unsupported audio"}}',{status:400})]]);
 // Whisper gets a form (the audio file and settings), recorded here without the file.
 globalThis.fetch=(f=>async(url,opts)=>{if(opts.body instanceof FormData){const form=opts.body;calls.push({url:String(url),form:Object.fromEntries([...form.entries()].filter(([k])=>k!=='file')),headers:opts.headers});return new Response(JSON.stringify({text:'ধমনি কী?'}),{status:200})}return f(url,opts)})(globalThis.fetch);
 assert.deepEqual(await cloud.transcribe(voice),{text:'ধমনি কী?',by:'Groq Whisper'});
 const w=calls.at(-1);assert.equal(w.form.model,'whisper-large-v3');assert.equal(w.form.language,'bn');assert.match(w.form.prompt,/নার্সিং/);assert.equal(w.headers.Authorization,'Bearer q-ears');
 // The Gemini models that refused this audio are not asked again for listening, but still answer questions.
 calls.length=0;await cloud.transcribe(voice);assert.equal(calls.filter(c=>c.url.includes('generativelanguage')).length,0);
 // Everything down: the app's own fallback (the phone's recognizer) takes over.
 cloud.setKeys({gemini:'g3',groq:'q3'});serve([]);
 await assert.rejects(cloud.transcribe(voice),e=>e.message==='ears_unavailable'&&e.tried.length===cloud.EARS.length);
});

test('OpenAI voice: natural female voice via the owner key; needs a key, maps a bad key',async()=>{
 cloud.setKeys({openai:''});
 await assert.rejects(cloud.openaiSpeech('হ্যালো'),/no_key/,'no key → no_key');
 cloud.setKeys({openai:'sk-test'});cloud.setOpenaiVoice('shimmer');
 serve([['api.openai.com/v1/audio/speech',()=>new Response(new Uint8Array([1,2,3,4]),{status:200,headers:{'content-type':'audio/wav'}})]]);
 const r=await cloud.openaiSpeech('নমস্কার');
 assert.ok(r.wav instanceof Uint8Array&&r.wav.length===4,'returns WAV bytes playWav can play');
 const call=calls.find(c=>c.url.includes('audio/speech'));
 assert.equal(call.headers.Authorization,'Bearer sk-test','sends the owner key');
 assert.equal(call.body.model,'gpt-4o-mini-tts');assert.equal(call.body.voice,'shimmer','uses the chosen voice');
 assert.equal(call.body.response_format,'wav');assert.match(call.body.instructions,/Shayni/,'friendly tutor instructions');
 cloud.setOpenaiVoice('nonsense');assert.equal(cloud.openaiVoice(),'shimmer','ignores an unknown voice, keeps the last valid one');
 localStorage.removeItem('nandini-openai-voice');assert.equal(cloud.openaiVoice(),'coral','default is a friendly female voice');
 serve([['audio/speech',()=>new Response('no',{status:401})]]);
 await assert.rejects(cloud.openaiSpeech('x'),/key_rejected/,'401 → key_rejected');
});
