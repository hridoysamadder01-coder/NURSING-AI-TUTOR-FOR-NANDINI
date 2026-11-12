// Bookshelf model shared by the library, the subject page, the Tutor and the tests.
// data/books/catalog.json lists the bundled books (text really in the app); data/books/shelf.json is the hand-kept evidence:
// the printed books Nandini owns, her subjects, and which bundled book may be sent to a language model.
// A printed title is never a book in the app: it has no text, so it is never searched and never evidence for an answer.

// Books written by the newer importers keep each section as blocks only; its text is the blocks joined by blank lines.
export const sectionText=sec=>typeof sec?.text==='string'?sec.text:(sec?.blocks||[]).map(b=>b.text).join('\n\n');
export const bookOf=(catalog,id)=>(catalog?.books||[]).find(b=>b.id===id)||null;
// Fail closed: a book reaches a language model only when the shelf lists it as allowed and nothing says otherwise.
export function aiBookIds(catalog,shelf){
 const allowed=new Set((shelf?.ai_use?.allowed||[]).flatMap(x=>x.books)),blocked=new Set((shelf?.ai_use?.not_permitted||[]).flatMap(x=>x.books));
 return (catalog?.books||[]).filter(b=>b.ready&&allowed.has(b.id)&&!blocked.has(b.id)&&b.ai_use!=='not_permitted').map(b=>b.id);
}
export function licenseShort(book){
 const l=String(book?.license||'');
 if(/BY-NC-SA 4\.0/.test(l))return 'CC BY-NC-SA 4.0';
 if(/CC BY 4\.0/.test(l))return 'CC BY 4.0';
 if(/free of copyright/i.test(l))return 'কপিরাইট-মুক্ত (মার্কিন সরকারি NCI)';
 return l.split(';')[0];
}
export const COVERAGE_BN={full:'পুরো মিলিয়ে দেখা হয়েছে',partial:'আংশিক',none:'অ্যাপে কোনো বই নেই',unverified:'মিলিয়ে দেখা হয়নি'};
export const PHYSICAL_BN={physical_verified:'হাতে আছে (ছবিতে দেখা)',title_unconfirmed:'বইয়ের নাম এখনো জানা নেই'};
export const LOCAL_BN={not_imported:'এখনো আনা হয়নি',imported:'আছে'};
// One row per subject: printed book she owns → bundled books → online links → her own copy on the phone → coverage.
export function subjectMatrix(catalog,shelf){
 const ai=new Set(aiBookIds(catalog,shelf));
 return (shelf?.subjects||[]).map(s=>{
  const physical=s.physical.map(id=>shelf.physical_titles.find(p=>p.id===id)).filter(Boolean);
  const bundled=s.bundled.map(x=>{const b=bookOf(catalog,x.book);return b&&{id:b.id,title:b.title,publisher:b.publisher,chapters:b.chapters,license:licenseShort(b),licenseUrl:b.license_url||'',aiUse:ai.has(b.id),note:x.note||''}}).filter(Boolean);
  return {code:s.code,name:s.name,bn:s.bn,emoji:s.emoji,status:s.status,statusNote:s.status_note||'',inCoach:Boolean(s.in_coach),physical,bundled,online:s.online||[],
   userLocal:physical.some(p=>p.user_local_copy==='imported')?'imported':'not_imported',chapters:bundled.reduce((n,b)=>n+b.chapters,0),
   coverage:s.coverage,coverageNote:s.coverage_note||'',coverageBn:s.coverage_bn||'',statusBn:s.status_bn||'',gapTable:s.gap_table};
 });
}
export const subjectsOfBook=(shelf,id)=>(shelf?.subjects||[]).filter(s=>s.bundled.some(b=>b.book===id));
// Every rule the shelf must keep. Returns the list of broken rules (empty when the shelf is sound).
export function shelfProblems(catalog,shelf){
 const out=[],books=catalog?.books||[],titles=shelf?.physical_titles||[],subjects=shelf?.subjects||[];
 const dup=(list,what)=>{const seen=new Set();for(const x of list){const k=String(x).toLowerCase();if(seen.has(k))out.push('duplicate '+what+': '+x);seen.add(k)}};
 dup(books.map(b=>b.id),'book id');dup(books.map(b=>b.title),'book title');dup(titles.map(p=>p.id),'printed title id');
 dup(titles.filter(p=>p.title).map(p=>p.title),'printed title');dup(subjects.map(s=>s.code),'subject code');
 const evidence=new Set((shelf?.evidence||[]).map(e=>e.id)),bookIds=new Set(books.map(b=>b.id)),bookTitles=new Set(books.map(b=>b.title.toLowerCase()));
 for(const p of titles){
  if(bookIds.has(p.id)||(p.title&&bookTitles.has(p.title.toLowerCase())))out.push('printed title is also listed as a bundled book: '+p.id);
  if(!['physical_verified','title_unconfirmed'].includes(p.status))out.push('unknown status: '+p.id);
  if((p.status==='physical_verified')!==Boolean(p.title))out.push('title and status disagree: '+p.id);
  if(p.full_text!=='not_imported'||p.searchable!==false)out.push('printed title must not be searchable: '+p.id);
  for(const k of ['chapters','sections','source_url','license','ready'])if(k in p)out.push('printed title carries book field '+k+': '+p.id);
  if(!evidence.has(p.evidence))out.push('no evidence for: '+p.id);
  if(!subjects.some(s=>s.code===p.subject&&s.physical.includes(p.id)))out.push('printed title is not mapped to its subject: '+p.id);
 }
 const levels=Object.keys(shelf?.coverage_levels||{});
 for(const s of subjects){
  for(const id of s.physical)if(!titles.some(p=>p.id===id&&p.subject===s.code))out.push(s.code+' lists an unknown printed title: '+id);
  for(const b of s.bundled)if(!bookIds.has(b.book))out.push(s.code+' lists a book that is not bundled: '+b.book);
  if(!levels.includes(s.coverage))out.push(s.code+' has an unknown coverage level');
  if(s.coverage==='full'&&s.gap_table!=='done')out.push(s.code+' claims full coverage without a gap table');
  if(s.coverage==='none'&&s.bundled.length)out.push(s.code+' says none but lists bundled books');
  if(s.in_coach!==(s.status==='owner_listed'))out.push(s.code+' is in the study plan without the owner listing it (or the reverse)');
 }
 const allowed=(shelf?.ai_use?.allowed||[]).flatMap(x=>x.books),blocked=(shelf?.ai_use?.not_permitted||[]).flatMap(x=>x.books);
 dup([...allowed,...blocked],'AI policy entry');
 for(const b of books){
  if(!allowed.includes(b.id)&&!blocked.includes(b.id))out.push('no AI policy for: '+b.id);
  if(allowed.includes(b.id)&&(b.ai_use==='not_permitted'||/openstax/i.test(b.publisher)))out.push('AI use allowed against the publisher terms: '+b.id);
  if(!subjects.some(s=>s.bundled.some(x=>x.book===b.id)))out.push('bundled book is not mapped to a subject: '+b.id);
 }
 for(const id of [...allowed,...blocked])if(!bookIds.has(id))out.push('AI policy names a book that is not bundled: '+id);
 for(const x of [...(shelf?.ai_use?.allowed||[]),...(shelf?.ai_use?.not_permitted||[])])if(!x.basis||!/^https:\/\//.test(x.evidence_url||''))out.push('AI policy entry without evidence');
 return out;
}
