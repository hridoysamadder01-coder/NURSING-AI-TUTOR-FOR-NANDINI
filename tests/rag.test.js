import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {chunkBooks,buildIndex,retrieve,buildMessages,queryTerms,NOT_FOUND} from '../src/rag.js';
import {MODELS} from '../src/local-llm.js';
const books=await Promise.all(['fundamentals','skills','terminology','mentalhealth'].map(async id=>JSON.parse(await readFile(new URL('../data/books/'+id+'.json',import.meta.url),'utf8'))));
const index=buildIndex(chunkBooks(books));
test('Bangla questions reach the right English book passages (cross-lingual RAG)',()=>{
 assert.deepEqual(queryTerms('ধমনি আর শিরার পার্থক্য কী?'),['artery','vein']);
 for(const [q,heading] of [['ডায়াবেটিস রোগীর যত্ন','Diabetes'],['বেডসোর কেন হয়?','Pressure Injur'],['রোগীকে কীভাবে ইনজেকশন দিতে হয়?','Patient Safety'],['what is SBAR',/Handoff|Report/]]){
  const r=retrieve(q,index);assert.ok(r.grounded,q);const hit=h=>typeof heading==='string'?h.includes(heading):heading.test(h);assert.ok(r.passages.some(p=>hit(p.heading)||hit(p.chapter)),q+' → '+r.passages.map(p=>p.heading).join(' | '));
 }
});
test('verified Bangla explanation is used on a strong topic match and off-topic questions never reach the model',()=>{
 const vit=retrieve('ভাইটাল সাইনের স্বাভাবিক মান কত?',index);assert.equal(vit.topic.id,'vital-signs');
 const [system,user]=buildMessages('ভাইটাল সাইনের স্বাভাবিক মান কত?',vit);
 assert.equal(system.role,'system');assert.match(system.content,/নিজের থেকে কোনো তথ্য যোগ করবে না/);assert.ok(system.content.includes(NOT_FOUND));
 assert.match(user.content,/৬০–১০০/);assert.match(user.content,/প্রশ্ন: ভাইটাল সাইনের/);
 for(const q of ['বাংলাদেশের ক্রিকেট অধিনায়ক কে?','আজকের আবহাওয়া কেমন?']){const r=retrieve(q,index);assert.equal(r.grounded,false,q);assert.equal(r.passages.length,0)}
 assert.equal(retrieve('RAM আর ROM-এর পার্থক্য কী?',index).passages.length,0,'ICT topics get no nursing-book passage');
});
test('on-device model catalog is pinned to exact Hugging Face revisions and sizes',()=>{
 for(const m of MODELS){assert.match(m.url,/^https:\/\/huggingface\.co\/[\w.-]+\/[\w.-]+\/resolve\/[0-9a-f]{40}\/[\w.-]+\.gguf$/);assert.ok(m.url.endsWith('/'+m.file));assert.ok(Number.isInteger(m.bytes)&&m.bytes>5e8);assert.match(m.file,/^[A-Za-z0-9._-]+\.gguf$/)}
});
