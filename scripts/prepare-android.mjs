// Prepare a standalone offline-first Android study bundle from repository sources.
// No network calls, API keys or dynamic private files are included in APK.
import {mkdir,copyFile,readFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
const sources=[
'index.html','library.html','tutor.html','coach.html','settings.html','faridpur-first-year.html','topics.html','ask.html',
'manifest.webmanifest','icon.svg','sw.js','src/app.css',
'src/study-plan.js','src/easy-topics.js','src/tutor-core.js','src/rag.js','src/local-llm.js','src/voice.js','src/api-config.js','src/translation-cache.js','src/answer-core.js','src/lesson-data.js',
'data/books/catalog.json','data/books/fundamentals.json','data/books/skills.json','data/books/terminology.json','data/books/mentalhealth.json'
];
await rm('www',{recursive:true,force:true});
for(const src of sources){const dest=join('www',src);await mkdir(join(dest,'..'),{recursive:true});await copyFile(src,dest)}
const catalog=JSON.parse(await readFile('www/data/books/catalog.json','utf8'));
if(catalog.books.length!==4)throw Error('Missing four verified source books in APK');
let chapters=0;for(const b of catalog.books){const data=JSON.parse(await readFile(join('www/data/books',b.id+'.json'),'utf8'));chapters+=data.chapters.length}
if(chapters<620)throw Error('Textbooks incomplete in Android package');
const structure=await JSON.parse(await readFile('www/data/books/skills.json','utf8'));
const steps=structure.chapters.flatMap(ch=>ch.sections).flatMap(s=>s.blocks||[]).filter(b=>b.type==='numbered').length;
if(steps<1)throw Error('Missing publisher ordered nursing procedure steps');
console.log('Publisher numbered procedure steps:',steps);

const reader=await readFile('www/library.html','utf8');
if(!reader.includes('native-translation.bundle.js')||!reader.includes('source-list'))throw Error('Missing bilingual textbook reader controls');
if(!sources.includes('src/translation-cache.js'))throw Error('Missing offline translation cache');
const all=await Promise.all(sources.map(async s=>({file:s,size:(await stat(join('www',s))).size})));
console.log(JSON.stringify({status:'offline_assets_prepared',files:all.length,bytes:all.reduce((sum,x)=>sum+x.size,0),chapters},null,2));
