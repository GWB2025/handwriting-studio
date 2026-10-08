const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine.js'),{files}=require('./browser_helpers'),{webcrypto}=require('node:crypto');
test('single-character workspace previews slider changes and saves the selected sources',async()=>{
 function element(tag='div'){return {tag,value:'',children:[],listeners:{},dataset:{},append(...nodes){this.children.push(...nodes);if(this.tag==='select'&&!this.value&&nodes[0]?.value)this.value=nodes[0].value;},replaceChildren(){this.children=[];this.value='';},get options(){return this.children;},querySelectorAll(tag){return this.children.flatMap(c=>typeof c==='string'?[]:[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);},addEventListener(name,fn){this.listeners[name]=fn;}};}
 const ids={};for(const id of ['single-writer','single-letter','single-count','single-vertical-label','single-horizontal','single-horizontal-value','single-vertical','single-vertical-value','single-sources','single-cards','single-save','single-refresh','blend-status'])ids[id]=element(['single-writer','single-letter','single-count'].includes(id)?'select':'div');
 ids['single-count'].value='2';ids['single-horizontal'].value='50';ids['single-vertical'].value='50';let records=files(),created=[],requests=[];
 const doc={getElementById:id=>ids[id],createElement:element,querySelectorAll:()=>[]},context={document:doc,crypto:webcrypto,Blob,URL:{createObjectURL:blob=>{created.push(blob);return 'blob:'+created.length;},revokeObjectURL(){}},StudioEngine:E,StudioStorage:{snapshot:async()=>records},studioFetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:requests.at(-1).id})};}};context.window=context;
 await vm.runInNewContext(fs.readFileSync('web/blending.js','utf8'),context);
 assert.equal(ids['single-save'].disabled,false);assert.equal(ids['single-cards'].children.length,3);
 const selectors=ids['single-sources'].querySelectorAll('select'),first=selectors[0].value,second=selectors[1].value;assert.notEqual(first,second);
 selectors[0].value=second;selectors[0].listeners.change();assert.equal(selectors[1].value,first);assert.equal(selectors[0].value,second);
 selectors[1].value=second;selectors[1].listeners.change();assert.equal(selectors[0].value,first);assert.equal(selectors[1].value,second);
 selectors[1].value=selectors[1].options.find(o=>o.value&&o.value!==first&&o.value!==second).value;selectors[1].listeners.change();assert.notEqual(selectors[0].value,selectors[1].value);
 const old=await created.at(-1).text();ids['single-horizontal'].value='100';ids['single-horizontal'].listeners.input();const next=await created.at(-1).text();assert.notEqual(old,next);
 await ids['single-save'].onclick();assert.equal(requests.length,1);assert.equal(requests[0].horizontal,100);assert.equal(requests[0].source_ids.length,2);assert(ids['blend-status'].textContent.includes('Saved a'));
 ids['single-count'].value='4';ids['single-count'].listeners.change();assert.equal(ids['single-save'].disabled,true);assert(ids['blend-status'].textContent.includes('distinct originals'));
 records=[records[0]];await ids['single-refresh'].onclick();
 const single=ids['single-sources'].querySelectorAll('select');assert.equal(single[1].value,'');assert.equal(single[1].disabled,true);assert(ids['blend-status'].textContent.includes('1 included original'));assert.equal(ids['single-save'].disabled,true);
});
