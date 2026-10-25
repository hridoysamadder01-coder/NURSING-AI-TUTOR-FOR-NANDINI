import test from 'node:test';import assert from 'node:assert/strict';
import {askTutor,questionTokens,smallTalk,followUpKind,chatLike,isQuestion} from '../src/tutor-core.js';
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
test('everyday chat and follow-ups are recognised without hiding real questions',()=>{
 for(const [q,kind] of [['hi mama','greet'],['আসসালামু আলাইকুম','greet'],['good morning','greet'],['কেমন আছো?','how'],['how are you','how'],['ধন্যবাদ মামা','thanks'],['thank you','thanks'],['তুমি কে?','who'],['ok bujhlam','ok'],['আচ্ছা বুঝেছি','ok'],['good night','bye']])assert.equal(smallTalk(q),kind,q);
 for(const q of ['hi, osmosis ki?','বুঝলাম না','বুঝিনি','কে আবিষ্কার করেছে রক্তের গ্রুপ','হৃদ্‌যন্ত্র'])assert.equal(smallTalk(q),null,q);
 for(const [q,kind] of [['বুঝিনি','simpler'],['বুঝলাম না মামা','simpler'],['আরো সহজ করে বলো','simpler'],['bujhi nai','simpler'],['আবার বুঝিয়ে বলো','simpler'],['একটা উদাহরণ দাও','example'],['example dao','example']])assert.equal(followUpKind(q),kind,q);
 for(const q of ['osmosis সহজ করে বলো','more about heart','hi mama','ধমনি কী'])assert.equal(followUpKind(q),null,q);
});
test('friendly chat is told apart from study questions',()=>{
 for(const q of ['bondhu','বন্ধু'])assert.equal(smallTalk(q),'friend',q);
 for(const q of ['এখনো বুঝিনি','আরেকবার বলো','অন্যভাবে বোঝাও','kichu bujhi nai'])assert.equal(followUpKind(q),'simpler',q);
 for(const q of ['ami khub tired','পড়তে ভালো লাগছে না','আমার পরীক্ষার ভয় লাগছে','ami parbo na'])assert.equal(chatLike(q),'personal',q);
 assert.equal(chatLike('diabetes'),'short');
 for(const q of ['বাংলাদেশের ক্রিকেট অধিনায়ক কে?','শ্বাসকষ্ট কী?','osmosis ki','how does the heart work'])assert.equal(chatLike(q),null,q);
 assert.equal(isQuestion('bp normal koto'),true);assert.equal(isQuestion('ami tired'),false);
});
