// Build data/books/toc-index.json: the chapter titles and section headings of every bundled book, for src/book-finder.js.
// Deterministic (no dates), so a test can rebuild it and compare. Run after any book import:
//   node scripts/build-book-index.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=new URL('../data/books/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
// End-of-chapter pages (questions, glossaries, answer keys) are left out: the finder should point at the teaching text.
const TEACHING=new Set(['numbered-section','intro','page','appendix']);
const SKIP_HEADING=/^(learning objectives|note|example)$|\(continued\)$/i;
export function buildTocIndex(){
 const books=[];
 for(const b of read('catalog.json').books){
  const book=read(b.id+'.json'),chapters=[];
  book.chapters.forEach((ch,ci)=>{
   if(ch.kind&&!TEACHING.has(ch.kind))return;
   const heads=[...new Set(ch.sections.map(s=>s.heading).filter(h=>h&&h!==ch.title&&!SKIP_HEADING.test(h)))].slice(0,12);
   chapters.push([ci,ch.title,heads]);
  });
  books.push({id:b.id,title:b.title,chapters});
 }
 return {schema:1,about:'Chapter titles and section headings of the bundled books. Built by scripts/build-book-index.mjs; do not edit by hand.',books};
}
export const packIndex=index=>JSON.stringify(index)+'\n';
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const index=buildTocIndex();
 writeFileSync(new URL('toc-index.json',root),packIndex(index));
 console.log('toc-index.json',index.books.map(b=>b.id+':'+b.chapters.length).join(' '));
}
