'use strict';
(function(root){
 // Deliberately limited to decisions that benefit from an explanation.
 const important=new Set(('symbol-zoom symbol-generate writer writer-new capture-kind more-sheets save guide-symbols guide-tail smooth single-writer single-letter single-pool single-count single-find single-reopen single-zoom single-centre single-save single-prefer sample-size sample-shift sample-included stroke-target stroke-reverse stroke-original review-writer review-kind review-letter review-zoom review-starts review-word review-save review-reset alphabet-writer alphabet-kind alphabet-compare alphabet-proof alphabet-zoom alphabet-clear spacing-before spacing-after spacing-save proof-writer proof-mode proof-kind proof-size proof-source proof-smooth proof-example proof-compare-size proof-compare-text proof-natural proof-zoom proof-svg proof-gcode compose-writer compose-size compose-source compose-samples compose-preferred compose-joined compose-connect compose-natural compose-order compose-letter-spacing compose-word-spacing compose-line-spacing compose-compare compose-compare-zoom compose-gcode composition-save backup-download backup-import recovery-restore saved-pages library-writer open-page replace-page export guides calibration-stage download-gcode download-svg font-choice font-files font-size font-phrase font-page font-svg font-gcode plot-open-local plot-file plot-port plot-connect plot-home plot-ready plot-start plot-pause plot-continue plot-cancel plot-travel').split(' '));
 function init(doc,win,content){
  const selector='button,input:not([type="hidden"]),select,textarea,a[href],canvas,summary,[tabindex]:not([tabindex="-1"])';
  const entries=new Map();let active=null;
  const panel=doc.createElement('div');panel.className='studio-tip-panel studio-tip-ui';panel.id='studio-help-explanation';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Control help');
  const message=doc.createElement('p'),close=doc.createElement('button');close.type='button';close.textContent='Close help';panel.append(message,close);doc.body.append(panel);
  const own=node=>!!node?.closest?.('.studio-tip-ui');
  function hide(restore=false){const previous=active;active=null;panel.hidden=true;previous?.button.setAttribute('aria-expanded','false');if(restore&&previous?.button.isConnected)previous.button.focus({preventScroll:true});}
  function position(){
   if(!active||panel.hidden)return;
   const viewport=win.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||win.innerWidth,height=viewport?.height||win.innerHeight;
   panel.style.maxWidth=Math.max(120,Math.min(360,width-24))+'px';panel.style.maxHeight=Math.max(80,height-24)+'px';
   const box=active.button.getBoundingClientRect(),tip=panel.getBoundingClientRect();
   panel.style.left=Math.max(left+12,Math.min(box.left,left+width-tip.width-12))+'px';
   const below=box.bottom+8,y=below+tip.height<=top+height-12?below:box.top-tip.height-8;
   panel.style.top=Math.max(top+12,Math.min(y,top+height-tip.height-12))+'px';
  }
  function label(control){const copy=control.labels?.[0]?.cloneNode(true);for(const node of copy?.querySelectorAll('button,input,select,textarea')||[])node.remove();return control.getAttribute('aria-label')||copy?.textContent.trim()||control.textContent?.trim()||control.id.replace(/-/g,' ');}
  function decorate(control){
   if(own(control))return;
   const text=content.describe(control,doc);if(!text)return;
   // Native title tooltips should not appear either.
   control.removeAttribute('title');
   if(!important.has(control.id)&&!control.matches('#single-sources select,#alphabet-samples button'))return text;
   let entry=entries.get(control);
   if(!entry){
    const button=doc.createElement('button');button.type='button';button.className='studio-help-marker studio-tip-ui';button.textContent='?';button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
    entry={control,button,text};entries.set(control,entry);
    button.addEventListener('click',event=>{
     event.preventDefault();event.stopPropagation();
     if(active===entry){hide(true);return;}
     hide();entry.text=content.describe(control,doc);message.textContent=entry.text;
     const host=control.closest('dialog')||doc.body;host.append(panel);
     active=entry;button.setAttribute('aria-expanded','true');panel.hidden=false;position();close.focus({preventScroll:true});
    });
    const enclosing=control.closest('label');
    if(control.labels?.length&&!control.hasAttribute('aria-label'))control.setAttribute('aria-label',label(control));
    if(enclosing){if(control.matches('select,textarea,input:not([type="checkbox"]):not([type="radio"])'))control.before(button);else enclosing.append(button);}
    else {const matching=control.labels?.[0];if(matching)matching.append(button);else control.after(button);}
   }
   entry.text=text;entry.button.setAttribute('aria-label','Help: '+label(control));
   return text;
  }
  function scan(node){if(own(node))return;if(node.matches?.(selector))decorate(node);for(const control of node.querySelectorAll?.(selector)||[])decorate(control);}
  close.addEventListener('click',()=>hide(true));
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();event.stopPropagation();hide(true);}},true);
  doc.addEventListener('pointerdown',event=>{if(active&&!panel.contains(event.target)&&!active.button.contains(event.target))hide();},true);
  doc.addEventListener('focusin',event=>{if(active&&!panel.contains(event.target)&&event.target!==active.button)hide();});
  doc.addEventListener('scroll',position,true);win.addEventListener('resize',position);win.visualViewport?.addEventListener('resize',position);win.visualViewport?.addEventListener('scroll',position);
  scan(doc.body);
  const observer=new win.MutationObserver(records=>{
   for(const record of records){if(own(record.target))continue;const target=record.target.nodeType===3?record.target.parentElement:record.target;if(target)scan(target);}
   for(const [control,entry] of entries){if(!control.isConnected){if(active===entry)hide();entry.button.remove();entries.delete(control);}else if(active===entry){if(control.closest('[hidden]')||control.closest('dialog:not([open])'))hide();else{const text=content.describe(control,doc);if(message.textContent!==text)message.textContent=text;position();}}}
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled','hidden','open']});
  return {describe:decorate,panel,message,entries};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={init};else init(root.document,root,root.StudioTipContent);
})(typeof window!=='undefined'?window:globalThis);
