import test from 'node:test';import assert from 'node:assert/strict';
import {askTutor,questionTokens} from '../src/tutor-core.js';
const top=q=>{const r=askTutor(q);return r.confident?r.topics[0].topic.id:null};
test('offline tutor answers Bangla, English and Banglish questions from the simple-Bangla topics',()=>{
 for(const [q,id] of [['osmosis কী?','osmosis'],['ভাইটাল সাইনের স্বাভাবিক মান কত?','vital-signs'],['ধমনি আর শিরার পার্থক্য কী','heart-circulation'],['হৃদযন্ত্র কীভাবে কাজ করে','heart-circulation'],['হৃদ্‌যন্ত্র','heart-circulation'],['RAM আর ROM কী','memory-units'],['NPO mane ki','abbreviations'],['hand wash kivabe','hand-hygiene-ppe'],['হাত ধোয়ার নিয়ম','hand-hygiene-ppe'],['নেফ্রন কী','kidney'],['gram positive','gram-stain'],['PQRST','pain-words'],['SBAR','documentation-sbar'],['ম্যালেরিয়া','parasites'],['টিকা','immunity'],['mg থেকে mcg','units'],['bp normal koto','vital-signs'],['রক্তের গ্রুপ','blood'],['ADPIE','nursing-process'],['অটোক্লেভ','sterilization']])assert.equal(top(q),id,q);
});
test('offline tutor shows matching term meanings and admits when it has no answer',()=>{
 assert.ok(askTutor('Atrium মানে কী').terms.some(t=>t.en==='Atrium'&&t.bn==='অলিন্দ'));
 assert.deepEqual(askTutor('ধমনি আর শিরার পার্থক্য').terms.map(t=>t.en).slice(0,2),['Artery','Vein']);
 for(const q of ['ক্রিকেট খেলা','ডায়াবেটিস','diabetes'])assert.equal(top(q),null,q);
 assert.deepEqual(questionTokens('কী? কেন? what is'),[]);
});
