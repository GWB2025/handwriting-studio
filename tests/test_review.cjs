const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,(process.env.STUDIO_PAGES_TEST?'../docs/assets/':'../static/')+'review.js'),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function review(extended=false,{initialShift=0,initialScale=1,enhanced=false,failSave=false,wideCrossbar=false,strokeTools=false}={}){
  function node(tag='div'){let value='';return {tag,parent:null,style:{},get value(){return value;},set value(v){value=String(v);},checked:false,dataset:{},children:[],attributes:{},
    append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(c=>c!==item);item.parent=this;this.children.push(item);}if(!this.value&&items[0]?.value)this.value=items[0].value;},
    replaceChildren(){for(const c of this.children)c.parent=null;this.children=[];this.value='';},
    querySelectorAll(tag){return this.children.flatMap(c=>[...((tag.startsWith('.')?c.attributes.class===tag.slice(1):c.tag===tag)?[c]:[]),...c.querySelectorAll(tag)]);},querySelector(tag){return this.querySelectorAll(tag)[0]||null;},
    setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},removeAttribute(k){delete this[k];},
    getBBox(){if(!this.attributes.d){const boxes=this.querySelectorAll('path').map(p=>p.getBBox()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};}const values=this.attributes.d.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=values.filter((_,i)=>i%2===0),ys=values.filter((_,i)=>i%2);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};},
    set innerHTML(text){this.replaceChildren();const stack=[this];for(const m of text.matchAll(/<(\/?)(svg|g|line|text|path|circle)\b([^>]*)>/g)){if(m[1]){stack.pop();continue;}const child=node(m[2]);for(const attr of m[3].matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(attr[1],attr[2]);stack.at(-1).append(child);if(!m[3].endsWith('/'))stack.push(child);}}
  };}
  const E=require('../web/engine'),raw={bounds:{left:0,right:wideCrossbar?100:40},processed_strokes:[{points:[{x:0,y:-60},{x:40,y:0}]},{points:[{x:5,y:-40},{x:wideCrossbar?100:35,y:-40}]}]};
  const svg=(shift,scale=1,edit)=>E.reviewSVG({...E.scaleSample(E.editStrokes(raw,edit),scale),baseline_shift_mm:shift},{colourStrokes:enhanced,showStarts:enhanced});
  const elements={};
  for(const id of ['review-status','review-writer','review-letter','review-refresh','sample-included','sample-shift','sample-shift-value','sample-zero','review-save','review-reset','sample-list','review-compose','review-coverage','sample-detail','sample-image','sample-title','sample-date','review-form','review-alphabet','review-kind'])elements[id]=node();
  elements['review-kind'].value='lowercase';
  if(enhanced){for(const id of ['sample-size','sample-size-value','sample-size-reset','review-word','review-word-status','review-word-preview','review-zoom','review-zoom-value','review-colours','review-starts'])elements[id]=node();elements['review-zoom'].value=100;elements['review-colours'].checked=true;}
  if(strokeTools)for(const id of ['review-strokes','stroke-target','stroke-earlier','stroke-later','stroke-reverse','stroke-undo','stroke-original','stroke-detail'])elements[id]=node();
  const requests=[],settings={};
  const fetch=async(url,options={})=>{
    requests.push({url,options});
    let data;
    if(url==='/api/letters/writers')data={writers:[{writer:'Writer',counts:{a:1,j:1,z:1},total_counts:{a:1,j:1,z:1}}]};
    else if(url==='/api/review-preview')data={svg:'<svg viewBox="0 0 210 297"><g><path d="M20 20 L25 25"/></g></svg>'};
    else if(options.method==='POST'){if(failSave)return {ok:false,json:async()=>({error:'Storage unavailable'})};Object.assign(settings,JSON.parse(options.body));data={...settings,svg:svg(settings.baseline_shift_mm,settings.scale_factor??1,settings.stroke_edit)};}
    else{const letter=new URL('https://test.invalid'+url).searchParams.get('letter');data={samples:['a','j','z'].includes(letter)?[{letter,capture_id:'id-'+letter,saved_at:'2026-10-08T12:00:00Z',stroke_count:2,...(strokeTools?{stroke_sample:raw,stroke_edit:E.originalStrokeEdit(2)}:{}),included:true,baseline_shift_mm:initialShift,scale_factor:initialScale,svg:svg(initialShift,initialScale)}]:[]};}
    return {ok:true,json:async()=>data};
  };
  const window={...(extended?{StudioEngine:require('../web/engine.js')} : {}),location:{search:'?writer=Writer'},addEventListener(){},studioFetch:fetch};
  vm.runInNewContext(source,{window,document:{hidden:false,getElementById:id=>elements[id],createElement:node,createElementNS:(_,tag)=>node(tag),addEventListener(){}},fetch,URLSearchParams,AbortController,Blob,setTimeout,clearTimeout,URL:{createObjectURL:()=> 'blob:sample',revokeObjectURL(){}}});
  await settle();return {elements,requests,settings};
}
test('review offers all 26 letters and buttons fetch j and z samples',async()=>{
  const r=await review(),e=r.elements;
  assert.equal(e['review-letter'].children.length,26);
  assert.equal(e['review-alphabet'].children.map(b=>b.dataset.letter).join(''),'abcdefghijklmnopqrstuvwxyz');
  for(const letter of ['j','z']){
    const button=e['review-alphabet'].children.find(b=>b.dataset.letter===letter);
    assert.equal(button.disabled,false);button.onclick();await settle();
    assert.match(r.requests.at(-1).url,new RegExp('letter='+letter));
    assert.equal(e['sample-title'].textContent,letter+' · Included');
    assert.equal(e['review-alphabet'].children.find(b=>b.dataset.letter===letter).attributes['aria-pressed'],'true');
  }
});
test('unsaved review locks letter navigation and saving retains the selected letter',async()=>{
  const r=await review(),e=r.elements;
  e['review-alphabet'].children.find(b=>b.dataset.letter==='j').onclick();await settle();
  e['sample-included'].checked=false;e['sample-included'].onchange();
  assert.ok(e['review-alphabet'].children.every(b=>b.disabled));
  assert.equal(e['review-letter'].disabled,true);
  e['review-alphabet'].children.find(b=>b.dataset.letter==='z').onclick();
  assert.equal(e['review-letter'].value,'j');
  await e['review-form'].onsubmit({preventDefault(){}});await settle();
  assert.equal(r.settings.included,false);
  assert.equal(e['review-letter'].value,'j');
  assert.ok(e['review-alphabet'].children.every(b=>!b.disabled));
  assert.match(e['sample-title'].textContent,/j · Excluded/);
});


test('review group selection exposes capitals, symbols and joined pairs',async()=>{
 const r=await review(true),e=r.elements;
 for(const [group,token] of [['uppercase','Z'],['symbols','/'],['pairs','th']]){
  e['review-kind'].value=group;e['review-kind'].onchange();await settle();
  const b=e['review-alphabet'].children.find(b=>b.dataset.letter===token);assert.ok(b);b.onclick();await settle();
  assert.equal(new URL('https://test.invalid'+r.requests.at(-1).url).searchParams.get('letter'),token);
 }
});

test('baseline edits move only the ink live, keep guides and scale fixed, and do not save until requested',async()=>{
 const r=await review(false,{initialShift:2}),e=r.elements;
 e['review-alphabet'].children.find(b=>b.dataset.letter==='z').onclick();await settle();
 const svg=e['sample-image'].querySelector('svg'),ink=svg.querySelector('g'),guides=svg.querySelectorAll('line'),paths=ink.querySelectorAll('path'),frame=svg.getAttribute('viewBox'),guideY=guides.map(g=>g.getAttribute('y1')),pathData=paths.map(p=>p.getAttribute('d')),requestCount=r.requests.length;
 for(const offset of [3.5,-2,-10,10,0]){
  e['sample-shift'].value=-offset;e['sample-shift'].oninput();
  assert.equal(e['sample-image'].querySelector('svg'),svg);assert.equal(ink.getAttribute('transform'),`translate(70 ${(offset-2)*16})`);assert.equal(svg.getAttribute('viewBox'),frame);
  assert.deepEqual(svg.querySelectorAll('line'),guides);assert.deepEqual(guides.map(g=>g.getAttribute('y1')),guideY);assert.deepEqual(paths.map(p=>p.getAttribute('d')),pathData);
  const [,top,,height]=frame.split(' ').map(Number);for(const p of paths){const b=p.getBBox(),shift=(offset-2)*16;assert(b.y+shift>=top&&b.y+b.height+shift<=top+height);}
 }
 assert.equal(r.requests.length,requestCount);assert.equal(e['review-save'].disabled,false);assert.equal(e['review-letter'].disabled,true);
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'-2');assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(70 0)');assert.equal(e['review-save'].disabled,true);
 e['sample-shift'].value='1.25';e['sample-shift'].oninput();await e['review-form'].onsubmit({preventDefault(){}});
 assert.equal(r.settings.baseline_shift_mm,-1.25);assert.equal(e['sample-image'].querySelector('svg').getAttribute('viewBox'),frame);assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(70 0)');
 assert.equal(e['sample-image'].querySelector('path').getBBox().y,-60-1.25*16);assert.equal(e['review-save'].disabled,true);
 e['sample-shift'].value='1';e['sample-shift'].oninput();assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(70 4)');
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'1.25');
});

test('invalid offsets retain the last valid preview and a failed save preserves the unsaved adjustment',async()=>{
 const r=await review(false,{failSave:true}),e=r.elements,ink=e['sample-image'].querySelector('g');
 e['sample-shift'].value='2';e['sample-shift'].oninput();assert.equal(ink.getAttribute('transform'),'translate(70 -32)');
 for(const value of ['','-', 'NaN','Infinity','10.1','-11']){
  e['sample-shift'].value=value;e['sample-shift'].oninput();assert.equal(ink.getAttribute('transform'),'translate(70 -32)');assert.equal(e['review-save'].disabled,true);assert.match(e['review-status'].textContent,/last valid position/);
 }
 e['sample-shift'].value='-3';e['sample-shift'].oninput();await e['review-form'].onsubmit({preventDefault(){}});
 assert.equal(ink.getAttribute('transform'),'translate(70 48)');assert.equal(e['sample-shift'].value,'-3');assert.equal(e['review-reset'].disabled,false);assert.equal(e['review-save'].disabled,false);assert.match(e['review-status'].textContent,/Not saved/);assert.deepEqual(r.settings,{});
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'0');assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(70 0)');
});

test('the upward slider direction, keyboard and zero button preserve existing stored offsets and horizontal centring',async()=>{
 const r=await review(false,{initialShift:1.234567,wideCrossbar:true}),e=r.elements,svg=e['sample-image'].querySelector('svg'),ink=svg.querySelector('g');
 assert.equal(e['sample-shift'].value,'-1.234567');assert.match(e['sample-shift-value'].textContent,/down/);
 const [x,,width]=svg.getAttribute('viewBox').split(' ').map(Number),paths=ink.querySelectorAll('path'),bounds=paths.map(p=>p.getBBox()),left=Math.min(...bounds.map(b=>b.x)),right=Math.max(...bounds.map(b=>b.x+b.width));
 function checkCentre(){const shift=Number(ink.getAttribute('transform').match(/translate\(([^ ]+)/)[1]);assert.equal((left+right)/2+shift,x+width/2);}
 checkCentre();
 // An inclusion-only save must not round or reverse an existing arbitrary-precision offset.
 e['sample-included'].checked=false;e['sample-included'].onchange();await e['review-form'].onsubmit({preventDefault(){}});assert.equal(r.settings.baseline_shift_mm,1.234567);
 e['sample-zero'].onclick();assert.equal(e['sample-shift'].value,'0');assert.equal(e['sample-shift-value'].textContent,'Original baseline');assert.equal(e['review-save'].disabled,false);
 const key=(key,shiftKey=false)=>{let prevented=false;e['sample-shift'].onkeydown({key,shiftKey,preventDefault(){prevented=true;}});assert(prevented);};
 key('ArrowUp');assert.equal(e['sample-shift'].value,'0.1');assert.equal(e['sample-shift-value'].textContent,'0.1 mm up');
 key('ArrowUp',true);assert.equal(e['sample-shift'].value,'1.1');key('ArrowDown');assert.equal(e['sample-shift'].value,'1');assert.equal(e['sample-shift'].attributes['aria-valuetext'],'1 mm up');
 await e['review-form'].onsubmit({preventDefault(){}});assert.equal(r.settings.baseline_shift_mm,-1);
 assert.equal(e['sample-image'].querySelector('path').getBBox().y,-76);
 e['sample-shift'].value='10';key('ArrowUp');assert.equal(e['sample-shift'].value,'10');
 e['sample-shift'].value='-10';key('ArrowDown');assert.equal(e['sample-shift'].value,'-10');
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'1');assert.equal(e['sample-shift-value'].textContent,'1 mm up');
 e['sample-zero'].onclick();await e['review-form'].onsubmit({preventDefault(){}});assert.equal(r.settings.baseline_shift_mm,0);
});

test('size edits scale ink and numbered starts live while zoom remains display-only; saving and reset preserve the intended size',async()=>{
 const r=await review(true,{enhanced:true,initialShift:2,initialScale:1.25}),e=r.elements,svg=e['sample-image'].querySelector('svg'),ink=svg.querySelector('g'),paths=ink.querySelectorAll('path'),frame=svg.getAttribute('viewBox');
 assert.equal(ink.querySelectorAll('.stroke-start').length,2);assert.equal(e['sample-image'].dataset.starts,'false');
 const original=paths.map(p=>p.getAttribute('d'));
 e['sample-size'].value='150';e['sample-size'].oninput();
 assert.match(ink.getAttribute('transform'),/ -6\.399999999999999\) scale\(1\.2\)$/);assert.equal(svg.getAttribute('viewBox'),frame);assert.equal(e['review-save'].disabled,false);
 const [vx,,vw]=frame.split(' ').map(Number),bounds=paths.map(p=>p.getBBox()),centre=(Math.min(...bounds.map(b=>b.x))+Math.max(...bounds.map(b=>b.x+b.width)))/2;
 const dx=Number(ink.getAttribute('transform').match(/translate\(([^ ]+)/)[1]);assert.equal(centre*1.2+dx,vx+vw/2);assert.deepEqual(paths.map(p=>p.getAttribute('d')),original);
 e['review-zoom'].value=250;e['review-zoom'].oninput();e['review-colours'].checked=false;e['review-colours'].oninput();e['review-starts'].checked=true;e['review-starts'].oninput();
 assert.equal(e['sample-image'].style.height,'700px');assert.equal(e['sample-image'].dataset.colours,'false');assert.equal(e['sample-image'].dataset.starts,'true');assert.equal(e['sample-image'].querySelector('svg'),svg);
 await new Promise(resolve=>setTimeout(resolve,150));const preview=r.requests.filter(r=>r.url==='/api/review-preview').at(-1);assert.equal(JSON.parse(preview.options.body).scale_factor,1.5);assert.equal(JSON.parse(preview.options.body).baseline_shift_mm,2);assert.deepEqual(r.settings,{});assert.match(e['review-word-status'].textContent,/Live word preview/);
 await e['review-form'].onsubmit({preventDefault(){}});assert.equal(r.settings.scale_factor,1.5);assert.equal(r.settings.baseline_shift_mm,2);assert.equal(e['review-save'].disabled,true);assert.equal(e['sample-image'].querySelector('path').getBBox().y,-90+32);
 e['sample-size-reset'].onclick();assert.equal(e['sample-size'].value,'100');assert.equal(e['review-save'].disabled,false);
 e['review-reset'].onclick();assert.equal(e['sample-size'].value,'150');assert.equal(e['review-save'].disabled,true);assert.equal(e['sample-image'].dataset.starts,'true');
 await new Promise(resolve=>setTimeout(resolve,150));
});

test('stroke edits update numbered paths, support undo and reset, save separately and protect unsaved choices',async()=>{
 const r=await review(true,{enhanced:true,strokeTools:true}),e=r.elements,path=()=>e['sample-image'].querySelector('path').getAttribute('d');
 const original=path();assert.equal(e['stroke-earlier'].disabled,true);assert.equal(e['stroke-undo'].disabled,true);
 e['stroke-later'].onclick();assert.notEqual(path(),original);assert.equal(e['stroke-target'].children[0].value,'1');assert.equal(e['review-letter'].disabled,true);assert.equal(e['review-starts'].checked,true);
 e['stroke-reverse'].onclick();assert.match(e['stroke-detail'].textContent,/reversed/);assert.equal(e['review-save'].disabled,false);
 await new Promise(resolve=>setTimeout(resolve,150));const word=r.requests.filter(r=>r.url==='/api/review-preview').at(-1);assert.deepEqual(JSON.parse(word.options.body).stroke_edit,{order:[1,0],reversed:[true,false]});
 e['stroke-undo'].onclick();assert.match(e['stroke-detail'].textContent,/original direction/);e['stroke-undo'].onclick();assert.equal(path(),original);assert.equal(e['review-save'].disabled,true);
 e['stroke-reverse'].onclick();await e['review-form'].onsubmit({preventDefault(){}});assert.deepEqual(r.settings.stroke_edit,{order:[0,1],reversed:[true,false]});assert.equal(e['review-letter'].disabled,false);assert.equal(e['stroke-undo'].disabled,true);
 const saved=path();e['stroke-original'].onclick();assert.equal(path(),original);assert.equal(e['review-save'].disabled,false);e['review-reset'].onclick();assert.equal(path(),saved);
 e['stroke-original'].onclick();await e['review-form'].onsubmit({preventDefault(){}});assert.deepEqual(r.settings.stroke_edit,{order:[0,1],reversed:[false,false]});assert.equal(path(),original);
});
test('failed stroke saves retain pending corrections and allow reset without altering the saved sample',async()=>{
 const r=await review(true,{enhanced:true,strokeTools:true,failSave:true}),e=r.elements,original=e['sample-image'].querySelector('path').getAttribute('d');
 e['stroke-later'].onclick();await e['review-form'].onsubmit({preventDefault(){}});assert.match(e['review-status'].textContent,/Not saved/);assert.equal(e['review-letter'].disabled,true);assert.equal(e['stroke-target'].children[0].value,'1');assert.deepEqual(r.settings,{});
 e['review-reset'].onclick();assert.equal(e['sample-image'].querySelector('path').getAttribute('d'),original);assert.equal(e['review-letter'].disabled,false);
});

test('stroke edits preserve pending size and baseline adjustments without applying either twice',async()=>{
 const r=await review(true,{enhanced:true,strokeTools:true,initialShift:2,initialScale:1.25}),e=r.elements;
 e['sample-size'].value='150';e['sample-size'].oninput();e['sample-shift'].value='3';e['sample-shift'].oninput();const before=e['sample-image'].querySelector('g').getAttribute('transform');
 e['stroke-later'].onclick();assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),before);assert.equal(e['sample-size'].value,'150');assert.equal(e['sample-shift'].value,'3');
 await e['review-form'].onsubmit({preventDefault(){}});assert.equal(r.settings.scale_factor,1.5);assert.equal(r.settings.baseline_shift_mm,-3);assert.deepEqual(r.settings.stroke_edit,{order:[1,0],reversed:[false,false]});
 const first=e['sample-image'].querySelector('path').getBBox();assert.equal(first.y,-108);assert.equal(first.width,45);
});
