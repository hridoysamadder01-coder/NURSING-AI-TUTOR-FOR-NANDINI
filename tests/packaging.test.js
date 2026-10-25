import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
// Every module a page imports (directly or through another module) must be served, cached offline and copied into the APK;
// a missing one only shows up as a 404 on the phone.
test('every imported module is served, cached and packaged',()=>{
 const pages=readdirSync('.').filter(f=>f.endsWith('.html'));
 const need=new Set(),queue=[];
 for(const p of pages)for(const m of readFileSync(p,'utf8').matchAll(/(?:from|import\()\s*'\.\/src\/([\w.-]+\.js)'/g))queue.push(m[1]);
 while(queue.length){const f=queue.pop();if(need.has(f))continue;need.add(f);if(f.endsWith('.bundle.js'))continue;
  for(const m of readFileSync('src/'+f,'utf8').matchAll(/(?:from|import\()\s*'\.\/([\w.-]+\.js)'/g))queue.push(m[1])}
 const server=readFileSync('server.mjs','utf8'),sw=readFileSync('sw.js','utf8'),apk=readFileSync('scripts/prepare-android.mjs','utf8');
 // native-translation.bundle.js is built in CI from src/native-translation.js.
 for(const f of [...need].filter(f=>!f.endsWith('.bundle.js'))){
  assert.ok(server.includes("'/src/"+f+"'"),'server.mjs does not serve src/'+f);
  assert.ok(apk.includes("'src/"+f+"'"),'prepare-android.mjs does not copy src/'+f);
 }
 for(const f of ['cloud-ai.js','voice.js','local-llm.js','rag.js','tutor-core.js'])assert.ok(sw.includes("'./src/"+f+"'"),'sw.js does not cache src/'+f);
 assert.ok(need.has('cloud-ai.js')&&need.has('voice.js'));
});
