// The evidence-based bookshelf: what is really in the app, what Nandini only owns on paper, and under which licence.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {shelfProblems,subjectMatrix,aiBookIds,sectionText,licenseShort} from '../src/library-catalog.js';
import {SUBJECTS,BOOK_NAMES,SOURCE_LINKS} from '../src/study-plan.js';
const raw=name=>readFileSync(new URL('../data/books/'+name,import.meta.url));
const json=name=>JSON.parse(raw(name).toString('utf8'));
const sha=buf=>createHash('sha256').update(buf).digest('hex');
const catalog=json('catalog.json'),shelf=json('shelf.json');
const OPEN_RN={fundamentals:['c992dbca1868b6b68cd710ff6c6c26bc1270d60c50c66f2d9252f3a6be32b279',141],skills:['a04c7c2ca90ebcc9ba841b56ed791fce83595b1590a364a171901d3cde9b4df4',214],
 terminology:['6353078d461d6594261dd258319ca3d01709e87284baf815a35c7e7fdd2e0efb',148],mentalhealth:['d511577291641e80c3bc1ddab75a35bc6e918df18588e996a412cce54e7e26cc',129]};
const NEW=catalog.books.filter(b=>!OPEN_RN[b.id]);

test('the four Open RN books are exactly as imported in October: files, counts and catalog entries',()=>{
 const four=catalog.books.slice(0,4);
 assert.deepEqual(four.map(b=>b.id),Object.keys(OPEN_RN));
 // The four catalog entries, byte for byte (compact JSON of the list as it was on main).
 assert.equal(sha(Buffer.from(JSON.stringify(four))),'7d2534ca60ee7cac4317538aa704c28d5958e9d8bdee5dbd6e956fd32f8ef617');
 let chapters=0;
 for(const [id,[hash,count]] of Object.entries(OPEN_RN)){assert.equal(sha(raw(id+'.json')),hash,id+' text changed');assert.equal(json(id+'.json').chapters.length,count);chapters+=count}
 assert.equal(chapters,632);
});

test('the shelf keeps every rule: no duplicates, sound mapping, evidence for each printed title and each AI decision',()=>{
 assert.deepEqual(shelfProblems(catalog,shelf),[]);
 // The checker really catches the mistakes it is there for.
 const copy=()=>JSON.parse(JSON.stringify(shelf));
 let bad=copy();bad.physical_titles[0].searchable=true;assert.match(shelfProblems(catalog,bad).join('|'),/must not be searchable/);
 bad=copy();bad.physical_titles[0].chapters=40;assert.match(shelfProblems(catalog,bad).join('|'),/carries book field chapters/);
 bad=copy();bad.physical_titles[0].id='fundamentals';assert.match(shelfProblems(catalog,bad).join('|'),/also listed as a bundled book/);
 bad=copy();bad.subjects[0].coverage='full';assert.match(shelfProblems(catalog,bad).join('|'),/full coverage without a gap table/);
 bad=copy();bad.ai_use.allowed[0].books.push('openstax-anatomy');assert.match(shelfProblems(catalog,bad).join('|'),/against the publisher terms|duplicate AI policy/);
 bad=copy();bad.subjects[6].in_coach=true;assert.match(shelfProblems(catalog,bad).join('|'),/study plan without the owner/);
 const twice={...catalog,books:[...catalog.books,catalog.books[0]]};assert.match(shelfProblems(twice,shelf).join('|'),/duplicate book id/);
});

test('six photographed Neuron titles are recorded as owned on paper only, and the ICT title stays unconfirmed',()=>{
 const owned=shelf.physical_titles.filter(p=>p.status==='physical_verified');
 assert.deepEqual(owned.map(p=>p.title),['Neuron Fundamentals of Nursing','Neuron Behavioral Science','Neuron Basic Science',
  'Neuron Anatomy & Physiology for Nurses & Midwives','Neuron Microbiology & Parasitology for Nurses','Neuron Communicative English for Nurses']);
 assert.ok(owned.every(p=>p.publisher==='Neuron Publication'&&p.full_text==='not_imported'&&p.toc==='not_supplied'&&p.user_local_copy==='not_imported'&&p.searchable===false));
 // Only the edition seen on a title page is recorded; the other five are not guessed.
 assert.deepEqual(owned.filter(p=>p.edition).map(p=>[p.id,p.edition,p.edition_status]),[['neuron-anatomy-physiology','10th Edition','seen_on_title_page']]);
 assert.ok(owned.filter(p=>!p.edition).every(p=>p.edition_status==='unconfirmed'));
 assert.deepEqual(owned.find(p=>p.id==='neuron-anatomy-physiology').co_editors,['Dr. S. M. Mosharraf Hossain']);
 const ict=shelf.physical_titles.filter(p=>p.status==='title_unconfirmed');
 assert.equal(ict.length,1);assert.equal(ict[0].subject,'D117');assert.equal(ict[0].title,null);assert.equal(ict[0].publisher,null);assert.deepEqual(ict[0].editors,[]);
 // A photo proves ownership only.
 const photos=shelf.evidence.find(e=>e.id==='owner-photos-2026-11-12');
 assert.equal(photos.count,20);assert.match(photos.does_not_show.join(' '),/licensed copy/);assert.match(photos.does_not_show.join(' '),/table of contents/);assert.match(photos.does_not_show.join(' '),/ICT/);
 // No Neuron text or file is in the repository.
 assert.ok(catalog.books.every(b=>!/neuron/i.test(b.id+b.title+b.publisher)));
});

test('course mapping: her six subjects stay in the plan, Behavioral Science waits for confirmation',()=>{
 const rows=subjectMatrix(catalog,shelf);
 assert.deepEqual(rows.filter(r=>r.inCoach).map(r=>[r.code,r.name]),SUBJECTS.map(s=>[s.code,s.name]));
 const pending=rows.filter(r=>!r.inCoach);
 assert.deepEqual(pending.map(r=>[r.code,r.name,r.status]),[['D111','Behavioral Science','pending_confirmation']]);
 assert.deepEqual(pending[0].physical.map(p=>p.id),['neuron-behavioral-science']);assert.match(pending[0].statusNote,/until the owner or the college confirms/);
 // The study plan and the shelf point each subject at the same bundled books.
 for(const s of SUBJECTS){assert.deepEqual(s.references,shelf.subjects.find(x=>x.code===s.code).bundled.map(b=>b.book),s.code);for(const id of s.references)assert.ok(BOOK_NAMES[id]&&SOURCE_LINKS[id].endsWith('book='+id))}
 // Each row separates: printed book owned, bundled books, online links, her own copy on the phone, coverage.
 for(const r of rows){
  assert.equal(r.physical.length,1,r.code);assert.equal(r.userLocal,'not_imported');assert.ok(r.bundled.length>=1&&r.chapters>0);
  assert.ok(['partial','unverified'].includes(r.coverage),r.code+' must not claim full coverage');assert.equal(r.gapTable,'blocked_no_contents');assert.ok(r.coverageBn.length>20);
 }
 assert.deepEqual(rows.filter(r=>r.coverage==='partial').map(r=>r.code),['D124','D116']);
 assert.ok(rows.find(r=>r.code==='D117').online.every(o=>o.url.startsWith('https://')));
});

test('every later import has its licence, source, attribution and AI decision recorded, and the file is intact',()=>{
 assert.deepEqual(NEW.map(b=>b.id),['seer-anatomy','openstax-anatomy','openstax-microbiology','openstax-biology','openstax-chemistry','openstax-psychology','openstax-sociology','openstax-workplace']);
 for(const entry of NEW){
  const file=raw(entry.id+'.json'),book=JSON.parse(file.toString('utf8'));
  // Integrity: the catalog describes exactly this file.
  assert.equal(sha(file),entry.sha256,entry.id);assert.equal(file.length,entry.size_bytes);assert.equal(book.chapters.length,entry.chapters);
  assert.equal(book.toc_pages,entry.toc_pages);assert.equal(book.chapters.length+book.skipped_pages.length,book.toc_pages,entry.id+': every publisher page is imported or listed as skipped');
  assert.ok(book.skipped_pages.every(s=>s.title&&s.reason));
  let sections=0,chars=0;const urls=new Set(),titles=new Set(),ids=new Set();
  for(const ch of book.chapters){
   assert.ok(ch.title&&ch.group&&ch.url.startsWith(entry.chapter_url_base),entry.id+' '+ch.title);
   urls.add(ch.url);titles.add(ch.title);ids.add(ch.id);assert.ok(ch.sections.length>0);
   for(const s of ch.sections){sections++;const text=sectionText(s);chars+=text.length;assert.ok(s.heading&&text.length>1&&s.blocks.length>0);
    assert.ok(s.blocks.every(b=>['paragraph','bullet','numbered'].includes(b.type)&&b.text.trim().length>1));
    assert.doesNotMatch(text,/<(img|figure|svg|iframe|script|math)\b/i,entry.id+' '+ch.title)}
  }
  assert.equal(urls.size,book.chapters.length);assert.equal(titles.size,book.chapters.length);assert.equal(ids.size,book.chapters.length);
  assert.equal(sections,entry.sections);assert.equal(chars,entry.text_chars);
  // Provenance and licence.
  for(const k of ['title','publisher','license','license_url','source_url','attribution','ai_use','retrieved','source_version'])assert.ok(entry[k],entry.id+' lacks '+k);
  assert.equal(book.license,entry.license);assert.equal(book.attribution,entry.attribution);assert.equal(book.ai_use,entry.ai_use);assert.match(book.page_reference,/no page numbers|No PDF page metadata/i);
  assert.match(entry.license_url,/^https:\/\//);assert.match(entry.source_url,/^https:\/\//);assert.equal(entry.access,'bundled');assert.match(book.modifications,/[Ii]mages/);
  assert.ok(entry.subjects.every(code=>shelf.subjects.find(s=>s.code===code).bundled.some(b=>b.book===entry.id)));
 }
});

test('OpenStax books: CC BY-NC-SA 4.0 with the publisher\'s credit line, and never for AI',()=>{
 const os=NEW.filter(b=>/OpenStax/.test(b.publisher));assert.equal(os.length,7);
 for(const b of os){
  const book=json(b.id+'.json');
  assert.equal(licenseShort(b),'CC BY-NC-SA 4.0');assert.equal(b.license_url,'https://creativecommons.org/licenses/by-nc-sa/4.0/');assert.match(b.license,/shared under the same license/);
  assert.match(b.attribution,/^Access for free at https:\/\/openstax\.org\/books\/[\w-]+\/pages\/[\w-]+$/);
  assert.equal(b.ai_use,'not_permitted');assert.equal(book.publisher_ai_statement_seen,true);assert.match(book.ai_use_reason,/may not be used in the training of large language models/);
  assert.equal(book.section_shape,'blocks');assert.ok(b.chapters>150&&b.text_chars>1_000_000,b.id+' is not a whole book');
 }
 assert.ok(aiBookIds(catalog,shelf).every(id=>!id.startsWith('openstax-')));
 assert.match(shelf.ai_use.not_permitted[0].basis,/prior written permission/);
});

test('the NCI anatomy overview is public text with credit, and may be used by the Tutor',()=>{
 const b=catalog.books.find(x=>x.id==='seer-anatomy'),book=json('seer-anatomy.json');
 assert.equal(b.license_url,'https://www.cancer.gov/policies/copyright-reuse');assert.match(b.license,/free of copyright/);assert.match(b.attribution,/originally published by the National Cancer Institute/);
 assert.equal(b.ai_use,'allowed');assert.match(book.ai_use_reason,/free of copyright and may be reused without our permission/);assert.match(book.scope_note,/not a nursing textbook/);
 assert.equal(b.chapters,105);assert.ok(book.chapters.every(ch=>ch.url.startsWith('https://training.seer.cancer.gov/anatomy/')));
 assert.deepEqual(aiBookIds(catalog,shelf),['fundamentals','skills','terminology','mentalhealth','seer-anatomy']);
 // Fail closed: a book nobody listed, or one the publisher forbids, is never AI material.
 assert.deepEqual(aiBookIds(catalog,{}),[]);
 assert.deepEqual(aiBookIds({books:[{id:'x',ready:true,ai_use:'not_permitted'}]},{ai_use:{allowed:[{books:['x']}]}}),[]);
});
