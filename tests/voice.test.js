import test from 'node:test';import assert from 'node:assert/strict';
import {forSpeech,onlineAllowed,autoSpeak,available} from '../src/voice.js';
test('answers are cleaned up before the Bangla voice reads them',()=>{
 assert.equal(forSpeech('**হৃদ্‌যন্ত্র** 😊 শরীর → মহাশিরা → ডান অলিন্দ ✅️'),'হৃদ্‌যন্ত্র শরীর, মহাশিরা, ডান অলিন্দ');
 assert.equal(forSpeech('*   ধমনি (Artery)\n*   শিরা'),'ধমনি (Artery) শিরা');
 assert.equal(forSpeech('x'.repeat(5000)).length,3900,'stays under the Android TTS input limit');
});
test('voice stays on the device unless the owner allows online recognition',()=>{
 assert.equal(onlineAllowed(),false);assert.equal(autoSpeak(),true);assert.equal(available(),false,'only inside the Android app');
});
