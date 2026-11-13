'use strict';
(function(root){
  function create(indexedDB){
    let pending;
    function open(){return pending??=new Promise((resolve,reject)=>{
      if(!indexedDB){reject(Error('Browser storage is unavailable.'));return;}
      const r=indexedDB.open('handwriting-studio-fonts',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('fonts',{keyPath:'id'});
      r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();pending=null;};resolve(r.result);};
      r.onerror=()=>{pending=null;reject(r.error);};
      r.onblocked=()=>{pending=null;reject(Error('Close other Fonts tabs and try again.'));};
    });}
    async function list(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('fonts').objectStore('fonts').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async function add(records){
      const db=await open();return new Promise((resolve,reject)=>{
        const tx=db.transaction('fonts','readwrite'),store=tx.objectStore('fonts'),r=store.getAll();let error;
        r.onsuccess=()=>{try{
          const existing=r.result;let bytes=existing.reduce((n,f)=>n+f.buffer.byteLength,0);
          for(const f of records){if(!f.id||!(f.buffer instanceof ArrayBuffer)||f.buffer.byteLength>2*1024*1024)throw Error('Invalid font file.');bytes+=f.buffer.byteLength;}
          if(existing.length+records.length>20||bytes>20*1024*1024)throw Error('This browser’s font library is full (20 fonts or 20 MB).');
          for(const f of records)store.add(f);
        }catch(e){error=e;tx.abort();}};
        tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(error||tx.error||Error('Could not save these fonts.'));
      });
    }
    return {list,add};
  }
  if(typeof module!=='undefined')module.exports={create};else root.StudioFontStorage=create(root.indexedDB);
})(typeof window==='undefined'?globalThis:window);
