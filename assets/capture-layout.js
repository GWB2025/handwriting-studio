'use strict';
(function(root){
 function init(doc,hooks){
  const $=id=>doc.getElementById(id),main=$('notebook'),writer=$('writer');
  let editing=!writer.value.trim(),focused=false;
  function focusMode(value){
   if(hooks.busy())return;
   focused=value;main.classList.toggle('writing-focused',focused);
   $('writing-focus').textContent=focused?'Show controls':'Writing focus';
   $('writing-focus').setAttribute('aria-pressed',String(focused));hooks.fit();
  }
  function sync(){
   const busy=hooks.busy();
   for(const id of ['capture-more','capture-guides','capture-help','writing-focus','backup-open','recovery-open'])if($(id))$(id).disabled=busy;
   for(const link of main.querySelectorAll('a'))link.setAttribute('aria-disabled',String(busy));
   $('writer-change').disabled=busy||writer.disabled;
   // A Pencil contact can dismiss the keyboard. Wait until its release to
   // collapse the name field, preserving the stroke's original coordinates.
   if(busy)return;
   if(!writer.value.trim())editing=true;
   $('writer-name').textContent=writer.value.trim();
   doc.querySelector('.writer-entry').hidden=!editing;
   $('writer-summary').hidden=editing;
   $('writer-done').disabled=writer.disabled||!writer.value.trim();
  }
  function editWriter(){if(hooks.busy()||writer.disabled)return;editing=true;focusMode(false);sync();}
  function writerFinished(){editing=false;sync();}
  $('writer-change').onclick=()=>{editWriter();hooks.requestWriter();};
  main.addEventListener('click',event=>{if(hooks.busy()&&event.target.closest('a')){event.preventDefault();event.stopImmediatePropagation();}},true);
  $('writing-focus').onclick=()=>{if(hooks.busy())return;hooks.finishWriter();focusMode(!focused);};
  for(const name of ['more','guides','help']){
   const button=$('capture-'+name),dialog=$('capture-'+name+'-dialog');
   button.onclick=()=>{if(hooks.busy())return;hooks.finishWriter();dialog.showModal();};
   $('capture-'+name+'-close').onclick=()=>dialog.close();
   // Native dialogs restore focus to their opener; a second focus event here
   // would replace the Control tips introduction when Help closes.
  }
  doc.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&focused&&!doc.querySelector('dialog[open]')&&!hooks.busy()){
    focusMode(false);$('writing-focus').focus({preventScroll:true});
   }
  });
  function drawLegend(guides,height){
   const canvas=$('paper'),gap=Math.max(0,(canvas.parentElement.getBoundingClientRect().width-parseFloat(canvas.style.width))/2);
   $('capture-guide-labels').style.height=height;
   $('capture-guide-labels').style.transform='translate('+gap+'px,-50%)';
   for(const [label,control,key] of [['tall','guide-tall','ascender'],['small','guide-small','x_height'],['baseline','guides','baseline'],['tail','guide-tail','descender']]){
    const node=$('label-'+label);node.hidden=!$(control).checked;node.style.top=(guides[key]/500*100)+'%';
   }
  }
  sync();hooks.fit();
  return {sync,editWriter,writerFinished,drawLegend};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={init};
 else root.StudioCaptureUI=init(root.document,{busy:()=>!!active||saving,fit:()=>settlePage(),requestWriter:()=>requestWriterKeyboard(),finishWriter:()=>finishWriter()});
})(typeof window!=='undefined'?window:globalThis);
