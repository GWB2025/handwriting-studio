const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../web/tooltips-content'),{init}=require('../web/tooltips'),{environment}=require('./tooltip_dom');
function workspace(){
 const w=environment(),{add,doc,win}=w;add('div','',doc.body,{class:'storage-buttons'});const button=add('button','proof-refresh');button.textContent='Refresh preview';const input=add('input','proof-size');input.value='5';const canvas=add('canvas','paper'),drag=add('figure','',doc.body,{class:'blend-result',tabindex:'0','aria-describedby':'single-drag-help'});const dialog=add('dialog','backup-dialog'),backup=add('button','backup-import',dialog);
 const tips=init(doc,win,C);return {...w,tips,button,input,canvas,drag,dialog,backup};
}
test('every widget in every published screen has explanatory help and loads the tooltip assets',()=>{
 let controls=0;for(const file of fs.readdirSync('docs').filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(path.join('docs',file),'utf8'),w=environment();if(file==='index.html')w.add('select','capture-kind');
  for(const match of html.matchAll(/<(button|input|select|textarea|a|canvas|div)\b([^>]*)>/g)){
   const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
   if(match[1]==='div'&&attrs.tabindex===undefined)continue;if(match[1]==='input'&&attrs.type==='hidden')continue;
   const node=w.add(match[1],attrs.id||'',w.doc.body,attrs);if(['button','a'].includes(match[1]))node.textContent=html.slice(match.index+match[0].length).split('</'+match[1]+'>')[0].replace(/<[^>]+>/g,'');const description=C.describe(node,w.doc);
   assert(description.length>20,file+': no tooltip for '+match[0]);controls++;
  }
  assert.match(html,/assets\/tooltips-content\.js\?v=/);assert.match(html,/assets\/tooltips\.js\?v=/);
 }
 assert(controls>250);
});
test('dynamic sources, sample cards and changing capture actions have specific descriptions',()=>{
 const {doc,add}=environment();add('select','capture-kind');const save=add('button','save');
 for(const [label,expected] of [['Start capture',/Practice strokes are cleared/],['Save sheet 1 of 6',/Save this capture sheet/],['Compose handwriting',/Open Compose/]]){save.textContent=label;assert.match(C.describe(save,doc),expected);}
 for(const [parent,tag,expected] of [['single-sources','select',/swaps the two/],['alphabet-grid','button',/adjust spacing/],['review-alphabet','button',/saved examples/],['sample-list','button',/stroke order/],['page-list','button',/before opening/]]){const control=add(tag,'',add('div',parent));assert.match(C.describe(control,doc),expected);}
 const button=add('button','',add('div','alphabet-samples'));button.textContent='Add to preferred';assert.match(C.describe(button,doc),/Add this included version/);button.textContent='Remove from preferred';assert.match(C.describe(button,doc),/sample is kept/);
 button.disabled=true;assert.match(C.describe(button,doc),/currently unavailable/);
});
test('hover and keyboard tips preserve existing accessibility descriptions and dismiss without activating controls',()=>{
 const w=workspace(),{emit,tick,button,tips,drag}=w;let actions=0;button.onclick=()=>actions++;
 const description=drag.getAttribute('aria-describedby');assert.match(description,/^single-drag-help studio-control-tip-/);assert(w.doc.getElementById(description.split(' ')[1]));
 tips.describe(drag);assert.equal(drag.getAttribute('aria-describedby'),description);
 const label=w.add('span','',button);label.textContent='Refresh';
 emit(button,'pointerover');emit(button,'pointerout',{relatedTarget:label});emit(label,'pointerover',{relatedTarget:button});assert(tips.panel.hidden);tick();assert(!tips.panel.hidden);assert.match(tips.message.textContent,/Rebuild the proof/);assert.equal(actions,0);
 assert(emit(button,'keydown',{key:'Escape'}).defaultPrevented);assert(tips.panel.hidden);
 emit(drag,'focusin');assert.match(tips.message.textContent,/four also blend up\/down/);emit(drag,'focusout');assert(tips.panel.hidden);
 emit(drag,'focusin');emit(drag,'keydown',{key:'ArrowLeft'});assert(tips.panel.hidden);
 emit(button,'pointerover',{pointerType:'pen'});tick();assert(tips.panel.hidden);
 emit(button,'pointerover',{pointerType:'touch'});tick();assert(tips.panel.hidden);
});
test('touch inspection blocks activation, drawing, dragging and keyboard edits, then restores normal use',()=>{
 const w=workspace(),{emit,tips,button,input,canvas,drag}=w;let actions=0,strokes=0,drags=0;button.onclick=()=>actions++;canvas.addEventListener('pointerdown',()=>strokes++);drag.addEventListener('pointerdown',()=>drags++);
 emit(tips.toggles[0],'click');assert.equal(tips.toggles[0].getAttribute('aria-pressed'),'true');
 const link=w.add('a','',w.doc.body,{href:'compose.html'}),check=w.add('input','sample-included',w.doc.body,{type:'checkbox'});check.checked=true;
 for(const target of [button,input,canvas,drag,link,check]){
  assert(emit(target,'pointerdown',{pointerType:'touch'}).defaultPrevented);assert(emit(target,'pointerup',{pointerType:'touch'}).defaultPrevented);assert(emit(target,'click').defaultPrevented);
 }
 assert(emit(input,'keydown',{key:'ArrowUp'}).defaultPrevented);assert(!emit(input,'keydown',{key:'Tab'}).defaultPrevented);assert.equal(input.value,'5');assert.equal(check.checked,true);assert.equal(actions+strokes+drags,0);assert(emit(link,'contextmenu').defaultPrevented);
 emit(tips.panel.querySelector('button'),'click');assert.equal(tips.toggles[0].getAttribute('aria-pressed'),'false');assert(tips.panel.hidden);
 emit(button,'click');emit(canvas,'pointerdown',{pointerType:'pen'});emit(canvas,'pointerup',{pointerType:'pen'});emit(drag,'pointerdown');emit(drag,'pointerup');assert.deepEqual([actions,strokes,drags],[1,1,1]);
});
test('tips are available inside dialogs, include disabled controls and stay within the visible viewport',()=>{
 const w=workspace(),{emit,tips,backup,dialog,win}=w;backup.disabled=true;dialog.setAttribute('open','');
 emit(tips.toggles[1],'click');assert.equal(tips.panel.parentNode,dialog);emit(backup,'pointerdown',{pointerType:'touch'});
 assert.match(tips.message.textContent,/currently unavailable/);assert.equal(tips.panel.parentNode,dialog);
 win.visualViewport={width:320,height:260,offsetLeft:5,offsetTop:10};backup.rect={left:300,top:240,bottom:280};emit(backup,'click');
 assert(Number.parseFloat(tips.panel.style.left)>=17);assert(Number.parseFloat(tips.panel.style.left)+tips.panel.rect.width<=313);assert(Number.parseFloat(tips.panel.style.top)+tips.panel.rect.height<=258);
 emit(backup,'keydown',{key:'Escape'});assert(tips.panel.hidden);assert.equal(tips.toggles[1].getAttribute('aria-pressed'),'false');
});
test('new controls receive tips, changed labels update tips, and removed controls do not leave stale descriptions',()=>{
 const w=workspace(),{add,doc,win,tips,emit}=w;add('select','capture-kind');const save=add('button','save');save.textContent='Start capture';
 win.observer.deliver([{type:'childList',target:doc.body,addedNodes:[save]}]);const id=save.getAttribute('aria-describedby');assert.match(doc.getElementById(id).textContent,/Start capturing/);
 emit(save,'focusin');save.textContent='Save sheet 1 of 6';win.observer.deliver([{type:'childList',target:save,addedNodes:[]}]);assert.match(tips.message.textContent,/Save this capture sheet/);
 save.remove();win.observer.deliver([{type:'childList',target:doc.body,addedNodes:[]}]);assert(tips.panel.hidden);assert.equal(doc.getElementById(id),null);assert.equal(save.getAttribute('aria-describedby'),null);
 doc.body.append(save);win.observer.deliver([{type:'childList',target:doc.body,addedNodes:[save]}]);assert(doc.getElementById(save.getAttribute('aria-describedby')));
});
test('turning on tips waits for an active pen or drag to finish and never swallows its release',()=>{
 const w=workspace(),{emit,tips,canvas}=w;let released=0;canvas.addEventListener('pointerup',()=>released++);
 emit(canvas,'pointerdown',{pointerId:9,pointerType:'pen'});emit(tips.toggles[0],'pointerdown',{pointerId:10,pointerType:'touch'});emit(tips.toggles[0],'pointerup',{pointerId:10,pointerType:'touch'});emit(tips.toggles[0],'click');
 assert.equal(tips.toggles[0].getAttribute('aria-pressed'),'false');assert.match(tips.message.textContent,/Finish drawing/);emit(canvas,'pointerup',{pointerId:9,pointerType:'pen'});assert.equal(released,1);
 emit(tips.toggles[0],'click');assert.equal(tips.toggles[0].getAttribute('aria-pressed'),'true');
});
