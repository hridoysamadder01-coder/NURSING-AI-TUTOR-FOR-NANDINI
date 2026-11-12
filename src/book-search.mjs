// Server-owned nursing-book evidence search. No client-supplied citations are accepted.
// Searches only the bundled books the shelf allows for AI use, because these passages are sent to the server's model.
// Reading-only books (publisher forbids AI use) and printed titles that are not in the app are never searched here.
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {rank} from './answer-core.js';
import {aiBookIds,sectionText} from './library-catalog.js';
const docsRoot=new URL('../data/books/',import.meta.url);
const readJson=async name=>JSON.parse(await readFile(new URL(name,docsRoot),'utf8'));
const BOOKS=aiBookIds(await readJson('catalog.json'),await readJson('shelf.json'));
let cache;
let pending;
function segments(text,max=1250){
  const paragraphs=String(text||'').split(/\n\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>35);
  const out=[];
  for(const p of paragraphs){
    if(p.length<=max){out.push(p);continue}
    for(let start=0;start<p.length;){
      const end=Math.min(start+max,p.length);
      let split=end;
      if(end<p.length){const idx=p.lastIndexOf(' ',end);if(idx>start+max/2)split=idx}
      out.push(p.slice(start,split).trim());
      start=split;
    }
  }
  return out;
}
export async function libraryIndex(){
 if(cache)return cache;
 if(pending)return pending;
 pending=(async()=>{
   const loaded=await Promise.all(BOOKS.map(async id=>{
     const doc=JSON.parse(await readFile(new URL(id+'.json',docsRoot),'utf8'));
     if(doc.id!==id||!Array.isArray(doc.chapters))throw Error('invalid_book_index:'+id);
     const entries=[];
     for(let ci=0;ci<doc.chapters.length;ci++){
       const chapter=doc.chapters[ci];
       if(!Array.isArray(chapter.sections)||!chapter.title)continue;
       for(let si=0;si<chapter.sections.length;si++){
         const sec=chapter.sections[si];
         for(const passage of segments(sectionText(sec))){
           entries.push({
             id:id+':'+ci+':'+si+':'+entries.length,
             bookId:id,bookTitle:doc.title,chapter:chapter.title,
             heading:sec.heading,sourceUrl:chapter.url||doc.source_url,
             title:chapter.title+' '+sec.heading,
             text:passage
           });
         }
       }
     }
     return {id,title:doc.title,entries};
   }));
   return {books:loaded,entries:loaded.flatMap(b=>b.entries)};
 })();
 try{cache=await pending;return cache}finally{pending=undefined}
}
export const bookIds=Object.freeze([...BOOKS]);
export async function findEvidence(query,bookId='all',limit=4){
 if(typeof query!=='string'||query.length<2||query.length>300) return [];
 if(bookId!=='all'&&!BOOKS.includes(bookId))return [];
 const {books,entries}=await libraryIndex();
 const target=bookId==='all'?entries:books.find(b=>b.id===bookId).entries;
 const found=rank(query,target,Math.min(Math.max(Number(limit)||4,1),8));
 const seen=new Set();
 const hits=[];
 for(const p of found){
   if(seen.has(p.id))continue;
   seen.add(p.id);
   hits.push({
     id:p.id,bookId:p.bookId,bookTitle:p.bookTitle,chapter:p.chapter,
     heading:p.heading,sourceUrl:p.sourceUrl,excerpt:p.text,
     score:p.score
   });
 }
 return hits;
}
export function trustedSources(matches,max=3){
 return matches.slice(0,max).map(x=>({
   label:x.bookTitle+' · '+x.chapter+' · '+x.heading,
   url:x.sourceUrl,
   text:x.excerpt
 }));
}
