import test from 'node:test';import assert from 'node:assert/strict';
import {LiveTalk,LIVE_URL,TALK_SYSTEM,REDO_IN_BANGLA,otherScript,floatTo16kPcm,toBase64,fromBase64,pcm16ToFloat,wav} from '../src/live-talk.js';
class FakeWS{static last;constructor(url){FakeWS.last=this;this.url=url;this.sent=[];this.readyState=1;setTimeout(()=>this.onopen?.(),0)}
 send(d){this.sent.push(JSON.parse(d))}close(){this.onclose?.({code:1000,reason:''})}server(m){this.onmessage?.({data:JSON.stringify(m)})}}
test('microphone audio becomes 16 kHz 16-bit PCM and back',()=>{
 const one=new Float32Array(48000).fill(0.5);const pcm=floatTo16kPcm(one,48000);
 assert.equal(pcm.length,16000);assert.equal(pcm[100],Math.trunc(0.5*0x7fff));
 const b=new Uint8Array(pcm.buffer);assert.deepEqual(fromBase64(toBase64(b)),b);
 assert.ok(Math.abs(pcm16ToFloat(b)[5]-0.5)<0.001);
 const w=wav(b,16000);assert.equal(String.fromCharCode(...w.subarray(0,4)),'RIFF');assert.equal(new DataView(w.buffer).getUint32(24,true),16000);
});
test('Live session: setup, tool lookup from the notes, audio and transcripts',async()=>{
 const got={audio:[],user:'',ai:'',ends:0,looked:[]};
 const talk=new LiveTalk({key:'k y',WebSocketImpl:FakeWS,lookup:async q=>{got.looked.push(q);return 'ধমনি রক্ত দূরে নেয়'},
  onAudio:a=>got.audio.push(a),onUserText:t=>got.user+=t,onAiText:t=>got.ai+=t,onTurnEnd:()=>got.ends++});
 const ready=talk.connect();await new Promise(r=>setTimeout(r,5));
 const ws=FakeWS.last;assert.equal(ws.url,LIVE_URL+'?key=k%20y');
 const setup=ws.sent[0].setup;assert.equal(setup.model,'models/gemini-3.8-live');assert.equal(setup.tools[0].functionDeclarations[0].name,'lookup_nursing');
 assert.ok('inputAudioTranscription' in setup&&'outputAudioTranscription' in setup);
 ws.server({setupComplete:{}});await ready;assert.equal(talk.ready,true);
 talk.sendAudio('AAAA');assert.deepEqual(ws.sent[1],{realtimeInput:{audio:{data:'AAAA',mimeType:'audio/pcm;rate=16000'}}});
 ws.server({serverContent:{inputTranscription:{text:'ধমনি কী?'}}});
 ws.server({toolCall:{functionCalls:[{id:'1',name:'lookup_nursing',args:{query:'ধমনি'}}]}});await new Promise(r=>setTimeout(r,5));
 assert.deepEqual(ws.sent.at(-1),{toolResponse:{functionResponses:[{id:'1',name:'lookup_nursing',response:{result:'ধমনি রক্ত দূরে নেয়'}}]}});
 ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'BBBB'}}]},outputTranscription:{text:'ধমনি…'}}});ws.server({serverContent:{turnComplete:true}});
 assert.deepEqual(got,{audio:['BBBB'],user:'ধমনি কী?',ai:'ধমনি…',ends:1,looked:['ধমনি']});
});
test('a rejected key or a closed socket before setup is reported, not left hanging',async()=>{
 const t=new LiveTalk({key:'bad',WebSocketImpl:FakeWS});const p=t.connect();await new Promise(r=>setTimeout(r,5));
 FakeWS.last.onclose({code:1008,reason:'API key not valid'});await assert.rejects(p,/key_rejected/);
 const t2=new LiveTalk({key:'k',WebSocketImpl:FakeWS});const p2=t2.connect();await new Promise(r=>setTimeout(r,5));
 FakeWS.last.onclose({code:1011,reason:'Quota exceeded'});await assert.rejects(p2,/limit/);
});
test('talk mode speaks only Bangla: a reply in Hindi is cut off and asked again in Bangla',async()=>{
 assert.match(TALK_SYSTEM,/^RESPOND IN BENGALI/);assert.match(TALK_SYSTEM,/হিন্দি, উর্দু বা অন্য কোনো ভাষা কখনো বলবে না/);assert.match(TALK_SYSTEM,/বাংলায় তার মানে বলে দেবে/);
 // Bengali's danda (।) is in the Devanagari block; English terms are fine.
 assert.equal(otherScript('ধমনি (Artery) রক্ত দূরে নেয়। বুঝেছ? ॥'),false);assert.equal(otherScript('धमनी रक्त को दूर ले जाती है'),true);assert.equal(otherScript('دل خون'),true);
 const got={audio:[],ai:'',wrong:0,ends:[]};
 const talk=new LiveTalk({key:'k',WebSocketImpl:FakeWS,onAudio:a=>got.audio.push(a),onAiText:t=>got.ai+=t,onWrongLanguage:()=>got.wrong++,onTurnEnd:e=>got.ends.push(e)});
 const ready=talk.connect();await new Promise(r=>setTimeout(r,5));const ws=FakeWS.last;ws.server({setupComplete:{}});await ready;
 const hindiTurn=()=>{ws.server({serverContent:{inputTranscription:{text:'ধমনি কী?'}}});
  ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'H1'}}]},outputTranscription:{text:'धमनी रक्त'}}});
  ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'H2'}}]},outputTranscription:{text:' को दूर ले जाती है'}}});ws.server({serverContent:{turnComplete:true}})};
 hindiTurn();
 assert.deepEqual(got,{audio:[],ai:'',wrong:1,ends:[{redo:true}]},'no Hindi audio or text is passed on');
 assert.deepEqual(ws.sent.at(-1),{realtimeInput:{text:REDO_IN_BANGLA}});
 ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'B1'}}]},outputTranscription:{text:'ধমনি রক্ত দূরে নেয়।'}}});ws.server({serverContent:{turnComplete:true}});
 assert.deepEqual(got.audio,['B1']);assert.equal(got.ai,'ধমনি রক্ত দূরে নেয়।');assert.deepEqual(got.ends.at(-1),{redo:false});
 // A model that keeps slipping is asked again at most twice, then heard rather than left silent.
 const sent=ws.sent.length;
 ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'H3'}}]},outputTranscription:{text:'फिर से हिंदी'}}});ws.server({serverContent:{turnComplete:true}});
 ws.server({serverContent:{modelTurn:{parts:[{inlineData:{data:'H4'}}]},outputTranscription:{text:'फिर से हिंदी'}}});ws.server({serverContent:{turnComplete:true}});
 assert.equal(ws.sent.length,sent+1,'the second slip in a row is the last one asked again');assert.deepEqual(got.audio,['B1','H4']);
});
