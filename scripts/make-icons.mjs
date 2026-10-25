// Renders the app logo (icon.svg) into the Android launcher icons in android-icons/, which scripts/add-local-llm.mjs
// copies into the generated android/ project. Run after changing icon.svg: node scripts/make-icons.mjs
// (uses the Playwright Chromium that the browser smoke test uses; the PNGs are committed, so CI does not need it).
import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
const svg=readFileSync('icon.svg','utf8');
// Legacy icon sizes (48 dp) and adaptive-icon layer sizes (108 dp) per density.
const DENSITY={mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4};
const only=id=>svg.replace(id==='mark'?/<rect id="background"[^>]*\/>/:/<g id="mark">[^]*?<\/g>/,'');
const uri=s=>'data:image/svg+xml;base64,'+Buffer.from(s).toString('base64');
const browser=await chromium.launch();const page=await browser.newPage();
async function render(file,size,{src=svg,shape='square',inset=0}={}){
 // inset: the adaptive foreground shows the logo in the middle 72 of 108 dp, the part every launcher mask keeps.
 const art=size*(1-2*inset);
 await page.setViewportSize({width:size,height:size});
 await page.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;overflow:hidden;border-radius:${shape==='round'?'50%':shape==='rounded'?'22%':'0'}"><img style="width:${art}px;height:${art}px;display:block" src="${uri(src)}"></div></body></html>`);
 await page.waitForFunction(()=>document.images[0].complete);
 await page.screenshot({path:file,omitBackground:true});
}
for(const [d,k] of Object.entries(DENSITY)){
 const dir='android-icons/res/mipmap-'+d;mkdirSync(dir,{recursive:true});
 await render(dir+'/ic_launcher.png',48*k,{shape:'rounded'});
 await render(dir+'/ic_launcher_round.png',48*k,{shape:'round'});
 await render(dir+'/ic_launcher_foreground.png',108*k,{src:only('mark'),inset:1/6});
 await render(dir+'/ic_launcher_bg.png',108*k,{src:only('background')});
}
mkdirSync('android-icons/res/drawable',{recursive:true});
await render('android-icons/res/drawable/splash_logo.png',512,{shape:'round'});
await browser.close();
console.log('android-icons/ written');
