'use strict';
(async()=>{
 const E=window.StudioEngine,$=id=>document.getElementById(id),query=new URLSearchParams(window.location.search);
 let serial=0,timer=null,svg='',url='',automatic=true;
 if($('proof-mode')&&query.get('mode')==='comparison')$('proof-mode').value='comparison';
 const comparison=()=>$('proof-mode')?.value==='comparison';
 function modeControls(){const compare=comparison();for(const id of ['proof-kind','proof-source','proof-size'])$(id).disabled=compare;if($('proof-alphabet-text'))$('proof-alphabet-text').hidden=compare;if($('proof-comparison-text'))$('proof-comparison-text').hidden=!compare;}
 modeControls();
 if(E.plans[query.get('kind')])$('proof-kind').value=query.get('kind');
 const disable=()=>{svg='';$('proof-svg').disabled=true;$('proof-gcode').disabled=true;};
 async function preview(){
  clearTimeout(timer);const ticket=++serial;disable();$('proof-status').textContent='Updating proof sheet…';
  try{const files=await window.StudioStorage.snapshot();if(ticket!==serial)return;
   const cat=E.catalog(files),writer=$('proof-writer').value||query.get('writer');$('proof-writer').replaceChildren();
   for(const profile of cat.writers){const option=document.createElement('option');option.value=profile.writer;option.textContent=profile.writer;$('proof-writer').append(option);}
   if(cat.writers.some(p=>p.writer===writer))$('proof-writer').value=writer;
   let result;const selected=$('proof-writer').value;
   if(comparison()){result=window.StudioComparison.comparisonProof(files,{writer:selected,text:$('proof-compare-text').value,smooth:$('proof-smooth').checked});$('proof-missing').textContent=result.missing.length?'Missing versions: '+result.missing.map(m=>m.column.toLowerCase()+' '+m.letter).join(' · ')+'. Crossed boxes mark these characters.':'Every comparison has the required versions.';}else{
   const source=$('proof-source').value,kind=$('proof-kind').value,counts=E.countsFor(cat.writers.find(p=>p.writer===selected),source),tokens=E.tokens(E.plans[kind].alphabet),ready=tokens.filter(c=>counts[c]>0),missing=tokens.filter(c=>!counts[c]);
   $('proof-missing').textContent=missing.length?'Missing included samples: '+missing.join(' ')+'. These are omitted from the character row.':'All characters in this group have an included sample.';
   if(automatic)$('proof-sentence').value=kind==='lowercase'&&ready.length===26?'the quick brown fox jumps over the lazy dog':ready.slice(0,8).join(' ');
   result=E.proofSheet(files,{writer:selected,kind,source,height:Number($('proof-size').value),smooth:$('proof-smooth').checked,sentence:$('proof-sentence').value});}
   svg=result.svg;const next=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),old=url;url=next;$('proof-image').src=next;$('proof-image').hidden=false;if(old)URL.revokeObjectURL(old);
   $('proof-svg').disabled=false;$('proof-gcode').disabled=false;$('proof-status').textContent=(comparison()?'Ready · comparison at 3, 5 and 8 mm':'Ready · '+result.characters.length+' characters in the group · '+$('proof-size').value+' mm writing')+' · '+selected+'. Downloads match this preview.';
  }catch(error){if(ticket!==serial)return;disable();$('proof-image').hidden=true;$('proof-status').textContent=error.message;}
 }
 function update(){serial++;disable();clearTimeout(timer);$('proof-status').textContent='Updating proof sheet…';timer=setTimeout(preview,200);}
 for(const id of ['proof-writer','proof-kind','proof-source','proof-size','proof-smooth'])$(id).addEventListener('change',update);
 $('proof-mode')?.addEventListener('change',()=>{modeControls();update();});$('proof-compare-text')?.addEventListener('input',update);
 $('proof-sentence').addEventListener('input',()=>{automatic=false;update();});$('proof-refresh').onclick=preview;
 function download(gcode){if(!svg)return;try{const data=gcode?window.StudioPlotter.fromSVG(svg):svg,href=URL.createObjectURL(new Blob([data],{type:gcode?'text/plain':'image/svg+xml'})),a=document.createElement('a');a.href=href;a.download=(comparison()?'comparison-proof-a4.':'alphabet-proof-a4.')+(gcode?'gcode':'svg');a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(href);},1000);$('proof-status').textContent='Download requested. Look for '+a.download+' in Downloads.';}catch(error){$('proof-status').textContent=error.message;}}
 $('proof-svg').onclick=()=>download(false);$('proof-gcode').onclick=()=>download(true);
 window.addEventListener('pageshow',event=>{if(event.persisted)preview();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)preview();});await preview();
})();
