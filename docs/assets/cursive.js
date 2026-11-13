'use strict';
(()=>{
  const pairs=['th','he','in','er','an','re','on','at','en','nd','to','it','is','of','st','ng','ll','ou','oo','fi','tt','ch','sh','ee'];
  const $=id=>document.getElementById(id);
  let profiles=[],selectedPair='th',proofURL='',joinURL='';

  function metrics(sample){
    const m=window.StudioEngine?.connectionMetrics?.(sample);if(m)return {entry:m.entry,exit:m.exit,entryT:m.entry_tangent,exitT:m.exit_tangent,strokeCount:m.stroke_count};
    const strokes=sample?.processed_strokes||[],first=strokes.find(s=>s.points?.length)?.points,last=[...strokes].reverse().find(s=>s.points?.length)?.points;
    if(!first||!last)return null;
    const tangent=(a,b)=>({dx:b.x-a.x,dy:b.y-a.y,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI});
    return {entry:first[0],exit:last.at(-1),entryT:first.length>1?tangent(first[0],first[1]):{dx:0,dy:0,angle:0},exitT:last.length>1?tangent(last.at(-2),last.at(-1)):{dx:0,dy:0,angle:0},strokeCount:strokes.length};
  }
  function revoke(which){if(which==='proof'&&proofURL){URL.revokeObjectURL(proofURL);proofURL='';}if(which==='join'&&joinURL){URL.revokeObjectURL(joinURL);joinURL='';}}
  function imageFromSVG(img,svg,which){
    revoke(which);const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    if(which==='proof')proofURL=url;else joinURL=url;img.src=url;img.hidden=false;
  }
  // Match proof sheets: percentages enlarge the fitted page, never its SVG geometry.
  function previewZoom(){
    const zoom=Number($('cursive-zoom').value);
    $('proof-image').style.width='min('+zoom+'%, '+650*zoom/100+'px)';
    $('proof-view-status').textContent='Preview zoom: '+(zoom===100?'fit width (100%)':zoom+'%')+'.';
  }
  function resetProofScroll(){
    $('proof-viewport').scrollTop=0;$('proof-viewport').scrollLeft=0;
  }
  $('cursive-zoom').addEventListener('change',previewZoom);
  $('cursive-zoom-reset').onclick=()=>{$('cursive-zoom').value='100';previewZoom();resetProofScroll();};
  $('proof-image').addEventListener('load',resetProofScroll);
  function writer(){return $('cursive-writer').value;}
  function storageIsPreview(){
    const host=window.location?.hostname||'';
    return host.includes('raw.githack.com')||host.includes('rawgit')||host.includes('preview');
  }
  function storageSummary(){
    const samples=profiles.reduce((sum,profile)=>sum+Object.values(profile.total_counts||profile.counts||{}).reduce((a,b)=>a+(Number(b)||0),0),0);
    const where=storageIsPreview()?'Milestone 2 preview storage':'live Handwriting Studio storage';
    $('cursive-storage-status').textContent=profiles.length
      ? where+': '+profiles.length+' writer'+(profiles.length===1?'':'s')+' · '+samples+' saved sample'+(samples===1?'':'s')+'.'
      : where+' is empty. Import your latest Handwriting Studio backup to use captured handwriting here.';
  }
  function updateCaptureLink(){$('capture-cursive').href='index.html?kind=pairs&writer='+encodeURIComponent(writer());}

  async function loadWriters(){
    const response=await window.studioFetch('/api/letters/writers');if(!response.ok)throw Error('Could not read saved writers.');
    const data=await response.json();profiles=data.writers||[];
    const prior=writer();$('cursive-writer').replaceChildren();
    for(const profile of profiles){const o=document.createElement('option');o.value=profile.writer;o.textContent=profile.writer;$('cursive-writer').append(o);}
    if(profiles.some(p=>p.writer===prior))$('cursive-writer').value=prior;
    storageSummary();updateCaptureLink();renderCoverage();await loadPair(selectedPair);
  }
  function renderCoverage(){
    const profile=profiles.find(p=>p.writer===writer()),counts=profile?.counts||{};
    const lower=[...'abcdefghijklmnopqrstuvwxyz'],lowerCount=lower.filter(c=>(counts[c]||0)>0).length,pairCount=pairs.filter(p=>(counts[p]||0)>0).length;
    $('cursive-coverage').textContent=profile?'Lowercase coverage: '+lowerCount+'/26 · cursive joins: '+pairCount+'/'+pairs.length+'.':'No captured handwriting for this writer yet.';
    $('cursive-pairs').replaceChildren();
    for(const pair of pairs){
      const button=document.createElement('button');button.type='button';button.dataset.pair=pair;button.setAttribute('aria-pressed',String(pair===selectedPair));
      const n=counts[pair]||0;button.textContent=pair+' · '+n;button.title=n?pair+' has '+n+' included sample'+(n===1?'':'s'):pair+' has not been captured yet';
      button.onclick=()=>loadPair(pair);$('cursive-pairs').append(button);
    }
  }
  async function loadPair(pair){
    selectedPair=pair;for(const b of $('cursive-pairs').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.pair===pair));
    $('join-title').textContent='Join: '+pair;$('join-status').textContent='Loading…';$('join-metrics').textContent='';$('join-image').hidden=true;revoke('join');
    if(!writer()){$('join-status').textContent='Choose a writer.';return;}
    const response=await window.studioFetch('/api/letters/samples?writer='+encodeURIComponent(writer())+'&letter='+encodeURIComponent(pair));
    const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load join samples.');
    if(!data.samples?.length){$('join-status').textContent='No included '+pair+' sample yet. Use Capture cursive joins to add one.';return;}
    const sample=data.samples[0];$('join-status').textContent=data.samples.length+' saved sample'+(data.samples.length===1?'':'s')+' · showing newest.';
    imageFromSVG($('join-image'),sample.svg,'join');
    const m=metrics(sample.stroke_sample),engineMetric=window.StudioEngine?.connectionMetrics?.(sample.stroke_sample);
    $('join-metrics').textContent=m?'Entry ('+m.entry.x.toFixed(1)+', '+m.entry.y.toFixed(1)+') at '+m.entryT.angle.toFixed(1)+'° · Exit ('+m.exit.x.toFixed(1)+', '+m.exit.y.toFixed(1)+') at '+m.exitT.angle.toFixed(1)+'° · '+m.strokeCount+' stroke'+(m.strokeCount===1?'':'s')+(engineMetric?' · primary join stroke '+(engineMetric.join_stroke_index+1)+' of '+engineMetric.stroke_count+(engineMetric.auxiliary_stroke_count?' · '+engineMetric.auxiliary_stroke_count+' auxiliary stroke'+(engineMetric.auxiliary_stroke_count===1?'':'s'):''):'')+'.':'Entry/exit geometry is available after reloading the current browser build.';
  }
  async function generate(){
    if(!writer()){$('proof-status').textContent='Choose a writer first.';return;}
    $('proof-status').textContent='Generating cursive proof…';$('proof-image').hidden=true;revoke('proof');
    const response=await window.studioFetch('/api/compose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      writer:writer(),phrase:$('cursive-text').value,height:Number($('cursive-size').value),smooth:true,samples:'latest_three',source:'both',use_preferred:true,joined:$('cursive-use-pairs').checked,
      auto_join_preview:$('cursive-auto-join').checked,letter_spacing:1,word_spacing:1,line_spacing:1,page_layout:{}
    })});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Could not generate cursive proof.');
    const page=data.pages?.[0]||data;resetProofScroll();imageFromSVG($('proof-image'),page.svg,'proof');
    const used=page.used_samples||data.used_samples||[],joins=used.filter(s=>pairs.includes(s.letter)),generated=page.generated_joins||0,skipped=page.skipped_joins||0;
    $('proof-status').textContent='Ready · '+joins.length+' captured join'+(joins.length===1?'':'s')+' used'+($('cursive-auto-join').checked?' · '+generated+' generated connector'+(generated===1?'':'s')+(skipped?' · '+skipped+' unsafe connector'+(skipped===1?'':'s')+' skipped':''):'')+'. Generated connectors are preview-only for Milestone 2.';
  }
  async function refresh(){
    try{await loadWriters();$('proof-status').textContent='Ready to generate a proof.';}catch(error){$('cursive-coverage').textContent=error.message;$('join-status').textContent=error.message;}
  }
  $('cursive-writer').onchange=()=>{updateCaptureLink();renderCoverage();loadPair(selectedPair).catch(e=>$('join-status').textContent=e.message);};
  $('cursive-refresh').onclick=refresh;
  $('cursive-import-backup').onclick=()=>{
    $('cursive-backup-file').value='';
    $('cursive-backup-file').click();
  };
  $('cursive-backup-file').addEventListener('change',async()=>{
    const file=$('cursive-backup-file').files?.[0];if(!file)return;
    const button=$('cursive-import-backup');button.disabled=true;
    $('cursive-storage-status').textContent='Importing '+file.name+'…';
    try{
      if(file.size>100*1024*1024)throw Error('Backup exceeds 100 MB. Choose a smaller Handwriting Studio backup.');
      const backup=JSON.parse(await file.text());
      const added=await window.StudioStorage.importBackup(backup);
      await refresh();
      $('cursive-storage-status').textContent+=' Imported '+added+' new record'+(added===1?'':'s')+'.';
    }catch(error){
      $('cursive-storage-status').textContent='Nothing imported: '+(error.message||'Could not read this backup file.');
    }finally{button.disabled=false;$('cursive-backup-file').value='';}
  });
  $('cursive-generate').onclick=()=>generate().catch(error=>$('proof-status').textContent=error.message);
  window.addEventListener('studio-saved-change',()=>refresh());
  window.addEventListener('beforeunload',()=>{revoke('proof');revoke('join');});
  refresh();
})();