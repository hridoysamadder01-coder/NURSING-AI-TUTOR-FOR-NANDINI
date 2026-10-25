// Browser audio for the Tutor's voice features: microphone → 16 kHz PCM chunks (Gemini Live), one spoken utterance
// recorded until she stops talking (Whisper dictation), and 24 kHz PCM playback that can be cut off when she interrupts.
import {floatTo16kPcm,toBase64,fromBase64,pcm16ToFloat} from './live-talk.js';
const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
const MIC={audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}};
const rmsOf=f=>{let s=0;for(let i=0;i<f.length;i++)s+=f[i]*f[i];return Math.sqrt(s/f.length)};

// Streams the microphone as base64 16 kHz PCM chunks (~85 ms each). setMuted(true) stops sending (the level still updates).
export async function openMic(onChunk,{onLevel}={}){
 const stream=await navigator.mediaDevices.getUserMedia(MIC);
 const ctx=new AC(),src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1);
 let muted=false;
 proc.onaudioprocess=e=>{const input=e.inputBuffer.getChannelData(0);onLevel?.(rmsOf(input));if(muted)return;
  const pcm=floatTo16kPcm(input,ctx.sampleRate);onChunk(toBase64(new Uint8Array(pcm.buffer)))};
 // A ScriptProcessor only runs while connected; its output stays silent because nothing is written to it.
 src.connect(proc);proc.connect(ctx.destination);
 await ctx.resume();
 return {setMuted:m=>{muted=m},close:()=>{proc.onaudioprocess=null;try{proc.disconnect();src.disconnect()}catch{}stream.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{})}};
}

// Records one utterance: starts when she speaks, ends after `silenceMs` of quiet (or maxMs, or stop()).
// Resolves with a Blob (webm/opus or mp4), or null if she said nothing.
export function recordUtterance({onLevel,maxMs=20000,silenceMs=1300,startTimeoutMs=8000,threshold=0.02}={}){
 let stopNow;
 const done=(async()=>{
  const stream=await navigator.mediaDevices.getUserMedia(MIC);
  const type=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>globalThis.MediaRecorder?.isTypeSupported?.(t))||'';
  const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined),parts=[];
  const ctx=new AC(),src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();an.fftSize=2048;src.connect(an);
  const buf=new Float32Array(an.fftSize);let spoke=false,quietSince=0;const t0=Date.now();
  rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
  const finished=new Promise(r=>{rec.onstop=r});rec.start(250);
  await new Promise(resolve=>{
   stopNow=resolve;
   const tick=()=>{if(rec.state!=='recording')return resolve();
    an.getFloatTimeDomainData(buf);const level=rmsOf(buf);onLevel?.(level);const t=Date.now();
    if(level>threshold){spoke=true;quietSince=0}else if(spoke){quietSince||=t;if(t-quietSince>silenceMs)return resolve()}
    if(!spoke&&t-t0>startTimeoutMs)return resolve();if(t-t0>maxMs)return resolve();
    setTimeout(tick,50)};
   tick();
  });
  rec.stop();await finished;stream.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{});
  return spoke&&parts.length?new Blob(parts,{type:rec.mimeType||type||'audio/webm'}):null;
 })();
 return {done,stop:()=>stopNow?.()};
}

// Plays queued 24 kHz PCM chunks back to back; clear() stops at once (she started talking).
export function pcmPlayer(){
 const ctx=new AC();let until=0;const live=new Set();
 return {
  play(b64){
   const f=pcm16ToFloat(fromBase64(b64));if(!f.length)return;
   const buf=ctx.createBuffer(1,f.length,24000);buf.copyToChannel(f,0);
   const s=ctx.createBufferSource();s.buffer=buf;s.connect(ctx.destination);
   const at=Math.max(ctx.currentTime+0.04,until);s.start(at);until=at+buf.duration;live.add(s);s.onended=()=>live.delete(s);
  },
  clear(){for(const s of live){try{s.stop()}catch{}}live.clear();until=0},
  remaining(){return Math.max(0,until-ctx.currentTime)},
  resume(){return ctx.resume()},
  close(){this.clear();ctx.close().catch(()=>{})}
 };
}

// Plays a WAV (Gemini TTS) and resolves when it ends; stop() cuts it off.
let current=null;
export function playWav(bytes){
 stopWav();
 const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'})),a=new Audio(url);current=a;
 return new Promise((resolve,reject)=>{a.onended=()=>{URL.revokeObjectURL(url);resolve()};a.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('play_failed'))};a.onpause=()=>resolve();a.play().catch(reject)});
}
export function stopWav(){if(current){try{current.pause()}catch{}current=null}}
