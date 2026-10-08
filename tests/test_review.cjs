const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,(process.env.STUDIO_PAGES_TEST?'../docs/assets/':'../static/')+'review.js'),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function review(extended=false){
  function node(){let value='';return {get value(){return value;},set value(v){value=String(v);},checked:false,dataset:{},children:[],attributes:{},
    append(...items){this.children.push(...items);if(!this.value&&items[0]?.value)this.value=items[0].value;},
    replaceChildren(){this.children=[];this.value='';},
    querySelectorAll(){return this.children;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this[k];}};}
  const elements={};
  for(const id of ['review-status','review-writer','review-letter','review-refresh','sample-included','sample-shift','review-save','review-reset','sample-list','review-compose','review-coverage','sample-detail','sample-image','sample-title','sample-date','review-form','review-alphabet','review-kind'])elements[id]=node();
  elements['review-kind'].value='lowercase';
  const requests=[],settings={};
  const fetch=async(url,options={})=>{
    requests.push({url,options});
    let data;
    if(url==='/api/letters/writers')data={writers:[{writer:'Writer',counts:{a:1,j:1,z:1},total_counts:{a:1,j:1,z:1}}]};
    else if(options.method==='POST'){Object.assign(settings,JSON.parse(options.body));data={...settings,svg:'<svg/>'};}
    else{const letter=new URL('https://test.invalid'+url).searchParams.get('letter');data={samples:['a','j','z'].includes(letter)?[{letter,capture_id:'id-'+letter,saved_at:'2026-10-08T12:00:00Z',stroke_count:2,included:true,baseline_shift_mm:0,svg:'<svg/>'}]:[]};}
    return {ok:true,json:async()=>data};
  };
  const window={...(extended?{StudioEngine:require('../web/engine.js')} : {}),location:{search:'?writer=Writer'},addEventListener(){},studioFetch:fetch};
  vm.runInNewContext(source,{window,document:{hidden:false,getElementById:id=>elements[id],createElement:node,addEventListener(){}},fetch,URLSearchParams,AbortController,Blob,setTimeout,clearTimeout,URL:{createObjectURL:()=> 'blob:sample',revokeObjectURL(){}}});
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
