'use strict';
(async()=>{
 const E=window.StudioEngine,$=id=>document.getElementById(id);let files=[],samples=[],sources=[],result=null,saveID='',previewKey='',views=[],busy=false;
 let horizontal=50,vertical=50,drag=null,recipeShifts=null,lastSaved=null;
 const query=new URLSearchParams(window.location.search),requestedLetter=query.get('letter');
 const status=text=>{if($('blend-status').textContent!==text)$('blend-status').textContent=text;};
 function release(){stopDrag();previewKey='';views=[];$('single-cards').replaceChildren();$('single-position').textContent='';}
 function render(){lastSaved=null;$('single-saved').hidden=true;result=null;saveID='';$('single-save').disabled=true;$('single-centre').disabled=true;
  const count=Number($('single-count').value);$('single-cards').dataset.count=String(count);
  $('single-find').disabled=busy||samples.length<count;
  sources=Array.from($('single-sources').querySelectorAll('select')).map(s=>samples.find(p=>p.capture_id===s.value));
  if(samples.length<count){release();status(samples.length+' included original sample'+(samples.length===1?'':'s')+' available for '+$('single-letter').value+'. '+count+' distinct originals are needed. Capture another set, or include an excluded original in Review samples. Saved blends are not used as originals.');return;}
  if(sources.length!==count||sources.some(s=>!s)||new Set(sources.map(s=>s.capture_id)).size!==count){release();status('Choose '+count+' distinct original samples.');return;}
  const h=horizontal/100,v=vertical/100,weights=count===2?[1-h,h]:[(1-h)*(1-v),h*(1-v),(1-h)*v,h*v];
  result=E.blendMany(sources,weights);const items=result?[...sources,result]:sources;
  const key=JSON.stringify(sources.map(s=>[s.capture_id,s.letter,s.baseline_shift_mm]))+'|'+Boolean(result);
  if(key!==previewKey){
   release();previewKey=key;
   // Source bounds are fixed for the entire drag; the result is their weighted blend.
   const points=sources.flatMap(s=>s.processed_strokes.flatMap(st=>st.points.map(p=>({x:p.x,y:p.y+s.baseline_shift_mm*16}))));
   const left=Math.min(...points.map(p=>p.x))-20,top=Math.min(...points.map(p=>p.y))-20,right=Math.max(...points.map(p=>p.x))+20,bottom=Math.max(...points.map(p=>p.y))+20;
   items.forEach((item,i)=>{
    const figure=document.createElement('figure'),caption=document.createElement('figcaption'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');if(i===count){figure.className='blend-result';enableDragging(figure);}
    svg.setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',i<count?'Source '+String.fromCharCode(65+i):'Blended result');
    svg.innerHTML=E.reviewSVG(item).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    figure.append(caption,svg);$('single-cards').append(figure);views.push({caption,svg,figure});
   });
  }else if(result){
   // Update the existing paths in place: no image downloads or collapsing card grid.
   const paths=Array.from(views[count].svg.querySelectorAll('path')),data=[...E.reviewSVG(result).matchAll(/<path d="([^"]+)"/g)];
   data.forEach((match,i)=>paths[i].setAttribute('d',match[1]));
  }
  views.forEach(({caption},i)=>{const text=i<count?'Source '+String.fromCharCode(65+i)+' · Sample '+(samples.findIndex(s=>s.capture_id===sources[i].capture_id)+1)+' · '+Math.round(weights[i]*100)+'%':'Blended result';if(caption.textContent!==text)caption.textContent=text;});
  $('single-save').disabled=busy||!result;$('single-centre').disabled=busy||!result;
  if(result){const figure=views[count].figure;figure.style.left=(15+70*h)+'%';figure.style.top=(count===4?20+60*v:50)+'%';figure.setAttribute('aria-label','Blended character: '+Math.round(horizontal)+'% right'+(count===4?', '+Math.round(vertical)+'% bottom':'')+'. Drag or use arrow keys.');}
  $('single-position').textContent=result?Math.round(horizontal)+'% right'+(count===4?' · '+Math.round(vertical)+'% bottom':''):'';
  let conflict='';
  if(!result)for(let i=0;i<count&&!conflict;i++)for(let j=i+1;j<count&&!conflict;j++){
   const reason=E.blendConflict(sources[i],sources[j]);if(reason)conflict='Source '+String.fromCharCode(65+i)+' and Source '+String.fromCharCode(65+j)+' have '+reason+'. Choose another sample or tap Find compatible sources.';
  }
  status(result?'Live preview · originals remain unchanged. Save adds this result as another sample for Review and Compose.':conflict);
 }
 function stopDrag(){
  const previous=drag;drag=null;if(!previous)return;previous.figure.dataset.dragging='false';
  if(previous.figure.hasPointerCapture(previous.pointerId))previous.figure.releasePointerCapture(previous.pointerId);
 }
 function moveDrag(event){
  if(!drag||event.pointerId!==drag.pointerId||busy)return;
  event.preventDefault();horizontal=Math.max(0,Math.min(100,drag.horizontal+(event.clientX-drag.x)/drag.width*100));
  if(drag.count===4)vertical=Math.max(0,Math.min(100,drag.vertical+(event.clientY-drag.y)/drag.height*100));
  render();
 }
 function enableDragging(figure){
  figure.tabIndex=0;figure.setAttribute('role','group');figure.setAttribute('aria-roledescription','draggable blended character');figure.setAttribute('aria-describedby','single-drag-help');
  figure.addEventListener('pointerdown',event=>{
   if(busy||drag||event.isPrimary===false||event.button!==0)return;
   const bounds=$('single-cards').getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
   event.preventDefault();figure.focus({preventScroll:true});figure.setPointerCapture(event.pointerId);
   drag={figure,pointerId:event.pointerId,x:event.clientX,y:event.clientY,horizontal,vertical,width:bounds.width*.7,height:bounds.height*.6,count:Number($('single-count').value)};figure.dataset.dragging='true';
  });
  figure.addEventListener('pointermove',moveDrag);
  figure.addEventListener('pointerup',event=>{if(drag?.pointerId===event.pointerId){moveDrag(event);stopDrag();}});
  for(const name of ['pointercancel','lostpointercapture'])figure.addEventListener(name,event=>{if(drag?.pointerId===event.pointerId)stopDrag();});
  figure.addEventListener('keydown',event=>{
   if(busy||drag)return;const step=event.shiftKey?10:1,count=Number($('single-count').value);
   if(event.key==='ArrowLeft')horizontal=Math.max(0,horizontal-step);
   else if(event.key==='ArrowRight')horizontal=Math.min(100,horizontal+step);
   else if(event.key==='ArrowUp'&&count===4)vertical=Math.max(0,vertical-step);
   else if(event.key==='ArrowDown'&&count===4)vertical=Math.min(100,vertical+step);
   else return;event.preventDefault();render();
  });
 }
 function pool(){const catalog=E.catalog(files);return ($('single-pool')?.value==='all'?[...catalog.byWriter].flatMap(([writer,list])=>list.map(s=>({...s,writer}))):(catalog.byWriter.get($('single-writer').value)||[]).map(s=>({...s,writer:$('single-writer').value})));}
 function selectCompatible(){
  const menus=Array.from($('single-sources').querySelectorAll('select')),found=E.findCompatibleSources(samples,menus.length,menus.map(s=>s.value));
  if(!found.length)return false;
  menus.forEach((menu,i)=>{menu.value=found[i].capture_id;menu.dataset.previous=menu.value;});return true;
 }
 function sourceControls(selectedIDs){
  const selected=selectedIDs||Array.from($('single-sources').querySelectorAll('select')).map(s=>s.value);$('single-sources').replaceChildren();const count=Number($('single-count').value);
  samples=pool().filter(s=>s.letter===$('single-letter').value&&s.included&&!s.derived).map(s=>({...s,baseline_shift_mm:recipeShifts?.get(s.capture_id)??s.baseline_shift_mm}));
  const used=new Set();
  for(let i=0;i<count;i++){
   const label=document.createElement('label'),select=document.createElement('select');label.append('Source '+String.fromCharCode(65+i)+' ',select);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a different original sample';select.append(placeholder);
   samples.forEach((sample,j)=>{const option=document.createElement('option');option.value=sample.capture_id;option.textContent='Sample '+(j+1)+' · '+sample.writer+' · '+new Date(sample.saved_at).toLocaleString()+' · '+sample.capture_id.slice(0,8)+' · '+sample.processed_strokes.length+' strokes';select.append(option);});
   select.value=samples.some(s=>s.capture_id===selected[i]&&!used.has(s.capture_id))?selected[i]:(samples.find(s=>!used.has(s.capture_id))?.capture_id||'');if(select.value)used.add(select.value);
   select.dataset.previous=select.value;select.disabled=samples.length<count&&i>=samples.length;
   select.addEventListener('change',()=>{
    const all=Array.from($('single-sources').querySelectorAll('select')),previous=select.dataset.previous;
    const other=select.value&&all.find(s=>s!==select&&s.value===select.value);
    if(other)other.value=previous||'';
    all.forEach(s=>s.dataset.previous=s.value);recipeShifts=null;samples=pool().filter(s=>s.letter===$('single-letter').value&&s.included&&!s.derived);render();savedChoices();
   });$('single-sources').append(label);
  }
  // Explicit sources belong to a reopened recipe; preserve them exactly.
  if(!selectedIDs)selectCompatible();
  render();savedChoices();
 }
 function letters(){const old=$('single-letter').value||requestedLetter,available=pool().filter(s=>s.included&&!s.derived);$('single-letter').replaceChildren();for(const letter of [...new Set(available.map(s=>s.letter))].sort()){const originals=available.filter(s=>s.letter===letter),option=document.createElement('option');option.value=letter;option.textContent=letter+' · '+originals.length+' originals';$('single-letter').append(option);}if([...$('single-letter').options].some(o=>o.value===old))$('single-letter').value=old;sourceControls();}
 async function load(){files=await window.StudioStorage.snapshot();const previous=$('single-writer').value||query.get('writer');$('single-writer').replaceChildren();for(const writer of E.catalog(files).writers){const option=document.createElement('option');option.value=writer.writer;option.textContent=writer.writer;$('single-writer').append(option);}if([...$('single-writer').options].some(o=>o.value===previous))$('single-writer').value=previous;letters();}
 function savedChoices(selectedID){
  const select=$('single-saved-choice'),previous=selectedID||select.value;select.replaceChildren();
  const records=files.filter(f=>f.key.startsWith('blends/')&&f.value.writer===$('single-writer').value&&f.value.order[0]===$('single-letter').value).map(f=>f.value).sort((a,b)=>Date.parse(b.saved_at)-Date.parse(a.saved_at));
  for(const r of records){const option=document.createElement('option');option.value=r.id;option.textContent=new Date(r.saved_at).toLocaleString()+' · '+r.source_ids.length+' sources · '+r.id.slice(0,8);select.append(option);}
  if(records.some(r=>r.id===previous))select.value=previous;
  select.disabled=busy||!records.length;$('single-reopen').disabled=busy||!records.length;
  $('single-next').disabled=busy||$('single-letter').options.length<2;
 }
 function showSaved(id){
  const sample=E.catalog(files).byWriter.get($('single-writer').value)?.find(s=>s.capture_id===id&&s.letter===$('single-letter').value);
  if(!sample)return;
  lastSaved={id,writer:$('single-writer').value,letter:sample.letter};$('single-saved').hidden=false;
  $('single-saved-name').textContent='Saved '+sample.letter+' under '+lastSaved.writer+' · '+id.slice(0,8);
  $('single-saved-preview').innerHTML=E.reviewSVG(sample).replace(/<line\b[^>]*\/>|<text\b[^>]*>[^<]*<\/text>/g,'');
  $('single-view').href='alphabet.html?'+new URLSearchParams({writer:lastSaved.writer,letter:lastSaved.letter,sample:id})+'#alphabet-detail';
  $('single-prefer').disabled=!sample.included;$('single-prefer').textContent='Use as preferred';
  savedChoices(id);
 }
 function reopen(id){
  if(busy||!id)return;
  try{const recipe=E.savedBlendRecipe(files,id);stopDrag();recipeShifts=null;
   $('single-writer').value=recipe.writer;$('single-pool').value='all';letters();$('single-letter').value=recipe.letter;$('single-count').value=String(recipe.source_ids.length);
   horizontal=recipe.horizontal;vertical=recipe.vertical;recipeShifts=new Map(recipe.source_ids.map((id,i)=>[id,recipe.source_shifts[i]]));sourceControls(recipe.source_ids);savedChoices(id);
   status('Reopened '+recipe.letter+' from its original sources and saved blend position. Source baseline adjustments are restored. Save creates a new version; any later Review adjustment stays with the old sample.');
  }catch(error){status('Could not reopen: '+error.message);}
 }
 $('single-reopen').onclick=()=>reopen($('single-saved-choice').value);
 $('single-find').onclick=()=>{
  if(busy)return;stopDrag();recipeShifts=null;samples=pool().filter(s=>s.letter===$('single-letter').value&&s.included&&!s.derived);
  const found=selectCompatible();render();savedChoices();
  status(found?'Compatible sources selected. Drag the result to adjust the mix, then save.':'Could not find '+$('single-count').value+' compatible originals in this source pool. Try two sources, All saved writers / sets, or capture more examples with consistent stroke order and direction.');
 };
 $('single-next').onclick=()=>{if(busy)return;stopDrag();recipeShifts=null;const list=Array.from($('single-letter').options).map(o=>o.value),i=list.indexOf($('single-letter').value);if(list.length<2)return;$('single-letter').value=list[(i+1)%list.length];horizontal=50;vertical=50;sourceControls();};
 $('single-prefer').onclick=async()=>{
  if(busy||!lastSaved)return;const saved={...lastSaved},controls=Array.from(document.querySelectorAll('select,input,button')).map(c=>[c,c.disabled]);stopDrag();busy=true;controls.forEach(([c])=>c.disabled=true);let preferred=false;
  try{const response=await window.studioFetch('/api/alphabet/preferred',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({writer:saved.writer,letter:saved.letter,capture_id:saved.id})});const data=await response.json();if(!response.ok)throw Error(data.error);files=await window.StudioStorage.snapshot();preferred=true;$('single-prefer').textContent='Preferred version saved';status(saved.letter+' is now preferred for '+saved.writer+'. Compose uses it when the source type allows saved blends.');}
  catch(error){status('Could not save preference: '+error.message);}finally{busy=false;controls.forEach(([c,disabled])=>c.disabled=disabled);$('single-prefer').disabled=preferred;}
 };
 function previewControls(){
  stopDrag();
  $('single-cards').dataset.guides=String($('single-guides').checked);
  const zoom=Number($('single-zoom').value);$('single-cards').style.width=zoom+'%';$('single-zoom-value').textContent=zoom+'%';
 }
 $('single-guides').addEventListener('change',previewControls);$('single-zoom').addEventListener('input',previewControls);previewControls();
 for(const id of ['single-pool','single-writer'])$(id).addEventListener('change',()=>{if(busy)return;recipeShifts=null;letters();});for(const id of ['single-letter','single-count'])$(id).addEventListener('change',()=>{if(busy)return;recipeShifts=null;sourceControls();});
 $('single-centre').onclick=()=>{if(busy)return;stopDrag();horizontal=50;vertical=50;render();};
 $('single-refresh').onclick=()=>{if(busy)return;recipeShifts=null;return load().catch(e=>status(e.message));};
 $('single-save').onclick=async()=>{if(!result||busy)return;stopDrag();busy=true;$('single-save').disabled=true;saveID||=crypto.randomUUID();const controls=[...document.querySelectorAll('#single-controls select,#single-controls input,.preview-controls input'),$('single-refresh'),$('single-centre'),$('single-find'),$('single-next'),$('single-reopen'),$('single-saved-choice')];controls.forEach(c=>c.disabled=true);
  try{const response=await window.studioFetch('/api/blends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:saveID,writer:$('single-writer').value,letter:$('single-letter').value,source_ids:sources.map(s=>s.capture_id),horizontal,vertical,source_shifts:sources.map(s=>s.baseline_shift_mm)})});const data=await response.json();if(!response.ok)throw Error(data.error);status('Saved '+$('single-letter').value+' under '+$('single-writer').value+' as a new blended sample. It is now available in Review samples and Compose. Use Backup to keep a copy.');files=await window.StudioStorage.snapshot();showSaved(data.id);}
  catch(e){status('Could not save: '+e.message);$('single-save').disabled=false;}
  finally{busy=false;controls.forEach(c=>c.disabled=false);savedChoices(saveID);}
 };
 try{await load();if(query.get('blend'))reopen(query.get('blend'));}catch(e){status(e.message);}
})();
