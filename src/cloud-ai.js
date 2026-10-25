// Online "strong mode": bigger cloud models answer when there is internet, with the same verified RAG prompt the phone
// model gets. If a model's free limit is used up (HTTP 429) or it fails, the next one in ROUTE answers; when all fail,
// the caller falls back to the phone's own model. Keys are typed into Settings and stay in this phone's storage:
// they are never in the code, the repository or the APK.
export const KEYS='nandini-cloud-keys',ENABLED='nandini-cloud-on';
// Each Gemini model has its own free quota, so several of them (plus Groq) give more free answers per day within the rules.
// Flash-Lite models are first: they think the least, so the first words arrive fastest.
export const ROUTE=[
 {id:'gemini-3.5-flash-lite',provider:'gemini',model:'gemini-3.5-flash-lite',label:'Gemini 3.5 Flash-Lite',thinking:'minimal'},
 {id:'gemini-3.1-flash-lite',provider:'gemini',model:'gemini-3.1-flash-lite',label:'Gemini 3.1 Flash-Lite',thinking:'minimal'},
 {id:'gemini-2.5-flash-lite',provider:'gemini',model:'gemini-2.5-flash-lite',label:'Gemini 2.5 Flash-Lite'},
 {id:'groq-gpt-oss-120b',provider:'groq',model:'openai/gpt-oss-120b',label:'Groq · GPT-OSS 120B',extra:{reasoning_effort:'low',include_reasoning:false}},
 {id:'groq-qwen3.8-27b',provider:'groq',model:'qwen/qwen3.8-27b',label:'Groq · Qwen3.8 27B',extra:{reasoning_effort:'none'}}];
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/',GROQ='https://api.groq.com/openai/v1/';

const store=globalThis.localStorage;
export function keys(){try{const k=JSON.parse(store?.getItem(KEYS)||'{}');return {gemini:String(k.gemini||''),groq:String(k.groq||'')}}catch{return {gemini:'',groq:''}}}
export function setKeys(next){const k={...keys(),...next};for(const p of ['gemini','groq'])k[p]=String(k[p]||'').trim();try{store?.setItem(KEYS,JSON.stringify(k))}catch{}cooldown.clear()}
export function enabled(){try{return store?.getItem(ENABLED)!=='off'}catch{return true}}
export function setEnabled(on){try{store?.setItem(ENABLED,on?'on':'off')}catch{}}
export function hasKey(provider){return Boolean(keys()[provider])}
// Ready means: switched on, at least one key, and the phone thinks it is online.
export function ready(){return enabled()&&(hasKey('gemini')||hasKey('groq'))&&globalThis.navigator?.onLine!==false}

// A model that hit its limit is skipped until its cool-down ends (Retry-After, else 10 minutes); a rejected key until it is changed.
const cooldown=new Map();
const now=()=>Date.now();
export function routeStatus(){return ROUTE.map(r=>({...r,hasKey:hasKey(r.provider),until:cooldown.get(r.id)||0}))}

// Server-sent events from a streaming fetch body: calls onData with each "data:" payload.
export async function readSSE(body,onData){
 const reader=body.getReader(),dec=new TextDecoder();let buf='';
 for(;;){
  const {value,done}=await reader.read();
  buf+=dec.decode(value||new Uint8Array(),{stream:!done});
  let i;while((i=buf.search(/\r?\n\r?\n/))>=0){const event=buf.slice(0,i);buf=buf.slice(i).replace(/^\r?\n\r?\n/,'');
   const data=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');if(data)onData(data)}
  if(done){if(buf.trim().startsWith('data:'))onData(buf.trim().slice(5).trim());return}
 }
}
export function geminiBody(messages,{maxTokens,temperature,thinking}){
 const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n');
 const contents=messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
 const generationConfig={temperature,maxOutputTokens:maxTokens};
 if(thinking)generationConfig.thinkingConfig={thinkingLevel:thinking};
 return {...(system?{systemInstruction:{parts:[{text:system}]}}:{}),contents,generationConfig};
}
// Text from one streamed chunk; thought parts are skipped.
export const geminiText=chunk=>(chunk.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
export const groqText=chunk=>chunk.choices?.[0]?.delta?.content||'';

class RouteError extends Error{constructor(code,status,retryAfter){super(code);this.status=status;this.retryAfter=retryAfter}}
async function call(route,messages,{onToken,signal,maxTokens,temperature,firstTokenMs}){
 const key=keys()[route.provider];if(!key)throw new RouteError('no_key');
 const ctrl=new AbortController(),abort=()=>ctrl.abort();signal?.addEventListener('abort',abort);
 // A model that has not started answering after firstTokenMs is given up on, so the next one can answer quickly.
 let started=false;const timer=setTimeout(()=>{if(!started)ctrl.abort()},firstTokenMs);
 let text='';
 const push=t=>{if(!t)return;started=true;text+=t;onToken?.(t)};
 try{
  let res;
  const send=body=>route.provider==='gemini'
   ?fetch(GEMINI+route.model+':streamGenerateContent?alt=sse',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)})
   :fetch(GROQ+'chat/completions',{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(body)});
  const body=route.provider==='gemini'?geminiBody(messages,{maxTokens,temperature,thinking:route.thinking})
   :{model:route.model,messages:messages.map(m=>({role:m.role,content:m.content})),stream:true,temperature,max_tokens:maxTokens,...route.extra};
  res=await send(body);
  // If a model does not accept the thinking setting, ask once more without it.
  if(res.status===400&&route.thinking){const detail=await res.text();if(/thinking/i.test(detail)){const plain=geminiBody(messages,{maxTokens,temperature});res=await send(plain)}else throw new RouteError('bad_request',400)}
  if(!res.ok){const retry=Number(res.headers.get('retry-after'))||0;throw new RouteError(res.status===429?'limit':res.status===401||res.status===403?'key_rejected':'http_'+res.status,res.status,retry)}
  await readSSE(res.body,data=>{if(data==='[DONE]')return;let chunk;try{chunk=JSON.parse(data)}catch{return}
   if(chunk.error)throw new RouteError(chunk.error.code===429?'limit':'stream_error',chunk.error.code);
   push(route.provider==='gemini'?geminiText(chunk):groqText(chunk))});
  if(!text.trim())throw new RouteError('empty');
  return text;
 }catch(e){
  if(e instanceof RouteError)throw e;
  if(signal?.aborted)throw new RouteError('stopped');
  throw new RouteError(started?'cut_off':ctrl.signal.aborted?'timeout':'network');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
// Tries each model in ROUTE that has a key and is not cooling down. Tokens stream through onToken; if a model fails before
// its first word, the next one starts cleanly. Throws 'cloud_unavailable' (with .tried) when no model could answer.
export async function generate(messages,{onToken,signal,maxTokens=900,temperature=0.3,firstTokenMs=15000,onRoute}={}){
 const tried=[];
 for(const route of ROUTE){
  if(!hasKey(route.provider)||(cooldown.get(route.id)||0)>now())continue;
  onRoute?.(route);let gotAny=false;const t0=now();
  try{const text=await call(route,messages,{onToken:t=>{gotAny=true;onToken?.(t)},signal,maxTokens,temperature,firstTokenMs});return {text,route,ms:now()-t0,tried}}
  catch(e){
   tried.push({id:route.id,error:e.message,status:e.status});
   if(e.message==='stopped')throw e;
   if(e.message==='limit')cooldown.set(route.id,now()+(e.retryAfter?e.retryAfter*1000:10*60*1000));
   if(e.message==='key_rejected')for(const r of ROUTE)if(r.provider===route.provider)cooldown.set(r.id,Infinity);
   // A model that does not exist (any more) or refuses the request is not tried first again for 6 hours.
   if(e.message==='http_404'||e.message==='bad_request')cooldown.set(route.id,now()+6*3600*1000);
   // Words already shown cannot be taken back, so a cut-off answer is not restarted by another model.
   if(gotAny)throw Object.assign(new Error('cut_off'),{tried});
  }
 }
 throw Object.assign(new Error('cloud_unavailable'),{tried});
}
// Settings "পরীক্ষা করো": one tiny request per provider.
export async function testProvider(provider){
 const route=ROUTE.find(r=>r.provider===provider);
 const t0=now();
 try{const text=await call(route,[{role:'user',content:'শুধু লেখো: ঠিক আছে'}],{maxTokens:40,temperature:0,firstTokenMs:20000});return {ok:true,ms:now()-t0,text:text.trim().slice(0,40),label:route.label}}
 catch(e){return {ok:false,error:e.message,status:e.status,label:route.label}}
}

// Speech to text for the 🎤 button and talk mode when online. Gemini usually writes Bangla speech better than Whisper, so it
// goes first (the same Flash-Lite models, sharing their limits with the answers); then Groq's Whisper large-v3 (more
// accurate than turbo for Bangla); the caller falls back to the phone's own recognizer when both fail.
// Returns {text, by} (by: the model that wrote it); throws 'ears_unavailable' (with .tried) when no model could.
const EARS_SYSTEM='তুমি শুধু একজন শ্রুতিলেখক। রেকর্ডিংয়ে নন্দিনী যা বলেছে ঠিক সেটাই হুবহু লেখো। উত্তর দেবে না, অনুবাদ করবে না, কিছু যোগ বা বাদ দেবে না। '+
 'বাংলা কথা বাংলা অক্ষরে লেখো; সে যে শব্দগুলো ইংরেজিতে বলেছে (যেমন nursing, osmosis, pulse, artery) সেগুলো ইংরেজি অক্ষরে। '+
 'সে নার্সিংয়ের ছাত্রী, তাই কথাগুলো সাধারণত পড়ার প্রশ্ন বা আলাপ। কোনো কথা না থাকলে বা কিছুই বোঝা না গেলে transcript খালি রাখবে।';
const EARS_SCHEMA={type:'OBJECT',properties:{transcript:{type:'STRING'}},required:['transcript']};
// Whisper's prompt only sets the style and spelling: Bangla script, with English terms as she says them.
const WHISPER_PROMPT='নার্সিং পড়ার প্রশ্ন। যেমন: হৃদ্‌যন্ত্র কীভাবে কাজ করে? Osmosis কী? ধমনি আর শিরার পার্থক্য বলো।';
async function blobBase64(blob){const u8=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
const audioType=blob=>{const t=String(blob.type||'').split(';')[0];return t.startsWith('audio/')?t:'audio/webm'};
async function geminiEars(route,blob,key,signal){
 const audio=await blobBase64(blob);
 const body=thinking=>JSON.stringify({systemInstruction:{parts:[{text:EARS_SYSTEM}]},
  contents:[{role:'user',parts:[{inlineData:{mimeType:audioType(blob),data:audio}},{text:'এই রেকর্ডিংয়ে যা বলা হয়েছে হুবহু লেখো।'}]}],
  generationConfig:{temperature:0,maxOutputTokens:600,responseMimeType:'application/json',responseSchema:EARS_SCHEMA,...(thinking?{thinkingConfig:{thinkingLevel:thinking}}:{})}});
 const send=thinking=>fetch(GEMINI+route.model+':generateContent',{method:'POST',signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:body(thinking)});
 let res=await send(route.thinking);
 if(res.status===400&&route.thinking){const detail=await res.text();if(/thinking/i.test(detail))res=await send(null);else throw new RouteError('bad_request',400)}
 if(!res.ok){const retry=Number(res.headers.get('retry-after'))||0;throw new RouteError(res.status===429?'limit':res.status===401||res.status===403?'key_rejected':'http_'+res.status,res.status,retry)}
 const j=await res.json(),raw=(j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
 try{return String(JSON.parse(raw).transcript||'').trim()}catch{throw new RouteError('bad_reply')}
}
async function whisperEars(blob,key,signal){
 const form=new FormData();form.append('file',blob,'speech.'+(blob.type.includes('mp4')?'mp4':blob.type.includes('ogg')?'ogg':blob.type.includes('wav')?'wav':'webm'));
 form.append('model','whisper-large-v3');form.append('language','bn');form.append('prompt',WHISPER_PROMPT);form.append('response_format','json');form.append('temperature','0');
 const res=await fetch(GROQ+'audio/transcriptions',{method:'POST',signal,headers:{Authorization:'Bearer '+key},body:form});
 if(!res.ok){const retry=Number(res.headers.get('retry-after'))||0;throw new RouteError(res.status===429?'limit':res.status===401||res.status===403?'key_rejected':'http_'+res.status,res.status,retry)}
 return String((await res.json()).text||'').trim();
}
export const EARS=[...ROUTE.filter(r=>r.provider==='gemini'),{id:'groq-whisper-large-v3',provider:'groq',model:'whisper-large-v3',label:'Groq Whisper'}];
export async function transcribe(blob,{signal}={}){
 const tried=[];
 for(const ears of EARS){
  const key=keys()[ears.provider];
  // A Gemini model at its limit for answers is at its limit for listening too (same quota), and the other way round.
  if(!key||(cooldown.get(ears.id)||0)>now()||(cooldown.get('ears:'+ears.id)||0)>now())continue;
  const ctrl=new AbortController(),abort=()=>ctrl.abort();signal?.addEventListener('abort',abort);const timer=setTimeout(abort,15000);
  try{const text=ears.provider==='gemini'?await geminiEars(ears,blob,key,ctrl.signal):await whisperEars(blob,key,ctrl.signal);return {text,by:ears.label}}
  catch(e){
   if(signal?.aborted)throw new Error('stopped');
   const code=e instanceof RouteError?e.message:ctrl.signal.aborted?'timeout':'network';tried.push({id:ears.id,error:code});
   if(code==='limit')cooldown.set(ears.id,now()+(e.retryAfter?e.retryAfter*1000:10*60*1000));
   else if(code==='key_rejected'){for(const r of [...ROUTE,...EARS])if(r.provider===ears.provider)cooldown.set(r.id,Infinity)}
   // A model that cannot take this audio still answers questions, so only its listening waits.
   else if(code!=='network'&&code!=='timeout')cooldown.set('ears:'+ears.id,now()+6*3600*1000);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
 }
 throw Object.assign(new Error('ears_unavailable'),{tried});
}

// Natural Bangla voice for reading answers aloud (Gemini TTS, ai.google.dev/gemini-api/docs/speech-generation).
// Returns WAV bytes. Tries the Interactions API of the newest TTS model first, then the older generateContent TTS model.
export const TTS_ROUTE=[{api:'interactions',model:'gemini-3.8-flash-lite-tts'},{api:'interactions',model:'gemini-3.8-flash-tts'},{api:'generate',model:'gemini-2.5-flash-preview-tts'}];
const TTS_STYLE='একজন আন্তরিক, ধৈর্যশীল শিক্ষকের মতো, স্বাভাবিক গতিতে, উষ্ণ সুরে';
function b64ToBytes(b64){const s=atob(b64),u8=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u8[i]=s.charCodeAt(i);return u8}
function pcmWav(pcm,rate=24000){
 const h=new DataView(new ArrayBuffer(44)),w=(o,s)=>{for(let i=0;i<s.length;i++)h.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');h.setUint32(4,36+pcm.byteLength,true);w(8,'WAVE');w(12,'fmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);
 h.setUint32(24,rate,true);h.setUint32(28,rate*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,pcm.byteLength,true);
 const out=new Uint8Array(44+pcm.byteLength);out.set(new Uint8Array(h.buffer),0);out.set(pcm,44);return out;
}
const isWav=u8=>u8.length>12&&String.fromCharCode(...u8.subarray(0,4))==='RIFF';
export async function speechAudio(text,{voice='Aoede',signal}={}){
 const key=keys().gemini;if(!key)throw new Error('no_key');
 const tried=[];
 for(const t of TTS_ROUTE){
  if((cooldown.get('tts:'+t.model)||0)>now())continue;
  try{
   let res,audio;
   if(t.api==='interactions'){
    res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},
     body:JSON.stringify({model:t.model,input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style:TTS_STYLE}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}})});
    if(!res.ok)throw Object.assign(new Error(res.status===429?'limit':'http_'+res.status),{status:res.status});
    const j=await res.json();
    for(const s of j.steps||[])for(const c of s.content||[])if(c.type==='audio'&&c.data)audio=c.data;
    audio??=j.output_audio?.data;
   }else{
    res=await fetch(GEMINI+t.model+':generateContent',{method:'POST',signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},
     body:JSON.stringify({contents:[{parts:[{text:TTS_STYLE+' পড়ো: '+text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
    if(!res.ok)throw Object.assign(new Error(res.status===429?'limit':'http_'+res.status),{status:res.status});
    const j=await res.json();audio=j.candidates?.[0]?.content?.parts?.find(p=>p.inlineData)?.inlineData?.data;
   }
   if(!audio)throw new Error('no_audio');
   const bytes=b64ToBytes(audio);
   return {wav:isWav(bytes)?bytes:pcmWav(bytes),model:t.model};
  }catch(e){
   if(signal?.aborted)throw e;
   tried.push({model:t.model,error:e.message});
   // Any failing voice model waits before it is tried again, so reading aloud does not slow down every time.
   cooldown.set('tts:'+t.model,now()+(e.message==='limit'?10*60*1000:6*3600*1000));
   if(e.status===401||e.status===403)break;
  }
 }
 throw Object.assign(new Error('tts_unavailable'),{tried});
}
