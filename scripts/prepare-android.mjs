// Prepare a standalone offline-first Android study bundle from repository sources.
// No network calls, API keys or dynamic private files are included in APK.
import {mkdir,copyFile,readFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
const sources=[
'index.html','library.html','tutor.html','coach.html','settings.html','faridpur-first-year.html',
'manifest.webmanifest','icon.svg','sw.js',
'src/study-plan.js','src/api-config.js','src/answer-core.js','src/lesson-data.js',
'data/books/catalog.json','data/books/fundamentals.json','data/books/skills.json','data/books/terminology.json'
];
await rm('www',{recursive:true,force:true});
for(const src of sources){const dest=join('www',src);await mkdir(join(dest,'..'),{recursive:true});await copyFile(src,dest)}
const catalog=JSON.parse(await readFile('www/data/books/catalog.json','utf8'));
if(catalog.books.length!==3)throw Error('Missing three verified source books in APK');
let chapters=0;for(const b of catalog.books){const data=JSON.parse(await readFile(join('www/data/books',b.id+'.json'),'utf8'));chapters+=data.chapters.length}
if(chapters<470)throw Error('Textbooks incomplete in Android package');
const all=await Promise.all(sources.map(async s=>({file:s,size:(await stat(join('www',s))).size})));
console.log(JSON.stringify({status:'offline_assets_prepared',files:all.length,bytes:all.reduce((sum,x)=>sum+x.size,0),chapters},null,2));
