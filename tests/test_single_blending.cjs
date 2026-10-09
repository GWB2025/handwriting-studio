const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine.js'),{files}=require('./browser_helpers'),{webcrypto}=require('node:crypto');
async function workspace(initial,search=''){
 function element(tag='div'){return {tag,style:{},attrs:{},capture:null,setAttribute(name,value){this.attrs[name]=value;},focus(options){this.focusOptions=options;},setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(id){if(this.capture===id)this.capture=null;},set innerHTML(value){this.children=[...value.matchAll(/<path d="([^"]+)"/g)].map(m=>{const p=element('path');p.setAttribute('d',m[1]);return p;});},value:'',children:[],listeners:{},dataset:{},append(...nodes){this.children.push(...nodes);if(this.tag==='select'&&!this.value&&nodes[0]?.value)this.value=nodes[0].value;},replaceChildren(){this.children=[];this.value='';},get options(){return this.children;},querySelectorAll(tag){return this.children.flatMap(c=>typeof c==='string'?[]:[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);},addEventListener(name,fn){this.listeners[name]=fn;}};}
 const ids={};for(const id of ['single-find','single-saved','single-saved-name','single-saved-preview','single-view','single-prefer','single-next','single-saved-choice','single-reopen','single-centre','single-position','single-guides','single-zoom','single-zoom-value','single-pool','single-writer','single-letter','single-count','single-sources','single-cards','single-save','single-refresh','blend-status'])ids[id]=element(['single-saved-choice','single-pool','single-writer','single-letter','single-count'].includes(id)?'select':'div');
 ids['single-guides'].checked=false;ids['single-zoom'].value='100';ids['single-pool'].value='writer';ids['single-count'].value='2';let records=initial||files(),created=[],requests=[];
 const rect={left:20,top:30,width:1000,height:800};ids['single-cards'].getBoundingClientRect=()=>({...rect});
 const doc={getElementById:id=>ids[id],createElement:element,createElementNS:(_,tag)=>element(tag),querySelectorAll:()=>[]},context={document:doc,URLSearchParams,location:{search},crypto:webcrypto,Blob,URL:{createObjectURL:blob=>{created.push(blob);return 'blob:'+created.length;},revokeObjectURL(){}},StudioEngine:E,StudioStorage:{snapshot:async()=>records},studioFetch:async(url,options)=>{const data=JSON.parse(options.body);requests.push(data);try{if(url==='/api/blends'){const value=E.createSavedBlend(records,data);if(!records.some(f=>f.key==='blends/'+value.id+'.json'))records.push({key:'blends/'+value.id+'.json',value});return {ok:true,json:async()=>({id:value.id})};}const pref=E.choosePreferred(records,data),old=records.findIndex(f=>f.key===pref.key);if(old<0)records.push(pref);else records[old]=pref;return {ok:true,json:async()=>({saved:true})};}catch(e){return {ok:false,json:async()=>({error:e.message})};}}};context.window=context;
 await vm.runInNewContext(fs.readFileSync('web/blending.js','utf8'),context);
 function event(fig,type,x=500,y=400,extra={}){const e={pointerId:11,isPrimary:true,button:0,clientX:x,clientY:y,preventDefault(){this.prevented=true;},...extra};fig.listeners[type](e);return e;}
 function dragTo(fig,h,v=50){const currentH=(parseFloat(fig.style.left)-15)/70,currentV=(parseFloat(fig.style.top)-20)/60;const x=500+(h/100-currentH)*rect.width*.7,y=400+(v/100-currentV)*rect.height*.6;event(fig,'pointerdown');event(fig,'pointermove',x,y);event(fig,'pointerup',x,y);}
 return {ids,created,requests,rect,event,dragTo,get records(){return records;},set records(value){records=value;}};
}
test('dragging two sources keeps previews stable, supports zoom and saves the visible position',async()=>{
 const w=await workspace(),{ids,created,requests}=w;
 assert.equal(ids['single-save'].disabled,false);assert.equal(ids['single-cards'].children.length,3);
 const selectors=ids['single-sources'].querySelectorAll('select'),first=selectors[0].value,second=selectors[1].value;assert.notEqual(first,second);
 selectors[0].value=second;selectors[0].listeners.change();assert.equal(selectors[1].value,first);assert.equal(selectors[0].value,second);
 selectors[1].value=second;selectors[1].listeners.change();assert.equal(selectors[0].value,first);assert.equal(selectors[1].value,second);
 selectors[1].value=selectors[1].options.find(o=>o.value&&o.value!==first&&o.value!==second).value;selectors[1].listeners.change();assert.notEqual(selectors[0].value,selectors[1].value);
 const cards=ids['single-cards'].children.slice(),sourceSVG=cards[0].children[1],figure=cards[2],resultSVG=figure.children[1],resultPaths=resultSVG.querySelectorAll('path'),viewBox=resultSVG.attrs.viewBox;
 assert.equal(ids['single-cards'].dataset.guides,'false');ids['single-guides'].checked=true;ids['single-guides'].listeners.change();assert.equal(ids['single-cards'].dataset.guides,'true');ids['single-zoom'].value='170';ids['single-zoom'].listeners.input();w.rect.width=1700;assert.equal(ids['single-cards'].style.width,'170%');assert.equal(ids['single-cards'].children[2],figure);assert.equal(resultSVG.attrs.viewBox,viewBox);
 const old=resultPaths[0].attrs.d,sourcePath=sourceSVG.querySelectorAll('path')[0].attrs.d;
 for(const h of [0,30,70,100]){w.dragTo(figure,h,90);assert.equal(ids['single-cards'].children[2],figure);assert.equal(figure.children[1],resultSVG);assert.equal(resultSVG.querySelectorAll('path')[0],resultPaths[0]);assert.equal(resultSVG.attrs.viewBox,viewBox);assert.equal(figure.style.top,'50%');assert(Math.abs(parseFloat(figure.style.left)-(15+.7*h))<.0001);}
 assert.notEqual(old,resultPaths[0].attrs.d);assert.equal(sourceSVG.querySelectorAll('path')[0].attrs.d,sourcePath);assert.equal(created.length,0);assert.equal(figure.focusOptions.preventScroll,true);assert.equal(figure.capture,null);
 await ids['single-save'].onclick();assert.equal(requests[0].horizontal,100);assert.equal(requests[0].vertical,50);assert.equal(requests[0].source_ids.length,2);
 ids['single-count'].value='4';ids['single-count'].listeners.change();assert.equal(ids['single-save'].disabled,true);assert(ids['blend-status'].textContent.includes('distinct originals'));assert.equal(ids['single-position'].textContent,'');assert.equal(ids['single-cards'].dataset.count,'4');
 w.records=[w.records[0]];await ids['single-refresh'].onclick();const single=ids['single-sources'].querySelectorAll('select');assert.equal(single[1].value,'');assert.equal(single[1].disabled,true);assert(ids['blend-status'].textContent.includes('1 included original'));
});
test('four-source dragging reaches all corners, clamps outside and persists bilinear position',async()=>{
 const w=await workspace(),{ids}=w,original=w.records[0];w.records=Array.from({length:4},(_,i)=>{const r=E.clone(original);r.value.id=webcrypto.randomUUID();r.key='letters/'+r.value.id+'.json';r.value.writer='Gordon-00'+(i+1)+'-lower';return r;});await ids['single-refresh'].onclick();
 ids['single-count'].value='4';ids['single-count'].listeners.change();assert.equal(ids['single-save'].disabled,true);ids['single-pool'].value='all';ids['single-pool'].listeners.change();assert.equal(ids['single-save'].disabled,false);
 const figure=ids['single-cards'].children[4],box=figure.children[1].attrs.viewBox;
 for(const [h,v] of [[0,0],[100,0],[0,100],[100,100],[25,75]]){w.dragTo(figure,h,v);assert(Math.abs(parseFloat(figure.style.left)-(15+.7*h))<.0001);assert(Math.abs(parseFloat(figure.style.top)-(20+.6*v))<.0001);assert.equal(figure.children[1].attrs.viewBox,box);}
 await ids['single-save'].onclick();assert.equal(w.requests.at(-1).horizontal,25);assert.equal(w.requests.at(-1).vertical,75);const saved=E.createSavedBlend(w.records,w.requests.at(-1));assert.deepEqual(saved.weights,[.1875,.0625,.5625,.1875]);
 w.event(figure,'pointerdown');w.event(figure,'pointermove',-10000,10000);w.event(figure,'pointerup',-10000,10000);assert.equal(figure.style.left,'15%');assert.equal(figure.style.top,'80%');
 ids['single-centre'].onclick();assert.equal(figure.style.left,'50%');assert.equal(figure.style.top,'50%');
});
test('dragging ignores other pointers, stops on cancellation, and supports arrow keys',async()=>{
 const w=await workspace(),figure=w.ids['single-cards'].children[2];w.event(figure,'pointerdown',500,400,{isPrimary:false});assert.equal(figure.capture,null);
 w.event(figure,'pointerdown');w.event(figure,'pointermove',850,400,{pointerId:12});assert.equal(figure.style.left,'50%');w.event(figure,'pointercancel');w.event(figure,'pointermove',850,400);assert.equal(figure.style.left,'50%');assert.equal(figure.capture,null);
 figure.listeners.keydown({key:'ArrowRight',shiftKey:true,preventDefault(){}});assert.equal(figure.style.left,'57%');figure.listeners.keydown({key:'ArrowUp',preventDefault(){}});assert.equal(figure.style.top,'50%');
 w.ids['single-centre'].onclick();w.event(figure,'pointerdown');w.event(figure,'pointermove',700,400);const last=figure.style.left;w.event(figure,'lostpointercapture');w.event(figure,'pointermove',850,400);assert.equal(figure.style.left,last);
});

test('saving shows the destination and can prefer that blend or move to the next character',async()=>{
 const w=await workspace(),{ids}=w;await ids['single-save'].onclick();const saved=w.requests[0];
 assert.equal(ids['single-saved'].hidden,false);assert.match(ids['single-saved-name'].textContent,/Saved a under Writer/);assert(ids['single-view'].href.includes(saved.id));
 await ids['single-prefer'].onclick();assert.equal(E.catalog(w.records).writers[0].preferred.a,saved.id);
 assert.equal(E.compose(w.records,{writer:'Writer',phrase:'aa'}).used_samples[0].capture_id,saved.id);
 ids['single-next'].onclick();assert.equal(ids['single-letter'].value,'b');assert.equal(ids['single-saved'].hidden,true);assert.equal(ids['single-cards'].children.at(-1).style.left,'50%');
});
test('reopen restores sources and stored shifts after reviews change; saving creates a separate version',async()=>{
 const w=await workspace(),{ids}=w;w.dragTo(ids['single-cards'].children.at(-1),25);await ids['single-save'].onclick();
 const old=w.records.find(f=>f.key==='blends/'+w.requests[0].id+'.json'),snapshot=JSON.stringify(old),sourceID=old.value.source_ids[0];
 w.records.push({key:'letter_reviews/'+sourceID+'.json',value:{schema_version:1,capture_id:sourceID,reviews:{a:{included:true,baseline_shift_mm:3}}}});await ids['single-refresh'].onclick();
 ids['single-saved-choice'].value=old.value.id;ids['single-reopen'].onclick();
 assert.equal(ids['single-cards'].children.at(-1).style.left,'32.5%');assert.deepEqual(ids['single-sources'].querySelectorAll('select').map(s=>s.value),old.value.source_ids);
 await ids['single-save'].onclick();const next=w.records.find(f=>f.key==='blends/'+w.requests.at(-1).id+'.json');assert.notEqual(next.value.id,old.value.id);assert.deepEqual(next.value.samples,old.value.samples);assert.equal(JSON.stringify(old),snapshot);
 const reopened=await workspace(w.records,'?blend='+old.value.id);assert.equal(reopened.ids['single-cards'].children.at(-1).style.left,'32.5%');
});

test('automatic source choices skip an incompatible default, while manual choices stay put until Find is used',async()=>{
 const original=files()[0],records=Array.from({length:5},(_,i)=>{
  const record=E.clone(original);record.value.id=webcrypto.randomUUID();record.key='letters/'+record.value.id+'.json';record.value.saved_at=new Date(Date.UTC(2026,9,2,0,5-i)).toISOString();
  if(i===3){const points=record.value.raw_strokes[0].points;record.value.raw_strokes[0].points=points.map((p,j)=>({...p,x:points.at(-1-j).x,y:points.at(-1-j).y}));record.value.samples=E.extract(record.value.raw_strokes,record.value.order,record.value.schema_version);}
  E.validateRecord(record.key,record.value);return record;
 }),before=JSON.stringify(records),w=await workspace(records),{ids}=w;
 ids['single-count'].value='4';ids['single-count'].listeners.change();
 const menus=ids['single-sources'].querySelectorAll('select');assert.deepEqual(menus.map(s=>s.value),[0,1,2,4].map(i=>records[i].value.id));assert.equal(ids['single-save'].disabled,false);
 menus[3].value=records[3].value.id;menus[3].listeners.change();assert.equal(menus[3].value,records[3].value.id);assert.equal(ids['single-save'].disabled,true);
 assert.match(ids['blend-status'].textContent,/Source A and Source D/);assert.match(ids['blend-status'].textContent,/direction/);
 ids['single-find'].onclick();assert.deepEqual(menus.map(s=>s.value),[0,1,2,4].map(i=>records[i].value.id));assert.equal(ids['single-save'].disabled,false);assert.equal(JSON.stringify(records),before);
 await ids['single-save'].onclick();E.validateBlendReferences(w.records);
});

test('no compatible set keeps manual selections visible and explains the next options',async()=>{
 const w=await workspace(),{ids}=w;
 w.records=w.records.filter(f=>f.value.order.includes('a')).slice(0,2);
 const record=w.records[1].value,index=[...record.order].indexOf('a'),strokeIndex=record.samples[index].raw_stroke_indices[0],points=record.raw_strokes[strokeIndex].points;
 record.raw_strokes[strokeIndex].points=points.map((p,j)=>({...p,x:points.at(-1-j).x,y:points.at(-1-j).y}));record.samples=E.extract(record.raw_strokes,record.order,record.schema_version);
 await ids['single-refresh'].onclick();const menus=ids['single-sources'].querySelectorAll('select'),before=menus.map(s=>s.value);
 assert.equal(ids['single-save'].disabled,true);ids['single-find'].onclick();assert.deepEqual(menus.map(s=>s.value),before);assert.equal(ids['single-save'].disabled,true);assert.match(ids['blend-status'].textContent,/Could not find 2 compatible originals/);
});
