'use strict';
(function(root){
 function init(doc,win,content){
  const selector='button,input:not([type="hidden"]),select,textarea,a[href],canvas,[tabindex]:not([tabindex="-1"])';
  const entries=new Map(),hosts=new Map(),toggles=[];
  const pointers=new Set();
  let sequence=0,active=null,anchor=null,inspect=false,origin=null,showTimer,hideTimer;
  const panel=doc.createElement('div');panel.className='studio-tip-panel studio-tip-ui';panel.hidden=true;
  const message=doc.createElement('p');message.setAttribute('role','tooltip');
  const done=doc.createElement('button');done.type='button';done.textContent='Done with tips';done.title='Close this explanation and return to normal use.';done.hidden=true;
  panel.append(message,done);doc.body.append(panel);
  const own=node=>!!node?.closest?.('.studio-tip-ui');
  function controlFor(node){
   if(own(node))return null;
   return node?.closest?.(selector)||node?.closest?.('label')?.control||null;
  }
  function hostFor(control){
   const parent=control.closest('dialog')||doc.body;
   if(!hosts.has(parent)){const host=doc.createElement('div');host.className='studio-tip-descriptions studio-tip-ui';host.hidden=true;parent.append(host);hosts.set(parent,host);}
   return hosts.get(parent);
  }
  function decorate(control){
   if(own(control))return;
   const text=content.describe(control,doc);if(!text)return;
   let entry=entries.get(control);
   if(!entry){const node=doc.createElement('span');node.id='studio-control-tip-'+(++sequence);hostFor(control).append(node);entry={node,text:''};entries.set(control,entry);}
   if(entry.text!==text){entry.text=text;entry.node.textContent=text;}
   const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);
   if(!ids.includes(entry.node.id))control.setAttribute('aria-describedby',[...ids,entry.node.id].join(' '));
   return entry.text;
  }
  function scan(node){
   if(own(node))return;
   if(node.matches?.(selector))decorate(node);
   for(const control of node.querySelectorAll?.(selector)||[])decorate(control);
  }
  function hide(){win.clearTimeout(showTimer);win.clearTimeout(hideTimer);panel.hidden=true;active=null;anchor=null;}
  function position(){
   if(panel.hidden||!anchor)return;
   const viewport=win.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||win.innerWidth,height=viewport?.height||win.innerHeight;
   panel.style.maxWidth=Math.max(120,Math.min(360,width-24))+'px';panel.style.maxHeight=Math.max(80,height-24)+'px';
   const box=anchor.getBoundingClientRect(),tip=panel.getBoundingClientRect();
   const x=Math.max(left+12,Math.min(box.left,left+width-tip.width-12));
   const below=box.bottom+8,y=below+tip.height<=top+height-12?below:box.top-tip.height-8;
   panel.style.left=x+'px';panel.style.top=Math.max(top+12,Math.min(y,top+height-tip.height-12))+'px';
  }
  function show(control,override){
   win.clearTimeout(showTimer);win.clearTimeout(hideTimer);
   const text=override||decorate(control);if(!text)return;
   const parent=control.closest('dialog')||doc.body;if(panel.parentNode!==parent)parent.append(panel);
   active=override?null:control;anchor=control;
   if(message.textContent!==text)message.textContent=text;
   panel.hidden=false;done.hidden=!inspect;panel.classList.toggle('studio-tip-inspecting',inspect);position();
  }
  function setInspect(value,button){
   origin=button||origin;
   if(value&&pointers.size){show(origin,'Finish drawing or dragging, then turn on Control tips.');return;}
   inspect=value;
   for(const toggle of toggles)toggle.setAttribute('aria-pressed',String(inspect));
   message.setAttribute('role',inspect?'status':'tooltip');
   if(inspect){doc.activeElement?.blur?.();show(origin,'Control tips are on. Tap a control to read what it does without activating it. Tap Done with tips, Control tips, or press Escape to return to normal use.');}
   else{hide();origin?.focus({preventScroll:true});}
  }
  function addToggle(parent){
   const button=doc.createElement('button');button.type='button';button.className='studio-tip-toggle studio-tip-ui';button.textContent='Control tips';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Control tips: tap controls for explanations without activating them');button.title='Turn on tap-to-explain mode. Turn it off to use controls normally.';
   button.addEventListener('click',()=>setInspect(!inspect,button));parent.append(button);toggles.push(button);
  }
  addToggle(doc.querySelector('.storage-buttons')||doc.querySelector('header')||doc.body);
  for(const dialog of doc.querySelectorAll('dialog'))addToggle(dialog);
  done.addEventListener('click',()=>setInspect(false));scan(doc.body);
  const cancel=event=>{event.preventDefault();event.stopImmediatePropagation();};
  doc.addEventListener('pointerover',event=>{
   if(inspect||pointers.size||event.buttons||event.pointerType==='touch'||event.pointerType==='pen')return;
   const control=controlFor(event.target);if(!control||control.contains(event.relatedTarget))return;
   win.clearTimeout(hideTimer);win.clearTimeout(showTimer);showTimer=win.setTimeout(()=>show(control),450);
  },true);
  doc.addEventListener('pointerout',event=>{
   if(inspect)return;
   if(panel.contains(event.relatedTarget)||active?.contains(event.relatedTarget)||controlFor(event.target)?.contains(event.relatedTarget))return;
   if(controlFor(event.target)||panel.contains(event.target)){win.clearTimeout(showTimer);hideTimer=win.setTimeout(hide,200);}
  },true);
  panel.addEventListener('pointerenter',()=>win.clearTimeout(hideTimer));
  doc.addEventListener('focusin',event=>{const control=controlFor(event.target);if(control&&!pointers.size)show(control);},true);
  doc.addEventListener('focusout',event=>{if(!inspect&&!panel.contains(event.relatedTarget))hide();},true);
  doc.addEventListener('pointerdown',event=>{
   const control=controlFor(event.target);
   if(inspect&&control){cancel(event);show(control);return;}
   if(!inspect){pointers.add(event.pointerId);hide();}
  },true);
  doc.addEventListener('pointerup',event=>{pointers.delete(event.pointerId);if(inspect&&controlFor(event.target))cancel(event);},true);
  doc.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);},true);
  doc.addEventListener('click',event=>{const control=controlFor(event.target);if(inspect&&control){cancel(event);show(control);}},true);
  doc.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&(inspect||!panel.hidden)){cancel(event);if(inspect)setInspect(false);else hide();return;}
   if(!inspect&&!['Tab','Shift'].includes(event.key))hide();
   const control=controlFor(event.target);
   if(inspect&&control&&!['Tab','Shift'].includes(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){cancel(event);show(control);}
  },true);
  doc.addEventListener('contextmenu',event=>{const control=controlFor(event.target);if(inspect&&control){cancel(event);show(control);}},true);
  doc.addEventListener('input',event=>{if(!inspect&&controlFor(event.target))hide();},true);
  doc.addEventListener('scroll',()=>{if(inspect)position();else hide();},true);
  win.addEventListener('resize',position);win.visualViewport?.addEventListener('resize',position);win.visualViewport?.addEventListener('scroll',position);
  function suspend(){inspect=false;for(const toggle of toggles)toggle.setAttribute('aria-pressed','false');hide();pointers.clear();}
  win.addEventListener('blur',suspend);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)suspend();});
  const observer=new win.MutationObserver(records=>{
   for(const record of records){
    if(own(record.target))continue;
    const target=record.target.nodeType===3?record.target.parentElement:record.target,control=controlFor(target);
    if(control)decorate(control);
    if(record.type==='attributes'&&target.matches?.('fieldset'))scan(target);
    for(const node of record.addedNodes||[])if(node.nodeType===1)scan(node);
   }
   for(const [control,entry] of entries)if(!control.isConnected){
    const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==entry.node.id);
    if(ids.length)control.setAttribute('aria-describedby',ids.join(' '));else control.removeAttribute('aria-describedby');
    entry.node.remove();entries.delete(control);
   }
   if(active){if(!active.isConnected||active.closest('[hidden]'))hide();else if(!panel.hidden)show(active);}
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled','aria-expanded','href','open']});
  return {describe:control=>decorate(control),panel,message,toggles};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={init};else init(root.document,root,root.StudioTipContent);
})(typeof window!=='undefined'?window:globalThis);
