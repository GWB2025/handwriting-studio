'use strict';
(()=>{
  const byID=id=>document.getElementById(id);
  const alphabet='abcdefghijklmnopqrstuvwxyz',fullExample='the quick brown fox jumps over the lazy dog\n'+alphabet;
  let automaticPhrase=fullExample,phraseEdited=byID('phrase').value!==fullExample;
  let liveTimer=null,blendSeed='',hasPreview=false,previewSVG='',profiles=[],imageURL='',requestNumber=0,controller=null,loading=false,checkingSamples=false;
  function sourceCounts(profile){return window.StudioEngine?.countsFor?window.StudioEngine.countsFor(profile,byID('compose-source')?.value||'both'):(profile?.counts||{});}
  function updateExample(){
    // Never replace text the writer entered (including browser-restored text).
    if(phraseEdited || byID('phrase').value!==automaticPhrase)return;
    const profile=profiles.find(p=>p.writer===byID('compose-writer').value);
    if(!profile)return;
    const available=[...(window.StudioEngine?.characters || alphabet)].filter(letter=>sourceCounts(profile)[letter]>0).join('');
    automaticPhrase=available===alphabet?fullExample:available==='abcde'?'a bad cab\naaaa bbbb cccc dddd eeee':[...available].join(' ');
    byID('phrase').value=automaticPhrase;
  }
  function clearPreview(keepImage=false){
    previewSVG='';window.StudioBlendPreview?.clear();if(byID('compose-gcode'))byID('compose-gcode').disabled=true;
    if(!keepImage){if(imageURL)URL.revokeObjectURL(imageURL);imageURL='';byID('composed-image').hidden=true;byID('composed-image').removeAttribute('src');byID('compose-empty').hidden=false;}
    byID('compose-download').disabled=true;
  }
  function invalidate(options){
    clearTimeout(liveTimer);requestNumber++;controller?.abort();controller=null;loading=false;clearPreview(options?.keepImage===true);
    byID('generate').disabled=!byID('compose-writer').value;
    byID('generate').textContent='Generate preview';
    byID('compose-status').textContent='Settings changed. Generate a new preview before downloading.';
    showCounts();
  }
  function showCounts(counts){
    const supplied=!!counts;const profile=profiles.find(p=>p.writer===byID('compose-writer').value);
    const limit={latest_three:3,latest_four:4,latest_only:1,all:Infinity}[byID('compose-samples').value];
    counts=counts || (profile && Object.fromEntries(Object.entries(sourceCounts(profile)).map(([letter,n])=>[letter,Math.min(n,limit)])));
    byID('compose-counts').textContent=counts?(supplied?'Preview samples: ':'Available samples: ')+Object.entries(counts).map(([letter,n])=>letter+' × '+n).join(' · ')+' · '+(byID('compose-preferred')?.checked?'preferred versions when available; otherwise newest first':'newest first'):'';
    byID('review-link').href='review.html?writer='+encodeURIComponent(byID('compose-writer').value);
  }
  async function loadWriters(){
    invalidate();const ticket=++requestNumber;
    const selected=byID('compose-writer').value || new URLSearchParams(window.location.search).get('writer');
    const requestController=new AbortController();controller=requestController;
    const timeout=setTimeout(()=>requestController.abort(),15000);
    for(const id of ['compose-source','compose-preferred','compose-letter-spacing','compose-word-spacing','compose-line-spacing','compose-spacing-reset'])if(byID(id))byID(id).disabled=true;
    byID('generate').disabled=true;byID('compose-writer').disabled=true;byID('refresh-writers').disabled=true;
    for(const id of ['phrase','compose-size','compose-smooth','compose-samples'])byID(id).disabled=true;
    byID('compose-status').textContent='Loading your saved letters…';
    try{
      const r=await window.studioFetch('/api/letters/writers',{signal:requestController.signal,cache:'no-store'});if(!r.ok)throw Error();
      const data=await r.json();if(ticket!==requestNumber)return;
      profiles=data.writers;const select=byID('compose-writer');select.replaceChildren();
      for(const profile of profiles){const option=document.createElement('option');option.value=profile.writer;option.textContent=profile.writer;select.append(option);}
      if(profiles.some(p=>p.writer===selected))select.value=selected;
      select.disabled=!profiles.length;updateExample();showCounts();
      byID('generate').disabled=!profiles.length;
      byID('compose-status').textContent=profiles.length?'Choose a writer and generate a preview.':'No letter samples yet. Tap Capture letters and save your first sheet.';
      if(data.variation?.mode==='blend')byID('compose-status').textContent+=' '+data.variation.blended+' blended; '+data.variation.fallback+' used original samples.';
      if(data.unavailable_count)byID('compose-status').textContent+=' Some saved files could not be read and have been left untouched.';
    }catch(error){if(ticket===requestNumber)byID('compose-status').textContent='Could not load samples. Try reopening this page in a regular browser window, then tap Refresh samples.';}
    finally{clearTimeout(timeout);if(ticket===requestNumber){controller=null;for(const id of ['compose-source','compose-preferred','compose-letter-spacing','compose-word-spacing','compose-line-spacing','compose-spacing-reset'])if(byID(id))byID(id).disabled=false;byID('refresh-writers').disabled=false;for(const id of ['phrase','compose-size','compose-smooth','compose-samples'])byID(id).disabled=false;}}
  }
  byID('compose-form').onsubmit=async event=>{
    event.preventDefault();if(loading || !byID('compose-writer').value)return;
    if(!event.live)blendSeed=crypto.randomUUID();
    clearPreview(!!event.live);loading=true;const ticket=++requestNumber;
    const requestController=new AbortController();controller=requestController;
    const timeout=setTimeout(()=>requestController.abort(),15000);
    byID('generate').disabled=true;byID('generate').textContent='Composing…';
    byID('compose-status').textContent='Building the phrase from your saved letters…';
    try{
      const r=await window.studioFetch('/api/compose',{method:'POST',headers:{'Content-Type':'application/json'},signal:requestController.signal,cache:'no-store',
        body:JSON.stringify({writer:byID('compose-writer').value,phrase:byID('phrase').value,height:Number(byID('compose-size').value),smooth:byID('compose-smooth').checked,samples:byID('compose-samples').value,...(window.StudioEngine?{source:byID('compose-source')?.value||'both',use_preferred:byID('compose-preferred')?.checked??true,...spacingData(),variation:byID('compose-variation').value,joined:byID('compose-joined').checked,seed:blendSeed,...(byID('blend-mix')?{blend_strength:Number(byID('blend-mix').value),blend_count:Number(byID('blend-count')?.value||2),blend_vertical:Number(byID('blend-vertical')?.value||50)}:{})}:{})})});
      const data=await r.json();if(ticket!==requestNumber)return;if(!r.ok)throw Error(data.error || 'Could not generate preview.');
      hasPreview=true;previewSVG=data.svg;window.StudioBlendPreview?.show(data.variation);if(byID('compose-gcode'))byID('compose-gcode').disabled=false;
      const oldImageURL=imageURL;imageURL=URL.createObjectURL(new Blob([data.svg],{type:'image/svg+xml'}));
      byID('composed-image').src=imageURL;if(oldImageURL)URL.revokeObjectURL(oldImageURL);byID('composed-image').hidden=false;byID('compose-empty').hidden=true;
      byID('compose-download').disabled=false;
      const profile=profiles.find(p=>p.writer===byID('compose-writer').value);
      if(profile){profile.counts=data.sample_selection.all_counts||data.sample_selection.available_counts;for(const key of ['original_counts','blend_counts','preferred'])if(data.sample_selection[key])profile[key]=data.sample_selection[key];profile.latest_saved_at=data.sample_selection.latest_saved_at || data.sample_selection.newest_saved_at;profile.revision=data.sample_selection.writer_revision;}
      showCounts(data.sample_selection.counts);
      byID('compose-status').textContent='Ready · '+data.used_samples.length+' letters composed. Newest sample used: '+
        new Date(data.sample_selection.newest_saved_at).toLocaleString()+'. Download exports exactly this preview.';
      if(data.variation?.mode==='blend')byID('compose-status').textContent+=' '+data.variation.blended+' blended; '+data.variation.fallback+' used original samples.';
      if(data.unavailable_count)byID('compose-status').textContent+=' Some unreadable captures were skipped.';
    }catch(error){if(ticket===requestNumber)byID('compose-status').textContent=(error.name==='AbortError'?'Browser storage took too long to respond. Try Generate preview again.':error.message)+(event.live&&imageURL?' Previous preview shown; adjust settings to update it.':'');}
    finally{clearTimeout(timeout);if(ticket===requestNumber){loading=false;controller=null;byID('generate').disabled=false;byID('generate').textContent='Generate preview';}}
  };
  byID('compose-download').onclick=()=>{
    if(!imageURL||!previewSVG||byID('compose-download').disabled)return;
    const a=document.createElement('a');a.href=imageURL;a.download='composed-handwriting-a4.svg';a.hidden=true;
    // Keep the download link in the document for Safari's native download path.
    document.body.append(a);a.click();setTimeout(()=>a.remove(),1000);
    byID('compose-status').textContent='SVG download requested. Look for composed-handwriting-a4.svg in your browser’s Downloads. You can download this preview again.';
  };
  if(byID('compose-gcode'))byID('compose-gcode').onclick=()=>{
    if(!previewSVG)return;
    try{const gcode=window.StudioPlotter.fromSVG(previewSVG),url=URL.createObjectURL(new Blob([gcode],{type:'text/plain'}));
      const a=document.createElement('a');a.href=url;a.download='composed-handwriting-a4.gcode';a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1000);
      byID('compose-status').textContent='G-code downloaded for this preview. Send it from the Mac with the plotter homed at the paper’s top-left corner and the pen raised.';
    }catch(error){byID('compose-status').textContent=error.message;}
  };
  byID('compose-writer').addEventListener('change',()=>{updateExample();invalidate();});
  for(const id of ['compose-size','compose-smooth','compose-samples'])byID(id).addEventListener('change',invalidate);
  for(const id of ['compose-variation','compose-joined'])byID(id)?.addEventListener('change',invalidate);
  byID('compose-source')?.addEventListener('change',()=>{updateExample();invalidate();});
  byID('compose-preferred')?.addEventListener('change',invalidate);
  function liveBlend(){
    const active=hasPreview;invalidate();
    if(active&&byID('compose-variation').value==='blend')liveTimer=setTimeout(()=>byID('compose-form').onsubmit({preventDefault(){},live:true}),100);
  }
  byID('blend-mix')?.addEventListener('input',()=>{byID('blend-mix-value').textContent=byID('blend-mix').value+'% right source';liveBlend();});
  byID('blend-vertical')?.addEventListener('input',()=>{byID('blend-vertical-value').textContent=byID('blend-vertical').value+'% bottom row';liveBlend();});
  byID('blend-count')?.addEventListener('change',()=>{if(byID('blend-count').value==='4'&&byID('compose-samples').value==='latest_three')byID('compose-samples').value='latest_four';liveBlend();});
  byID('phrase').addEventListener('input',()=>{phraseEdited=true;invalidate();});
  function spacingData(){return Object.fromEntries(['letter','word','line'].map(name=>[name+'_spacing',Number(byID('compose-'+name+'-spacing')?.value||100)/100]));}
  function liveSpacing(){
    for(const name of ['letter','word','line'])if(byID('compose-'+name+'-value'))byID('compose-'+name+'-value').textContent=byID('compose-'+name+'-spacing').value+'%';
    const active=hasPreview;invalidate({keepImage:active});
    if(active){byID('compose-status').textContent='Updating spacing… Downloads will be ready when the preview is updated.';liveTimer=setTimeout(()=>byID('compose-form').onsubmit({preventDefault(){},live:true}),180);}
  }
  for(const name of ['letter','word','line'])byID('compose-'+name+'-spacing')?.addEventListener('input',liveSpacing);
  if(byID('compose-spacing-reset'))byID('compose-spacing-reset').onclick=()=>{for(const name of ['letter','word','line'])byID('compose-'+name+'-spacing').value='100';liveSpacing();};
  byID('refresh-writers').onclick=loadWriters;
  async function checkForNewSamples(){
    if(checkingSamples || loading || byID('compose-writer').disabled)return;
    checkingSamples=true;
    const ticket=requestNumber,writer=byID('compose-writer').value;
    const previous=profiles.find(profile=>profile.writer===writer);
    const checkController=new AbortController(),timeout=setTimeout(()=>checkController.abort(),15000);
    try{
      const r=await window.studioFetch('/api/letters/writers',{signal:checkController.signal,cache:'no-store'});if(!r.ok)throw Error();
      const data=await r.json();if(ticket!==requestNumber)return;
      const current=data.writers.find(profile=>profile.writer===writer);
      const changed=JSON.stringify(previous?.counts)!==JSON.stringify(current?.counts) || previous?.latest_saved_at!==current?.latest_saved_at || previous?.revision!==current?.revision;
      profiles=data.writers;showCounts();
      if(changed){
        updateExample();
        invalidate();
        byID('compose-status').textContent=current?'Saved samples have changed. Tap Generate preview to use the latest captures before downloading.':
          'This writer’s samples are unavailable. Tap Refresh samples to check the list.';
      }
      // Keep the existing SVG and download link when no captures have changed.
    }catch(error){
      if(ticket===requestNumber && imageURL)byID('compose-status').textContent='Could not check for new captures. Your displayed preview is still available to download.';
    }finally{clearTimeout(timeout);checkingSamples=false;}
  }
  window.addEventListener('pageshow',event=>{if(event.persisted)checkForNewSamples();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForNewSamples();});
  loadWriters().then(()=>{if(!window.StudioCompositions)return;
    window.StudioCompositions.init({read:()=>({writer:byID('compose-writer').value,phrase:byID('phrase').value,height:Number(byID('compose-size').value),smooth:byID('compose-smooth').checked,samples:byID('compose-samples').value,source:byID('compose-source').value,use_preferred:byID('compose-preferred').checked,joined:byID('compose-joined').checked,...spacingData()}),restore:async settings=>{
      const previousPhrase=byID('phrase').value;await loadWriters();if(!profiles.some(p=>p.writer===settings.writer)){byID('phrase').value=previousPhrase;throw Error('Import the saved handwriting for '+settings.writer+' first. Your text has not been replaced.');}
      byID('compose-writer').value=settings.writer;byID('phrase').value=settings.phrase;phraseEdited=true;byID('compose-size').value=String(settings.height);byID('compose-smooth').checked=settings.smooth;byID('compose-samples').value=settings.samples;byID('compose-source').value=settings.source;byID('compose-preferred').checked=settings.use_preferred;byID('compose-joined').checked=settings.joined;
      for(const name of ['letter','word','line']){byID('compose-'+name+'-spacing').value=String(settings[name+'_spacing']*100);byID('compose-'+name+'-value').textContent=byID('compose-'+name+'-spacing').value+'%';}
      hasPreview=false;invalidate();
    }});
  });
})();
