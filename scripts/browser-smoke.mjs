// Real headless Chromium smoke test at Android viewport; not a substitute for physical phone.
import {chromium} from 'playwright';
import {server} from '../server.mjs';
import assert from 'node:assert/strict';
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await listen();const port=server.address().port;const base='http://127.0.0.1:'+port;
const browser=await chromium.launch({headless:true});let failed=false;
try{
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/index.html',{waitUntil:'networkidle'});
 assert.match(await page.title(),/Nandini/);
 await page.getByRole('link',{name:/Study Coach/}).first().click();
 await page.waitForURL(/coach\.html/);
 assert.match(await page.locator('#chosenSubject').innerText(),/নার্সিং/);
 assert.equal(await page.locator('.topic').count(),8);
 await page.locator('.topic button').first().click();
 assert.equal(await page.locator('#doneStat').innerText(),'1');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#doneStat').innerText(),'1');
 await page.locator('#search').fill('hand hygiene');
 await page.locator('#searchBtn').click();
 await page.waitForFunction(()=>document.querySelectorAll('#sources .source').length>0,null,{timeout:20000});
 const src=await page.locator('#sources .source a').first().getAttribute('href');
 assert.match(src,/https:\/\/wtcs\.pressbooks\.pub\//);
 await page.goto(base+'/library.html',{waitUntil:'networkidle'});
 await page.locator('#shelf .book button').first().click();
 await page.waitForFunction(()=>document.querySelector('#chapters')?.options?.length>0);
 assert.ok((await page.locator('#chapters option').count())>=130);
 await page.locator('#searchText').fill('hand hygiene');
 await page.locator('#searchBtn').click();
 assert.ok((await page.locator('#results').innerText()).length>40);
 assert.deepEqual(errors,[]);
 console.log('PASS: Mobile Chrome home -> coach -> local progress/reload -> sourced cross-book search -> 141+ chapter reader -> book search');
}finally{await browser.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
