'use strict';
window.StudioRecovery={init({kind,read,restore,canRestore=()=>true}){
 const S=window.StudioRecoveryStore,$=id=>document.getElementById(id),dialog=$('recovery-dialog');
 if(!S||!dialog)return null;
 let current=null,records=[],timer=null,chain=Promise.resolve(),queued='',paused=false,ready=false;
 const status=text=>$('draft-status').textContent=text;
 function enqueue(fn){chain=chain.catch(()=>{}).then(fn);return chain;}
 function flush(){
  clearTimeout(timer);if(!ready||paused)return chain;
  let payload,serialized;try{payload=read();if(payload===undefined)return chain;serialized=JSON.stringify(payload);}catch(e){status('Recovery unavailable: '+e.message);return chain;}
  if(serialized===queued)return chain;queued=serialized;
  // Capture an independent snapshot now; later writing must not mutate a queued save.
  payload=payload?JSON.parse(serialized):null;
  return enqueue(async()=>{try{
   if(payload){current=await S.put(kind,payload,current);status('Recovery copy saved on this device');}
   else{if(current)await S.remove(current);current=null;status('Draft recovery ready');}
  }catch(e){if(queued===serialized)queued='';status('Recovery copy not saved: '+e.message+' Save your work normally before leaving.');}});
 }
 function changed(){if(!ready||paused)return;clearTimeout(timer);timer=setTimeout(flush,200);}
 function detail(){const r=records.find(r=>r.id===$('recovery-list').value);$('recovery-detail').textContent=r?new Date(r.updated_at).toLocaleString()+' · '+(r.payload.writer||r.payload.fields?.['composition-title']||r.payload.fields?.['compose-writer']||'Unnamed draft'):'';}
 async function refresh(){records=(await S.list(kind)).filter(r=>r.id!==current?.id);$('recovery-list').replaceChildren();for(const r of records){const option=document.createElement('option');option.value=r.id;option.textContent=(r.payload.writer||r.payload.fields?.['composition-title']||r.payload.fields?.['compose-writer']||'Unnamed draft')+' · '+new Date(r.updated_at).toLocaleString();$('recovery-list').append(option);}for(const id of ['recovery-list','recovery-restore','recovery-discard'])$(id).disabled=!records.length;detail();}
 async function show(){if(paused)return;if(!canRestore()){status('Finish the current stroke or save before opening Drafts.');return;}try{await flush();await refresh();$('recovery-status').textContent=records.length?'Choose Restore draft or Discard draft.':'No other unfinished drafts found.';dialog.showModal();}catch(e){status('Could not read recovery copies: '+e.message);}}
 $('recovery-open').onclick=show;$('recovery-list').onchange=detail;$('recovery-later').onclick=()=>dialog.close();
 $('recovery-discard').onclick=async()=>{if(paused)return;const record=records.find(r=>r.id===$('recovery-list').value);if(!record||!window.confirm('Discard this recovery copy? Saved handwriting and compositions will be kept.'))return;try{const removed=await S.remove(record);await refresh();$('recovery-status').textContent=removed?'Recovery copy discarded.':'This draft changed in another tab. Review the newer copy before discarding.';if(!records.length)dialog.close();}catch(e){$('recovery-status').textContent='Could not discard: '+e.message;}};
 $('recovery-restore').onclick=async()=>{
  if(paused)return;
  const record=records.find(r=>r.id===$('recovery-list').value);if(!record)return;
  if(!canRestore()||read()===undefined){$('recovery-status').textContent='Wait for the current operation to finish before restoring.';return;}
  if(read()&&!window.confirm('Restore this draft? Your current unfinished work will be kept as a separate recovery copy.'))return;
  paused=true;clearTimeout(timer);for(const id of ['recovery-restore','recovery-discard','recovery-later','recovery-list'])$(id).disabled=true;
  try{
   await chain;const existing=read();if(existing)current=await S.put(kind,existing,current);
   S.validate(kind,record.payload);await restore(JSON.parse(JSON.stringify(record.payload)));
   // Persist the working copy before removing the selected version. If anything fails,
   // its previous recovery record remains available, and saved library records are untouched.
   current=await S.put(kind,read()||record.payload,null);queued=JSON.stringify(read());await S.remove(record);
   status('Draft restored · save it normally to keep it in your library');dialog.close();
  }catch(e){$('recovery-status').textContent='Could not restore: '+e.message;status('Recovery needs attention. Your earlier recovery copy is kept.');}
  finally{paused=false;for(const id of ['recovery-restore','recovery-discard','recovery-later','recovery-list'])$(id).disabled=false;}
 };
 dialog.addEventListener('cancel',event=>{if(paused)event.preventDefault();});
 window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 const api={changed,flush,show};window.StudioRecovery.active=api;
 api.ready=refresh().then(()=>{ready=true;if(records.length&&canRestore())dialog.showModal();else status('Draft recovery ready');changed();}).catch(e=>{ready=true;status('Recovery unavailable: '+e.message);});
 return api;
},changed(){this.active?.changed();},flush(){return this.active?.flush();}};
