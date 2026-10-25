// Local RAG for the on-device Tutor: BM25 search over the four Open RN books plus the simple-Bangla topics.
// Runs in the WebView (and in Node for tests); the retrieved text is what the local model may use.
import {askTutor,isStopword,relevantPoints,tokens as bnTokens} from './tutor-core.js';
import {TOPICS} from './easy-topics.js';
const EN_STOP=new Set(('a an the and or of to in on at for with by from is are was were be been being it its this that these those as can may '+
 'will would should could not no but if then than so such into about over under between their there they them he she his her you your we our '+
 'i me my what which who whom why how when where do does did done has have had also more most other some any each per via eg ie use used using').split(' '));
function stem(w){
 if(w.length>5&&w.endsWith('ing'))return w.slice(0,-3);
 if(w.length>4&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(w.length>4&&/(ss|sh|ch|x|z)es$/.test(w))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss')&&!w.endsWith('us')&&!w.endsWith('is'))return w.slice(0,-1);
 if(w.length>5&&w.endsWith('ed'))return w.slice(0,-2);
 return w;
}
export function enTokens(text){return (String(text||'').toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>w.length>1&&!EN_STOP.has(w)).map(stem)}
// Bangla question words → English book vocabulary. Topic term pairs are added below automatically.
const BN_EN={'রক্ত':'blood','রক্তচাপ':'blood pressure','হার্ট':'heart','হৃদ্‌যন্ত্র':'heart','ফুসফুস':'lung','শ্বাস':'breathing respiration','শ্বাসকষ্ট':'dyspnea shortness breath',
 'জ্বর':'fever temperature','ব্যথা':'pain','ক্ষত':'wound','ঘা':'ulcer wound','বেডসোর':'pressure injury','ওষুধ':'medication','ইনজেকশন':'injection','রোগী':'patient','নার্স':'nurse',
 'সংক্রমণ':'infection','ইনফেকশন':'infection','জীবাণু':'microorganism bacteria','হাত':'hand','ধোয়া':'hygiene wash','প্রস্রাব':'urine urinary','মূত্র':'urine urinary','কিডনি':'kidney renal',
 'মস্তিষ্ক':'brain','স্নায়ু':'nerve neuron','হাড়':'bone','পেশি':'muscle','মাংসপেশি':'muscle','চামড়া':'skin','ত্বক':'skin','ডায়াবেটিস':'diabetes glucose','পুষ্টি':'nutrition',
 'পানি':'fluid water','ঘুম':'sleep','ব্যায়াম':'exercise','শিশু':'child pediatric','গর্ভ':'pregnancy','নিরাপত্তা':'safety','পড়ে':'fall','যোগাযোগ':'communication','অক্সিজেন':'oxygen',
 'তাপমাত্রা':'temperature','লক্ষণ':'symptom sign','উপসর্গ':'symptom','কারণ':'cause','চিকিৎসা':'treatment','প্রতিরোধ':'prevention','যত্ন':'care','নাড়ি':'pulse','ওজন':'weight','ক্যান্সার':'cancer','ডায়রিয়া':'diarrhea','বমি':'vomiting nausea','কাশি':'cough','অ্যালার্জি':'allergy','টিকা':'vaccine immunization',
 'ড্রেসিং':'dressing wound','ক্যাথেটার':'catheter','স্যালাইন':'saline intravenous fluid','মানসিক':'mental','উদ্বেগ':'anxiety','বিষণ্নতা':'depression','মৃত্যু':'death dying',
 'প্রেসার':'blood pressure','কোষ':'cell','হজম':'digestion','খাবার':'food nutrition','যকৃত':'liver','লিভার':'liver','পাকস্থলী':'stomach','অন্ত্র':'intestine','হরমোন':'hormone',
 'নেফ্রন':'nephron','হাইপোক্সিয়া':'hypoxia oxygen','স্টেরাইল':'sterile','গ্লাভস':'gloves','ইনসুলিন':'insulin','প্যারাসিটামল':'acetaminophen',
 'অ্যান্টিবায়োটিক':'antibiotic','ক্যানুলা':'cannula intravenous','নেবুলাইজার':'nebulizer','স্টেথোস্কোপ':'stethoscope','থার্মোমিটার':'thermometer','পালস':'pulse',
 'প্রেশার':'blood pressure','ইউরিন':'urine','ব্লাড':'blood','সুগার':'glucose','ডায়েট':'diet nutrition','ভিটামিন':'vitamin','এনিমা':'enema','সিরিঞ্জ':'syringe',
 'স্ট্রেস':'stress','দুশ্চিন্তা':'anxiety stress','চাপ':'stress','পরার':'don','খোলার':'doff','মাপতে':'measure assess','মাপা':'measure assess','চোখ':'eye','কান':'ear','মুখ':'mouth oral','দাঁত':'teeth oral','পা':'leg foot','হাঁটা':'ambulation walking','বিছানা':'bed','গোসল':'bathing hygiene','ব্যান্ডেজ':'bandage dressing'};
const LEX=new Map();
// Words listed in BN_EN are kept even when the topic matcher ignores them (লক্ষণ, যত্ন…).
const KEEP=new Set();
function addLex(bn,en,keep=false){for(const t of bnTokens(bn)){if(keep)KEEP.add(t);else if(isStopword(t))continue;const cur=LEX.get(t)||new Set();for(const e of enTokens(en))cur.add(e);LEX.set(t,cur)}}
for(const [bn,en] of Object.entries(BN_EN))addLex(bn,en,true);
for(const t of TOPICS)for(const [en,bn] of t.terms)if(bnTokens(bn).length<=2)addLex(bn,en);
export function queryTerms(question){
 const out=new Set(enTokens(question));
 for(const t of bnTokens(question)){if(isStopword(t)&&![...KEEP].some(k=>t.startsWith(k)))continue;for(const [k,v] of LEX){if(t===k||(k.length>=3&&t.startsWith(k)&&t.length-k.length<=3))for(const e of v)out.add(e)}}
 return [...out];
}
// Split every book section into ~160-word passages on paragraph boundaries.
export function chunkBooks(books,maxWords=160){
 const chunks=[];
 for(const b of books)b.chapters.forEach((ch,ci)=>{for(const s of ch.sections){
  const parts=Array.isArray(s.blocks)&&s.blocks.length?s.blocks.map(x=>x.text):String(s.text||'').split(/\n\s*\n/);
  let buf=[],n=0;
  const flush=()=>{const text=buf.join(' ').replace(/\s+/g,' ').trim();if(text.length>40)chunks.push({book:b.id,bookTitle:b.title,ci,chapter:ch.title,heading:s.heading,url:ch.url||b.source_url,text});buf=[];n=0};
  for(const p of parts){const w=String(p||'').split(/\s+/).length;if(n&&n+w>maxWords)flush();buf.push(p);n+=w}
  flush();
 }});
 return chunks;
}
export function buildIndex(chunks){
 const postings=new Map(),lengths=new Array(chunks.length);let total=0;
 chunks.forEach((c,id)=>{
  const toks=enTokens(c.chapter+' '+c.heading+' '+c.heading+' '+c.text);lengths[id]=toks.length;total+=toks.length;
  const tf=new Map();for(const t of toks)tf.set(t,(tf.get(t)||0)+1);
  for(const [t,f] of tf){let p=postings.get(t);if(!p)postings.set(t,p=[]);p.push(id,f)}
 });
 return {chunks,postings,lengths,avg:total/Math.max(1,chunks.length)};
}
export function search(index,terms,k=3){
 const N=index.chunks.length,scores=new Map(),K1=1.2,B=0.75;
 for(const t of new Set(terms)){const p=index.postings.get(t);if(!p)continue;const df=p.length/2,idf=Math.log(1+(N-df+0.5)/(df+0.5));
  for(let i=0;i<p.length;i+=2){const id=p[i],f=p[i+1],norm=f*(K1+1)/(f+K1*(1-B+B*index.lengths[id]/index.avg));scores.set(id,(scores.get(id)||0)+idf*norm)}}
 return [...scores].sort((a,b)=>b[1]-a[1]).slice(0,k).map(([id,score])=>({...index.chunks[id],score:Math.round(score*100)/100}));
}
export function retrieve(question,index,{k=2}={}){
 // A wrong topic would mislead the model, so the Bangla explanation is only used on a strong match.
 const tutor=askTutor(question),topic=tutor.topics[0]?.score>=6?tutor.topics[0].topic:null;
 const terms=queryTerms(question);
 if(topic)for(const t of enTokens(topic.en))terms.push(t);
 // With a Bangla explanation one English passage is enough; more English pulls small models into English.
 // ICT/English topics have no matching nursing-book chapter (book: null), so they get no book passage.
 const passages=index&&terms.length&&!(topic&&!topic.book)?search(index,terms,topic?1:k):[];
 // Guardrail: no topic and only weak book matches means the app has no grounded answer, so the model is not asked.
 const grounded=Boolean(topic)||(passages[0]?.score||0)>=8;
 return {topic,terms:[...new Set(terms)],passages:grounded?passages:[],grounded};
}
const trim=(s,words)=>{const w=String(s).split(/\s+/);return w.length>words?w.slice(0,words).join(' ')+' …':String(s)};
export const NOT_FOUND='এই প্রশ্নের উত্তর অ্যাপের বইয়ে পাইনি। শিক্ষককে জিজ্ঞেস করো।';
// Patient doses are never left to a small model, whatever the retrieved text says ("১ গ্রাম কত mg" is still a unit question).
export const DOSE_NOTE='ওষুধের ডোজ রোগী অনুযায়ী চিকিৎসক ঠিক করেন, তাই AI ডোজ বলবে না। ডোজ নিয়ে সবসময় ইনচার্জ নার্স বা চিকিৎসককে জিজ্ঞেস করো। 🙏';
export function isDoseQuestion(q){
 const s=String(q||'').normalize('NFC');
 return /ডোজ|ডোস|dose|dosage/i.test(s)||(/কত\s*(mg|ml|মিলিগ্রাম|এমজি|মিলি|এমএল|ট্যাবলেট|টা|টি|ইউনিট|unit)|how\s+(much|many)\s+(mg|ml|tablet|unit)/i.test(s)&&/দেব|দিব|দিতে|দেওয়া|খাওয়া|খাব|খাবে|রোগী|give|patient/i.test(s));
}
// The same messages are used by the native llama.cpp runtime (via the model's own chat template) and by the desktop evaluation.
// Small models stay most faithful when they reuse verified sentences, so the instruction asks for that.
// A desktop test showed that asking the model itself for a chatty opener and closing made it add wrong facts,
// so the prompt only sets a warm tone; greetings and "বুঝিনি / উদাহরণ দাও" buttons are handled by the app.
// "বুঝিনি" can be pressed many times. Each round gives the model a different part of the verified topic or a different
// way of explaining, so the answers differ by construction. Desktop tests with Gemma 3 4B: pasting the previous answer
// into the prompt made it copy that answer; two "example" rounds on the same text gave identical answers; and asking it
// to explain term meanings or an MCQ in its own words produced wrong facts, so the app shows terms and MCQs itself.
export const FOLLOW_STYLES={
 simpler:[
  {use:'core',say:'নন্দিনী আগের ব্যাখ্যাটা বুঝতে পারেনি। শুধু মূল কথাটা ২–৩টি খুব সহজ বাক্যে বলো। শব্দ সহজ করবে, কিন্তু অর্থ একদম বদলাবে না।'},
  {use:'points',say:'নন্দিনী এখনো বোঝেনি। এবার ধাপে ধাপে (১, ২, ৩…) বোঝাও, প্রতিটি ধাপে "তথ্য"-এর একটা কথা।'},
  {use:'points',say:'নন্দিনী এখনো বোঝেনি। এবার নিজে ছোট ছোট প্রশ্ন করে তার উত্তর দিয়ে বোঝাও, যেমন: "এটা কী? → …", "কেন দরকার? → …"। উত্তরগুলো শুধু "তথ্য" থেকে।'}],
 example:[
  {use:'core',say:'নন্দিনী একটা উদাহরণ চাইছে। "মনে রাখার কৌশল"-টা দিয়ে সহজ করে বোঝাও। নতুন কোনো তথ্য বানাবে না।'},
  {use:'match',say:'নন্দিনী আরেকটা উদাহরণ চাইছে। রোজকার জীবনের একটা ছোট তুলনা দিয়ে বোঝাও, কিন্তু "তথ্য"-এর বাইরের কোনো তথ্য যোগ করবে না।'}]};
export function followUpStyle(kind,attempt=0){const list=FOLLOW_STYLES[kind]||FOLLOW_STYLES.simpler;return list[attempt%list.length]}
// Every slice keeps the gist and the points that match the question, so the answer to it is never cut out.
function topicSource(t,use,question){
 const list=ps=>ps.map(p=>'\n- '+p).join('');
 const head=t.title+' ('+t.en+'): '+t.gist,match=list(relevantPoints(question,t.points,use==='core'?2:3));
 if(use==='core')return head+match+'\nমনে রাখার কৌশল: '+t.trick;
 // Only the matching points, so another concept's example (diffusion's perfume) is not lent to this one.
 if(use==='match')return head+match;
 return head+list(t.points);
}
export function buildMessages(question,ctx,{passageWords=90,followUp=null,attempt=0}={}){
 const style=followUp?followUpStyle(followUp,attempt):null,sources=[];
 if(ctx.topic)sources.push(topicSource(ctx.topic,style?.use||'points',question));
 else for(const p of ctx.passages)sources.push(p.bookTitle+' · '+p.chapter+' · '+p.heading+': '+trim(p.text,passageWords));
 const system='তুমি নন্দিনীর বন্ধুর মতো, ধৈর্যশীল নার্সিং শিক্ষক। তাকে "তুমি" বলে আন্তরিক, সহজ কথ্য বাংলায় বলবে। নিয়ম:\n'+
  '১) শুধু "তথ্য" অংশে যা লেখা আছে, তা থেকেই উত্তর দেবে। নিজের থেকে কোনো তথ্য যোগ করবে না।\n'+
  '২) তথ্যের বাক্যগুলো যতটা সম্ভব হুবহু ব্যবহার করবে। সংখ্যা, "কম/বেশি", "থেকে/দিকে" একদম বদলাবে না।\n'+
  '৩) অন্য ধরন বলা না থাকলে: প্রথমে এক লাইনে মূল কথাটা বলবে, তারপর ৩–৫টি ছোট পয়েন্ট। ইংরেজি পরিভাষা (যেমন Artery) বন্ধনীতে রাখবে, কিন্তু পুরো বাক্য ইংরেজিতে অনুবাদ করবে না।\n'+
  '৪) "তথ্য"-এ উত্তর না থাকলে শুধু লিখবে: '+NOT_FOUND+'\n'+
  '৫) কোনো রোগীর ওষুধের ডোজ বা চিকিৎসার সিদ্ধান্ত দেবে না।';
 const user='তথ্য:\n'+(sources.length?sources.join('\n\n'):'(কিছু নেই)')+'\n\nপ্রশ্ন: '+String(question).trim()+(style?'\n\n'+style.say:'');
 return [{role:'system',content:system},{role:'user',content:user}];
}
// Free conversation (no study question): warm, short, no facts, then back to studying.
export function buildChatMessages(message){
 const system='তুমি নন্দিনীর পড়ার বন্ধু, একজন ধৈর্যশীল আর আন্তরিক নার্সিং শিক্ষক। নন্দিনী Diploma Nursing ১ম বর্ষে পড়ে। সে এখন পড়ার প্রশ্ন না করে এমনি কথা বলছে। নিয়ম:\n'+
  '১) "তুমি" বলে ২–৩টি ছোট, উষ্ণ বাক্যে উত্তর দেবে।\n'+
  '২) কোনো তথ্য, সংখ্যা, রোগ, ওষুধ বা চিকিৎসার কথা বলবে না। পড়ার বাইরের কিছু জানতে চাইলে বলবে, তুমি শুধু পড়ায় সাহায্য করো।\n'+
  '৩) মন খারাপ, ক্লান্তি বা ভয়ের কথা বললে আগে সহানুভূতি দেখাবে, দরকার হলে একটু বিরতি নিতে বলবে, আর সাহস দেবে।\n'+
  '৪) শরীর খারাপ, খুব কষ্ট বা নিজের ক্ষতির কথা বললে সঙ্গে সঙ্গে পরিবারের কাউকে বা কাছের বড় কাউকে জানাতে বলবে।\n'+
  '৫) শেষে আলতো করে পড়ায় ফেরাবে, যেমন জিজ্ঞেস করবে আজ কোন টপিকটা কঠিন লাগছে।';
 return [{role:'system',content:system},{role:'user',content:String(message).trim()}];
}
