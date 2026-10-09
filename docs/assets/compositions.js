'use strict';
window.StudioCompositions={init({read,restore}){
 const $=id=>document.getElementById(id);let records=[],active='',pending='',busy=false,baseline=JSON.stringify({title:'',settings:read()});
 const current=()=>({title:$('composition-title').value.trim(),settings:read()}),dirty=()=>JSON.stringify(current())!==baseline;
 const status=text=>$('composition-status').textContent=text;
 function controls(){for(const id of ['composition-save','composition-copy','composition-open','composition-list'])$(id).disabled=busy||(id==='composition-open'&&!records.length);}
 async function refresh(){const previous=active||$('composition-list').value;records=(await window.StudioStorage.snapshot()).filter(f=>f.key.startsWith('compositions/')).map(f=>f.value).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));$('composition-list').replaceChildren();for(const r of records){const option=document.createElement('option');option.value=r.id;option.textContent=r.title+' · '+r.settings.writer+' · '+new Date(r.updated_at).toLocaleString();$('composition-list').append(option);}if(records.some(r=>r.id===previous))$('composition-list').value=previous;controls();}
 async function save(copy=false){
  if(busy)return;const draft=current();busy=true;controls();pending=copy?crypto.randomUUID():(active||pending||crypto.randomUUID());status('Saving composition…');
  try{const response=await window.studioFetch('/api/compositions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pending,...draft})}),data=await response.json();if(!response.ok)throw Error(data.error);active=data.record.id;pending='';baseline=JSON.stringify({title:data.record.title,settings:data.record.settings});await refresh();status('Saved '+data.record.title+'.'+(dirty()?' Further edits are not yet saved.':' Included in your browser backup.'));}
  catch(error){status('Could not save: '+error.message);}finally{busy=false;controls();}
 }
 $('composition-save').onclick=()=>save();$('composition-copy').onclick=()=>save(true);
 $('composition-open').onclick=async()=>{
  if(busy)return;const record=records.find(r=>r.id===$('composition-list').value);if(!record)return;
  if(dirty()&&!window.confirm('Open this composition and replace the unsaved text and settings currently on screen?'))return;
  busy=true;controls();status('Opening '+record.title+'…');
  try{await restore(record.settings);active=record.id;pending='';$('composition-title').value=record.title;baseline=JSON.stringify(current());status('Opened '+record.title+'. Generate a preview using your current saved handwriting and preferred versions.');}
  catch(error){status('Could not open: '+error.message);}finally{busy=false;controls();}
 };
 window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
 refresh().catch(error=>status('Could not load saved compositions: '+error.message));
 return {refresh,hasUnsavedChanges:dirty};
}};
