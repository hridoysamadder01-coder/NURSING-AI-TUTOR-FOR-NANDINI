// Bridge to the phone's own voice engines (Capacitor plugin "NandiniVoice", android-llm/). Only works inside the Android app.
// Listening is on-device only unless the owner allows online recognition in Settings (then Google's service hears the audio).
export const ONLINE_KEY='nandini-voice-online',AUTO_KEY='nandini-voice-auto';
let cached;
function plugin(){
 if(cached!==undefined)return cached;
 const cap=globalThis.Capacitor;
 cached=cap?.isNativePlatform?.()?(cap.Plugins?.NandiniVoice||null):null;
 return cached;
}
export function available(){return Boolean(plugin())}
export function status(){return plugin()?plugin().status():Promise.resolve(null)}
const flag=(key,dflt)=>{try{const v=localStorage.getItem(key);return v===null?dflt:v==='on'}catch{return dflt}};
const setFlag=(key,on)=>{try{localStorage.setItem(key,on?'on':'off')}catch{}};
export const onlineAllowed=()=>flag(ONLINE_KEY,false),setOnline=on=>setFlag(ONLINE_KEY,on);
// Answers to a spoken question are read aloud unless this is switched off.
export const autoSpeak=()=>flag(AUTO_KEY,true),setAutoSpeak=on=>setFlag(AUTO_KEY,on);
// Text the Bangla voice can read: no markdown, emoji or arrows (read as "right arrow").
export function forSpeech(text){
 return String(text||'').replace(/[*#_`>|]/g,' ').replace(/\s*→\s*/g,', ').replace(/\p{Extended_Pictographic}|\uFE0F/gu,'').replace(/\s+/g,' ').trim().slice(0,3900);
}
export function speak(text){const t=forSpeech(text);return t&&plugin()?plugin().speak({text:t,rate:0.95}):Promise.resolve()}
// Speaks and resolves when the phone has finished saying it (for the talk-mode loop: speak, then listen again).
export async function speakWait(text){
 const p=plugin(),t=forSpeech(text);if(!p||!t)return;
 const finished=new Set();let id=null,resolveDone;const done=new Promise(r=>{resolveDone=r});
 const h=await p.addListener('speakDone',e=>{finished.add(e.id);if(e.id===id)resolveDone()});
 try{id=(await p.speak({text:t,rate:0.95})).id;if(finished.has(id))resolveDone();await done}finally{h.remove()}
}
export function stopSpeaking(){return plugin()?.stopSpeaking()}
export function installVoice(){return plugin()?.installVoice()}
export async function listen(onPartial){
 const p=plugin(),h=await p.addListener('partial',e=>onPartial?.(e.text));
 try{return (await p.listen({lang:'bn-BD',offlineOnly:!onlineAllowed()})).text}finally{h.remove()}
}
export function stopListening(){return plugin()?.stopListening()}
// Keeps the screen on during talk mode, so the phone does not lock and stop the microphone mid-conversation.
// The Android app does it natively; a browser uses the Screen Wake Lock API, asked again when the page comes back.
let lock=null,wanted=false;
async function browserLock(){try{if(wanted&&!lock&&document.visibilityState==='visible')lock=await navigator.wakeLock?.request('screen');lock?.addEventListener?.('release',()=>{lock=null})}catch{lock=null}}
globalThis.document?.addEventListener?.('visibilitychange',browserLock);
export async function keepAwake(on){
 wanted=on;
 if(plugin()){try{await plugin().keepAwake({on})}catch{}return}
 if(on)return browserLock();
 const l=lock;lock=null;try{await l?.release()}catch{}
}
