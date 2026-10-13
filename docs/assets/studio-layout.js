'use strict';
// Move the existing controls once on page load. Their IDs, form
// ownership and event handlers are retained; live previews never rebuild layout.
(function(root){
 function init(doc){
  const page=doc.body.dataset.studioPage;
  if(!page||doc.body.classList.contains('studio-page'))return;
  const $=id=>doc.getElementById(id),q=(selector,parent=doc)=>parent.querySelector(selector);
  const make=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  const move=(parent,...nodes)=>nodes.flat().filter(Boolean).forEach(node=>parent.append(node));
  const shell=q('[class$="-shell"]'),header=q('header',shell),title=q('h1',header);
  if(!shell||!header||!title)return;
  doc.body.classList.add('studio-page','studio-'+page);shell.classList.add('studio-shell');
  const bar=make('div','studio-topbar'),nav=make('nav','studio-navigation'),account=make('div','studio-account');
  nav.setAttribute('aria-label','Studio');
  const heading=make('div','studio-heading');move(heading,title);
  const oldLinks=Array.from(header.querySelectorAll('a'));
  const base=page==='plotting'?'https://gwb2025.github.io/handwriting-studio/':'';
  function link(file,label){
   const el=oldLinks.find(a=>a.getAttribute('href')?.split(/[?#]/)[0].endsWith(file))||make('a','button');
   el.href=el.getAttribute('href')||base+file;el.textContent=label;el.classList.add('button');
   if(file===page+'.html')el.setAttribute('aria-current','page');return el;
  }
  function panel(name,label){
   const button=make('button','',label);button.type='button';button.id='studio-'+name;
   const dialog=make('dialog','studio-dialog');dialog.id=button.id+'-dialog';
   button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);
   const top=make('div','studio-panel-heading'),h=make('h2','',label==='More'?'More from Studio':title.textContent+' help');h.id=button.id+'-title';
   dialog.setAttribute('aria-labelledby',h.id);
   const close=make('button','','Close');close.type='button';close.id=button.id+'-close';close.onclick=()=>dialog.close();
   move(top,h,close);dialog.append(top);doc.body.append(dialog);button.onclick=()=>dialog.showModal();
   return {button,dialog};
  }
  const more=panel('more','More'),help=panel('help','Help');
  for(const [file,label] of [['index.html','Capture'],['alphabet.html','My alphabet'],['blending.html','Blend'],['compose.html','Compose']])nav.append(link(file,label));
  nav.append(more.button);
  const extra=make('nav','studio-panel-links');extra.setAttribute('aria-label','More Studio pages');
  for(const [file,label] of [['review.html','Review samples'],['proof.html','Proof sheets'],['notebook.html','Free writing'],['calibration.html','Calibration'],['plotting.html','Plotter']])extra.append(link(file,label));
  more.dialog.append(extra);
  const helpLinks=make('div','studio-help-links'),tips=make('div');tips.id='studio-tips';
  const guide=make('a','button','Help guide');guide.href=base+'help.html#'+(page==='help'?'start':page);guide.target='_blank';guide.rel='noopener';
  move(helpLinks,tips,guide);help.dialog.append(helpLinks);
  const banner=q('.browser-storage'),backup=$('backup-open');
  if(backup){account.append(backup);$('backup-title').after(q('.storage-info',banner));move(more.dialog,$('recovery-open'),$('draft-status'));banner.remove();}
  move(bar,nav,account);move(heading,help.button);header.replaceChildren(bar,heading);

  function details(label,nodes,open=false){
   nodes=nodes.flat().filter(Boolean);if(!nodes.length)return null;
   const el=make('details','studio-options'),summary=make('summary','',label);el.open=open;
   nodes[0].before(el);el.append(summary);move(el,...nodes);return el;
  }
  function helpText(parent){
   for(const child of Array.from(parent.children))if(child.tagName==='P'&&!child.id&&!child.querySelector('button,input,select,textarea,output'))help.dialog.append(child);
  }
  function primary(node){if(node)node.classList.add('studio-primary-actions');return node;}
  function workspace(before){
   const grid=make('div','studio-workspace'),editor=make('section','studio-editor'),preview=make('section','studio-preview');
   editor.setAttribute('aria-label','Choices and settings');preview.setAttribute('aria-label','Handwriting workspace');
   before.before(grid);move(grid,editor,preview);return {grid,editor,preview};
  }
  function focus(target,hide=[]){
   const button=make('button','','Preview focus');button.id='studio-focus';button.type='button';button.setAttribute('aria-pressed','false');
   heading.append(button);hide.filter(Boolean).forEach(el=>el.classList.add('studio-focus-hide'));
   function toggle(value){
    // Do not resize a live blend gesture under the user's finger or Pencil.
    if(q('[data-dragging="true"]'))return;
    doc.body.classList.toggle('studio-focused',value);button.textContent=value?'Show controls':'Preview focus';button.setAttribute('aria-pressed',String(value));
    heading.scrollIntoView?.({block:'start'});
   }
   button.onclick=()=>toggle(!doc.body.classList.contains('studio-focused'));
   doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&doc.body.classList.contains('studio-focused')&&!q('dialog[open]')){toggle(false);button.focus({preventScroll:true});}});
   target?.classList.add('studio-focus-target');
  }
  helpText(shell);
  helpText(doc.body);
  if(page==='review'){
   const alphabet=details('Choose from the alphabet',[$('review-alphabet'),$('review-coverage')]);
   details('Display options',[q('.inspection-controls')]);
   details('Stroke corrections',[$('review-strokes')]);
   const form=$('review-form');
   // Bring live sizing beside the preview before occasional stroke corrections.
   const sizing=$('sample-size').closest('fieldset');form.prepend(sizing);
   helpText(sizing);helpText(form);
   move(help.dialog,$('sample-shift-help'));
   primary($('review-save').parentElement);
   focus($('sample-detail'),[q('.compose-settings'),alphabet,$('sample-list')]);
  }else if(page==='blending'){
   const {editor,preview}=workspace($('single-controls'));
   move(editor,$('single-controls'));move(more.dialog,$('single-refresh'));
   move(preview,$('blend-status'));
   const display=details('Display options',[q('.preview-controls')]);move(preview,display);
   move(help.dialog,$('single-drag-help'));
   preview.append(make('p','studio-cue','Drag the green-bordered character towards a source to change the blend.'));
   move(preview,q('.blend-preview-area'));
   const actions=make('div','studio-primary-actions');move(actions,$('single-save'),$('single-centre'));preview.append(actions);
   const position=$('single-position').parentElement;move(preview,position,$('single-saved'));
   move(editor,details('Saved versions',[q('.saved-blend-tools')]));
   focus(preview,[editor]);
  }else if(page==='alphabet'){
   move(more.dialog,$('alphabet-refresh'));
   const controls=q('.alphabet-controls'),proofTools=make('div','studio-inline-actions');move(proofTools,$('alphabet-proof'),$('alphabet-compare'));controls.after(proofTools);
   help.dialog.append($('alphabet-stroke-key'));
   details('Adjust character spacing',[$('character-spacing')]);
   focus($('alphabet-previews'),[controls,proofTools]);
  }else if(page==='compose'){
   const form=$('compose-form'),{editor,preview}=workspace(form);
   move(editor,details('Saved compositions',[q('.saved-compositions')]),form);
   const phrase=$('phrase'),phraseLabel=q('label[for="phrase"]');
   // Keep writing and live adjustments in the form; only its main action row
   // moves to the preview, with explicit ownership for native validation.
   form.prepend(phraseLabel,phrase);phrase.rows=5;
   helpText(form);
   const basic=q('.compose-settings',form);basic.classList.add('studio-basic-settings');
   details('Writing samples',[q('.sample-settings'),$('compose-source').closest('.compose-settings'),$('compose-preferred')?.closest('.compose-settings'),$('compose-joined').closest('label'),$('compose-joined-help')].filter((n,i,a)=>a.indexOf(n)===i));
   for(const [id,label] of [['compose-natural','Natural variation'],['compose-order','Sample order'],['compose-letter-spacing','Spacing'],['compose-margin-top','Page layout']])details(label,[$(id).closest('fieldset')]);
   const actions=$('generate').parentElement;for(const el of actions.querySelectorAll('button'))el.setAttribute('form','compose-form');
   move(more.dialog,$('refresh-writers'));move(preview,$('compose-status'),q('.compose-pages'),q('.composed-paper'),primary(actions));
   // Hidden required fields must be revealed when native form validation fails.
   form.addEventListener('invalid',event=>{let node=event.target.parentElement;while(node&&node!==form){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}doc.body.classList.remove('studio-focused');const b=$('studio-focus');b.textContent='Preview focus';b.setAttribute('aria-pressed','false');},true);
   focus(preview,[editor]);
  }else if(page==='proof'){
   const controls=q('.proof-controls',shell),{editor,preview}=workspace(controls);
   move(editor,controls,details('Text and examples',[$('proof-alphabet-text'),$('proof-comparison-text')]));
   move(preview,$('proof-status'),$('proof-missing'),q('.proof-page-nav'),q('.proof-inspection'),q('.proof-paper'),primary(q('.proof-actions')));
   const oldHeading=Array.from(shell.children).find(el=>el.tagName==='H2');oldHeading?.remove();
   focus(preview,[editor]);
  }else if(page==='calibration'){
   // Setup and measurement instructions remain one tap away beside the stage.
   const steps=details('Calibration procedure',[q('ol',shell)]);move(steps,...Array.from(help.dialog.children).filter(el=>el.tagName==='P'));
   const stage=$('calibration-stage'),label=q('label[for="calibration-stage"]'),controls=make('div','studio-inline-actions');stage.before(controls);move(controls,label,stage,steps);
   primary(q('.calibration-actions'));shell.append(q('.calibration-actions'));
   focus($('calibration-preview'),[controls]);
  }else if(page==='help'){
   // A compact topic list keeps the first section within easy reach.
   details('Browse help topics',[q('.help-contents')]);
  }else if(page==='plotting'){
   // No focus mode here: Pause and Cancel must stay with the live job.
   const events=$('plot-events'),eventHeading=events.previousElementSibling;
   details('Recent activity',[eventHeading,events]);
  }
  return {page,more:more.dialog,help:help.dialog};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={init};else init(root.document);
})(typeof window!=='undefined'?window:globalThis);
