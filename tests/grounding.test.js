// Source grounding for the wider bookshelf: what may reach a language model, what a citation may say, and when to abstain.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
import {chunkBooks,buildIndex,retrieve,lookupText,buildMessages,isOwnBookQuestion,stripBrand,enTokens,OWN_BOOK_NOTE,isDoseQuestion,DOSE_NOTE,buildPageMessages,pageTextUsable,PAGE_UNREADABLE} from '../src/rag.js';
import {aiBookIds} from '../src/library-catalog.js';
import {buildFinder,findChapters} from '../src/book-finder.js';
import {buildTocIndex,packIndex} from '../scripts/build-book-index.mjs';
const json=name=>JSON.parse(readFileSync(new URL('../data/books/'+name,import.meta.url),'utf8'));
const catalog=json('catalog.json'),shelf=json('shelf.json');
const aiBooks=aiBookIds(catalog,shelf).map(id=>json(id+'.json'));
const index=buildIndex(chunkBooks(aiBooks));
const finder=buildFinder(json('toc-index.json'));

test('only books allowed for AI are in the Tutor\'s index; a forbidden book is refused even if it is passed in',()=>{
 assert.deepEqual([...new Set(index.chunks.map(c=>c.book))],['fundamentals','skills','terminology','mentalhealth','seer-anatomy']);
 const openstax=json('openstax-anatomy.json');
 assert.equal(chunkBooks([openstax]).length,0);
 assert.equal(chunkBooks([...aiBooks,openstax]).length,index.chunks.length);
 // Every page that loads books for a model goes through the allow-list.
 for(const page of ['ask.html','coach.html'])assert.match(readFileSync(page,'utf8'),/aiBookIds\(c,sh\)\.map/);
 assert.match(readFileSync('src/book-search.mjs','utf8'),/const BOOKS=aiBookIds\(/);
 assert.doesNotMatch(readFileSync('ask.html','utf8')+readFileSync('coach.html','utf8'),/openstax-/);
});

test('NCI anatomy text grounds an answer with its exact page link and no page number',()=>{
 const ctx=retrieve('What do the endocrine glands secrete into the blood?',index);
 assert.equal(ctx.grounded,true);
 const seer=retrieve('exocrine glands and endocrine glands hormones',index,{k:3}).passages.filter(p=>p.book==='seer-anatomy');
 assert.ok(seer.length>0,'the NCI overview should be found');
 assert.ok(seer.every(p=>p.url.startsWith('https://training.seer.cancer.gov/anatomy/')&&p.chapter&&p.heading));
 // A citation is book · chapter · heading: no chunk or lookup result carries a page number.
 assert.ok(index.chunks.every(c=>!('page' in c)));
 assert.doesNotMatch(lookupText('exocrine glands and endocrine glands hormones',index),/\bpage \d|পৃষ্ঠা \d/i);
});

test('a printed title is never evidence: the Neuron books are in no index and cannot be cited',()=>{
 assert.ok(index.chunks.every(c=>!/neuron publication/i.test(c.bookTitle)&&!c.book.startsWith('neuron')));
 assert.ok(finder.books.every(b=>!b.id.startsWith('neuron')&&!/^Neuron /.test(b.title)));
 for(const p of shelf.physical_titles.filter(x=>x.title)){
  for(const hit of findChapters(p.title,finder))assert.ok(catalog.books.some(b=>b.id===hit.bookId),'a pointer must be a bundled book');
  assert.equal(isOwnBookQuestion(p.title+' বইয়ে কী আছে?'),true,p.title);
 }
 // Asking what her own book says gets the fixed note, for the phone model, the online models and the voice tool alike.
 for(const q of ['Neuron Anatomy & Physiology বইয়ের ৩ নম্বর অধ্যায়ে কী আছে?','আমার বইয়ের ৫০ পৃষ্ঠায় কী লেখা?','amar anatomy boi te ki ache','নিউরন বই থেকে বলো','my college book page 12'])assert.equal(isOwnBookQuestion(q),true,q);
 for(const q of ['neuron কী?','নিউরনের গঠন বলো','neuron er anatomy bolo','বইয়ে খুঁজো','osmosis কী?'])assert.equal(isOwnBookQuestion(q),false,q);
 // The publisher's name is taken out before every search on the Tutor page (topics, book passages, chapter pointers).
 assert.doesNotMatch(stripBrand('Neuron বইয়ের ৩ নম্বর অধ্যায়ে কী আছে?'),/neuron/i);assert.equal(stripBrand('neuron কী?'),'neuron কী?');
 assert.deepEqual(findChapters(stripBrand('Neuron বইয়ের ৩ নম্বর অধ্যায়ে কী আছে?'),finder),[]);
 const page=readFileSync('ask.html','utf8');
 for(const use of ['askTutor(stripBrand(q))','findChapters(stripBrand(q),finder)','q=stripBrand(q);'])assert.ok(page.includes(use),use);
 assert.deepEqual(enTokens('H₂O and 10⁻¹⁴'),enTokens('H2O and 10-14'));
 const tool=lookupText('আমার Neuron Anatomy & Physiology বইয়ের ১২০ পৃষ্ঠায় কী আছে?',index);
 assert.ok(tool.startsWith('OWN_BOOK: '+OWN_BOOK_NOTE));
 const [,user]=buildMessages('আমার বইয়ে osmosis নিয়ে কী লেখা আছে?',retrieve('আমার বইয়ে osmosis নিয়ে কী লেখা আছে?',index));
 assert.match(user.content,/নিজের ছাপা বইয়ের লেখা তোমার কাছে নেই/);
 assert.doesNotMatch(buildMessages('osmosis কী?',retrieve('osmosis কী?',index))[1].content,/ছাপা বইয়ের লেখা/);
});

test('retrieval failures abstain, and dose questions never reach a model',()=>{
 for(const q of ['extraterrestrial starship warp hyperdrive','ক্রিকেট বিশ্বকাপ কে জিতেছে?']){assert.equal(retrieve(q,index).grounded,false,q);assert.equal(lookupText(q,index),'NOT_FOUND');assert.deepEqual(findChapters(q,finder),[])}
 assert.equal(lookupText('Neuron বইয়ের ক্রিকেট বিশ্বকাপ অধ্যায়',index).endsWith('NOT_FOUND'),true);
 assert.equal(isDoseQuestion('রোগীকে প্যারাসিটামল কত mg দেব?'),true);assert.ok(lookupText('রোগীকে প্যারাসিটামল কত mg দেব?',index).includes(DOSE_NOTE));
});

test('"where do I read this" points at exact chapters of bundled books, reading-only ones included',()=>{
 const cases=[['কিডনির কাজ','openstax-anatomy',/Kidney/],['nephron কী?','openstax-anatomy',/Kidney|Nephron/i],['হৃদ্‌যন্ত্রের গঠন','seer-anatomy',/Heart/],
  ['osmosis and diffusion','openstax-biology',/Passive Transport/],['pH কী','openstax-chemistry',/pH and pOH/],['classical conditioning','openstax-psychology',/Classical Conditioning/],
  ['ম্যালেরিয়া','openstax-microbiology',/./],['Excel formula','openstax-workplace',/Formulas/],['হাত ধোয়া','skills',/Hand Hygiene/]];
 for(const [q,bookId,title] of cases){
  const hit=findChapters(q,finder).find(h=>h.bookId===bookId);assert.ok(hit,q+' should point into '+bookId);assert.match(hit.chapterTitle,title);
  const book=json(bookId+'.json');assert.equal(book.chapters[hit.chapter].title,hit.chapterTitle,'the link opens that very chapter');
  assert.equal(hit.href,'./library.html?book='+bookId+'&chapter='+hit.chapter);assert.ok(!('page' in hit)&&!('text' in hit));
 }
 assert.deepEqual(findChapters('কেমন আছো',finder),[]);assert.deepEqual(findChapters('',finder),[]);
});

test('the headings index is in step with the books, and the importer helpers pass their self-test',()=>{
 assert.equal(readFileSync('data/books/toc-index.json','utf8'),packIndex(buildTocIndex()),'run: node scripts/build-book-index.mjs');
 const py=spawnSync('python3',['scripts/bookimport.py','--selftest'],{encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);assert.match(py.stdout,/selftest ok/);
 for(const script of ['import_openstax.py','import_seer.py','import_openrn.py'])assert.equal(spawnSync('python3',['-m','py_compile','scripts/'+script]).status,0,script);
});


test('Scan & Explain: Shayni explains only the photographed page, with provenance and no dose',()=>{
 // Noise or a near-blank read is not usable; a real page is.
 assert.equal(pageTextUsable(''),false);
 assert.equal(pageTextUsable('q w e'),false);
 assert.equal(pageTextUsable('|| ~ 3 .'),false);
 assert.equal(pageTextUsable('The nephron is the functional unit of the kidney and filters blood.'),true);
 const page='The nephron is the functional unit of the kidney. It filters blood and forms urine through filtration, reabsorption and secretion.';
 const [sys,user]=buildPageMessages(page,'nephron অংশটা বোঝাও');
 assert.equal(sys.role,'system');assert.equal(user.role,'user');
 // Grounded strictly on the page; must not invent; keeps the no-dose rule; honest if unreadable.
 assert.match(sys.content,/শুধু নিচের "পাতার লেখা" থেকে/);
 assert.match(sys.content,/পাতায় যা নেই, তা বলবে না/);
 assert.match(sys.content,/ডোজ/);
 assert.match(sys.content,/তোলা পাতা/);
 assert.ok(user.content.includes(page),'the page text is the evidence');
 assert.ok(user.content.includes('nephron অংশটা বোঝাও'),'carries her question');
 // No question → explain the whole page.
 assert.match(buildPageMessages(page,'')[1].content,/এই পাতাটা সহজ/);
 // The cloud variant allows everyday examples; the on-device one stays terse.
 assert.match(buildPageMessages(page,'',{cloud:true})[0].content,/উদাহরণ/);
 assert.doesNotMatch(buildPageMessages(page,'')[0].content,/রোজকার জীবনের/);
 // The fixed abstain line names the page and asks for a clearer photo.
 assert.match(PAGE_UNREADABLE,/পরিষ্কার পড়তে পারিনি/);
 // Dose questions are handled by the caller with DOSE_NOTE and never reach the page model.
 assert.equal(isDoseQuestion('রোগীকে কত mg দেব?'),true);
});
