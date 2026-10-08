'use strict';
(async()=>{
 const E=window.StudioEngine,$=id=>document.getElementById(id);let files=[],samples=[],sources=[],result=null,saveID='',urls=[],busy=false;
 const status=text=>$('blend-status').textContent=text;
 function release(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];$('single-cards').replaceChildren();}
 function render(){release();result=null;saveID='';$('single-save').disabled=true;
  const count=Number($('single-count').value);$('single-vertical-label').hidden=count!==4;
  $('single-horizontal-value').textContent=$('single-horizontal').value+'% right';$('single-vertical-value').textContent=$('single-vertical').value+'% bottom';
  sources=Array.from($('single-sources').querySelectorAll('select')).map(s=>samples.find(p=>p.capture_id===s.value));
  if(samples.length<count){status(samples.length+' included original sample'+(samples.length===1?'':'s')+' available for '+$('single-letter').value+'. '+count+' distinct originals are needed. Capture another set, or include an excluded original in Review samples. Saved blends are not used as originals.');return;}
  if(sources.length!==count||sources.some(s=>!s)||new Set(sources.map(s=>s.capture_id)).size!==count){status('Choose '+count+' distinct original samples.');return;}
  const h=Number($('single-horizontal').value)/100,v=Number($('single-vertical').value)/100,weights=count===2?[1-h,h]:[(1-h)*(1-v),h*(1-v),(1-h)*v,h*v];
  result=E.blendMany(sources,weights);const items=result?[...sources,result]:sources;
  const svgs=items.map(E.reviewSVG),boxes=svgs.map(s=>s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)),left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.max(...boxes.map(b=>b[1]+b[3]));
  svgs.forEach((svg,i)=>{const figure=document.createElement('figure'),caption=document.createElement('figcaption'),img=document.createElement('img');if(i===count)figure.className='blend-result';caption.textContent=i<count?'Source '+String.fromCharCode(65+i)+' · Sample '+(samples.findIndex(s=>s.capture_id===sources[i].capture_id)+1)+' · '+Math.round(weights[i]*100)+'%':'Blended result';const url=URL.createObjectURL(new Blob([svg.replace(/viewBox="[^"]+"/,`viewBox="${left} ${top} ${right-left} ${bottom-top}"`)],{type:'image/svg+xml'}));urls.push(url);img.src=url;img.alt=caption.textContent;figure.append(caption,img);$('single-cards').append(figure);});
  $('single-cards').dataset.count=String(count);$('single-save').disabled=busy||!result;
  status(result?'Live preview · originals remain unchanged. Save adds this result as another sample for Review and Compose.':'These samples have incompatible strokes. Choose matching stroke counts and directions.');
 }
 function pool(){const catalog=E.catalog(files);return ($('single-pool')?.value==='all'?[...catalog.byWriter].flatMap(([writer,list])=>list.map(s=>({...s,writer}))):(catalog.byWriter.get($('single-writer').value)||[]).map(s=>({...s,writer:$('single-writer').value})));}
 function sourceControls(){
  const selected=Array.from($('single-sources').querySelectorAll('select')).map(s=>s.value);$('single-sources').replaceChildren();const count=Number($('single-count').value);
  samples=pool().filter(s=>s.letter===$('single-letter').value&&s.included&&!s.derived);
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
    all.forEach(s=>s.dataset.previous=s.value);render();
   });$('single-sources').append(label);
  }
  render();
 }
 function letters(){const old=$('single-letter').value,available=pool().filter(s=>s.included&&!s.derived);$('single-letter').replaceChildren();for(const letter of [...new Set(available.map(s=>s.letter))].sort()){const originals=available.filter(s=>s.letter===letter),option=document.createElement('option');option.value=letter;option.textContent=letter+' · '+originals.length+' originals';$('single-letter').append(option);}if([...$('single-letter').options].some(o=>o.value===old))$('single-letter').value=old;sourceControls();}
 async function load(){files=await window.StudioStorage.snapshot();const previous=$('single-writer').value;$('single-writer').replaceChildren();for(const writer of E.catalog(files).writers){const option=document.createElement('option');option.value=writer.writer;option.textContent=writer.writer;$('single-writer').append(option);}if([...$('single-writer').options].some(o=>o.value===previous))$('single-writer').value=previous;letters();}
 $('single-pool')?.addEventListener('change',letters);$('single-writer').addEventListener('change',letters);$('single-letter').addEventListener('change',sourceControls);$('single-count').addEventListener('change',sourceControls);for(const id of ['single-horizontal','single-vertical'])$(id).addEventListener('input',render);
 $('single-refresh').onclick=()=>load().catch(e=>status(e.message));
 $('single-save').onclick=async()=>{if(!result||busy)return;busy=true;$('single-save').disabled=true;saveID||=crypto.randomUUID();const controls=[...document.querySelectorAll('#single-controls select,#single-controls input,.blend-bottom-controls input'),$('single-refresh')];controls.forEach(c=>c.disabled=true);
  try{const response=await window.studioFetch('/api/blends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:saveID,writer:$('single-writer').value,letter:$('single-letter').value,source_ids:sources.map(s=>s.capture_id),horizontal:Number($('single-horizontal').value),vertical:Number($('single-vertical').value)})});const data=await response.json();if(!response.ok)throw Error(data.error);status('Saved '+$('single-letter').value+' as a new blended sample. It is now available in Review samples and Compose. Use Backup to keep a copy.');files=await window.StudioStorage.snapshot();}
  catch(e){status('Could not save: '+e.message);$('single-save').disabled=false;}
  finally{busy=false;controls.forEach(c=>c.disabled=false);}
 };
 try{await load();}catch(e){status(e.message);}
})();
