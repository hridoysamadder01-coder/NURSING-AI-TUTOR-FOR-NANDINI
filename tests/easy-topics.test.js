import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {TOPICS,EASY_SUBJECT_CODES,topicsForTask} from '../src/easy-topics.js';
import {SUBJECTS,taskId} from '../src/study-plan.js';
test('simple-Bangla topics cover the six college subjects with complete, checkable entries',async()=>{
 assert.deepEqual([...EASY_SUBJECT_CODES].sort(),['D112','D116','D117','D123','D124','D135']);
 assert.equal(new Set(TOPICS.map(t=>t.id)).size,TOPICS.length,'topic ids must be unique');
 const tasks=new Set(SUBJECTS.flatMap(s=>s.topics.map((t,i)=>taskId(s.code,i))));
 for(const code of EASY_SUBJECT_CODES)assert.ok(TOPICS.filter(t=>t.subject===code).length>=5,code+' needs at least five topics');
 for(const t of TOPICS){
  assert.match(t.id,/^[a-z0-9-]+$/);assert.ok(EASY_SUBJECT_CODES.includes(t.subject),t.id);
  for(const k of ['title','en','gist','trick'])assert.ok(typeof t[k]==='string'&&t[k].length>3,t.id+' '+k);
  assert.ok(t.points.length>=3&&t.points.every(p=>p.length>10),t.id+' points');
  assert.ok(t.terms.length>=4&&t.terms.every(x=>x.length===2&&x[0]&&x[1]),t.id+' terms');
  assert.ok(t.check.options.length===4&&Number.isInteger(t.check.answer)&&t.check.answer>=0&&t.check.answer<4&&t.check.why,t.id+' check');
  assert.ok(t.coach.every(c=>tasks.has(c)),t.id+' coach task ids must exist');
  if(t.book){assert.ok(['fundamentals','skills','terminology','mentalhealth'].includes(t.book.id));assert.ok(t.book.q.length>2)}
 }
 assert.ok(topicsForTask('D135:3').some(t=>t.id==='vital-signs'));
 const page=await readFile(new URL('../topics.html',import.meta.url),'utf8');
 assert.match(page,/AI-এর সাহায্যে লেখা/);assert.match(page,/শিক্ষক এখনো যাচাই করেননি/);
 assert.match(await readFile(new URL('../coach.html',import.meta.url),'utf8'),/topics\.html#/);
});
test('vital sign numbers in the simple-Bangla page match the bundled Open RN Skills text',async()=>{
 const skills=JSON.parse(await readFile(new URL('../data/books/skills.json',import.meta.url),'utf8'));
 const text=skills.chapters.flatMap(c=>c.sections.map(s=>s.text)).join(' ');
 assert.match(text,/oral temperature is 35\.8\s*–\s*37\.3/);assert.match(text,/60–100 beats per minute/);assert.match(text,/SpO2 for an adult is 94-100%/);
 const vs=TOPICS.find(t=>t.id==='vital-signs').points.join(' ');
 for(const n of ['৩৫.৮–৩৭.৩','৬০–১০০','১২–২০','৯৪–১০০'])assert.ok(vs.includes(n),n);
});
