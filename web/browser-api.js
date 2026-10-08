'use strict';
(()=>{
  const E=window.StudioEngine;
  let database;
  function open(){
    if(!database)database=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(Error('Browser storage is unavailable. Use a regular Safari or Chrome window.'));return;}
      const request=indexedDB.open('handwriting-studio',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'key'});
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
      request.onerror=()=>{database=null;reject(request.error);};
      request.onblocked=()=>{database=null;reject(Error('Close other Handwriting Studio tabs, then retry.'));};
    });return database;
  }
  async function transaction(edit){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('files',edit?'readwrite':'readonly'),store=tx.objectStore('files'),request=store.getAll();let result,error;
      request.onsuccess=()=>{try{result=edit?edit(request.result,store):request.result;}catch(e){error=e;tx.abort();}};
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(error||tx.error||Error('Could not save browser data.'));
    });
  }
  async function importBackup(backup){
    if(backup?.format!=='handwriting-studio-backup'||backup.version!==1||!Array.isArray(backup.files)||backup.files.length>10000)throw Error('Choose a Handwriting Studio backup JSON file.');
    const keys=new Set();
    for(const file of backup.files){if(!file||typeof file.key!=='string'||keys.has(file.key))throw Error('Duplicate or invalid backup path.');keys.add(file.key);E.validateRecord(file.key,file.value);}
    return transaction((existing,store)=>{
      const map=new Map(existing.map(f=>[f.key,f.value]));let added=0;
      for(const f of backup.files){if(map.has(f.key)&&!E.same(map.get(f.key),f.value))throw Error('A saved record has different content in this backup. Nothing was imported. Import into a fresh browser to keep both versions.');}
      const merged=new Map([...map,...backup.files.map(f=>[f.key,f.value])]);
      for(const [key,r] of merged)if(key.startsWith('letter_reviews/')){
        const capture=merged.get('letters/'+r.capture_id+'.json');
        if(!capture||Object.keys(r.reviews).some(letter=>!capture.order.includes(letter)))throw Error('A review is missing its original letter capture. Nothing was imported.');
      }
      for(const f of backup.files)if(!map.has(f.key)){store.add(f);added++;}return added;
    });
  }
  window.StudioStorage={snapshot:()=>transaction(),importBackup,backup:async()=>({format:'handwriting-studio-backup',version:1,exported_at:new Date().toISOString(),files:await transaction()})};
  window.studioFetch=async (url,options={})=>{
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    try{
      if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
      const u=new URL(url,window.location.href),path=u.pathname,method=options.method||'GET',data=options.body?JSON.parse(options.body):null;
      if(method==='POST'&&path==='/api/letters/pages'){
        const record=E.capture(data),key='letters/'+record.id+'.json';
        return await transaction((files,store)=>{
          const previous=files.find(f=>f.key===key)?.value;
          if(previous){if(!['schema_version','writer','raw_strokes','order_index','order','plan_id','capture_orders','display_smoothing'].every(k=>E.same(previous[k],record[k])))return json({error:'This save identifier is already in use. Your existing capture was kept.'},409);return json({id:previous.id,saved_at:previous.saved_at});}
          store.add({key,value:record});return json({id:record.id,saved_at:record.saved_at},201);
        });
      }
      if(method==='POST'&&path==='/api/pages'){
        E.validateContent(data.writer,data.strokes,data.smooth);
        const record={id:crypto.randomUUID(),writer:data.writer.trim(),saved_at:new Date().toISOString(),coordinates:{width:1000,height:500,y:'down',time:'milliseconds from first contact'},raw_strokes:E.clone(data.strokes),display_smoothing:data.smooth,schema_version:2};E.size(record);
        await transaction((files,store)=>store.add({key:record.id+'.json',value:record}));return json({id:record.id,saved_at:record.saved_at},201);
      }
      const review=path.match(/^\/api\/letters\/samples\/([0-9a-f-]+)\/([^/]+)\/review$/);
      if(review)review[2]=decodeURIComponent(review[2]);
      if(method==='POST'&&review){
        E.validateReview(data);
        return await transaction((files,store)=>{
          const capture=files.find(f=>f.key==='letters/'+review[1]+'.json')?.value,sample=capture?.samples.find(s=>s.letter===review[2]);
          if(!sample)return json({error:'This capture is no longer available.'},404);
          const key='letter_reviews/'+capture.id+'.json',reviews=E.clone(files.find(f=>f.key===key)?.value.reviews||{}),setting={included:data.included,baseline_shift_mm:data.baseline_shift_mm,reviewed_at:new Date().toISOString()};
          reviews[review[2]]=setting;store.put({key,value:{schema_version:1,capture_id:capture.id,reviews}});
          return json({saved:true,...setting,svg:E.reviewSVG({...sample,...setting})});
        });
      }
      const files=await transaction();
      if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
      if(method==='GET'&&path==='/api/pages')return json({pages:files.filter(f=>!f.key.includes('/')).map(f=>({id:f.value.id,writer:f.value.writer,saved_at:f.value.saved_at,stroke_count:f.value.raw_strokes.length})).sort((a,b)=>Date.parse(b.saved_at)-Date.parse(a.saved_at)||b.id.localeCompare(a.id)),unavailable_count:0});
      if(method==='GET'&&path.startsWith('/api/pages/')){const record=files.find(f=>f.key===path.slice('/api/pages/'.length)+'.json')?.value;return record?json(record):json({error:'This saved page is no longer available.'},404);}
      if(method==='GET'&&path==='/api/letters/writers')return json({writers:E.catalog(files).writers,unavailable_count:0});
      if(method==='GET'&&path==='/api/letters/samples'){
        const letter=u.searchParams.get('letter');if(!letter||![...E.characters,...E.pairs].includes(letter))throw Error('Choose a captured character or joined pair.');
        return json({samples:(E.catalog(files).byWriter.get(u.searchParams.get('writer'))||[]).filter(s=>s.letter===letter).map(s=>({capture_id:s.capture_id,letter:s.letter,saved_at:s.saved_at,included:s.included,baseline_shift_mm:s.baseline_shift_mm,stroke_count:s.processed_strokes.length,svg:E.reviewSVG(s)})),unavailable_count:0});
      }
      if(method==='POST'&&path==='/api/compose')return json(E.compose(files,data));
      return json({error:'Unknown browser operation.'},404);
    }catch(error){if(error.name==='AbortError')throw error;return json({error:error.name==='QuotaExceededError'?'Browser storage is full. Download a backup before freeing browser space. Your current writing is still here.':error.message||'Browser storage could not be opened. Try a regular browser window.'},400);}
  };
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
})();
