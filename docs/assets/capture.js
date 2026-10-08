'use strict';
// The notebook's Pencil handling, viewport fitting and undo/redo are shared.
// This layer supplies guides and explicit labels, not handwriting recognition.
(()=>{
  const plan=window.capturePlan,orders=plan.orders,setSize=plan.sheets_per_set;
  let phase='practice',sheet=0,profiles=[],lastBody='',lastID='';
  const order=()=>orders[sheet];
  const composeURL=()=>'compose.html?writer='+encodeURIComponent($('writer').value.trim());
  function updateCounts(){
    const writer=$('writer').value.trim(),profile=profiles.find(p=>p.writer===writer);
    const counts=profile?.total_counts || profile?.counts;
    $('sample-counts').textContent=profile?'Captured '+Object.values(counts).filter(n=>n>0).length+' of 26 letters · '+Object.values(counts).reduce((a,b)=>a+b,0)+' samples saved':'No letter samples saved for this name yet';
    $('compose-link').href=composeURL();
    $('review-link').href='review.html?writer='+encodeURIComponent(writer);
  }
  async function loadCounts(){
    try{
      const r=await window.studioFetch('/api/letters/writers');if(!r.ok)throw Error();
      const data=await r.json();profiles=data.writers;
      $('known-writers').replaceChildren();
      for(const profile of profiles){const option=document.createElement('option');option.value=profile.writer;$('known-writers').append(option);}
      updateCounts();
      if(data.unavailable_count)$('sample-counts').textContent+=' · Some saved files could not be read.';
    }catch{$('sample-counts').textContent='Saved counts unavailable. Browser storage could not be read. Try reopening this page in a regular browser window.';}
  }
  function updateControls(){
    const complete=phase==='complete';
    $('writer').disabled=saving || !!active || phase!=='practice';
    $('writer-done').disabled=$('writer').disabled || !$('writer').value.trim() || $('writer').value.trim()===finishedWriter;
    $('save').textContent=saving?'Saving…':complete?'Compose handwriting':phase==='practice'?'Start capture':'Save sheet '+(sheet%setSize+1)+' of '+setSize;
    // In practice an empty name should produce a useful prompt on tap, rather
    // than leaving Start capture silently disabled after practice writing.
    $('save').disabled=saving || !!active || (phase!=='practice'&&!$('writer').value.trim()) || (phase==='capture'&&!strokes.length);
    $('save').classList.toggle('saved',false);
    $('clear').disabled=saving || complete;
    $('undo').disabled=saving || complete || (!active&&!strokes.length);
    $('redo').disabled=saving || complete || !!active || !undone.length;
    $('export').disabled=saving || !!active || !strokes.length;
    $('more-sheets').hidden=!complete;
    $('smooth').disabled=saving;
    $('capture-step').textContent=complete?'Alphabet set complete':phase==='practice'?'Practice · not saved':'Capture · set '+(Math.floor(sheet/setSize)+1)+' · sheet '+(sheet%setSize+1)+' of '+setSize;
    // A completed set remains visible but is no longer an editable draft.
    canvas.style.pointerEvents=complete?'none':'auto';
  }
  function drawGuides(context){
    context.save();
    const labelScale=1000/Math.max(1,canvas.getBoundingClientRect().width);
    const width=1000/order().length;
    for(let i=0;i<order().length;i++){
      const x=i*width,letter=order()[i],tall=plan.tall_letters.includes(letter),tail=plan.descenders.includes(letter);
      context.fillStyle='#203832';context.font='bold '+(26*labelScale)+'px -apple-system, sans-serif';context.fillText(letter,x+18,45);
      if($('guide-shading').checked){
        const top=tall?plan.guides.ascender:plan.guides.x_height,bottom=tail?plan.guides.descender:plan.guides.baseline;
        context.fillStyle='#e9f0e94d';context.fillRect(x+8,top,width-16,bottom-top);
      }
      context.font=(12*labelScale)+'px -apple-system, sans-serif';context.fillStyle='#62776c';
      for(const [id,y,label] of [['guide-tall',plan.guides.ascender,'tall letters'],['guide-small',plan.guides.x_height,'small letters'],['guides',plan.guides.baseline,'baseline'],['guide-tail',plan.guides.descender,'tails below']]){
        if(!$(id).checked)continue;
        context.strokeStyle=y===330?'#93ad9b':'#d1dcd1';context.lineWidth=y===330?1.4:.8;
        context.setLineDash(y===330?[]:[5,5]);context.beginPath();context.moveTo(x+8,y);context.lineTo(x+width-8,y);context.stroke();
        context.fillText(label,x+10,y-7);
      }
      context.setLineDash([]);context.strokeStyle='#b9cbbd';context.lineWidth=1;
      if(i){context.beginPath();context.moveTo(x,0);context.lineTo(x,500);context.stroke();}
    }
    context.restore();
  }
  function blankSheet(){
    release();strokes=[];undone=[];origin=null;dirty=false;saved=false;
    canvas.setAttribute('aria-label','Write one '+order().split('').join(', ')+' in the corresponding labelled boxes');
    redraw();updateSave();
  }
  function start(){
    if(saving || active)return;
    if(!$('writer').value.trim()){
      $('writer').setAttribute('aria-invalid','true');
      message('Enter a writer name at the top, then tap Start capture. Your practice strokes will stay here until you start.');
      requestWriterKeyboard();return;
    }
    $('writer').removeAttribute('aria-invalid');
    const profile=profiles.find(p=>p.writer===$('writer').value.trim());
    sheet=phase==='complete'?(sheet+1)%orders.length:(profile?.next_order_index || 0);
    finishWriter();phase='capture';blankSheet();
    try{localStorage.setItem('handwriting-writer',$('writer').value.trim());}catch{}
    instructions();
    message('Sheet '+(sheet%setSize+1)+' of '+setSize+' · Write '+order().split('').join(', ')+'. Saved sheets stay in this browser if you stop here.');
  }
  function instructions(){
    const tails=[...order()].filter(letter=>plan.descenders.includes(letter));
    $('capture-instruction').textContent='Write one '+order().split('').join(', ')+' in the labelled boxes. '+(tails.length?'For '+tails.join(', ')+', place the body on the baseline and any tail below it.':'Use your usual letter proportions; tall letters reach above the small-letter line.');
  }
  function requestID(){
    // getRandomValues works on local HTTP in iPad Safari; randomUUID may not.
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  async function saveSheet(){
    if(saving || active)return;
    if(phase==='practice'){start();return;}
    if(phase==='complete'){window.location.href=composeURL();return;}
    if(!strokes.length)return;
    finishWriter();
    const body=JSON.stringify({writer:$('writer').value.trim(),strokes,smooth:$('smooth').checked,order_index:sheet,plan_id:plan.id});
    if(body!==lastBody){lastBody=body;lastID=requestID();}
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    saving=true;message('Saving sheet '+(sheet%setSize+1)+' in this browser…');
    try{
      const r=await window.studioFetch('/api/letters/pages',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({...JSON.parse(body),request_id:lastID})});
      const data=await r.json();if(!r.ok)throw Error(data.error || 'Save failed.');
      dirty=false;saved=true;const justSaved=sheet%setSize+1;
      if(justSaved<setSize){sheet++;blankSheet();instructions();}
      else{phase='complete';$('capture-instruction').textContent='This alphabet set is saved. Review your samples, compose a phrase, or capture another set for more variation.';}
      message('✓ Sheet '+justSaved+' saved in this browser at '+new Date(data.saved_at).toLocaleTimeString()+'. '+
        (phase==='complete'?'Tap Review samples to check individual letters, or Compose handwriting.':'Now write '+order().split('').join(', ')+' on sheet '+(sheet%setSize+1)+'.'));
      await loadCounts();
    }catch(error){
      message(error.name==='AbortError'?'Browser storage took too long to confirm. Your writing is still here. Tap Save to retry safely.':
        'Not saved: '+error.message+' Your writing is still here.');
    }finally{clearTimeout(timeout);saving=false;updateSave();redraw();}
  }
  window.notebookMode={updateControls,drawGuides};
  $('save').onclick=saveSheet;
  $('more-sheets').onclick=start;
  $('clear').onclick=()=>{if(saving || phase==='complete')return;blankSheet();message(phase==='practice'?'Practice cleared. Nothing was saved.':'Current sheet cleared. Previously saved letter samples are kept.');};
  function writerChanged(){
    if($('writer').value.trim())$('writer').removeAttribute('aria-invalid');
    updateCounts();updateSave();
  }
  $('writer').addEventListener('input',writerChanged);
  $('writer').addEventListener('change',writerChanged);
  $('smooth').onchange=()=>{if(phase!=='complete')dirty=true;updateSave();redraw();};
  for(const id of ['guides','guide-small','guide-tall','guide-tail','guide-shading'])$(id).onchange=redraw;
  try{if(!$('writer').value)$('writer').value=localStorage.getItem('handwriting-writer')||'';}catch{}
  loadCounts();updateSave();redraw();
})();
