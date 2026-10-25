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

// Speech to text for the 🎤 button when online: Groq's Whisper understands Bangla.
export async function transcribe(blob,{signal}={}){
 const key=keys().groq;if(!key)throw new Error('no_key');
 const form=new FormData();form.append('file',blob,'speech.'+(blob.type.includes('mp4')?'mp4':blob.type.includes('ogg')?'ogg':'webm'));
 form.append('model','whisper-large-v3-turbo');form.append('language','bn');form.append('response_format','json');form.append('temperature','0');
 const res=await fetch(GROQ+'audio/transcriptions',{method:'POST',signal,headers:{Authorization:'Bearer '+key},body:form});
 if(!res.ok)throw new Error(res.status===429?'limit':res.status===401||res.status===403?'key_rejected':'http_'+res.status);
 return String((await res.json()).text||'').trim();
}
