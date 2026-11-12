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

const {JSDOM}=require('jsdom');
function helpPage(){
 const dom=new JSDOM('<body><label for="compose-source">Use</label><select id="compose-source" title="Old tip"><option>Both</option></select><label><input id="compose-connect" type="checkbox">Smooth joins</label><button id="undo">Undo</button><dialog open><button id="backup-import" disabled>Import</button></dialog></body>',{pretendToBeVisual:true});
 const doc=dom.window.document,tips=init(doc,dom.window,C);return {dom,doc,tips};
}
test('help only opens from circled question marks and never intercepts a control',()=>{
 const {dom,doc,tips}=helpPage(),source=doc.getElementById('compose-source'),check=doc.getElementById('compose-connect');
 assert.equal(source.hasAttribute('title'),false);assert.equal(doc.querySelectorAll('.studio-help-marker').length,3);
 source.dispatchEvent(new dom.window.Event('pointerover',{bubbles:true}));source.focus();assert(tips.panel.hidden);
 const marker=tips.entries.get(check).button;assert.equal(marker.textContent,'?');marker.click();assert(!check.checked);assert(!tips.panel.hidden);assert.match(tips.message.textContent,/connecting strokes/);assert.equal(marker.getAttribute('aria-expanded'),'true');
 doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(tips.panel.hidden);assert.equal(doc.activeElement,marker);
 check.click();assert(check.checked);assert(tips.panel.hidden);
 tips.entries.get(source).button.click();assert(!tips.panel.hidden);tips.panel.querySelector('button').click();assert(tips.panel.hidden);
 dom.window.close();
});
test('disabled controls have usable help inside dialogs and dynamic controls are decorated once',async()=>{
 const {dom,doc,tips}=helpPage(),control=doc.getElementById('backup-import');tips.entries.get(control).button.click();assert.equal(tips.panel.parentElement,control.parentElement);assert.match(tips.message.textContent,/currently unavailable/);
 const select=doc.createElement('select');select.id='compose-size';doc.body.append(select);await new Promise(r=>dom.window.setTimeout(r,0));assert(tips.entries.has(select));
 select.disabled=true;await new Promise(r=>dom.window.setTimeout(r,0));assert.equal(doc.querySelectorAll('.studio-help-marker').length,4);
 tips.entries.get(select).button.click();doc.body.dispatchEvent(new dom.window.Event('pointerdown',{bubbles:true}));assert(tips.panel.hidden);
 select.remove();await new Promise(r=>dom.window.setTimeout(r,0));assert.equal(doc.querySelectorAll('.studio-help-marker').length,3);dom.window.close();
});
