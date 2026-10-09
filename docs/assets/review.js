'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  let alphabet='abcdefghijklmnopqrstuvwxyz';
  let profiles=[],samples=[],selected=null,busy=false,dirty=false,previewInk=null;
  function status(text){$('review-status').textContent=text;}
  async function api(url,body){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await window.studioFetch(url,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
      const data=await response.json();if(!response.ok)throw Error(data.error || 'Request failed.');return data;
    }catch(error){throw Error(error.name==='AbortError'?'Browser storage took too long to respond. Please retry.':error.message);}
    finally{clearTimeout(timeout);}
  }
  function controls(){
    $('review-writer').disabled=busy || dirty || !profiles.length;
    $('review-letter').disabled=busy || dirty || !profiles.length;
    if($('review-kind'))$('review-kind').disabled=busy || dirty;
    $('review-refresh').disabled=busy || dirty;
    for(const button of $('review-alphabet').querySelectorAll('button')){
      button.disabled=busy || dirty || !profiles.length;
      button.setAttribute('aria-pressed',String(button.dataset.letter===$('review-letter').value));
    }
    $('sample-included').disabled=busy || !selected;
    $('sample-shift').disabled=busy || !selected;
    const shift=$('sample-shift').value.trim(),number=Number(shift);
    $('review-save').disabled=busy || !dirty || !shift || !Number.isFinite(number) || number < -10 || number > 10;
    $('review-reset').disabled=busy || !dirty;
    for(const button of $('sample-list').querySelectorAll('button'))button.disabled=busy || dirty;
    $('review-compose').href='compose.html?writer='+encodeURIComponent($('review-writer').value);
  }
  function coverage(){
    if(window.StudioEngine && $('review-kind'))alphabet=window.StudioEngine.plans[$('review-kind').value].alphabet;
    const profile=profiles.find(p=>p.writer===$('review-writer').value);
    const previous=$('review-letter').value;$('review-letter').replaceChildren();
    for(const letter of alphabet){
      const option=document.createElement('option');option.value=letter;
      option.textContent=letter+' · '+(profile?.counts[letter] || 0)+' of '+(profile?.total_counts[letter] || 0)+' included';
      $('review-letter').append(option);
    }
    $('review-letter').value=previous&&alphabet.includes(previous)?previous:([...alphabet].find(letter=>profile?.total_counts[letter]) || alphabet[0]);
    $('review-alphabet').replaceChildren();
    for(const letter of alphabet){
      const count=profile?.total_counts[letter] || 0;
      const button=document.createElement('button');button.type='button';button.dataset.letter=letter;
      button.textContent=letter+' · '+count;
      button.setAttribute('aria-label','Review '+letter+' · '+count+' saved '+(count===1?'sample':'samples'));
      button.onclick=()=>{if(busy || dirty)return;$('review-letter').value=letter;load();};
      $('review-alphabet').append(button);
    }
    const missing=[...alphabet].filter(letter=>!profile?.counts[letter]);
    $('review-coverage').textContent=profile?(alphabet.length-missing.length)+' of '+alphabet.length+' characters/pairs ready to compose.'+(missing.length?' Still needed: '+missing.join(', ')+'.':' All characters in this group are ready.'):'No saved letters yet. Start on Capture letters.';
  }
  function showSample(sample){
    selected=sample;dirty=false;
    previewInk=null;$('sample-image').replaceChildren();
    $('sample-detail').hidden=!sample;
    if(!sample){controls();return;}
    $('sample-title').textContent=sample.letter+' · '+(sample.included?'Included':'Excluded');
    $('sample-date').textContent=(sample.derived?'Saved blend · ':'Saved ')+new Date(sample.saved_at).toLocaleString()+' · '+sample.stroke_count+' pen stroke'+(sample.stroke_count===1?'':'s');
    $('sample-image').innerHTML=sample.svg;
    const svg=$('sample-image').querySelector('svg');
    if(svg){
      const paths=Array.from(svg.querySelectorAll('path')),box=svg.getAttribute('viewBox').split(/\s+/).map(Number),savedShift=sample.baseline_shift_mm*16;
      // Keep guides and scale fixed throughout editing, including the full ±10 mm range.
      let top=-180,bottom=110;
      for(const path of paths){const bounds=path.getBBox();top=Math.min(top,bounds.y-savedShift-160-25);bottom=Math.max(bottom,bounds.y+bounds.height-savedShift+160+25);}
      svg.setAttribute('viewBox',`${box[0]} ${top} ${box[2]} ${bottom-top}`);
      previewInk=document.createElementNS('http://www.w3.org/2000/svg','g');previewInk.setAttribute('data-review-ink','');
      for(const path of paths)previewInk.append(path);svg.append(previewInk);
      previewInk.setAttribute('transform','translate(0 0)');
    }
    $('sample-included').checked=sample.included;$('sample-shift').value=sample.baseline_shift_mm;
    for(const button of $('sample-list').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.captureId===sample.capture_id));
    controls();
  }
  function drawList(data,keepID){
    samples=data.samples;$('sample-list').replaceChildren();
    for(const [index,sample] of samples.entries()){
      const button=document.createElement('button');button.type='button';button.className='page-card';button.dataset.captureId=sample.capture_id;
      const title=document.createElement('strong');title.textContent='Example '+(samples.length-index)+' · '+(sample.included?'Included':'Excluded');
      const date=document.createElement('span');date.textContent=(sample.derived?'Blend · ':'')+new Date(sample.saved_at).toLocaleString();
      button.append(title,date);button.onclick=()=>{showSample(sample);status('Viewing '+sample.letter+'. Choose whether to use this example, then save any changes.');};
      $('sample-list').append(button);
    }
    showSample(samples.find(s=>s.capture_id===keepID) || samples[0] || null);
    status(samples.length?samples.length+' saved examples of '+$('review-letter').value+'. Choose one to review.':'No examples of '+$('review-letter').value+' saved for this writer yet.');
    if(data.unavailable_count)status($('review-status').textContent+' Some unreadable files were skipped and left untouched.');
  }
  async function load(refreshProfiles=false){
    if(busy || dirty)return;
    busy=true;controls();status('Loading your saved samples…');
    const keepID=selected?.capture_id;
    try{
      if(refreshProfiles){
        const writer=$('review-writer').value || new URLSearchParams(window.location.search).get('writer');
        const data=await api('/api/letters/writers');profiles=data.writers;
        $('review-writer').replaceChildren();
        for(const p of profiles){const option=document.createElement('option');option.value=p.writer;option.textContent=p.writer;$('review-writer').append(option);}
        if(profiles.some(p=>p.writer===writer))$('review-writer').value=writer;
      }
      coverage();
      const query=new URLSearchParams({writer:$('review-writer').value,letter:$('review-letter').value});
      drawList(await api('/api/letters/samples?'+query),keepID);
    }catch(error){showSample(null);$('sample-list').replaceChildren();status('Could not load samples: '+error.message);}
    finally{busy=false;controls();}
  }
  function changed(){
    if(busy||!selected)return;
    const text=$('sample-shift').value.trim(),shift=Number(text),valid=!!text&&Number.isFinite(shift)&&shift>=-10&&shift<=10;
    dirty=!!selected && ($('sample-included').checked!==selected.included || $('sample-shift').value.trim()==='' || Number($('sample-shift').value)!==selected.baseline_shift_mm);
    if(valid&&previewInk)previewInk.setAttribute('transform',`translate(0 ${(shift-selected.baseline_shift_mm)*16})`);
    controls();status(!valid?'Enter a baseline shift from −10 to +10 mm. The preview keeps the last valid position.':dirty?'Preview baseline shift: '+shift+' mm. Changes not saved yet. Tap Save changes or Reset changes.':'This sample has no unsaved changes.');
  }
  $('sample-included').onchange=changed;$('sample-shift').oninput=changed;
  $('review-reset').onclick=()=>{showSample(selected);status('Unsaved changes reset.');};
  $('review-form').onsubmit=async event=>{
    event.preventDefault();if(busy || !dirty || $('review-save').disabled)return;
    busy=true;controls();status('Saving your review…');
    try{
      const result=await api('/api/letters/samples/'+selected.capture_id+'/'+encodeURIComponent(selected.letter)+'/review',
        {included:$('sample-included').checked,baseline_shift_mm:Number($('sample-shift').value)});
      Object.assign(selected,{included:result.included,baseline_shift_mm:result.baseline_shift_mm,svg:result.svg});
      const profile=profiles.find(p=>p.writer===$('review-writer').value);
      if(profile)profile.counts[selected.letter]=samples.filter(s=>s.included).length;
      coverage();drawList({samples},selected.capture_id);
      status('✓ Saved. This example is '+(selected.included?'included in':'excluded from')+' composition. Baseline shift: '+selected.baseline_shift_mm+' mm. Generate a new Compose preview to see the change.');
    }catch(error){status('Not saved: '+error.message+' Your edits are still here.');}
    finally{busy=false;controls();}
  };
  if($('review-kind'))$('review-kind').onchange=()=>load();
  $('review-writer').onchange=()=>load();$('review-letter').onchange=()=>load();$('review-refresh').onclick=()=>load(true);
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',event=>{if(event.persisted)load(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});
  load(true);
})();
