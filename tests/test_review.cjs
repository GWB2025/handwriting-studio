const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,(process.env.STUDIO_PAGES_TEST?'../docs/assets/':'../static/')+'review.js'),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function review(extended=false,{initialShift=0,failSave=false}={}){
  function node(tag='div'){let value='';return {tag,parent:null,get value(){return value;},set value(v){value=String(v);},checked:false,dataset:{},children:[],attributes:{},
    append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(c=>c!==item);item.parent=this;this.children.push(item);}if(!this.value&&items[0]?.value)this.value=items[0].value;},
    replaceChildren(){for(const c of this.children)c.parent=null;this.children=[];this.value='';},
    querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);},querySelector(tag){return this.querySelectorAll(tag)[0]||null;},
    setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},removeAttribute(k){delete this[k];},
    getBBox(){const values=this.attributes.d.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=values.filter((_,i)=>i%2===0),ys=values.filter((_,i)=>i%2);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};},
    set innerHTML(text){this.replaceChildren();let svg;for(const m of text.matchAll(/<(svg|line|text|path)\b([^>]*)>/g)){const child=node(m[1]);for(const attr of m[2].matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(attr[1],attr[2]);if(m[1]==='svg'){svg=child;this.append(svg);}else svg.append(child);}}
  };}
  const svg=shift=>require('../web/engine.js').reviewSVG({baseline_shift_mm:shift,processed_strokes:[{points:[{x:0,y:-60},{x:40,y:0}]},{points:[{x:5,y:-40},{x:35,y:-40}]}]});
  const elements={};
  for(const id of ['review-status','review-writer','review-letter','review-refresh','sample-included','sample-shift','review-save','review-reset','sample-list','review-compose','review-coverage','sample-detail','sample-image','sample-title','sample-date','review-form','review-alphabet','review-kind'])elements[id]=node();
  elements['review-kind'].value='lowercase';
  const requests=[],settings={};
  const fetch=async(url,options={})=>{
    requests.push({url,options});
    let data;
    if(url==='/api/letters/writers')data={writers:[{writer:'Writer',counts:{a:1,j:1,z:1},total_counts:{a:1,j:1,z:1}}]};
    else if(options.method==='POST'){if(failSave)return {ok:false,json:async()=>({error:'Storage unavailable'})};Object.assign(settings,JSON.parse(options.body));data={...settings,svg:svg(settings.baseline_shift_mm)};}
    else{const letter=new URL('https://test.invalid'+url).searchParams.get('letter');data={samples:['a','j','z'].includes(letter)?[{letter,capture_id:'id-'+letter,saved_at:'2026-10-08T12:00:00Z',stroke_count:2,included:true,baseline_shift_mm:initialShift,svg:svg(initialShift)}]:[]};}
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
  e['sample-shift'].value=offset;e['sample-shift'].oninput();
  assert.equal(e['sample-image'].querySelector('svg'),svg);assert.equal(ink.getAttribute('transform'),`translate(0 ${(offset-2)*16})`);assert.equal(svg.getAttribute('viewBox'),frame);
  assert.deepEqual(svg.querySelectorAll('line'),guides);assert.deepEqual(guides.map(g=>g.getAttribute('y1')),guideY);assert.deepEqual(paths.map(p=>p.getAttribute('d')),pathData);
  const [,top,,height]=frame.split(' ').map(Number);for(const p of paths){const b=p.getBBox(),shift=(offset-2)*16;assert(b.y+shift>=top&&b.y+b.height+shift<=top+height);}
 }
 assert.equal(r.requests.length,requestCount);assert.equal(e['review-save'].disabled,false);assert.equal(e['review-letter'].disabled,true);
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'2');assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(0 0)');assert.equal(e['review-save'].disabled,true);
 e['sample-shift'].value='-1.25';e['sample-shift'].oninput();await e['review-form'].onsubmit({preventDefault(){}});
 assert.equal(r.settings.baseline_shift_mm,-1.25);assert.equal(e['sample-image'].querySelector('svg').getAttribute('viewBox'),frame);assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(0 0)');
 assert.equal(e['sample-image'].querySelector('path').getBBox().y,-60-1.25*16);assert.equal(e['review-save'].disabled,true);
 e['sample-shift'].value='1';e['sample-shift'].oninput();assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(0 36)');
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'-1.25');
});

test('invalid offsets retain the last valid preview and a failed save preserves the unsaved adjustment',async()=>{
 const r=await review(false,{failSave:true}),e=r.elements,ink=e['sample-image'].querySelector('g');
 e['sample-shift'].value='2';e['sample-shift'].oninput();assert.equal(ink.getAttribute('transform'),'translate(0 32)');
 for(const value of ['','-', 'NaN','Infinity','10.1','-11']){
  e['sample-shift'].value=value;e['sample-shift'].oninput();assert.equal(ink.getAttribute('transform'),'translate(0 32)');assert.equal(e['review-save'].disabled,true);assert.match(e['review-status'].textContent,/last valid position/);
 }
 e['sample-shift'].value='-3';e['sample-shift'].oninput();await e['review-form'].onsubmit({preventDefault(){}});
 assert.equal(ink.getAttribute('transform'),'translate(0 -48)');assert.equal(e['sample-shift'].value,'-3');assert.equal(e['review-reset'].disabled,false);assert.equal(e['review-save'].disabled,false);assert.match(e['review-status'].textContent,/Not saved/);assert.deepEqual(r.settings,{});
 e['review-reset'].onclick();assert.equal(e['sample-shift'].value,'0');assert.equal(e['sample-image'].querySelector('g').getAttribute('transform'),'translate(0 0)');
});
