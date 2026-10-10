'use strict';
// Recovery copies and backup receipts are local housekeeping, separate from saved work.
(()=>{
 const E=window.StudioEngine;let database;
 function open(){
  if(!database)database=new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(Error('Browser storage is unavailable.'));return;}
   const request=indexedDB.open('handwriting-studio-recovery',1);
   request.onupgradeneeded=()=>{request.result.createObjectStore('drafts',{keyPath:'id'});request.result.createObjectStore('meta',{keyPath:'id'});};
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
   request.onerror=()=>{database=null;reject(request.error);};request.onblocked=()=>{database=null;reject(Error('Close other Studio tabs and retry.'));};
  });return database;
 }
 async function transaction(name,write,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(name,write?'readwrite':'readonly'),store=tx.objectStore(name);let result,error;const done=value=>result=value;try{action(store,done,tx);}catch(e){error=e;tx.abort();}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(error||tx.error||Error('Could not save the recovery copy.'));});}
 function validate(kind,p){
  if(!['capture','notebook','compose'].includes(kind)||!p||typeof p!=='object')throw Error('Unrecognised draft.');
  E.size(p);
  if(kind==='compose'){
   if(!p.fields||typeof p.fields!=='object'||Array.isArray(p.fields)||Object.keys(p.fields).length>40||Object.values(p.fields).some(v=>typeof v!=='string'&&typeof v!=='boolean')||typeof p.seed!=='string'||p.seed.length>80)throw Error('Invalid composition draft.');
   if(typeof p.fields.phrase!=='string'||p.fields.phrase.length>10000||typeof p.fields['composition-title']!=='string'||p.fields['composition-title'].length>100)throw Error('Invalid composition draft text.');
  }else{
   if(typeof p.writer!=='string'||p.writer.length>80||!Array.isArray(p.strokes)||!Array.isArray(p.undone)||typeof p.smooth!=='boolean')throw Error('Invalid writing draft.');
   const all=[...p.strokes,...p.undone.slice().reverse()];if(all.length)E.validateContent(p.writer.trim()||'Draft',all,p.smooth);
   if(kind==='capture'){const plan=E.getPlan(p.plan_id);if(!plan||!['practice','capture'].includes(p.phase)||!Number.isInteger(p.sheet)||!plan.orders[p.sheet])throw Error('Invalid capture draft.');E.validateOrders(p.orders,plan);if(p.request_id&&!E.uuid(p.request_id))throw Error('Invalid capture save identifier.');}
  }
  return p;
 }
 async function list(kind){return transaction('drafts',false,(store,done)=>{store.getAll().onsuccess=e=>done(e.target.result.filter(r=>r.kind===kind).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)));});}
 async function put(kind,payload,previous){
  validate(kind,payload);const data=E.clone(payload),candidate={id:previous?.id||crypto.randomUUID(),revision:crypto.randomUUID(),kind,updated_at:new Date().toISOString(),payload:data};
  return transaction('drafts',true,(store,done)=>{store.get(candidate.id).onsuccess=e=>{const old=e.target.result;
   // A restored/discarded draft or concurrent tab must never be overwritten.
   if(previous?old?.revision!==previous.revision:!!old)candidate.id=crypto.randomUUID();
   store.put(candidate);done(candidate);
  };});
 }
 async function remove(record){return transaction('drafts',true,(store,done)=>{store.get(record.id).onsuccess=e=>{if(e.target.result?.revision===record.revision){store.delete(record.id);done(true);}else done(false);};});}
 async function receipt(){return transaction('meta',false,(store,done)=>{store.get('backup').onsuccess=e=>done(e.target.result||null);});}
 async function confirmBackup(manifest){return transaction('meta',true,(store,done)=>{const value={id:'backup',confirmed_at:new Date().toISOString(),manifest};store.put(value);done(value);});}
 // Hash record content, not just record counts: reviews and edits update existing records.
 function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
 async function manifest(files){const result={};for(const f of files){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(f.value)));result[f.key]=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}return result;}
 function changed(current,previous={}){return [...new Set([...Object.keys(current),...Object.keys(previous)])].filter(key=>current[key]!==previous[key]).length;}
 window.StudioRecoveryStore={list,put,remove,validate,receipt,confirmBackup,manifest,changed};
})();
