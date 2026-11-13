import test from 'node:test';
import assert from 'node:assert/strict';
import {bookIds,libraryIndex,findEvidence,trustedSources} from '../src/book-search.mjs';
test('the books allowed for AI use are searchable without remote API or cloud inference',async()=>{
 const data=await libraryIndex();
 assert.deepEqual(bookIds,['fundamentals','skills','terminology','mentalhealth','seer-anatomy']);
 assert.ok(data.entries.length>2000,'books contain surprisingly little searchable content');
 assert.equal(data.books.length,5);
 assert.ok(data.entries.every(e=>!e.bookId.startsWith('openstax-')),'reading-only books must not feed the server model');
});
test('hand hygiene returns real citations from the book, never a PDF page invented',async()=>{
 const result=await findEvidence('hand hygiene','fundamentals');
 assert.ok(result.length>0,'hand hygiene should exist in published fundamentals');
 assert.ok(result[0].sourceUrl.startsWith('https://wtcs.pressbooks.pub/nursingfundamentals/'));
 assert.ok(result.every(hit=>hit.chapter&&hit.heading&&hit.excerpt.length>=35));
 const sources=trustedSources(result);
 assert.ok(sources.length>0&&sources.length<=3);
 assert.ok(sources.every(s=>s.url.startsWith('https://wtcs.pressbooks.pub/')));
});
test('a completely unrelated subject should produce no source evidence',async()=>{
 assert.deepEqual(await findEvidence('extraterrestrial starship warp hyperdrive'),[]);
});
test('bad book IDs and oversized query cannot be used to search arbitrary files',async()=>{
 assert.deepEqual(await findEvidence('hand','../../secrets'),[]);
 assert.deepEqual(await findEvidence('a'.repeat(500),'all'),[]);
});
