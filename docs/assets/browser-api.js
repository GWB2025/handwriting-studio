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
        const capture=merged.get('letters/'+r.capture_id+'.json')||merged.get('blends/'+r.capture_id+'.json');
        if(!capture||Object.keys(r.reviews).some(letter=>!capture.order.includes(letter)))throw Error('A review is missing its original letter capture. Nothing was imported.');
        for(const [letter,setting] of Object.entries(r.reviews))if(setting.stroke_edit!==undefined)E.validateStrokeEdit(setting.stroke_edit,capture.samples.find(s=>s.letter===letter).processed_strokes.length);
      }
      E.validateBlendReferences([...merged].map(([key,value])=>({key,value})));
      E.validateAlphabetReferences([...merged].map(([key,value])=>({key,value})));
      for(const f of backup.files)if(!map.has(f.key)){store.add(f);added++;}return added;
    });
  }
  window.StudioStorage={snapshot:()=>transaction(),importBackup,backup:async()=>({format:'handwriting-studio-backup',version:1,exported_at:new Date().toISOString(),files:await transaction()})};
  window.studioFetch=async (url,options={})=>{
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    try{
      if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
      const u=new URL(url,window.location.href),path=u.pathname,method=options.method||'GET',data=options.body?JSON.parse(options.body):null;
      if(method==='POST'&&path==='/api/character-spacing')return await transaction((files,store)=>{const record=E.characterSpacing(files,data);store.put(record);return json({saved:true,record});});
      if(method==='POST'&&path==='/api/compositions')return await transaction((files,store)=>{const old=files.find(f=>f.key==='compositions/'+data?.id+'.json')?.value;if(old?.drawings&&data.drawings===undefined)throw Error('Reload the app before updating this finished document.');if((old?.drawing||old?.drawings?.length)&&!data.drawing&&!data.drawings?.length)throw Error('Generate a preview before updating this finished document, or save a separate draft copy.');const record=E.createComposition(data);store.put({key:'compositions/'+record.id+'.json',value:record});return json({saved:true,record});});
      if(method==='POST'&&path==='/api/alphabet/preferred')return await transaction((files,store)=>{const record=E.choosePreferred(files,data);store.put(record);return json({saved:true,preferred:record.value.choices});});
      if(method==='POST'&&path==='/api/blends')return await transaction((files,store)=>{
        const record=E.createSavedBlend(files,data),key='blends/'+record.id+'.json',old=files.find(f=>f.key===key)?.value;
        if(old){if(!['writer','order','source_ids','source_shifts','source_scales','source_edits','weights','samples'].every(k=>E.same(old[k],record[k])))return json({error:'Save identifier is already in use.'},409);return json({id:old.id,saved_at:old.saved_at});}
        store.add({key,value:record});return json({id:record.id,saved_at:record.saved_at},201);
      });
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
          const capture=files.find(f=>f.key==='letters/'+review[1]+'.json'||f.key==='blends/'+review[1]+'.json')?.value,sample=capture?.samples.find(s=>s.letter===review[2]);
          if(!sample)return json({error:'This capture is no longer available.'},404);
          const key='letter_reviews/'+capture.id+'.json',reviews=E.clone(files.find(f=>f.key===key)?.value.reviews||{}),setting={included:data.included,baseline_shift_mm:data.baseline_shift_mm,scale_factor:data.scale_factor??reviews[review[2]]?.scale_factor??1,reviewed_at:new Date().toISOString()};
          const edit=data.stroke_edit??reviews[review[2]]?.stroke_edit;if(edit!==undefined){E.validateStrokeEdit(edit,sample.processed_strokes.length);setting.stroke_edit=E.clone(edit);}
          reviews[review[2]]=setting;store.put({key,value:{schema_version:1,capture_id:capture.id,reviews}});
          return json({saved:true,...setting,svg:E.reviewSVG({...E.scaleSample(E.editStrokes(sample,setting.stroke_edit),setting.scale_factor),...setting},{colourStrokes:true,showStarts:true})});
        });
      }
      const files=await transaction();
      if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
      if(method==='GET'&&path==='/api/compositions')return json({compositions:files.filter(f=>f.key.startsWith('compositions/')).map(f=>f.value).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))});
      if(method==='POST'&&path==='/api/spacing-preview')return json(E.spacingPreview(files,data));
      if(method==='POST'&&path==='/api/review-preview')return json(E.reviewWord(files,data));
      if(method==='GET'&&path==='/api/pages')return json({pages:files.filter(f=>!f.key.includes('/')).map(f=>({id:f.value.id,writer:f.value.writer,saved_at:f.value.saved_at,stroke_count:f.value.raw_strokes.length})).sort((a,b)=>Date.parse(b.saved_at)-Date.parse(a.saved_at)||b.id.localeCompare(a.id)),unavailable_count:0});
      if(method==='GET'&&path.startsWith('/api/pages/')){const record=files.find(f=>f.key===path.slice('/api/pages/'.length)+'.json')?.value;return record?json(record):json({error:'This saved page is no longer available.'},404);}
      if(method==='GET'&&path==='/api/letters/writers')return json({writers:E.catalog(files).writers,unavailable_count:0});
      if(method==='GET'&&path==='/api/letters/samples'){
        const letter=u.searchParams.get('letter');if(!letter||![...E.characters,...E.pairs].includes(letter))throw Error('Choose a captured character or joined pair.');
        return json({samples:(E.catalog(files).byWriter.get(u.searchParams.get('writer'))||[]).filter(s=>s.letter===letter).map(s=>({capture_id:s.capture_id,letter:s.letter,saved_at:s.saved_at,included:s.included,baseline_shift_mm:s.baseline_shift_mm,scale_factor:s.scale_factor,derived:!!s.derived,stroke_edit:s.stroke_edit,stroke_sample:files.find(f=>f.key===(s.derived?'blends/':'letters/')+s.capture_id+'.json').value.samples.find(p=>p.letter===s.letter),stroke_count:s.processed_strokes.length,svg:E.reviewSVG(s,{colourStrokes:true,showStarts:true})})),unavailable_count:0});
      }
      if(method==='POST'&&path==='/api/compose')return json(E.compose(files,data));
      return json({error:'Unknown browser operation.'},404);
    }catch(error){if(error.name==='AbortError')throw error;return json({error:error.name==='QuotaExceededError'?'Browser storage is full. Download a backup before freeing browser space. Your current writing is still here.':error.message||'Browser storage could not be opened. Try a regular browser window.'},400);}
  };
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
})();
