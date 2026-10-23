import {lessons,source} from './lesson-data.js';
const clean=s=>String(s??'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{M}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export function terms(text){return [...new Set(clean(text).split(' ').filter(x=>x.length>1))]}
const stop=new Set(['কি','কী','কেন','কিভাবে','কিভাবে','এর','এবং','একটি','আমাকে','বলো','হবে','করে','করতে','is','the','what','why','how','please','about','does','can','are','for','with']);
export function rank(query,documents,limit=3){
 const queryTerms=terms(query).filter(t=>!stop.has(t));if(!queryTerms.length)return[];
 return documents.map((doc,i)=>{
  const title=clean(doc.title||'');const body=clean(doc.text||'');const keys=(doc.keywords||[]).map(clean);
  let score=0;
  for(const t of queryTerms){if(title.includes(t))score+=6;if(keys.some(k=>k.includes(t)||t.includes(k)&&k.length>3))score+=5;if(body.includes(t))score+=1}
  return {...doc,score,index:i};
 }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit);
}
export function answerFromLesson(query){
 const hits=rank(query,lessons,2);
 return {status:hits.length?'matched':'not_found',mode:'curated_lesson_search',source,hits:hits.map(h=>({title:h.title,text:h.text,section:h.section,score:h.score}))};
}
export function excerptFromPages(query,pages,limit=3){
 const bounded=pages.filter(p=>Number.isInteger(p.page)&&p.page>=1&&typeof p.text==='string'&&p.text.trim().length);
 return rank(query,bounded.map(p=>({title:'পৃষ্ঠা '+p.page,text:p.text,page:p.page})),limit).map(p=>({
 page:p.page,source:'student_pdf',excerpt:extractWindow(query,p.text,380),score:p.score
 }));
}
export function extractWindow(query,text,width=380){
 const words=terms(query).filter(t=>!stop.has(t));const lower=text.toLowerCase();
 let at=-1;for(const w of words){at=lower.indexOf(w);if(at>=0)break}
 if(at<0)at=0;const start=Math.max(0,at-Math.floor(width/4));
 return (start?'…':'')+text.slice(start,start+width).replace(/\s+/g,' ').trim()+(start+width<text.length?'…':'');
}
