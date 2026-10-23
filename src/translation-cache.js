// Persist translation alongside original paragraph without storing user secrets.
// Cache is device-local IndexedDB. Failing storage never mutates source books.
const dbName='nandini-bilingual-library-v1';
let connection;
function openDB(){
 if(!('indexedDB' in globalThis))return Promise.resolve(null);
 if(connection)return connection;
 connection=new Promise(resolve=>{
  try{const request=indexedDB.open(dbName,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('paragraphs'))db.createObjectStore('paragraphs')};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);
    request.onblocked=()=>resolve(null);
  }catch{resolve(null)}
 });return connection;
}
export function paragraphKey(book,chapter,section,paragraph,sourceText){
 const text=String(sourceText||'');
 // Plaintext signature mitigates stale cache after publisher book changes.
 let hash=2166136261;
 for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
 return [book,chapter,section,paragraph,text.length,hash.toString(16)].join(':');
}
export async function readTranslation(key){
 const db=await openDB();if(!db)return null;
 return new Promise(resolve=>{try{const tx=db.transaction('paragraphs','readonly'),req=tx.objectStore('paragraphs').get(key);req.onsuccess=()=>resolve(typeof req.result==='string'?req.result:null);req.onerror=()=>resolve(null)}catch{resolve(null)}});
}
export async function saveTranslation(key,value){
 if(typeof value!=='string'||!value.trim())return false;
 const db=await openDB();if(!db)return false;
 return new Promise(resolve=>{try{const tx=db.transaction('paragraphs','readwrite');tx.objectStore('paragraphs').put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}});
}
