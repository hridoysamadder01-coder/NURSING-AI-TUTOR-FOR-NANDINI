// Bundled ONLY for native Android with esbuild. No translation API keys or cloud requests.
import {Capacitor} from '@capacitor/core';
import {Translation,Language} from '@capacitor-mlkit/translation';
export function isAvailable(){return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'}
export async function prepare(){
 if(!isAvailable())throw new Error('android_only');
 await Translation.downloadModel({language:Language.English});
 await Translation.downloadModel({language:Language.Bengali});
 return true;
}
export async function translate(text){
 if(!isAvailable())throw new Error('android_only');
 const value=String(text||'').trim();
 if(!value)return '';
 if(value.length>1800)throw new Error('paragraph_too_long');
 const result=await Translation.translate({text:value,sourceLanguage:Language.English,targetLanguage:Language.Bengali});
 if(!result?.text?.trim())throw new Error('translation_empty');
 return result.text.trim();
}
