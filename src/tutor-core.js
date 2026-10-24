// Instant offline tutor: matches a Bangla, English or Banglish question to the simple-Bangla topics.
// No language model runs here; it only returns text already in the app, so it cannot invent facts.
import {TOPICS} from './easy-topics.js';
// Bengali spellings vary (হৃদযন্ত্র / হৃদ্‌যন্ত্র, য় composed or not), so compare on a normalised key.
const key=s=>String(s||'').normalize('NFC').toLowerCase().replace(/[‌‍্]/g,'');
export function tokens(text){return key(text).split(/[^a-z0-9ঀ-৿₂]+/u).filter(Boolean)}
const STOP=new Set(tokens(`কী কি কেন কীভাবে কিভাবে কোনটি কোনটা কোন কাকে কাদের বলে বলা হয় হয়ে এর এ ও আর বা মানে বলো বল বুঝিয়ে বুঝাও বোঝাও বুঝি সহজ সহজে ভাবে করে করা একটু আমাকে আমি তুমি আপনি এটা এটি ওটা কত কতটা কয়টি কয়টা পার্থক্য তফাত দাও লেখো সম্পর্কে নিয়ে জানতে জানাও চাই বাংলায় বাংলা প্লিজ মামা মান সাথে সঙ্গে থেকে জন্য কাজ উদাহরণ
 the a an is are was what why how which who when where of in on at to for and or explain define definition meaning mean means tell me about please difference between vs versus do does give
 ki keno kivabe kibhabe kare kake bole bolo mane ar er theke jonno kaj plz pls`));
// A few everyday words that do not appear in the topic text itself.
const SYNONYMS={'হার্ট':['heart'],'হৃৎপিণ্ড':['heart'],'প্রেসার':['bp','রক্তচাপ'],'pressure':['bp'],'bp':['রক্তচাপ'],'প্রস্রাব':['মূত্র'],'পেশাব':['মূত্র'],'urine':['মূত্র'],'লিভার':['যকৃত'],'liver':['যকৃত'],'ইনফেকশন':['infection'],'জীবাণুমুক্ত':['sterile'],'প্রোটিন':['আমিষ'],'হাতধোয়া':['হাত'],'handwash':['hand'],'wash':['hand'],'pulse':['নাড়ি'],'temperature':['তাপমাত্রা'],'জ্বর':['তাপমাত্রা'],'computer':['কম্পিউটার'],'কম্পিউটারের':['কম্পিউটার']};
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
