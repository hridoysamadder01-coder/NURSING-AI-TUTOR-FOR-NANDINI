// Optional on-device/VPS model driver. Server-side only; no API key or public Ollama port.
// Do not infer that the hardware can run the model until VPS memory/latency are measured.
const OLLAMA_URL='http://127.0.0.1:11434/api/chat';
export async function ollamaChat({query,sources,instructions,model='qwen3:1.7b'},fetchImpl=fetch){
 if(typeof query!=='string'||!query.trim()||!Array.isArray(sources)||!sources.length)throw Error('invalid_ollama_request');
 const excerpts=sources.slice(0,3).map((s,i)=>('[S'+(i+1)+'] '+String(s.label||'').slice(0,150)+'\n'+String(s.text||'').slice(0,1300))).join('\n\n');
 const response=await fetchImpl(OLLAMA_URL,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  signal:AbortSignal.timeout(100000),
  body:JSON.stringify({
   model,
   messages:[
    {role:'system',content:instructions},
    {role:'user',content:'Answer ONLY from the passages. If uncertain refuse. Question:\n'+query+'\n\nPassages:\n'+excerpts}
   ],
   stream:false,
   think:false,
   keep_alive:'10s',
   options:{num_ctx:3072,num_predict:300,temperature:0.1,num_thread:2}
  })
 });
 if(!response.ok)throw Error('local_model_http_'+response.status);
 const data=await response.json();
 const message=String(data?.message?.content||'').trim();
 if(!message)throw Error('local_model_empty');
 return message;
}
