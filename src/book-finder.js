// "Where do I read this?" Points a question to exact chapters of the bundled books, by chapter titles and section headings.
// It only returns a citation (book, chapter, link into the app's reader). No book text is shown here and nothing is sent to a
// language model, so the reading-only books can be found this way too. Printed titles that are not in the app are not in
// the index, so they can never be returned. No page numbers exist for these books and none are made up.
import {queryTerms,enTokens} from './rag.js';
// Words that say nothing about a topic in a heading ("Introduction", "Types of ...").
const WEAK=new Set(enTokens('introduction overview summary review chapter part unit section general basic concept concepts type types structure function system systems care nursing nurse patient health body human common other introduction'));
export function buildFinder(toc){
 const entries=[],df=new Map();
 (toc?.books||[]).forEach((book,bi)=>{for(const [ci,title,heads] of book.chapters){
  const t=new Set(enTokens(title)),h=new Set((heads||[]).flatMap(x=>enTokens(x)));
  for(const x of new Set([...t,...h]))df.set(x,(df.get(x)||0)+1);
  entries.push({bi,ci,title,heads:heads||[],t,h});
 }});
 return {books:(toc?.books||[]).map(b=>({id:b.id,title:b.title})),entries,df,n:entries.length};
}
export function findChapters(question,finder,{limit=3,perBook=1}={}){
 if(!finder?.n)return [];
 const terms=[...new Set(queryTerms(question))].filter(t=>!WEAK.has(t)&&finder.df.has(t));
 if(!terms.length)return [];
 const idf=t=>Math.log(1+finder.n/(1+finder.df.get(t)));
 const total=terms.reduce((s,t)=>s+idf(t),0),rare=terms.reduce((a,t)=>idf(t)>idf(a)?t:a,terms[0]);
 const scored=[];
 for(const e of finder.entries){
  let score=0,matched=0,inTitle=false;
  for(const t of terms){const w=idf(t);if(e.t.has(t)){score+=3*w;matched+=w;inTitle=true}else if(e.h.has(t)){score+=w;matched+=w}}
  // A pointer must be about the question: the chapter names its most specific word, or its title carries half of the question.
  if(!score||!(e.t.has(rare)||e.h.has(rare)||(inTitle&&matched>=total*0.5)))continue;
  scored.push({e,score:score/(1+0.04*e.t.size)});
 }
 scored.sort((a,b)=>b.score-a.score||a.e.bi-b.e.bi||a.e.ci-b.e.ci);
 const out=[],used=new Map();
 for(const {e,score} of scored){
  const n=used.get(e.bi)||0;if(n>=perBook)continue;used.set(e.bi,n+1);
  const book=finder.books[e.bi],heading=e.heads.find(x=>enTokens(x).some(t=>terms.includes(t)))||'';
  out.push({bookId:book.id,bookTitle:book.title,chapter:e.ci,chapterTitle:e.title,heading,score:Math.round(score*100)/100,
   href:'./library.html?book='+encodeURIComponent(book.id)+'&chapter='+e.ci});
  if(out.length>=limit)break;
 }
 return out;
}
