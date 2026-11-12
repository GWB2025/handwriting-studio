'use strict';
(async()=>{
 const E=window.StudioEngine,$=id=>document.getElementById(id),query=new URLSearchParams(window.location.search),examples=window.StudioProofTexts.examples;
 let serial=0,timer=null,svg='',url='',automatic=true,pages=[],pageIndex=0,prefix='',previewState='updating';
 let naturalSeed=crypto.randomUUID();
 if(['comparison','passage'].includes(query.get('mode')))$('proof-mode').value=query.get('mode');
 const paper=()=>({size:$('proof-paper').value,orientation:$('proof-orientation').value}),paperLabel=()=>({a3:'A3',a4:'A4',a5:'A5',letter:'US Letter',legal:'US Legal'}[$('proof-paper').value]),plotterReady=()=>$('proof-paper').value==='a4'&&$('proof-orientation').value==='portrait';
 const comparison=()=>$('proof-mode').value==='comparison',passage=()=>$('proof-mode').value==='passage';
 function viewStatus(){
  const amount={off:'Off',subtle:'Subtle',pronounced:'More pronounced'}[$('proof-natural').value];
  $('proof-view-status').textContent=(comparison()?'Compare versions · natural variation is not applied.':'Natural variation: '+amount+(amount==='Off'?' · choose Subtle or More pronounced to enable it.':'.'))+(!comparison()?($('proof-connect').checked?' Smooth cursive joins: On.':' Smooth cursive joins: Off.'):'')+' Preview zoom: '+($('proof-zoom').value==='100'?'fit page width':$('proof-zoom').value+'%')+'.'+(previewState==='updating'?' Updating handwriting…':previewState==='error'?' Preview unavailable; see the message above.':'');
 }
 function modeControls(){
  const compare=comparison();$('proof-connect').disabled=compare;$('proof-fit').disabled=compare;$('proof-kind').disabled=compare||passage();for(const id of ['proof-source','proof-size'])$(id).disabled=compare;$('proof-writing-size').hidden=compare;$('proof-compare-size').disabled=!compare;
  $('proof-natural-controls').hidden=compare;$('proof-natural').disabled=compare;$('proof-natural-new').disabled=compare||$('proof-natural').value==='off';
  $('proof-alphabet-text').hidden=compare;$('proof-comparison-text').hidden=!compare;
  $('proof-text-label').textContent=passage()?'Passage to preview':'Test sentences · optional';$('proof-sentence').rows=passage()?8:4;
  $('proof-sentence').placeholder=passage()?'Choose a passage or paste your own text':'Leave blank for characters only';
  viewStatus();
 }
 const groups=new Map();
 for(const example of examples){
  if(!groups.has(example.group)){const group=document.createElement('optgroup');group.label=example.group;groups.set(example.group,group);$('proof-example').append(group);}
  const option=document.createElement('option');option.value=example.id;option.textContent=example.label;groups.get(example.group).append(option);
 }
 function exampleNote(){const example=examples.find(e=>e.id===$('proof-example').value);$('proof-example-note').textContent=example?.note||'Choose a pangram or passage, or write your own text below.';$('proof-text-credit').hidden=!example?.sonnet;}
 modeControls();
 if(E.plans[query.get('kind')])$('proof-kind').value=query.get('kind');
 function disable(){svg='';pages=[];pageIndex=0;$('proof-svg').disabled=true;$('proof-gcode').disabled=true;$('proof-previous').disabled=true;$('proof-next').disabled=true;$('proof-page-number').textContent='No preview';}
 function showPage(){
  if(!pages.length)return;
  svg=pages[pageIndex].svg;const next=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),old=url;url=next;$('proof-image').src=next;$('proof-image').hidden=false;
  $('proof-image').alt=paperLabel()+' handwriting proof sheet · page '+(pageIndex+1)+' of '+pages.length;if(old)URL.revokeObjectURL(old);
  $('proof-previous').disabled=pageIndex===0;$('proof-next').disabled=pageIndex===pages.length-1;$('proof-page-number').textContent='Page '+(pageIndex+1)+' of '+pages.length;
  $('proof-svg').disabled=false;$('proof-gcode').disabled=!plotterReady();$('proof-svg').textContent=pages.length>1?'Download this page SVG':'Download '+paperLabel()+' SVG';$('proof-gcode').textContent=pages.length>1?'Download this page G-code':'Download plotter G-code';
  previewState='ready';viewStatus();
 }
 async function preview(fit=false){
  clearTimeout(timer);timer=null;const ticket=++serial,previousPage=pageIndex;disable();previewState='updating';viewStatus();$('proof-status').textContent='Updating proof sheet…';$('proof-missing').textContent='';
  try{const files=await window.StudioStorage.snapshot();if(ticket!==serial)return;
   const cat=E.catalog(files),writer=$('proof-writer').value||query.get('writer');$('proof-writer').replaceChildren();
   for(const profile of cat.writers){const option=document.createElement('option');option.value=profile.writer;option.textContent=profile.writer;$('proof-writer').append(option);}
   if(cat.writers.some(p=>p.writer===writer))$('proof-writer').value=writer;
   let result;const selected=$('proof-writer').value;
   if(comparison()){
    result=window.StudioComparison.comparisonProof(files,{writer:selected,text:$('proof-compare-text').value,heights:$('proof-compare-size').value==='classic'?[3,5,8]:[Number($('proof-compare-size').value)],smooth:$('proof-smooth').checked,paper:paper()});
    $('proof-missing').textContent=result.missing.length?'Missing versions: '+result.missing.map(m=>m.column.toLowerCase()+' '+m.letter).join(' · ')+'. Crossed boxes mark these characters.':'Every comparison has the required versions.';
   }else{
    const source=$('proof-source').value,kind=$('proof-kind').value,counts=E.countsFor(cat.writers.find(p=>p.writer===selected),source),tokens=E.tokens(E.plans[kind].alphabet),ready=tokens.filter(c=>counts[c]>0),missing=tokens.filter(c=>!counts[c]);
    if(!passage())$('proof-missing').textContent=missing.length?'Missing included samples: '+missing.join(' ')+'. These are omitted from the character row.':'All characters in this group have an included sample.';
    if(automatic)$('proof-sentence').value=kind==='lowercase'&&ready.length===26?examples[0].text:ready.slice(0,8).join(' ');
    result=(fit?E.fitProofSheet:E.proofSheet)(files,{writer:selected,kind,source,height:Number($('proof-size').value),smooth:$('proof-smooth').checked,sentence:$('proof-sentence').value,text_only:passage(),auto_join_preview:$('proof-connect').checked,natural_variation:{level:$('proof-natural').value,seed:naturalSeed},paper:paper()});
    if(fit){let option=Array.from($('proof-size').children).find(o=>Number(o.value)===result.fitted_height);if(!option){option=document.createElement('option');option.value=String(result.fitted_height);option.textContent=result.fitted_height+' mm · fitted';$('proof-size').append(option);}$('proof-size').value=String(result.fitted_height);}
   }
   pages=result.pages||[{svg:result.svg}];pageIndex=Math.min(previousPage,pages.length-1);prefix=(comparison()?'comparison-proof-':passage()?'text-proof-':'alphabet-proof-')+$('proof-paper').value+($('proof-orientation').value==='landscape'?'-landscape':'');showPage();
   $('proof-status').textContent=(comparison()?'Ready · comparison at '+(result.heights.length===3?'3, 5 and 8':result.heights[0])+' mm':'Ready · '+(passage()?'text passage':result.characters.length+' characters in the group')+' · '+$('proof-size').value+' mm writing')+' · '+selected+' · '+pages.length+(pages.length===1?' page.':' pages.')+' '+paperLabel()+' '+$('proof-orientation').value+'. '+(fit?'Fitted to one page. ':'')+'Downloads match the displayed page.';
  }catch(error){if(ticket!==serial)return;disable();$('proof-image').hidden=true;previewState='error';viewStatus();$('proof-status').textContent=error.message;}
 }
 function update(){serial++;disable();previewState='updating';viewStatus();clearTimeout(timer);$('proof-status').textContent='Updating proof sheet…';timer=setTimeout(preview,200);}
 $('proof-zoom').addEventListener('change',()=>{const zoom=Number($('proof-zoom').value);$('proof-image').style.width='min('+zoom+'%, '+650*zoom/100+'px)';viewStatus();});
 for(const id of ['proof-paper','proof-orientation','proof-writer','proof-kind','proof-source','proof-size','proof-compare-size','proof-smooth'])$(id).addEventListener('change',update);
 $('proof-natural').addEventListener('change',()=>{if($('proof-natural').value!=='off')$('proof-connect').checked=false;modeControls();update();});
 $('proof-connect').addEventListener('change',()=>{if($('proof-connect').checked)$('proof-natural').value='off';modeControls();update();});
 $('proof-natural-new').onclick=()=>{if($('proof-natural-new').disabled)return;naturalSeed=crypto.randomUUID();update();};
 $('proof-mode').addEventListener('change',()=>{modeControls();update();});$('proof-compare-text').addEventListener('input',update);
 $('proof-example').addEventListener('change',()=>{
  const example=examples.find(e=>e.id===$('proof-example').value);automatic=$('proof-example').value==='automatic';
  if(example){$('proof-sentence').value=example.text;if(example.passage)$('proof-mode').value='passage';}
  exampleNote();modeControls();update();
 });
 function textEdited(){automatic=false;$('proof-example').value='custom';exampleNote();update();}
 function insertTab(){const box=$('proof-sentence');if(box.value.length-(box.selectionEnd-box.selectionStart)>=10000)return;box.setRangeText('\t',box.selectionStart,box.selectionEnd,'end');box.focus();textEdited();}
 $('proof-tab').onclick=insertTab;
 $('proof-sentence').addEventListener('keydown',event=>{if(event.key==='Tab'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();insertTab();}});
 $('proof-sentence').addEventListener('input',textEdited);$('proof-refresh').onclick=()=>preview();$('proof-fit').onclick=()=>preview(true);
 $('proof-previous').onclick=()=>{if(pageIndex>0){pageIndex--;showPage();}};$('proof-next').onclick=()=>{if(pageIndex+1<pages.length){pageIndex++;showPage();}};
 function download(gcode){if(!svg||(gcode&&!plotterReady()))return;try{const data=gcode?window.StudioPlotter.fromSVG(svg):svg,href=URL.createObjectURL(new Blob([data],{type:gcode?'text/plain':'image/svg+xml'})),a=document.createElement('a');a.href=href;a.download=prefix+(pages.length>1?'-page-'+(pageIndex+1):'')+'.'+(gcode?'gcode':'svg');a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(href);},1000);$('proof-status').textContent='Download requested. Look for '+a.download+' in Downloads.';}catch(error){$('proof-status').textContent=error.message;}}
 $('proof-svg').onclick=()=>download(false);$('proof-gcode').onclick=()=>download(true);
 window.addEventListener('pageshow',event=>{if(event.persisted)preview();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)preview();});await preview();
})();
