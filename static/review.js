'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  let alphabet='abcdefghijklmnopqrstuvwxyz';
  let profiles=[],samples=[],selected=null,busy=false,dirty=false,previewInk=null,previewX=0,previewCentre=0,previewInkCentre=0,previewPaths=[];
  let wordTimer=null,wordTicket=0,wordLetter='';
  // The slider increases upwards; stored offsets retain the existing down-positive convention.
  function shiftValue(){const text=$('sample-shift').value.trim();return text?-Number(text):NaN;}
  function shiftLabel(shift){return shift===0?'Original baseline':Number(Math.abs(shift).toFixed(3))+' mm '+(shift<0?'up':'down');}
  function shiftReadout(shift){const label=shiftLabel(shift);$('sample-shift-value').textContent=label;$('sample-shift').setAttribute('aria-valuetext',label);}
  function status(text){$('review-status').textContent=text;}
  async function api(url,body){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
      const data=await response.json();if(!response.ok)throw Error(data.error || 'Request failed.');return data;
    }catch(error){throw Error(error.name==='AbortError'?'The Mac took too long to respond. Please retry.':error.message);}
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
    $('sample-zero').disabled=busy || !selected;
    for(const id of ['sample-size','sample-size-reset'])if($(id))$(id).disabled=busy||!selected;
    const number=shiftValue();
    $('review-save').disabled=busy || !dirty || !Number.isFinite(number) || number < -10 || number > 10 || !validSize();
    $('review-reset').disabled=busy || !dirty;
    for(const button of $('sample-list').querySelectorAll('button'))button.disabled=busy || dirty;
    $('review-compose').href='/compose?writer='+encodeURIComponent($('review-writer').value);
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
    selected=sample;dirty=false;wordTicket++;clearTimeout(wordTimer);
    previewInk=null;previewX=0;$('sample-image').replaceChildren();
    $('sample-detail').hidden=!sample;
    if(!sample){controls();return;}
    $('sample-title').textContent=sample.letter+' · '+(sample.included?'Included':'Excluded');
    $('sample-date').textContent=(sample.derived?'Saved blend · ':'Saved ')+new Date(sample.saved_at).toLocaleString()+' · '+sample.stroke_count+' pen stroke'+(sample.stroke_count===1?'':'s');
    $('sample-image').innerHTML=sample.svg;
    const svg=$('sample-image').querySelector('svg');
    if(svg){
      const paths=Array.from(svg.querySelectorAll('path')),box=svg.getAttribute('viewBox').split(/\s+/).map(Number),savedShift=sample.baseline_shift_mm*16;
      // Keep guides and scale fixed throughout editing, including the full ±10 mm range.
      let top=-180,bottom=110,left=Infinity,right=-Infinity;const savedScale=sample.scale_factor??1,maxScale=$('sample-size')?2/savedScale:1;
      for(const path of paths){const bounds=path.getBBox();const minScale=$('sample-size')?.5/savedScale:1;top=Math.min(top,(bounds.y-savedShift)*maxScale-160-25,(bounds.y-savedShift)*minScale-160-25);bottom=Math.max(bottom,(bounds.y+bounds.height-savedShift)*maxScale+160+25,(bounds.y+bounds.height-savedShift)*minScale+160+25);left=Math.min(left,bounds.x);right=Math.max(right,bounds.x+bounds.width);}
      box[2]=Math.max(box[2],(right-left)*maxScale+60);svg.setAttribute('viewBox',`${box[0]} ${top} ${box[2]} ${bottom-top}`);
      previewCentre=box[0]+box[2]/2;previewInkCentre=(left+right)/2;previewPaths=paths;
      // Centre the complete letter, including separate dots and crossbars, in the preview only.
      if(paths.length)previewX=box[0]+box[2]/2-(left+right)/2;
      previewInk=document.createElementNS('http://www.w3.org/2000/svg','g');previewInk.setAttribute('data-review-ink','');
      for(const path of [...paths,...svg.querySelectorAll('.stroke-start')])previewInk.append(path);svg.append(previewInk);
      previewInk.setAttribute('transform',`translate(${previewX} 0)`);
    }
    $('sample-included').checked=sample.included;$('sample-shift').value=-sample.baseline_shift_mm;shiftReadout(sample.baseline_shift_mm);
    if($('sample-size')){$('sample-size').value=(sample.scale_factor??1)*100;$('sample-size-value').textContent=$('sample-size').value+'%';}
    if($('review-word')&&wordLetter!==sample.letter){wordLetter=sample.letter;const words={a:'cat',b:'baby',c:'cat',d:'day',e:'the',f:'of',g:'going',h:'the',i:'writing',j:'jump',k:'like',l:'hello',m:'moon',n:'hand',o:'moon',p:'paper',q:'quick',r:'writing',s:'same',t:'the',u:'quick',v:'very',w:'word',x:'box',y:'day',z:'lazy'};$('review-word').value=words[sample.letter]||sample.letter.repeat(3);$('review-word-preview').replaceChildren();}
    inspection();wordPreview();
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
  function sizeValue(){return $('sample-size')?Number($('sample-size').value)/100:1;}
  function validSize(){const size=sizeValue();return Number.isFinite(size)&&size>=.5&&size<=2;}
  function inspection(){
    if(!$('review-zoom'))return;
    const zoom=Number($('review-zoom').value);$('sample-image').style.height=280*zoom/100+'px';$('review-zoom-value').textContent=zoom+'%';
    $('sample-image').dataset.colours=String($('review-colours').checked);$('sample-image').dataset.starts=String($('review-starts').checked);
  }
  function wordPreview(){
    if(!$('review-word')||!selected)return;clearTimeout(wordTimer);const ticket=++wordTicket;
    if(!validSize()||!Number.isFinite(shiftValue()))return;
    const request={writer:$('review-writer').value,capture_id:selected.capture_id,letter:selected.letter,text:$('review-word').value,included:true,baseline_shift_mm:shiftValue(),scale_factor:sizeValue()};
    $('review-word-status').textContent='Updating word preview…';
    wordTimer=setTimeout(async()=>{try{const result=await api('/api/review-preview',request);if(ticket!==wordTicket)return;
      $('review-word-preview').innerHTML=result.svg;const svg=$('review-word-preview').querySelector('svg'),box=svg.querySelector('g').getBBox();svg.setAttribute('viewBox',`${box.x-2} ${box.y-2} ${box.width+4} ${box.height+4}`);svg.removeAttribute('width');svg.removeAttribute('height');
      $('review-word-status').textContent=request.text.includes(request.letter)?'Live word preview · this sample uses your pending size and position.':'This text does not contain '+request.letter+'. Add it to compare the adjustment.';
    }catch(error){if(ticket===wordTicket){$('review-word-preview').replaceChildren();$('review-word-status').textContent=error.message;}}},120);
  }
  function changed(){
    if(busy||!selected)return;
    const shift=shiftValue(),valid=Number.isFinite(shift)&&shift>=-10&&shift<=10&&validSize();
    dirty=$('sample-included').checked!==selected.included || shift!==selected.baseline_shift_mm || sizeValue()!==(selected.scale_factor??1);
    if(valid){shiftReadout(shift);const ratio=sizeValue()/(selected.scale_factor??1);previewX=previewCentre-previewInkCentre*ratio;if(previewInk)previewInk.setAttribute('transform',`translate(${previewX} ${(shift-selected.baseline_shift_mm*ratio)*16})`+(ratio===1?'':` scale(${ratio})`));for(const path of previewPaths)path.setAttribute('stroke-width',1.8/ratio);if($('sample-size-value'))$('sample-size-value').textContent=Number((sizeValue()*100).toFixed(2))+'%';}wordPreview();
    controls();status(!valid?'Choose a position within 10 mm up or down and a size from 50% to 200%. The preview keeps the last valid position.':dirty?'Preview: '+shiftLabel(shift)+'. Changes not saved yet. Tap Save changes or Reset changes.':'This sample has no unsaved changes.');
  }
  if($('sample-size')){$('sample-size').oninput=changed;$('sample-size-reset').onclick=()=>{if(busy||!selected)return;$('sample-size').value='100';changed();};$('review-word').oninput=wordPreview;for(const id of ['review-zoom','review-colours','review-starts'])$(id).oninput=inspection;}
  $('sample-included').onchange=changed;$('sample-shift').oninput=changed;
  $('sample-shift').onkeydown=event=>{
    if(busy||!selected)return;
    const step=event.shiftKey?1:.1,moves={ArrowUp:step,ArrowRight:step,ArrowDown:-step,ArrowLeft:-step};
    if(!(event.key in moves))return;event.preventDefault();
    $('sample-shift').value=Math.max(-10,Math.min(10,Number((Number($('sample-shift').value)+moves[event.key]).toFixed(6))));changed();
  };
  $('sample-zero').onclick=()=>{if(busy||!selected)return;$('sample-shift').value='0';changed();};
  $('review-reset').onclick=()=>{showSample(selected);status('Unsaved changes reset.');};
  $('review-form').onsubmit=async event=>{
    event.preventDefault();if(busy || !dirty || $('review-save').disabled)return;
    busy=true;controls();status('Saving your review…');
    try{
      const result=await api('/api/letters/samples/'+selected.capture_id+'/'+encodeURIComponent(selected.letter)+'/review',
        {included:$('sample-included').checked,baseline_shift_mm:shiftValue(),...($('sample-size')?{scale_factor:sizeValue()}:{})});
      Object.assign(selected,{included:result.included,baseline_shift_mm:result.baseline_shift_mm,scale_factor:result.scale_factor??selected.scale_factor??1,svg:result.svg});
      const profile=profiles.find(p=>p.writer===$('review-writer').value);
      if(profile)profile.counts[selected.letter]=samples.filter(s=>s.included).length;
      coverage();drawList({samples},selected.capture_id);
      status('✓ Saved. This example is '+(selected.included?'included in':'excluded from')+' composition. Position: '+shiftLabel(selected.baseline_shift_mm)+'. Generate a new Compose preview to see the change.');
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
