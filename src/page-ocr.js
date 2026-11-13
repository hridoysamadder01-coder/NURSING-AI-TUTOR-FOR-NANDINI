// On-device, offline OCR for a single page photo (scan.html). Wraps the bundled Tesseract.js (vendor/tesseract/).
// Nothing leaves the phone: every asset is served from the app itself, and the image is read in the browser/WebView.
// The result is always treated as an editable draft — OCR is never perfect, least of all on Bengali print.
const V=new URL('../vendor/tesseract/',import.meta.url).href;

// Tesseract's LSTM-SIMD core needs WebAssembly SIMD. Every modern Android WebView has it; some old ones do not.
let simd;
export function simdSupported(){
 if(simd!==undefined)return simd;
 try{
  // Minimal module with a v128 (SIMD) type — validates only where SIMD is available.
  simd=WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
 }catch{simd=false}
 return simd;
}
export function ocrAvailable(){return simdSupported()&&typeof globalThis.Tesseract!=='undefined'}

// Draw the page onto a canvas, capped so a big phone photo does not blow up memory or take minutes on a slow chip.
function toCanvas(img,maxDim){
 const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
 const scale=Math.min(1,maxDim/Math.max(w,h,1));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
 c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 return c;
}

// Read the page. source: an <img> or <canvas>. Returns {text, confidence (0-100), words, lines}.
// onProgress(fraction 0..1, stage) is called as it works. Rejects if cancelled via signal.
export async function recognizePage(source,{langs='eng+ben',maxDim=2000,onProgress,signal}={}){
 if(!simdSupported())throw new Error('no_simd');
 if(typeof globalThis.Tesseract==='undefined')throw new Error('ocr_unavailable');
 const image=source.tagName==='CANVAS'?source:toCanvas(source,maxDim);
 const worker=await globalThis.Tesseract.createWorker(langs,1,{
  workerPath:V+'worker.min.js',
  corePath:V+'tesseract-core-simd-lstm.wasm.js',
  langPath:V+'tessdata',
  gzip:true,
  logger:m=>{if(m.status==='recognizing text'&&onProgress)onProgress(m.progress,'read');}
 });
 const onAbort=()=>{worker.terminate().catch(()=>{})};
 signal?.addEventListener('abort',onAbort,{once:true});
 try{
  if(signal?.aborted)throw new Error('cancelled');
  const {data}=await worker.recognize(image);
  const words=(data.words||[]).map(w=>({text:w.text,confidence:Math.round(w.confidence)}));
  return {text:(data.text||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim(),
          confidence:Math.round(data.confidence||0),words,lines:(data.lines||[]).length};
 }finally{
  signal?.removeEventListener('abort',onAbort);
  await worker.terminate().catch(()=>{});
 }
}

// Honest judgement of a read: is it good enough to explain, or should she recapture / fix it first?
// Thresholds are deliberately cautious — a confident-looking wrong read is worse than asking again.
export function readQuality(result){
 const text=(result?.text||'').trim(),conf=result?.confidence||0;
 const letters=(text.match(/[A-Za-zঀ-৿]/g)||[]).length;
 if(letters<12)return {level:'none',bn:'এই ছবিতে পড়ার মতো যথেষ্ট লেখা পেলাম না।'};
 if(conf<55||letters<30)return {level:'low',bn:'লেখা ঝাপসা বা অসম্পূর্ণ মনে হচ্ছে — ভালো আলোয়, সোজা করে, কাছ থেকে আবার তুললে ভালো হয়। নিচের লেখা মিলিয়ে ঠিক করে নাও।'};
 if(conf<80)return {level:'ok',bn:'লেখা পড়েছি, তবে কিছু ভুল থাকতে পারে — মিলিয়ে ঠিক করে নাও।'};
 return {level:'good',bn:'লেখা পড়েছি। তবু এক নজরে মিলিয়ে নাও।'};
}
