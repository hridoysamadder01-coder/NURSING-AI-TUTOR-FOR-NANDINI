import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const file=async name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('browser inline script passes Node syntax check',async()=>{
 for(const path of ['index.html','tutor.html']){const html=await file(path);const m=html.match(/<script(?: type="module")?>([\s\S]*?)<\/script>/);assert.ok(m,'missing script in '+path);const parsed=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(parsed.status,0,path+' JavaScript syntax error: '+parsed.stderr)}
});
test('UI labels do not misrepresent search as verified generative AI',async()=>{
 const html=await file('tutor.html');
 assert.match(html,/এটি AI chat নয়/);assert.match(html,/AI সংযোগ থাকলেই/);assert.match(html,/PDF পৃষ্ঠা/);assert.match(html,/source\.url/);
});
test('PWA caches verified learning module, without server-side secrets',async()=>{
 const sw=await file('sw.js');assert.match(sw,/tutor\.html/);assert.match(sw,/src\/lesson-data\.js/);
 const manifest=JSON.parse(await file('manifest.webmanifest'));assert.equal(manifest.display,'standalone');
 for(const path of ['index.html','tutor.html','src/answer-core.js','src/lesson-data.js'])assert.doesNotMatch(await file(path),/sk-[a-zA-Z0-9]{25,}/);
});
