// Prepare a standalone offline-first Android study bundle from repository sources.
// No network calls, API keys or dynamic private files are included in APK.
import {mkdir,copyFile,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const sources=[
'index.html','library.html','tutor.html','coach.html','settings.html','faridpur-first-year.html','topics.html','ask.html','scan.html',
'manifest.webmanifest','icon.svg','sw.js','src/app.css',
'src/study-plan.js','src/easy-topics.js','src/tutor-core.js','src/rag.js','src/local-llm.js','src/voice.js','src/cloud-ai.js','src/live-talk.js','src/talk-audio.js','src/persona.js','src/api-config.js','src/translation-cache.js','src/answer-core.js','src/lesson-data.js','src/library-catalog.js','src/book-finder.js','src/page-ocr.js',
'vendor/tesseract/tesseract.min.js','vendor/tesseract/worker.min.js','vendor/tesseract/tesseract-core-simd-lstm.wasm.js','vendor/tesseract/tessdata/eng.traineddata.gz','vendor/tesseract/tessdata/ben.traineddata.gz',
'data/books/catalog.json','data/books/shelf.json','data/books/toc-index.json',
// Every bundled book the catalog lists (the four Open RN books plus the later licensed imports).
...JSON.parse(readFileSync('data/books/catalog.json','utf8')).books.map(b=>'data/books/'+b.id+'.json')
];
await rm('www',{recursive:true,force:true});
for(const src of sources){const dest=join('www',src);await mkdir(join(dest,'..'),{recursive:true});await copyFile(src,dest)}
// Android hardware/gesture Back: go back through the page history, and only leave the app from the first screen.
// Injected into the APK pages only (the @capacitor/app plugin exists there); on the web this script does nothing.
const BACK='<script>(function(){try{var C=window.Capacitor;if(!C||!C.isNativePlatform||!C.isNativePlatform())return;var A=C.Plugins&&C.Plugins.App;if(!A||!A.addListener)return;A.addListener("backButton",function(){if(window.history.length>1){window.history.back()}else if(A.exitApp){A.exitApp()}})}catch(e){}})();</script>';
for(const src of sources.filter(s=>s.endsWith('.html'))){const dest=join('www',src);const html=await readFile(dest,'utf8');if(html.includes('</body>'))await writeFile(dest,html.replace('</body>',BACK+'</body>'))}
const catalog=JSON.parse(await readFile('www/data/books/catalog.json','utf8'));
if(!['fundamentals','skills','terminology','mentalhealth'].every(id=>catalog.books.some(b=>b.id===id)))throw Error('Missing four verified source books in APK');
let chapters=0;for(const b of catalog.books){const data=JSON.parse(await readFile(join('www/data/books',b.id+'.json'),'utf8'));if(data.chapters.length!==b.chapters)throw Error('Catalog and book file disagree: '+b.id);chapters+=data.chapters.length}
const shelf=JSON.parse(await readFile('www/data/books/shelf.json','utf8'));
if(shelf.physical_titles.some(p=>catalog.books.some(b=>b.id===p.id)))throw Error('A printed title must never be packaged as a readable book');
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
