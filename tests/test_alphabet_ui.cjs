const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine'),{files}=require('./browser_helpers');
async function workspace(initial=files(),search='?writer=Writer'){
 function element(tag='div'){return {tag,dataset:{},style:{setProperty(k,v){this[k]=v;}},classList:{add(){}},children:[],value:'',attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},append(...nodes){this.children.push(...nodes);if(tag==='select'&&!this.value)this.value=nodes[0]?.value||'';},replaceChildren(){this.children=[];this.value='';},addEventListener(k,v){this.listeners[k]=v;}};}
 const ids=Object.fromEntries(['alphabet-previews','alphabet-zoom','alphabet-zoom-value','alphabet-zoom-reset','alphabet-colours','alphabet-proof','alphabet-writer','alphabet-kind','alphabet-refresh','alphabet-summary','alphabet-gaps','alphabet-status','alphabet-grid','alphabet-samples','alphabet-compose','alphabet-heading','alphabet-choice','alphabet-clear'].map(id=>[id,element(id==='alphabet-writer'||id==='alphabet-kind'?'select':'div')]));ids['alphabet-kind'].value='lowercase';ids['alphabet-zoom'].value='100';ids['alphabet-colours'].checked=true;
 let records=initial,requests=[];const doc={hidden:false,getElementById:id=>ids[id],createElement:element,querySelectorAll:()=>[],addEventListener(){}};
 const context={document:doc,StudioEngine:E,StudioStorage:{snapshot:async()=>records},URLSearchParams,location:{search},addEventListener(){},studioFetch:async(url,options)=>{const data=JSON.parse(options.body);requests.push(data);const r=E.choosePreferred(records,data);records=records.filter(f=>f.key!==r.key).concat(r);return {ok:true,json:async()=>({saved:true})};}};context.window=context;
 await vm.runInNewContext(fs.readFileSync('web/alphabet.js','utf8'),context);
 return {ids,requests,get records(){return records;}};
}
test('alphabet overview shows gaps, saves a preferred sample and clears it',async()=>{
 const {ids,requests}=await workspace();
 assert(ids['alphabet-proof'].href.includes('kind=lowercase'));assert.equal(ids['alphabet-grid'].children.length,26);assert(ids['alphabet-summary'].textContent.includes('26 of 26'));assert(ids['alphabet-gaps'].textContent.includes('No included saved blend yet'));assert.equal(ids['alphabet-samples'].children.length,3);
 const sampleButton=ids['alphabet-samples'].children[2].children[2];await sampleButton.onclick();assert.equal(requests[0].letter,'a');assert(ids['alphabet-choice'].textContent.startsWith('Preferred:'));assert.equal(ids['alphabet-clear'].disabled,false);assert(ids['alphabet-status'].textContent.includes('saved'));
 await ids['alphabet-clear'].onclick();assert.equal(requests[1].capture_id,null);assert.equal(ids['alphabet-clear'].disabled,true);assert(ids['alphabet-compose'].href.includes('writer=Writer'));
 ids['alphabet-kind'].value='uppercase';ids['alphabet-kind'].listeners.change();assert(ids['alphabet-summary'].textContent.includes('0 of 26'));assert.equal(ids['alphabet-samples'].children.length,0);assert(ids['alphabet-choice'].textContent.includes('No samples'));
});

test('preview zoom and colours update existing cards without saving or replacing their images',async()=>{
 const records=files(),before=JSON.stringify(records),{ids,requests}=await workspace(records),grid=ids['alphabet-grid'].children.slice(),cards=ids['alphabet-samples'].children.slice(),first=cards[0].children[1];
 assert.equal(ids['alphabet-previews'].dataset.colourStrokes,'true');
 ids['alphabet-zoom'].value='250';ids['alphabet-zoom'].listeners.input();
 assert.equal(ids['alphabet-zoom-value'].textContent,'250%');assert.equal(ids['alphabet-previews'].style['--alphabet-tile-height'],'250px');assert.equal(ids['alphabet-previews'].style['--alphabet-sample-height'],'450px');
 ids['alphabet-colours'].checked=false;ids['alphabet-colours'].listeners.change();assert.equal(ids['alphabet-previews'].dataset.colourStrokes,'false');
 assert.deepEqual(ids['alphabet-grid'].children,grid);assert.deepEqual(ids['alphabet-samples'].children,cards);assert.equal(cards[0].children[1],first);
 ids['alphabet-grid'].children[1].onclick();assert.equal(ids['alphabet-previews'].style['--alphabet-sample-height'],'450px');assert.equal(ids['alphabet-previews'].dataset.colourStrokes,'false');
 ids['alphabet-zoom-reset'].onclick();assert.equal(ids['alphabet-zoom-value'].textContent,'100%');assert.equal(ids['alphabet-previews'].style['--alphabet-tile-height'],'100px');
 assert.equal(requests.length,0);assert.equal(JSON.stringify(records),before);
});

test('separate strokes are coloured and samples share a fitted frame that contains every stroke',async()=>{
 const records=files(),r=records.find(f=>f.value.order.includes('t')).value,index=[...r.order].indexOf('t'),x=index*1000/r.order.length,t=r.raw_strokes.at(-1).points.at(-1).t;
 r.raw_strokes.push({pointerType:'pen',points:[{x:x+20,y:275,t:t+1},{x:x+80,y:275,t:t+2}]});r.samples=E.extract(r.raw_strokes,r.order,r.schema_version);E.validateRecord('letters/'+r.id+'.json',r);
 const before=JSON.stringify(records),{ids}=await workspace(records,'?writer=Writer&letter=t');
 const previews=ids['alphabet-samples'].children.map(card=>card.children[1]),boxes=previews.map(p=>p.innerHTML.match(/viewBox="([^"]+)"/)[1]);assert.equal(new Set(boxes).size,1);
 const coloured=previews.find(p=>p.innerHTML.includes('#1463d6'));assert(coloured);assert.equal(coloured.attrs['aria-label'],'t · 2 pen strokes');assert(!coloured.innerHTML.includes('<line'));
 const [left,top,width,height]=boxes[0].split(' ').map(Number);
 for(const s of E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='t'))for(const stroke of s.processed_strokes)for(const p of stroke.points){assert(p.x>left&&p.x<left+width);assert(p.y>top&&p.y<top+height);}
 assert(height<290);assert.equal(JSON.stringify(records),before);
 const sample=E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='t'&&s.processed_strokes.length===2),plain=E.reviewSVG(sample),colour=E.reviewSVG(sample,{colourStrokes:true});
 assert.deepEqual([...plain.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]),[...colour.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]));assert(!plain.includes('#1463d6'));
 const composed=E.compose(records,{writer:'Writer',phrase:'tt',samples:'all'});assert(!composed.svg.includes('#1463d6'));assert(composed.svg.includes('stroke="black"'));
});
