// Instant offline tutor: matches a Bangla, English or Banglish question to the simple-Bangla topics.
// No language model runs here; it only returns text already in the app, so it cannot invent facts.
import {TOPICS} from './easy-topics.js';
// Bengali spellings vary (হৃদযন্ত্র / হৃদ্‌যন্ত্র, য় composed or not), so compare on a normalised key.
const key=s=>String(s||'').normalize('NFC').toLowerCase().replace(/[‌‍্]/g,'');
export function tokens(text){return key(text).split(/[^a-z0-9ঀ-৿₂]+/u).filter(Boolean)}
const STOP=new Set(tokens(`কী কি কেন কীভাবে কিভাবে কোনটি কোনটা কোন কাকে কাদের বলে বলা হয় হয়ে এর এ ও আর বা মানে বলো বল বুঝিয়ে বুঝাও বোঝাও বুঝি সহজ সহজে ভাবে করে করা একটু আমাকে আমি তুমি আপনি এটা এটি ওটা কত কতটা কয়টি কয়টা পার্থক্য তফাত দাও লেখো সম্পর্কে নিয়ে জানতে জানাও চাই বাংলায় বাংলা প্লিজ মামা মান সাথে সঙ্গে থেকে জন্য কাজ উদাহরণ
 যত্ন নিয়ম লক্ষণ হলে কম বেশি দেখা যায় দিতে করতে রোগী রোগীর রোগীকে রোগীদের প্রতিরোধ করব করবো করি হয় নার্স নার্সের নার্সরা যত্নে যত্নের
 the a an is are was what why how which who when where of in on at to for and or explain define definition meaning mean means tell me about please difference between vs versus do does give
 symptom symptoms sign signs cause causes treatment types type function functions role importance process steps method
 ki keno kivabe kibhabe kare kake bole bolo mane ar er theke jonno kaj plz pls`));
export const isStopword=t=>STOP.has(t);
// A few everyday words that do not appear in the topic text itself.
const SYNONYMS={'হার্ট':['heart'],'হৃৎপিণ্ড':['heart'],'প্রেসার':['bp','রক্তচাপ'],'pressure':['bp'],'bp':['রক্তচাপ'],'প্রস্রাব':['মূত্র'],'পেশাব':['মূত্র'],'urine':['মূত্র'],'লিভার':['যকৃত'],'liver':['যকৃত'],'ইনফেকশন':['infection'],'জীবাণুমুক্ত':['sterile'],'প্রোটিন':['আমিষ'],'হাতধোয়া':['হাত'],'handwash':['hand'],'wash':['hand'],'pulse':['নাড়ি'],'temperature':['তাপমাত্রা'],'জ্বর':['তাপমাত্রা'],'computer':['কম্পিউটার'],'কম্পিউটারের':['কম্পিউটার'],
 // English nursing words often typed in Bangla letters.
 'স্টেরাইল':['sterile'],'জীবাণুমুক্ত':['sterile'],'নেফ্রন':['nephron'],'হাইপোক্সিয়া':['অক্সিজেন'],'পালস':['pulse'],'প্রেশার':['bp'],'ইউরিন':['মূত্র'],'অটোক্লেভ':['autoclave'],'স্যালাইন':['osmosis'],'আইভি':['osmosis']};
const SYN=new Map(Object.entries(SYNONYMS).map(([k,v])=>[key(k),v.map(key)]));
// Common Bengali and English endings, so "ধমনির" finds "ধমনি" and "signs" finds "sign".
const ENDINGS=tokens('ের র কে তে টা টি টির গুলো গুলি দের য় েরা রা এর ে s es').concat(['ে','য়']).map(key);
function strength(q,t){
 if(q===t)return 1;
 const [short,long]=q.length<t.length?[q,t]:[t,q];
 if(short.length<3||!long.startsWith(short))return 0;
 return ENDINGS.includes(long.slice(short.length))?0.8:0;
}
const FIELDS=[['title',6],['terms',4],['gist',3],['body',1]];
const INDEX=TOPICS.map(t=>({topic:t,fields:{
 title:new Set(tokens([t.title,t.en,t.id.replace(/-/g,' ')].join(' '))),
 terms:new Set(tokens(t.terms.flat().join(' '))),
 gist:new Set(tokens(t.gist)),
 body:new Set(tokens([...t.points,t.trick].join(' ')))}}));
function best(q,set){let s=0;for(const t of set){const v=strength(q,t);if(v>s)s=v;if(s===1)break}return s}
export function questionTokens(question){
 const out=[];for(const q of tokens(question)){if(STOP.has(q))continue;out.push(q);for(const extra of SYN.get(q)||[])out.push(extra)}
 return [...new Set(out)];
}
// Everyday chat ("hi", "ধন্যবাদ", "বুঝিনি") gets a friendly reply instead of a topic search.
// A message counts only when every word is chat or filler, so "hi, osmosis ki?" is still answered as a question.
const FILLER=new Set(tokens('মামা mama ভাই bhai আপু apu নন্দিনী nandini tutor টিউটর না na একটা একটি ekta akta can you'));
// Checked in this order, so "how are you" is "how" and "good night" is "bye".
const CHAT=[
 ['thanks','ধন্যবাদ শুকরিয়া thanks thank thanku thankyou thx tnx ty dhonnobad dhonnobaad'],
 ['who','তুমি তোমার কে নাম tumi tomar ke nam who your name'],
 ['how','কেমন আছো আছেন আছ kemon acho achen how'],
 ['friend','বন্ধু bondhu bondu friend dost দোস্ত'],
 ['bye','bye বাই আল্লাহ হাফেজ allah hafez খোদা khoda টাটা tata night নাইট শুভরাত্রি রাত্রি'],
 ['ok','ok okay ওকে আচ্ছা accha acha হুম hmm জি ji হ্যাঁ ha haa yes বুঝেছি বুঝলাম বুঝছি bujhechi bujhlam bujhsi got it understood দারুণ darun nice great ভালো valo bhalo আছি achi'],
 ['greet','hi hello hey hlw helo hii hiii হাই হ্যালো হেলো salam assalamualaikum আসসালামু আলাইকুম সালাম নমস্কার nomoskar good গুড morning evening afternoon শুভ সকাল সন্ধ্যা']
].map(([kind,words])=>[kind,new Set(tokens(words))]);
const FOLLOW=new Set(tokens('বুঝিনি বুঝি বুঝলাম বুঝতে পারিনি পারলাম পারছি নাই নি আরো আরও আরেকটু একটু সহজ সহজে আবার আরেকবার এখনো এখনও কিছু অন্যভাবে ধাপে উদাহরণ বিস্তারিত বোঝাও বুঝাও বুঝিয়ে দিয়ে বলো দাও করে ক্লিয়ার clear bujhi bujhini bujhinai bujhlam buji nai aro arektu ektu aktu sohoj abar arekbar ekhono ekhno kichu onnovabe udahoron diye example examples again more simple simpler easy easier explain detail details bolo dao kore bujhao'));
const EXAMPLE=new Set(tokens('উদাহরণ udahoron example examples'));
const NOT_UNDERSTOOD=new Set(tokens('বুঝিনি নাই নি না bujhini bujhinai nai na'));
export function smallTalk(text){
 const ws=tokens(text);if(!ws.length)return null;
 const kinds=new Set();
 for(const w of ws){const hit=CHAT.find(([,set])=>set.has(w));if(hit)kinds.add(hit[0]);else if(!FILLER.has(w)&&!STOP.has(w))return null}
 // "বুঝিনি" must reach the follow-up path, not be read as "ok".
 if(ws.some(w=>NOT_UNDERSTOOD.has(w))&&kinds.has('ok'))return null;
 for(const [kind] of CHAT)if(kinds.has(kind))return kind;
 return null;
}
// "বুঝিনি", "আরো সহজ করে বলো", "উদাহরণ দাও" refer to the previous question.
export function followUpKind(text){
 const ws=tokens(text);if(!ws.length)return null;
 let hit=false;
 for(const w of ws){if(FOLLOW.has(w)){hit=true;continue}if(!FILLER.has(w)&&!STOP.has(w))return null}
 if(!hit)return null;
 return ws.some(w=>EXAMPLE.has(w))?'example':'simpler';
}
// Free conversation ("ami khub tired", "পড়তে ভালো লাগছে না") is answered as chat, not searched as a fact question.
const QUESTION=new Set(tokens('কী কি কেন কীভাবে কিভাবে কোন কোনটি কোনটা কত কতটা কয়টি কয়টা কে কাকে কাদের কোথায় কখন মানে বলো বোঝাও বুঝাও বুঝিয়ে লেখো দাও what why how which who whom when where explain define tell ki keno kivabe kibhabe koto kon ke kothay kokhon mane bolo bujhao'));
const FIRST_PERSON=new Set(tokens('আমি আমার আমাকে ami amar amake amr i im me my লাগছে লাগে লাগতেছে লাগসে lagche lagtese lagse lagtase ক্লান্ত klanto tired sad bored ভয় voy bhoy টেনশন tension মন mon খারাপ kharap কষ্ট kosto বিরক্ত পারবো পারব parbo parbona ঘুম ghum'));
export function isQuestion(text){return /[?？]/.test(String(text||''))||tokens(text).some(w=>QUESTION.has(w))}
export function chatLike(text){
 const ws=tokens(text);if(!ws.length||ws.length>12||isQuestion(text))return null;
 // About herself or her feelings ("আমি", "ভয় লাগছে") is chat even when a word also appears in the books.
 return ws.some(w=>FIRST_PERSON.has(w))?'personal':ws.length<=2?'short':null;
}
// The topic points that best match a question, e.g. the artery/vein line for "ধমনি আর শিরার পার্থক্য".
export function relevantPoints(question,points,n=2){
 const qs=questionTokens(question);
 return points.map((p,i)=>{const set=new Set(tokens(p));let s=0;for(const q of qs)s+=best(q,set);return {p,i,s}})
  .filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.i-b.i).slice(0,n).sort((a,b)=>a.i-b.i).map(x=>x.p);
}
export function askTutor(question,{limit=3}={}){
 const qs=questionTokens(question);
 const scored=INDEX.map(({topic,fields})=>{let score=0;for(const q of qs){let top=0;for(const [name,w] of FIELDS)top=Math.max(top,w*best(q,fields[name]));score+=top}return {topic,score:Math.round(score*100)/100}})
  .filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const terms=[];
 for(const t of TOPICS)for(const [en,bn] of t.terms){
  // Long Bangla meanings ("রক্ত জমাট বাঁধা") match too loosely, so only short ones are compared.
  const words=new Set([...tokens(en),...(tokens(bn).length<=2?tokens(bn):[])]);
  const s=Math.max(0,...qs.map(q=>best(q,words)));
  if(s>=0.8&&!terms.some(x=>x.en===en))terms.push({en,bn,topicId:t.id,score:s});
 }
 terms.sort((a,b)=>b.score-a.score);
 const top=scored[0]?.score||0;
 return {tokens:qs,confident:top>=3,topics:scored.filter(x=>x.score>=top*0.6).slice(0,limit),terms:terms.slice(0,3)};
}
