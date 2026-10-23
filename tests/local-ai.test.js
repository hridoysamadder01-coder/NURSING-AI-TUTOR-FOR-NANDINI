import test from 'node:test';
import assert from 'node:assert/strict';
import {ollamaChat} from '../src/local-ai.mjs';
test('local model has no paid API key and cannot be redirected to an attacker host',async()=>{
 let seen=null;
 const stub=async(url,options)=>{seen={url,options};return {ok:true,async json(){return {message:{content:'হাত পরিষ্কার করা জরুরি। [S1]'}}}}};
 const answer=await ollamaChat({
  query:'হাত কেন ধুবো?',
  sources:[{label:'Open RN',text:'Hand hygiene prevents infection in care settings.'}],
  instructions:'Use only source citations',
  model:'qwen3:1.7b'
 },stub);
 assert.match(answer,/\[S1\]/);
 assert.equal(seen.url,'http://127.0.0.1:11434/api/chat');
 assert.equal(seen.options.method,'POST');
 assert.equal(seen.options.headers.Authorization,undefined);
 const body=JSON.parse(seen.options.body);
 assert.equal(body.model,'qwen3:1.7b');assert.equal(body.think,false);
 assert.equal(body.options.num_thread,2);assert.equal(body.options.num_ctx,3072);
 assert.equal(body.stream,false);assert.equal(body.keep_alive,'10s');
 assert.match(body.messages[1].content,/Hand hygiene prevents infection/);
});
test('local model refuses empty question and output',async()=>{
 await assert.rejects(ollamaChat({query:'',sources:[],instructions:'x'}),/invalid_ollama_request/);
 const stub=async()=>({ok:true,async json(){return {message:{content:''}}}});
 await assert.rejects(ollamaChat({query:'hand',sources:[{label:'RN',text:'hand hygiene helps prevent infection'}],instructions:'test'},stub),/local_model_empty/);
});
