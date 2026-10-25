// Gemini Live (WebSocket, voice in → voice out) for the Tutor's talk mode. Protocol only: audio capture and playback live
// in src/talk-audio.js, so the same code also runs in Node for scripts/cloud-live-check.mjs.
// Docs: ai.google.dev/gemini-api/docs/live-api (16 kHz PCM in, 24 kHz PCM out, Bengali "bn" supported, 15 min per session).
import {IDENTITY,LANGUAGE,EXAMPLES,SUBJECTS_BN} from './persona.js';
export const LIVE_MODEL='gemini-3.8-live';
export const LIVE_URL='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
export const LOOKUP={name:'lookup_nursing',description:'Search Nandini\'s verified nursing notes and Open RN nursing textbooks. Call this before saying any nursing, anatomy, microbiology or science fact. Returns the text to answer from, or NOT_FOUND.',
 parameters:{type:'OBJECT',properties:{query:{type:'STRING',description:'The question or topic, in Bangla or English, e.g. "ধমনি আর শিরার পার্থক্য"'}},required:['query']}};
// The voice model picks its language by itself (it cannot be set), so the instruction says it plainly in English too,
// the wording Google suggests for the Live API, before everything else.
const ONLY_BANGLA='RESPOND IN BENGALI (বাংলা). YOU MUST RESPOND UNMISTAKABLY IN BENGALI. Never speak Hindi, Urdu or any other language. '+
 'Nandini speaks Bengali, sometimes with English words; even if her speech sounds like Hindi, it is Bengali: understand it as Bengali and answer in Bengali.\n';
export const TALK_SYSTEM=ONLY_BANGLA+IDENTITY+' তুমি নন্দিনীর বন্ধুর মতো, ধৈর্যশীল নার্সিং শিক্ষক। নন্দিনী Diploma Nursing ১ম বর্ষে পড়ে। '+EXAMPLES+' তোমরা কণ্ঠে কথা বলছ, তাই:\n'+
 '১) '+LANGUAGE+' "তুমি" বলে, আন্তরিক সুরে, ছোট ছোট বাক্যে বলবে। একবারে ২–৪টি বাক্য, তারপর থেমে জিজ্ঞেস করবে বুঝেছে কি না।\n'+
 '২) নার্সিং, শরীর, রোগ, জীবাণু, বিজ্ঞান, কম্পিউটার বা ইংরেজির কোনো তথ্য বলার আগে অবশ্যই lookup_nursing দিয়ে খুঁজবে, আর যা পাবে সেটাই আগে ব্যবহার করবে; তার সঙ্গে মেলে না এমন কিছু বলবে না। NOT_FOUND পেলে: প্রশ্নটা তার বিষয়গুলোর ('+SUBJECTS_BN+') মধ্যে হলে বলবে "এটা অ্যাপের বইয়ে নেই, সাধারণ জ্ঞান থেকে বলছি", সহজ করে বোঝাবে আর শিক্ষকের সঙ্গে মিলিয়ে নিতে বলবে; বাইরে হলে আলতো করে পড়ায় ফেরাবে।\n'+
 '৩) কী জানতে চায় পরিষ্কার না হলে আন্দাজ করবে না; ছোট করে জিজ্ঞেস করে নেবে।\n'+
 '৪) না বুঝলে আগের মতো করে না বলে অন্যভাবে বলবে: উদাহরণ দিয়ে, ধাপে ধাপে, বা ছোট প্রশ্ন করে।\n'+
 '৫) কোনো রোগীর ওষুধের ডোজ বা চিকিৎসার সিদ্ধান্ত বলবে না।\n'+
 '৬) মন খারাপ বা ক্লান্তির কথা বললে আগে সহানুভূতি দেখাবে; পড়ার বাইরের প্রশ্নে আলতো করে পড়ায় ফেরাবে।\n'+
 '৭) মনে রেখো: প্রতিটি উত্তর শুধু বাংলায়।';
// Letters of other Indian and nearby scripts (not Bengali, Latin or digits). Bengali text uses the danda "।" (U+0964),
// which sits in the Devanagari block, so it is left out.
const OTHER_SCRIPT=/[\u0900-\u0963\u0966-\u097F\u0A00-\u0DFF\u0600-\u06FF\u0750-\u077F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/g;
export const otherScript=text=>(String(text).match(OTHER_SCRIPT)||[]).length>=3;
export const REDO_IN_BANGLA='তুমি এইমাত্র বাংলা ছাড়া অন্য ভাষায় বলেছ। নন্দিনী শুধু বাংলা বোঝে। ঠিক ওই কথাটাই এবার সহজ বাংলায় বলো, আর এখন থেকে সবসময় বাংলায় বলবে।';

// One conversation. Events: onState('connecting'|'ready'|'closed'), onAudio(base64 pcm24k), onUserText(t), onAiText(t),
// onTurnEnd(), onInterrupted(), onError(code), onWrongLanguage(). lookup(query) answers the model's tool calls.
// A reply that comes out in Hindi or another language is cut off (its audio is not passed on) and asked again in Bangla.
export class LiveTalk{
 // resume: a handle from an earlier connection (sessionResumptionUpdate), so the conversation continues after a
 // reconnect; long: context window compression, which lets an audio session run past 15 minutes.
 constructor({key,model=LIVE_MODEL,system=TALK_SYSTEM,voice='Aoede',lookup,WebSocketImpl=globalThis.WebSocket,resume=null,long=true,...events}){
  Object.assign(this,{key,model,system,voice,lookup,WebSocketImpl,events,handle:resume,long});this.ws=null;this.ready=false;
  this.turnText='';this.wrong=false;this.redos=0;
 }
 emit(name,...args){try{this.events[name]?.(...args)}catch{}}
 connect(){
  return new Promise((resolve,reject)=>{
   this.emit('onState','connecting');
   const ws=this.ws=new this.WebSocketImpl(LIVE_URL+'?key='+encodeURIComponent(this.key));
   let settled=false;const fail=code=>{if(!settled){settled=true;reject(new Error(code))}else this.emit('onError',code)};
   const timer=setTimeout(()=>{fail('timeout');try{ws.close()}catch{}},15000);
   ws.onopen=()=>ws.send(JSON.stringify({setup:{
    model:'models/'+this.model,
    generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:this.voice}}}},
    systemInstruction:{parts:[{text:this.system}]},
    tools:this.lookup?[{functionDeclarations:[LOOKUP]}]:[],
    inputAudioTranscription:{},outputAudioTranscription:{},
    ...(this.long?{contextWindowCompression:{slidingWindow:{}},sessionResumption:this.handle?{handle:this.handle}:{}}:{})}}));
   ws.onmessage=async ev=>{
    let msg;try{msg=JSON.parse(typeof ev.data==='string'?ev.data:await blobText(ev.data))}catch{return}
    if(msg.setupComplete){clearTimeout(timer);this.ready=true;settled=true;this.emit('onState','ready');resolve(this);return}
    if(msg.toolCall)this.answerTools(msg.toolCall.functionCalls||[]);
    const sc=msg.serverContent;
    if(sc){
     if(sc.interrupted){this.turnText='';this.wrong=false;this.emit('onInterrupted')}
     if(sc.inputTranscription?.text){this.redos=0;this.emit('onUserText',sc.inputTranscription.text)}
     if(sc.outputTranscription?.text){this.turnText+=sc.outputTranscription.text;
      // At most two tries in a row, so a model that keeps slipping is still heard rather than looping or going silent.
      if(!this.wrong&&this.redos<2&&otherScript(this.turnText)){this.wrong=true;this.emit('onWrongLanguage')}
      if(!this.wrong)this.emit('onAiText',sc.outputTranscription.text)}
     if(!this.wrong)for(const p of sc.modelTurn?.parts||[])if(p.inlineData?.data)this.emit('onAudio',p.inlineData.data);
     if(sc.turnComplete){const redo=this.wrong;this.turnText='';this.wrong=false;
      if(redo){this.redos++;this.sendText(REDO_IN_BANGLA)}
      this.emit('onTurnEnd',{redo})}
    }
    if(msg.sessionResumptionUpdate?.resumable&&msg.sessionResumptionUpdate.newHandle)this.handle=msg.sessionResumptionUpdate.newHandle;
    // The server closes each connection after about 10 minutes and warns first; the caller reconnects with the handle.
    if(msg.goAway)this.emit('onGoAway',msg.goAway.timeLeft);
   };
   ws.onerror=()=>fail('network');
   ws.onclose=ev=>{clearTimeout(timer);this.ready=false;
    // 1008 / 1007: bad key or rejected setup; 1011: server limit or failure.
    const code=ev.code===1008||/key|permission|auth/i.test(ev.reason||'')?'key_rejected':/quota|exceed|limit|resource/i.test(ev.reason||'')?'limit':'closed';
    if(!settled)fail(code);else this.emit('onState','closed',code,ev.reason||'')};
  });
 }
 async answerTools(calls){
  const functionResponses=[];
  for(const c of calls){let result='NOT_FOUND';try{result=await this.lookup?.(String(c.args?.query||''))||'NOT_FOUND'}catch{}functionResponses.push({id:c.id,name:c.name,response:{result}})}
  this.send({toolResponse:{functionResponses}});
 }
 send(obj){if(this.ws?.readyState===1)this.ws.send(JSON.stringify(obj))}
 // base64 16-bit little-endian PCM at 16 kHz.
 sendAudio(b64){this.send({realtimeInput:{audio:{data:b64,mimeType:'audio/pcm;rate=16000'}}})}
 endAudio(){this.send({realtimeInput:{audioStreamEnd:true}})}
 sendText(text){this.send({realtimeInput:{text}})}
 close(){try{this.ws?.close()}catch{}this.ready=false}
}
async function blobText(data){return typeof data.text==='function'?data.text():new TextDecoder().decode(data)}

// PCM helpers shared by the app and the check script.
export function floatTo16kPcm(input,inRate){
 const ratio=inRate/16000,len=Math.floor(input.length/ratio),out=new Int16Array(len);
 for(let i=0;i<len;i++){
  // Average the samples that fall into each output sample (a simple low-pass before decimating).
  const start=Math.floor(i*ratio),end=Math.min(input.length,Math.floor((i+1)*ratio));let sum=0,n=0;
  for(let j=start;j<end;j++){sum+=input[j];n++}
  const v=Math.max(-1,Math.min(1,n?sum/n:0));out[i]=v<0?v*0x8000:v*0x7fff;
 }
 return out;
}
export function toBase64(bytes){
 const u8=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(typeof Buffer!=='undefined')return Buffer.from(u8).toString('base64');
 let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);
}
export function fromBase64(b64){
 if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(b64,'base64'));
 const s=atob(b64),u8=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u8[i]=s.charCodeAt(i);return u8;
}
export function pcm16ToFloat(u8){const v=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),n=u8.byteLength>>1,out=new Float32Array(n);for(let i=0;i<n;i++)out[i]=v.getInt16(i*2,true)/0x8000;return out}
// A WAV file around raw 16-bit mono PCM (for saving Live/TTS audio).
export function wav(pcm,rate){
 const h=new DataView(new ArrayBuffer(44)),w=(o,s)=>{for(let i=0;i<s.length;i++)h.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');h.setUint32(4,36+pcm.byteLength,true);w(8,'WAVE');w(12,'fmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);
 h.setUint32(24,rate,true);h.setUint32(28,rate*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,pcm.byteLength,true);
 const out=new Uint8Array(44+pcm.byteLength);out.set(new Uint8Array(h.buffer),0);out.set(pcm,44);return out;
}
