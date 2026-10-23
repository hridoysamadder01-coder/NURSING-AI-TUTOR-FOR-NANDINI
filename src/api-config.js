// Explicit opt-in HTTPS endpoint for the user's OWN nursing tutor server.
// Only the public URL is stored on-device; API credentials are never persisted.
export const STORAGE_KEY='nandini-private-tutor-url-v1';
export function normalizedApiBase(value){
 if(typeof value!=='string'||!value.trim())return '';
 let u;try{u=new URL(value.trim())}catch{return ''}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port&&!['443'].includes(u.port))return '';
 if(u.hostname==='localhost'||u.hostname==='127.0.0.1')return '';
 return u.origin;
}
export function savedApiBase(){
 try{return normalizedApiBase(localStorage.getItem(STORAGE_KEY))}catch{return ''}
}
export function setApiBase(value){
 const norm=normalizedApiBase(value);
 if(!norm&&value?.trim())return false;
 try{
  if(norm)localStorage.setItem(STORAGE_KEY,norm);
  else localStorage.removeItem(STORAGE_KEY);
  return true
 }catch{return false}
}
export function apiUrl(path){
 if(typeof path!=='string'||!/^\/api\/[a-z0-9/-]+$/.test(path))throw Error('invalid_api_path');
 const base=savedApiBase();
 return base?base+path:'.'+path;
}
export function healthUrl(){
 const base=savedApiBase();
 return base?base+'/healthz':'./healthz';
}
