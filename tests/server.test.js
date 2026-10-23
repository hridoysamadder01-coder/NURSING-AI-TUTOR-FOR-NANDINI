import test from 'node:test';import assert from 'node:assert/strict';import {server} from '../server.mjs';
test('static app and health endpoints do not need an API key',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();const origin='http://127.0.0.1:'+address.port;
 try{
  const health=await fetch(origin+'/healthz');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
  const stat=await fetch(origin+'/api/status');assert.equal(stat.status,200);assert.equal((await stat.json()).ai_enabled,false);
  const page=await fetch(origin+'/tutor.html');assert.equal(page.status,200);assert.match(await page.text(),/বইভিত্তিক/);
  const asset=await fetch(origin+'/src/lesson-data.js');assert.equal(asset.status,200);
  const forbidden=await fetch(origin+'/package.json');assert.equal(forbidden.status,404);
  const ai=await fetch(origin+'/api/ask',{method:'POST'});assert.equal(ai.status,503);
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
});
