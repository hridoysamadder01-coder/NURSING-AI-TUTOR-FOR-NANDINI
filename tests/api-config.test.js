import test from 'node:test';import assert from 'node:assert/strict';
import {normalizedApiBase,apiUrl} from '../src/api-config.js';
test('personal AI URL is HTTPS-only and never accepts credentials/path injection',()=>{
 assert.equal(normalizedApiBase('https://nursing.example.org'),'https://nursing.example.org');
 for(const u of ['http://evil.com','https://user:pass@evil.com','https://evil.com/file','https://evil.com?a=b','https://evil.com/#oops','https://localhost','https://127.0.0.1','javascript:alert(1)']){
  assert.equal(normalizedApiBase(u),'',u);
 }
 assert.equal(normalizedApiBase(''),'');
});
test('strictly allow API-only endpoint paths',()=>{
 assert.equal(apiUrl('/api/books/search'),'./api/books/search');
 assert.throws(()=>apiUrl('/admin/secrets'),/invalid_api_path/);
});
