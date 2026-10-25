import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {chunkBooks,buildIndex,retrieve,buildMessages,buildChatMessages,FOLLOW_STYLES,queryTerms,NOT_FOUND,isDoseQuestion} from '../src/rag.js';
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
 assert.equal(system.role,'system');assert.match(system.content,/নিজের থেকে কোনো তথ্য যোগ করবে না/);assert.match(system.content,/"তুমি" বলে/);assert.ok(system.content.includes(NOT_FOUND));
 assert.match(user.content,/৬০–১০০/);assert.match(user.content,/প্রশ্ন: ভাইটাল সাইনের/);assert.doesNotMatch(user.content,/বুঝতে পারেনি|মনে রাখার কৌশল/);
 assert.match(buildMessages('ভাইটাল সাইনের স্বাভাবিক মান কত?',vit,{followUp:'simpler'})[1].content,/বুঝতে পারেনি/);
 const ex=buildMessages('ভাইটাল সাইনের স্বাভাবিক মান কত?',vit,{followUp:'example'})[1].content;assert.match(ex,/উদাহরণ চাইছে/);assert.ok(ex.includes('মনে রাখার কৌশল: '+vit.topic.trick));
 for(const q of ['বাংলাদেশের ক্রিকেট অধিনায়ক কে?','আজকের আবহাওয়া কেমন?']){const r=retrieve(q,index);assert.equal(r.grounded,false,q);assert.equal(r.passages.length,0)}
 assert.equal(retrieve('RAM আর ROM-এর পার্থক্য কী?',index).passages.length,0,'ICT topics get no nursing-book passage');
});
test('on-device model catalog is pinned to exact Hugging Face revisions and sizes',()=>{
 for(const m of MODELS){assert.match(m.url,/^https:\/\/huggingface\.co\/[\w.-]+\/[\w.-]+\/resolve\/[0-9a-f]{40}\/[\w.-]+\.gguf$/);assert.ok(m.url.endsWith('/'+m.file));assert.ok(Number.isInteger(m.bytes)&&m.bytes>5e8);assert.match(m.file,/^[A-Za-z0-9._-]+\.gguf$/)}
});
test('patient dose questions never reach the model, unit conversions still do',()=>{
 for(const q of ['জ্বরের রোগীকে প্যারাসিটামল কত mg দেব?','insulin dose koto','ডোজ কত দিতে হয়?','রোগীকে কয়টা ট্যাবলেট কত টা দেব','how much mg should I give the patient'])assert.equal(isDoseQuestion(q),true,q);
 for(const q of ['১ গ্রাম কত mg?','mg থেকে mcg','ভাইটাল সাইনের স্বাভাবিক মান কত?','প্যারাসিটামল কী কাজ করে?'])assert.equal(isDoseQuestion(q),false,q);
});
test('repeated "বুঝিনি" never asks the model the same thing twice',()=>{
 const ctx=retrieve('হৃদ্‌যন্ত্র কীভাবে কাজ করে?',index);
 const asks=FOLLOW_STYLES.simpler.map((_,a)=>buildMessages('হৃদ্‌যন্ত্র কীভাবে কাজ করে?',ctx,{followUp:'simpler',attempt:a})[1].content);
 assert.equal(new Set(asks).size,asks.length);
 // Rounds differ in the slice of the verified topic or in the way of explaining; the cycle restarts after the last style.
 assert.equal(asks.length,3);assert.ok(asks[0].includes('মনে রাখার কৌশল: '+ctx.topic.trick));assert.ok(!asks[1].includes('মনে রাখার কৌশল'));
 const vein=retrieve('ধমনি আর শিরার পার্থক্য কী?',index);
 assert.match(buildMessages('ধমনি আর শিরার পার্থক্য কী?',vein,{followUp:'simpler'})[1].content,/ধমনি \(Artery\) হৃদ্‌যন্ত্র থেকে রক্ত দূরে নেয়/,'the short slice keeps the point that answers the question');
 assert.doesNotMatch(buildMessages('Osmosis কী?',retrieve('Osmosis কী?',index),{followUp:'example',attempt:1})[1].content,/সুগন্ধি/,"diffusion's example is not lent to osmosis");
 assert.equal(buildMessages('x',ctx,{followUp:'simpler',attempt:FOLLOW_STYLES.simpler.length})[1].content.split('\n\n').pop(),FOLLOW_STYLES.simpler[0].say);
 const [system,user]=buildChatMessages('ami khub tired');
 assert.match(system.content,/পড়ার বন্ধু/);assert.match(system.content,/কোনো তথ্য, সংখ্যা, রোগ, ওষুধ/);assert.match(system.content,/নিজের ক্ষতির/);assert.equal(user.content,'ami khub tired');
});
