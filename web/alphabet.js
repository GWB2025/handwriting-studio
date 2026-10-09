'use strict';
(async()=>{
 const E=window.StudioEngine,$=id=>document.getElementById(id);const query=new URLSearchParams(window.location.search);let cat=null,selected=query.get('letter')||'a',busy=false,spacingUI=null,spacingLocks=[];
 if(query.get('letter')){const group=Object.keys(E.plans).find(k=>E.tokens(E.plans[k].alphabet).includes(selected));if(group)$('alphabet-kind').value=group;}
 const status=text=>$('alphabet-status').textContent=text;
 function previewBounds(samples){
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const sample of samples)for(const stroke of sample.processed_strokes)for(const p of stroke.points){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y+sample.baseline_shift_mm*16);bottom=Math.max(bottom,p.y+sample.baseline_shift_mm*16);}
  if(!Number.isFinite(left))return '';
  const padding=Math.max(6,(bottom-top)*.12,(right-left)*.12);return `${left-padding} ${top-padding} ${right-left+2*padding} ${bottom-top+2*padding}`;
 }
 function image(sample,label,box){
  const preview=document.createElement('div');preview.className='alphabet-preview';preview.setAttribute('role','img');preview.setAttribute('aria-label',label+' · '+sample.processed_strokes.length+' pen stroke'+(sample.processed_strokes.length===1?'':'s'));
  preview.innerHTML=E.reviewSVG(sample,{colourStrokes:true}).replace(/<line\b[^>]*\/>|<text\b[^>]*>[^<]*<\/text>/g,'').replace(/viewBox="[^"]+"/,'viewBox="'+box+'"');return preview;
 }
 function previewControls(){
  const zoom=Number($('alphabet-zoom').value);$('alphabet-zoom-value').textContent=zoom+'%';
  const style=$('alphabet-previews').style;style.setProperty('--alphabet-tile-width',130*zoom/100+'px');style.setProperty('--alphabet-tile-height',100*zoom/100+'px');style.setProperty('--alphabet-sample-width',200*zoom/100+'px');style.setProperty('--alphabet-sample-height',180*zoom/100+'px');
  $('alphabet-previews').dataset.colourStrokes=String($('alphabet-colours').checked);
 }
 function controls(){const locked=!!spacingUI?.isLocked();for(const control of document.querySelectorAll('.alphabet-controls select,.alphabet-controls button,#alphabet-grid button'))control.disabled=busy||locked;if(locked&&!spacingLocks.length){spacingLocks=Array.from(document.querySelectorAll('#alphabet-clear,#alphabet-samples button')).map(c=>[c,c.disabled]);for(const [c] of spacingLocks)c.disabled=true;}else if(!locked&&spacingLocks.length){for(const [c,disabled] of spacingLocks)c.disabled=busy||disabled;spacingLocks=[];}}
 function render(){$('alphabet-grid').replaceChildren();$('alphabet-samples').replaceChildren();
  const writer=$('alphabet-writer').value,profile=cat.writers.find(p=>p.writer===writer),all=cat.byWriter.get(writer)||[],tokens=E.tokens(E.plans[$('alphabet-kind').value].alphabet);if(!tokens.includes(selected))selected=tokens[0];
  const ready=tokens.filter(c=>profile?.counts[c]>0),blended=tokens.filter(c=>profile?.blend_counts[c]>0),preferred=tokens.filter(c=>all.some(s=>s.letter===c&&E.preferenceIDs(profile?.preferred_sets[c]).includes(s.capture_id)&&s.included));
  // Share one ink frame within each comparison so natural size differences remain visible.
  const overviewBox=previewBounds(all.filter(s=>tokens.includes(s.letter)&&s.included));
  $('alphabet-summary').textContent=profile?`${ready.length} of ${tokens.length} characters ready · ${blended.length} with saved blends · ${preferred.length} with an included preferred version`:'No samples yet. Capture letters to start your alphabet.';
  const missing=tokens.filter(c=>!profile?.counts[c]),unblended=tokens.filter(c=>!profile?.blend_counts[c]);
  $('alphabet-gaps').textContent=(missing.length?'Missing included samples: '+missing.join(' ')+'. ':'All characters have an included sample. ')+(unblended.length?'No included saved blend yet: '+unblended.join(' ')+'.':'Every character has an included saved blend.');
  $('alphabet-compose').href='compose.html?writer='+encodeURIComponent(writer);$('alphabet-proof').href='proof.html?'+new URLSearchParams({writer,kind:$('alphabet-kind').value});
  if($('alphabet-compare'))$('alphabet-compare').href='proof.html?'+new URLSearchParams({writer,mode:'comparison'});
  for(const c of tokens){const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(c===selected));const title=document.createElement('strong');title.textContent=c;button.append(title);
   const samples=all.filter(s=>s.letter===c&&s.included),sample=E.preferenceIDs(profile?.preferred_sets[c]).map(id=>samples.find(s=>s.capture_id===id)).find(Boolean)||samples[0];if(sample)button.append(image(sample,c,overviewBox));
   const count=document.createElement('small');count.textContent=`${profile?.original_counts[c]||0} originals · ${profile?.blend_counts[c]||0} blends`+(preferred.includes(c)?' · Preferred':'');button.append(count);button.onclick=()=>{if(busy||spacingUI?.isLocked())return;selected=c;render();status('Choose preferred versions of '+c+'.');};$('alphabet-grid').append(button);
  }
  $('alphabet-heading').textContent='Samples for '+selected;const samples=all.filter(s=>s.letter===selected),chosen=E.preferenceIDs(profile?.preferred_sets[selected]),choices=samples.filter(s=>chosen.includes(s.capture_id));
  const sampleBox=previewBounds(samples);
  $('alphabet-choice').textContent=chosen.length?'Preferred: '+choices.filter(s=>s.included).length+' included versions · Compose cycles through these choices.'+(choices.some(s=>!s.included)?' Excluded preferred samples are skipped.':''):samples.length?'Add one or more included versions below.':'No samples for this character yet. Use Capture or Blend a character.';
  $('alphabet-clear').disabled=busy||!chosen.length;
  for(const sample of samples){const card=document.createElement('article');if(chosen.includes(sample.capture_id))card.className='preferred-sample';const caption=document.createElement('p');caption.textContent=(sample.derived?'Saved blend':'Original')+' · '+new Date(sample.saved_at).toLocaleString()+' · '+sample.capture_id.slice(0,8)+(sample.included?'':' · Excluded')+' · '+sample.processed_strokes.length+' pen stroke'+(sample.processed_strokes.length===1?'':'s');const button=document.createElement('button');button.type='button';button.textContent=chosen.includes(sample.capture_id)?'Remove from preferred':'Add to preferred';button.disabled=busy||(!sample.included&&!chosen.includes(sample.capture_id));button.onclick=()=>save(sample.capture_id);if(sample.capture_id===query.get('sample')){card.classList.add('requested-sample');caption.textContent+=' · Selected sample';}card.append(caption,image(sample,selected,sampleBox),button);if(sample.derived){const reopen=document.createElement('a');reopen.className='button';reopen.textContent='Reopen source mix';reopen.href='blending.html?'+new URLSearchParams({blend:sample.capture_id});card.append(reopen);} $('alphabet-samples').append(card);}
  spacingUI?.show({writer,letter:selected,setting:profile?.character_spacing[selected],available:samples.some(s=>s.included)});controls();
 }
 async function load(){if(busy||spacingUI?.isLocked())return;busy=true;controls();status('Loading your alphabet…');try{const files=await window.StudioStorage.snapshot();cat=E.catalog(files);const old=$('alphabet-writer').value||new URLSearchParams(window.location.search).get('writer');$('alphabet-writer').replaceChildren();for(const p of cat.writers){const option=document.createElement('option');option.value=p.writer;option.textContent=p.writer;$('alphabet-writer').append(option);}if(cat.writers.some(p=>p.writer===old))$('alphabet-writer').value=old;busy=false;render();status('Choose a character to compare its samples.');}catch(error){status(error.message);}finally{busy=false;controls();}}
 async function save(capture_id){if(busy||spacingUI?.isLocked())return;busy=true;render();status('Saving preference…');try{const current=E.preferenceIDs(cat.writers.find(p=>p.writer===$('alphabet-writer').value)?.preferred_sets[selected]),ids=current.includes(capture_id)?current.filter(id=>id!==capture_id):[...current,capture_id];const response=await window.studioFetch('/api/alphabet/preferred',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({writer:$('alphabet-writer').value,letter:selected,...(capture_id===null?{capture_id:null}:{capture_ids:ids})})});const data=await response.json();if(!response.ok)throw Error(data.error);cat=E.catalog(await window.StudioStorage.snapshot());busy=false;render();status(capture_id?'Preferred choices saved. Compose cycles through included choices allowed by its source setting.':'Preference cleared. Compose will choose from the available samples.');}catch(error){busy=false;render();status('Could not save preference: '+error.message);}}
 $('alphabet-writer').addEventListener('change',()=>{render();status('Choose a character.');});$('alphabet-kind').addEventListener('change',()=>{render();status('Choose a character.');});$('alphabet-refresh').onclick=load;$('alphabet-clear').onclick=()=>save(null);
 $('alphabet-zoom').addEventListener('input',previewControls);$('alphabet-colours').addEventListener('change',previewControls);$('alphabet-zoom-reset').onclick=()=>{$('alphabet-zoom').value='100';previewControls();};previewControls();
 spacingUI=window.StudioCharacterSpacing?.init({onSaved:load,onDirty:controls});
 window.addEventListener('pageshow',event=>{if(event.persisted)load();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});await load();
})();
