// Bridge to the on-device LLM (android-llm/, Capacitor plugin "NandiniLlm"). Only works inside the Android app.
// Model files are downloaded once from Hugging Face (pinned revision, exact size) into the app's private storage.
// Chosen by a desktop test of 10 Bangla nursing questions with the same RAG prompt (README: "Local AI"):
// Gemma 3 4B answered all 10 faithfully; Gemma 3n E2B made 3 factual errors; 1B-class models were unusable.
export const MODELS=[
 {id:'gemma-3-4b',label:'Gemma 3 4B',file:'gemma-3-4b-it-Q4_0.gguf',bytes:2370065536,minRamMb:5500,
  url:'https://huggingface.co/unsloth/gemma-3-4b-it-GGUF/resolve/5a3566e716d80f709ed7b79817eaf7733d2a1fce/gemma-3-4b-it-Q4_0.gguf',
  note:'বাংলায় ভালো, অ্যাপের পরীক্ষায় ১০টির ১০টি উত্তর সঠিক। ৬ GB বা বেশি RAM-এর ফোনে চলবে।'}
];
export const AUTO_KEY='nandini-ai-auto';
let cached;
function plugin(){
 if(cached!==undefined)return cached;
 const cap=globalThis.Capacitor;
 cached=cap?.isNativePlatform?.()?(cap.Plugins?.NandiniLlm||cap.registerPlugin?.('NandiniLlm')||null):null;
 return cached;
}
export function available(){return Boolean(plugin())}
export async function status(){return plugin()?await plugin().status():null}
export function installed(st){return MODELS.filter(m=>st?.files?.some(f=>f.name===m.file&&f.bytes===m.bytes))}
// Prefer the model the user picked last, else the best installed one.
export function activeModel(st){
 const list=installed(st);let pick=null;try{pick=localStorage.getItem('nandini-ai-model')}catch{}
 return list.find(m=>m.id===pick)||list[0]||null;
}
export function chooseModel(id){try{localStorage.setItem('nandini-ai-model',id)}catch{}}
export function autoEnabled(){try{return localStorage.getItem(AUTO_KEY)!=='off'}catch{return true}}
export function setAuto(on){try{localStorage.setItem(AUTO_KEY,on?'on':'off')}catch{}}
export async function download(model,onProgress){
 const p=plugin(),h=await p.addListener('downloadProgress',e=>onProgress?.(e.received,e.total));
 try{return await p.download({url:model.url,fileName:model.file,bytes:model.bytes})}finally{h.remove()}
}
export function cancelDownload(){return plugin()?.cancelDownload()}
export function remove(model){return plugin().deleteModel({fileName:model.file})}
export function load(model){return plugin().load({fileName:model.file,nCtx:2048})}
export async function generate(messages,{onToken,maxTokens=220,temperature=0}={}){
 const p=plugin(),h=await p.addListener('token',e=>onToken?.(e.text));
 try{return await p.generate({messages,maxTokens,temperature})}finally{h.remove()}
}
export function stop(){return plugin()?.stop()}
