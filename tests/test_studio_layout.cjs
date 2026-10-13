const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {init}=require('../web/studio-layout');
const tips=require('../web/tooltips-content');
const pages=['review','blending','alphabet','compose','proof','calibration','help','plotting'];
function load(page){
 const dom=new JSDOM(fs.readFileSync('docs/'+page+'.html','utf8'),{url:'https://example.test/'+page+'.html'});
 return {dom,doc:dom.window.document,$:id=>dom.window.document.getElementById(id)};
}
for(const page of pages)test(page+': all existing controls survive layout with their values, identity and form ownership',()=>{
 const {dom,doc}=load(page);
 const controls=Array.from(doc.querySelectorAll('input,select,textarea,button,a[id]'));
 const before=controls.map(el=>({el,form:el.form,value:el.value}));
 init(doc);
 for(const {el,form,value} of before){
  assert.ok(el.isConnected,el.id+' was removed');
  if(form)assert.equal(el.form,form,el.id+' changed form');
  assert.equal(el.value,value,el.id+' changed value');
 }
 const ids=Array.from(doc.querySelectorAll('[id]')).map(el=>el.id);
 assert.equal(new Set(ids).size,ids.length,'IDs must remain unique');
 assert.equal(doc.querySelectorAll('.studio-navigation a').length,4);
 assert.equal(doc.querySelectorAll('#studio-more-dialog a').length,5);
 assert.ok(doc.querySelector('#studio-help-dialog #studio-tips'));
 for(const control of doc.querySelectorAll('.studio-navigation button,.studio-heading button,.studio-dialog button,summary'))assert.ok(tips.describe(control,doc).length>20,control.textContent+' needs a tooltip');
 assert.equal(init(doc),undefined,'initialisation is idempotent');
 dom.window.close();
});
test('Compose still submits through native validation from its preview action row',()=>{
 const {dom,doc,$}=load('compose');init(doc);
 const writer=$('compose-writer');writer.disabled=false;writer.innerHTML='<option value="Test">Test</option>';
 $('generate').disabled=false;
 let submits=0;$('compose-form').addEventListener('submit',event=>{event.preventDefault();submits++;});
 $('generate').click();assert.equal(submits,1);
 const margin=$('compose-margin-top'),panel=margin.closest('details');
 margin.value='1';panel.open=false;$('studio-focus').click();$('generate').click();
 assert.equal(submits,1,'invalid margins prevent submission');
 assert.ok(panel.open,'invalid field is revealed');
 assert.equal(doc.body.classList.contains('studio-focused'),false);
 assert.equal($('studio-focus').getAttribute('aria-pressed'),'false');
 margin.value='25';$('generate').click();assert.equal(submits,2);
 dom.window.close();
});
test('Review save keeps size, baseline and inclusion inputs in its original form',()=>{
 const {dom,doc,$}=load('review');init(doc);
 $('sample-detail').hidden=false;$('review-save').disabled=false;
 $('sample-size').value='240';$('sample-shift').value='2.5';$('sample-included').checked=true;
 let saved;
 $('review-form').onsubmit=event=>{event.preventDefault();saved={size:$('sample-size').value,shift:$('sample-shift').value,included:$('sample-included').checked};};
 $('studio-focus').click();$('review-save').click();
 assert.deepEqual(saved,{size:'240',shift:'2.5',included:true});
 doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));
 assert.equal(doc.body.classList.contains('studio-focused'),false);
 assert.equal($('sample-size').value,'240');
 dom.window.close();
});
test('Blend source events and save-time control selectors survive, focus waits for a drag to finish',()=>{
 const {dom,doc,$}=load('blending');
 const source=doc.createElement('select');source.innerHTML='<option>A</option><option>B</option>';
 $('single-sources').append(source);let changed=0;source.onchange=()=>changed++;
 init(doc);source.value='B';source.dispatchEvent(new dom.window.Event('change'));
 assert.equal(changed,1);assert.ok(Array.from(doc.querySelectorAll('#single-controls select')).includes(source));
 assert.equal(doc.querySelectorAll('.preview-controls input').length,4);
 const result=doc.createElement('figure');result.dataset.dragging='true';$('single-cards').append(result);
 $('studio-focus').click();assert.equal(doc.body.classList.contains('studio-focused'),false);
 result.dataset.dragging='false';$('studio-focus').click();assert.ok(doc.body.classList.contains('studio-focused'));
 assert.equal(source.value,'B');assert.ok($('single-save').closest('.studio-preview'));
 dom.window.close();
});
test('Plotter navigation remains on the public site from the local sender and no focus hides job controls',()=>{
 const {dom,doc,$}=load('plotting');init(doc);
 for(const link of doc.querySelectorAll('.studio-navigation a,#studio-more-dialog a'))assert.ok(link.href.startsWith('https://gwb2025.github.io/handwriting-studio/'));
 assert.equal($('studio-focus'),null);
 for(const id of ['plot-pause','plot-continue','plot-cancel']){
  assert.equal($(id).closest('details,dialog'),null);
  assert.ok($(id).closest('.plot-operation'));
 }
 dom.window.close();
});
test('Free writing uses the pen-safe compact layout and retains every original field and library control',()=>{
 const {dom,doc}=load('notebook'),original=new JSDOM(fs.readFileSync('static/index.html','utf8'));
 for(const el of original.window.document.querySelectorAll('input,select,canvas,button'))if(el.id!=='focus')assert.ok(doc.getElementById(el.id),el.id+' is missing');
 const ids=Array.from(doc.querySelectorAll('[id]')).map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
 assert.equal(doc.querySelectorAll('.capture-navigation a').length,4);
 assert.ok(doc.querySelector('#capture-more-dialog #export'));
 assert.ok(doc.querySelector('#capture-more-dialog #recovery-open'));
 assert.ok(doc.querySelector('#capture-guides-dialog #smooth'));
 assert.ok(doc.querySelector('main.capture-workspace #saved-pages'));
 original.window.close();dom.window.close();
});
