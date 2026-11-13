const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine'),{files}=require('./browser_helpers');
async function workspace(){
 function element(tag='div'){return {tag,value:'',hidden:false,disabled:false,checked:true,style:{},children:[],listeners:{},append(...nodes){this.children.push(...nodes);if(tag==='select'&&!this.value)this.value=nodes[0]?.value||'';},replaceChildren(){this.children=[];this.value='';},addEventListener(name,fn){this.listeners[name]=fn;},click(){downloads.push(this.download);},remove(){}};}
 const ids={};for(const id of ['proof-underline','proof-ununderline','proof-underline-status','proof-connect','proof-tab','proof-fit','proof-paper','proof-orientation','proof-zoom','proof-view-status','proof-natural','proof-natural-new','proof-natural-controls','proof-example','proof-example-note','proof-text-credit','proof-text-label','proof-previous','proof-next','proof-page-number','proof-mode','proof-alphabet-text','proof-comparison-text','proof-writing-size','proof-compare-size','proof-compare-text','proof-writer','proof-kind','proof-source','proof-size','proof-smooth','proof-sentence','proof-refresh','proof-svg','proof-gcode','proof-status','proof-missing','proof-image'])ids[id]=element(['proof-writer','proof-kind','proof-source','proof-size'].includes(id)?'select':'div');
 ids['proof-paper'].value='a4';ids['proof-orientation'].value='portrait';ids['proof-compare-size'].value='classic';ids['proof-zoom'].value='100';ids['proof-mode'].value='alphabet';ids['proof-natural'].value='off';ids['proof-compare-text'].value='f i j l t z\nfizz\njilt';ids['proof-kind'].value='lowercase';ids['proof-source'].value='both';ids['proof-size'].value='5';const records=files(),urls=[],downloads=[],exported=[];let snapshot=async()=>records;
 const doc={getElementById:id=>ids[id],createElement:element,body:element(),addEventListener(){}},context={document:doc,StudioEngine:E,crypto:require('node:crypto').webcrypto,StudioComparison:require('../web/proof-comparison'),StudioStorage:{snapshot:()=>snapshot()},StudioPlotter:{fromSVG(svg){exported.push(svg);return 'G21\n';}},Blob,URLSearchParams,URL:{createObjectURL(blob){urls.push(blob);return 'blob:'+urls.length;},revokeObjectURL(){}},setTimeout,clearTimeout,location:{search:'?writer=Writer'},addEventListener(){}};context.window=context;
 const root=process.env.STUDIO_PAGES_TEST?'docs/assets/':'web/';vm.runInNewContext(fs.readFileSync(root+'proof-texts.js','utf8'),context);
 await vm.runInNewContext(fs.readFileSync(root+'proof.js','utf8'),context);return {ids,records,urls,downloads,exported,setSnapshot(fn){snapshot=fn;}};
}
test('proof sheet refreshes physical size, exports the displayed SVG, and blocks missing sentence characters',async()=>{
 const w=await workspace(),e=w.ids;assert.equal(e['proof-svg'].disabled,false);assert.match(e['proof-status'].textContent,/26 characters/);assert.equal(e['proof-sentence'].value,'the quick brown fox jumps over the lazy dog');
 const svg=await w.urls.at(-1).text();e['proof-gcode'].onclick();assert.equal(w.exported[0],svg);assert.equal(w.downloads.at(-1),'alphabet-proof-a4.gcode');
 e['proof-size'].value='3';e['proof-size'].listeners.change();assert.equal(e['proof-svg'].disabled,true);await e['proof-refresh'].onclick();assert.notEqual(await w.urls.at(-1).text(),svg);assert.match(e['proof-status'].textContent,/3 mm/);
 e['proof-sentence'].value='XYZ';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,true);assert.equal(e['proof-gcode'].disabled,true);assert.match(e['proof-status'].textContent,/No included samples for: X, Y, Z/);
 e['proof-sentence'].value='';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,false);assert.equal(e['proof-sentence'].value,'');
});
test('a stale proof load cannot replace a newer preview or reenable downloads',async()=>{
 const w=await workspace(),e=w.ids;let resolve;w.setSnapshot(()=>new Promise(r=>resolve=r));const pending=e['proof-refresh'].onclick();e['proof-source'].value='blends';e['proof-source'].listeners.change();assert.equal(e['proof-svg'].disabled,true);
 w.setSnapshot(async()=>w.records);await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/No included samples/);resolve(w.records);await pending;assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/No included samples/);
});

test('larger proof sizes update automatically and export the enlarged page',async()=>{
 const w=await workspace(),e=w.ids;
 for(const height of [10,12,16,20]){
  const previous=await w.urls.at(-1).text();e['proof-size'].value=String(height);e['proof-size'].listeners.change();assert.equal(e['proof-gcode'].disabled,true);
  await new Promise(resolve=>setTimeout(resolve,260));assert.equal(e['proof-gcode'].disabled,false);assert.match(e['proof-status'].textContent,new RegExp(height+' mm'));
  const displayed=await w.urls.at(-1).text();assert.notEqual(displayed,previous);e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),displayed);
 }
});

test('comparison mode shows three sizes, reports missing versions and exports the labelled preview',async()=>{
 const w=await workspace(),e=w.ids;e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();assert.equal(e['proof-kind'].disabled,true);assert.equal(e['proof-size'].disabled,true);assert.equal(e['proof-comparison-text'].hidden,false);await e['proof-refresh'].onclick();
 assert.equal(e['proof-svg'].disabled,false);assert.match(e['proof-status'].textContent,/3, 5 and 8/);assert.match(e['proof-missing'].textContent,/Crossed boxes/);const svg=await w.urls.at(-1).text();
 e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),svg);assert.equal(w.downloads.at(-1),'comparison-proof-a4.gcode');
 e['proof-compare-text'].value='a'.repeat(100);e['proof-compare-text'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/shorter/);
 e['proof-mode'].value='alphabet';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-size'].disabled,false);assert.equal(e['proof-svg'].disabled,false);
});

test('comparison sizes through 20 mm refresh and export the chosen size without changing alphabet size',async()=>{
 const w=await workspace(),e=w.ids;e['proof-size'].value='12';e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();
 assert.equal(e['proof-writing-size'].hidden,true);assert.equal(e['proof-compare-size'].disabled,false);e['proof-compare-text'].value='a';
 for(const height of [3,5,8,10,12,16,20]){
  e['proof-compare-size'].value=String(height);e['proof-compare-size'].listeners.change();assert.equal(e['proof-svg'].disabled,true);await e['proof-refresh'].onclick();
  assert.equal(e['proof-svg'].disabled,false);assert.match(e['proof-status'].textContent,new RegExp('comparison at '+height+' mm'));
  const displayed=await w.urls.at(-1).text();e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),displayed);assert.equal(w.downloads.at(-1),'comparison-proof-a4.gcode');
 }
 e['proof-mode'].value='alphabet';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-writing-size'].hidden,false);assert.equal(e['proof-size'].value,'12');assert.equal(e['proof-compare-size'].disabled,true);
 e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.match(e['proof-status'].textContent,/comparison at 20 mm/);
 e['proof-compare-size'].value='classic';e['proof-compare-size'].listeners.change();await e['proof-refresh'].onclick();assert.match(e['proof-status'].textContent,/3, 5 and 8 mm/);
});

test('pangrams and Sonnet 18 load editable text, preserve edits and report missing original capitals and punctuation',async()=>{
 const w=await workspace(),e=w.ids,choose=async id=>{e['proof-example'].value=id;e['proof-example'].listeners.change();assert.equal(e['proof-svg'].disabled,true);await e['proof-refresh'].onclick();};
 await choose('pack-box');assert.equal(e['proof-sentence'].value,'pack my box with five dozen liquor jugs');assert.equal(e['proof-mode'].value,'alphabet');assert.equal(e['proof-svg'].disabled,false);
 await choose('sonnet-lowercase');assert.equal(e['proof-mode'].value,'passage');assert.equal(e['proof-kind'].disabled,true);assert.equal(e['proof-source'].disabled,false);assert.equal(e['proof-text-credit'].hidden,false);assert.equal(e['proof-sentence'].value.split('\n').length,14);assert.equal(e['proof-svg'].disabled,false);
 const poem=e['proof-sentence'].value;e['proof-size'].value='8';e['proof-size'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-sentence'].value,poem);
 await choose('sonnet-original');assert.match(e['proof-sentence'].value,/^Shall I compare/);assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/No included samples for:/);
 await choose('handwriting-sonnet-lowercase');assert.equal(e['proof-mode'].value,'passage');assert.equal(e['proof-sentence'].value.split('\n').length,14);assert.equal(e['proof-svg'].disabled,false);assert.equal(e['proof-text-credit'].hidden,true);assert.match(e['proof-example-note'].textContent,/original sonnet by Codex/);
 await choose('handwriting-sonnet-original');assert.match(e['proof-sentence'].value,/^Upon the page/);assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/No included samples for:/);assert.equal(e['proof-text-credit'].hidden,true);
 e['proof-sentence'].value='a bad cab\nabc';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-example'].value,'custom');assert.equal(e['proof-text-credit'].hidden,true);assert.equal(e['proof-svg'].disabled,false);
 e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();e['proof-mode'].value='passage';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-sentence'].value,'a bad cab\nabc');
});

test('passage navigation exports exactly the displayed page and invalid edits cannot download a stale page',async()=>{
 const w=await workspace(),e=w.ids;e['proof-mode'].value='passage';e['proof-mode'].listeners.change();e['proof-size'].value='8';e['proof-sentence'].value=Array(80).fill('a bad cab').join('\n');e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();
 assert.match(e['proof-page-number'].textContent,/Page 1 of [2-9]/);assert.equal(e['proof-previous'].disabled,true);assert.equal(e['proof-next'].disabled,false);const first=await w.urls.at(-1).text();e['proof-gcode'].onclick();assert.equal(w.downloads.at(-1),'text-proof-a4-page-1.gcode');assert.equal(w.exported.at(-1),first);
 e['proof-next'].onclick();const second=await w.urls.at(-1).text();assert.notEqual(first,second);assert.match(e['proof-page-number'].textContent,/Page 2/);e['proof-gcode'].onclick();assert.equal(w.downloads.at(-1),'text-proof-a4-page-2.gcode');assert.equal(w.exported.at(-1),second);
 await e['proof-refresh'].onclick();assert.match(e['proof-page-number'].textContent,/Page 2/);assert.equal(await w.urls.at(-1).text(),second);
 e['proof-previous'].onclick();assert.equal(await w.urls.at(-1).text(),first);
 while(!e['proof-next'].disabled)e['proof-next'].onclick();const last=await w.urls.at(-1).text();e['proof-next'].onclick();assert.equal(await w.urls.at(-1).text(),last);
 const count=w.downloads.length;e['proof-sentence'].value='Z';e['proof-sentence'].listeners.input();e['proof-gcode'].onclick();e['proof-next'].onclick();assert.equal(w.downloads.length,count);assert.equal(e['proof-next'].disabled,true);await e['proof-refresh'].onclick();assert.equal(e['proof-image'].hidden,true);assert.equal(e['proof-svg'].disabled,true);
 e['proof-sentence'].value='a';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-page-number'].textContent,'Page 1 of 1');e['proof-gcode'].onclick();assert.equal(w.downloads.at(-1),'text-proof-a4.gcode');
 e['proof-sentence'].value='';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/Enter a passage/);
});

test('natural proof settings preserve a pattern through refresh, amount changes and comparison mode',async()=>{
 const w=await workspace(),e=w.ids;e['proof-connect'].checked=false;e['proof-connect'].listeners.change();await e['proof-refresh'].onclick();const plain=await w.urls.at(-1).text();assert.equal(e['proof-natural-new'].disabled,true);
 e['proof-natural'].value='subtle';e['proof-natural'].listeners.change();assert.equal(e['proof-svg'].disabled,true);await e['proof-refresh'].onclick();const subtle=await w.urls.at(-1).text();assert.notEqual(subtle,plain);
 await e['proof-refresh'].onclick();assert.equal(await w.urls.at(-1).text(),subtle);
 e['proof-natural'].value='pronounced';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();assert.notEqual(await w.urls.at(-1).text(),subtle);
 e['proof-natural'].value='subtle';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();assert.equal(await w.urls.at(-1).text(),subtle);
 e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-natural-controls'].hidden,true);assert.equal(e['proof-natural-new'].disabled,true);
 e['proof-mode'].value='alphabet';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(await w.urls.at(-1).text(),subtle);
 e['proof-natural-new'].onclick();assert.equal(e['proof-gcode'].disabled,true);await e['proof-refresh'].onclick();const next=await w.urls.at(-1).text();assert.notEqual(next,subtle);e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),next);
 e['proof-natural'].value='off';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();assert.equal(await w.urls.at(-1).text(),plain);assert.equal(e['proof-natural-new'].disabled,true);
});

test('changing natural variation updates the proof automatically without Refresh preview',async()=>{
 const w=await workspace(),e=w.ids;e['proof-connect'].checked=false;e['proof-connect'].listeners.change();await e['proof-refresh'].onclick();const plain=await w.urls.at(-1).text();
 e['proof-natural'].value='pronounced';e['proof-natural'].listeners.change();assert.equal(e['proof-svg'].disabled,true);
 await new Promise(resolve=>setTimeout(resolve,260));
 assert.equal(e['proof-svg'].disabled,false);const changed=await w.urls.at(-1).text();assert.notEqual(changed,plain);
 e['proof-natural-new'].onclick();await new Promise(resolve=>setTimeout(resolve,260));assert.equal(e['proof-svg'].disabled,false);assert.notEqual(await w.urls.at(-1).text(),changed);
 e['proof-natural'].value='off';e['proof-natural'].listeners.change();await new Promise(resolve=>setTimeout(resolve,260));assert.equal(await w.urls.at(-1).text(),plain);
});

test('proof zoom enlarges only the display and survives variation updates and page navigation',async()=>{
 const w=await workspace(),e=w.ids;let snapshots=0;w.setSnapshot(async()=>{snapshots++;return w.records;});
 e['proof-mode'].value='passage';e['proof-mode'].listeners.change();e['proof-sentence'].value=Array(80).fill('a bad cab').join('\n');e['proof-sentence'].listeners.input();
 e['proof-natural'].value='pronounced';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();
 const svg=await w.urls.at(-1).text(),blobCount=w.urls.length,loadCount=snapshots,src=e['proof-image'].src;
 for(const value of ['150','200','300','400','100','300']){e['proof-zoom'].value=value;e['proof-zoom'].listeners.change();}
 assert.equal(snapshots,loadCount);assert.equal(w.urls.length,blobCount);assert.equal(e['proof-image'].src,src);assert.equal(e['proof-image'].style.width,'min(300%, 1950px)');
 assert.equal(e['proof-svg'].disabled,false);assert.match(e['proof-view-status'].textContent,/More pronounced.*300%/);e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),svg);
 e['proof-svg'].onclick();assert.equal(await w.urls.at(-1).text(),svg);
 e['proof-next'].onclick();assert.match(e['proof-page-number'].textContent,/Page 2/);assert.equal(e['proof-image'].style.width,'min(300%, 1950px)');
 e['proof-previous'].onclick();assert.equal(await w.urls.at(-1).text(),svg);
 e['proof-natural'].value='subtle';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-image'].style.width,'min(300%, 1950px)');
 e['proof-natural'].value='pronounced';e['proof-natural'].listeners.change();await e['proof-refresh'].onclick();assert.equal(await w.urls.at(-1).text(),svg);
});

test('proof inspection status distinguishes Off, updating, failed and comparison previews even when zoom changes',async()=>{
 const w=await workspace(),e=w.ids;assert.match(e['proof-view-status'].textContent,/Off.*choose Subtle.*fit page width/);
 e['proof-natural'].value='subtle';e['proof-natural'].listeners.change();e['proof-zoom'].value='200';e['proof-zoom'].listeners.change();assert.match(e['proof-view-status'].textContent,/Subtle.*200%.*Updating/);
 await e['proof-refresh'].onclick();assert.doesNotMatch(e['proof-view-status'].textContent,/Updating|unavailable/);
 e['proof-sentence'].value='Z';e['proof-sentence'].listeners.input();await e['proof-refresh'].onclick();e['proof-zoom'].value='300';e['proof-zoom'].listeners.change();
 assert.match(e['proof-view-status'].textContent,/300%.*Preview unavailable/);assert.doesNotMatch(e['proof-view-status'].textContent,/Updating/);assert.equal(e['proof-svg'].disabled,true);
 e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.match(e['proof-view-status'].textContent,/Compare versions.*not applied.*300%/);assert.doesNotMatch(e['proof-view-status'].textContent,/Updating|unavailable/);
});

test('Fit to page finds a fractional physical size and page choices reach the SVG',async()=>{
 const w=await workspace(),e=w.ids;
 e['proof-mode'].value='passage';e['proof-mode'].listeners.change();e['proof-sentence'].value=Array(14).fill('the quick brown fox jumps over the lazy dog').join('\n');e['proof-sentence'].listeners.input();
 await e['proof-fit'].onclick();assert.equal(e['proof-page-number'].textContent,'Page 1 of 1');assert.match(e['proof-status'].textContent,/Fitted to one page/);const height=Number(e['proof-size'].value);assert(height>=2&&height<=20);
 const opts={writer:'Writer',sentence:e['proof-sentence'].value,text_only:true,height:height+.1,auto_join_preview:true};if(height<20){try{const larger=E.proofSheet(w.records,opts);assert(larger.pages.length>1||larger.pages[0].lines.length>14);}catch(error){assert.match(error.message,/too wide|taller than|more than/);}}
 for(const [size,orientation,dimensions] of [['a5','portrait','148 210'],['letter','landscape','279.4 215.9'],['a3','portrait','297 420']]){
  e['proof-paper'].value=size;e['proof-orientation'].value=orientation;e['proof-paper'].listeners.change();assert(e['proof-svg'].disabled);await e['proof-fit'].onclick();assert.equal(e['proof-page-number'].textContent,'Page 1 of 1');assert.match(await w.urls.at(-1).text(),new RegExp('viewBox="0 0 '+dimensions+'"'));assert(e['proof-gcode'].disabled);e['proof-svg'].onclick();assert(w.downloads.at(-1).includes(size));
 }
 e['proof-paper'].value='a4';e['proof-orientation'].value='portrait';await e['proof-refresh'].onclick();assert.equal(e['proof-gcode'].disabled,false);
});
test('Fit cannot hide missing characters and comparison keeps explicit sizes',async()=>{
 const w=await workspace(),e=w.ids;e['proof-sentence'].value='missing XYZ';e['proof-sentence'].listeners.input();await e['proof-fit'].onclick();assert(e['proof-svg'].disabled);assert.match(e['proof-status'].textContent,/No included/);
 e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();assert(e['proof-fit'].disabled);e['proof-paper'].value='a3';e['proof-orientation'].value='landscape';await e['proof-refresh'].onclick();assert.match(await w.urls.at(-1).text(),/viewBox="0 0 420 297"/);
});
test('page sizes retain all text inside margins and impossible fits report failure',()=>{
 const records=files(),text=Array(10).fill('the quick brown fox jumps over the lazy dog').join('\n');
 for(const size of Object.keys(E.paperSizes))for(const orientation of ['portrait','landscape']){
  const paper={size,orientation},result=E.fitProofSheet(records,{writer:'Writer',text_only:true,sentence:text,paper,natural_variation:{level:'subtle',seed:'fit-test'}}),dims=E.paperSize(paper);
  assert.equal(result.pages.length,1);assert.equal(result.used_samples.length,text.replace(/\s/g,'').length);
  for(const match of result.svg.matchAll(/<path d="([^"]+)"/g)){const nums=match[1].match(/-?\d+(?:\.\d+)?/g).map(Number);nums.forEach((n,i)=>assert(n>=19.99&&n<=(i%2?dims.height:dims.width)-19.99));}
 }
 assert.throws(()=>E.fitProofSheet(records,{writer:'Writer',text_only:true,sentence:Array(200).fill('a').join('\n'),paper:{size:'a5'}}),/cannot fit on one page/);
 assert.throws(()=>E.proofSheet(records,{writer:'Writer',paper:{size:'unknown'}}),/supported page/);
});
test('proof tabs indent lines including the first, remain in fitting, and never join across punctuation',()=>{
 const records=files(),base={writer:'Writer',height:5,text_only:true,auto_join_preview:true};
 // Use a forward-entry c; the fixture b now correctly requires a pen lift.
 const plain=E.proofSheet(records,{...base,sentence:'ac\nac'}),tabbed=E.proofSheet(records,{...base,sentence:'\tac\n\t\tac'});
 assert.equal(tabbed.pages[0].lines[0].left-plain.pages[0].lines[0].left,14);assert.equal(tabbed.pages[0].lines[1].left-plain.pages[0].lines[1].left,28);assert.equal(tabbed.used_samples.length,4);assert(tabbed.pages[0].generated_joins>0);
 const r=E.capture({writer:'Writer',request_id:require('node:crypto').randomUUID(),plan_id:E.plans.symbols.id,order_index:0,smooth:true,strokes:E.plans.symbols.orders[0].map((c,i)=>({pointerType:'pen',points:[{x:30+i*250,y:320,t:i*2},{x:35+i*250,y:330,t:i*2+1}]}))});records.push({key:'letters/'+r.id+'.json',value:r});assert.equal(E.proofSheet(records,{...base,sentence:'ac.ac'}).pages[0].generated_joins,2);
 const fitted=E.fitProofSheet(records,{...base,sentence:'ac\n\tac'});assert.equal(fitted.pages.length,1);assert(Math.abs(fitted.pages[0].lines[1].left-fitted.pages[0].lines[0].left-fitted.fitted_height*2.8)<.001);
 assert.throws(()=>E.proofSheet(records,{...base,sentence:'\t'.repeat(30)+'ac'}),/indentation.*too wide/);
 const examples=require('../web/proof-texts').examples;for(const id of ['sonnet-original','sonnet-lowercase'])assert(examples.find(e=>e.id===id).text.split('\n').slice(-2).every(line=>line.startsWith('\t')));
});
test('Tab and Insert tab edit text; Shift Tab retains keyboard navigation; joins refresh immediately',async()=>{
 const w=await workspace(),e=w.ids,box=e['proof-sentence'];box.focus=()=>{};box.setRangeText=function(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);this.selectionStart=this.selectionEnd=start+text.length;};box.value='ab\nab';box.selectionStart=box.selectionEnd=3;let prevented=false;
 box.listeners.keydown({key:'Tab',preventDefault(){prevented=true;}});assert(prevented);assert.equal(box.value,'ab\n\tab');assert.equal(e['proof-example'].value,'custom');assert(e['proof-svg'].disabled);await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,false);
 e['proof-tab'].onclick();assert.equal(box.value,'ab\n\t\tab');prevented=false;box.listeners.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented=true;}});assert.equal(prevented,false);
 await e['proof-refresh'].onclick();const joined=await w.urls.at(-1).text();assert(e['proof-connect'].checked);e['proof-connect'].checked=false;e['proof-connect'].listeners.change();assert(e['proof-svg'].disabled);await e['proof-refresh'].onclick();assert.notEqual(await w.urls.at(-1).text(),joined);
 e['proof-natural'].value='pronounced';e['proof-natural'].listeners.change();e['proof-connect'].checked=true;e['proof-connect'].listeners.change();assert.equal(e['proof-natural'].value,'off');await e['proof-refresh'].onclick();assert.match(e['proof-view-status'].textContent,/Smooth cursive joins: On/);
});

test('passage fitting preserves verse lines and indented couplets at the largest fitting size',()=>{
 const records=files(),lines=['the quick brown fox','jumps over the lazy dog','\tthe quick brown fox jumps over the lazy dog','\tthe quick brown fox jumps over the lazy dog'],sentence=lines.join('\n');
 for(const auto_join_preview of [false,true]){
  const options={writer:'Writer',text_only:true,sentence,auto_join_preview,paper:{size:'a4',orientation:'portrait'}};
  const result=E.fitProofSheet(records,options),page=result.pages[0];
  assert.equal(result.pages.length,1);assert.deepEqual(page.lines.map(line=>line.characters),lines.map(line=>line.replace(/\s/g,'')));
  for(const line of page.lines.slice(-2))assert(Math.abs(line.left-page.lines[0].left-result.fitted_height*2.8)<.001);
  const larger=E.proofSheet(records,{...options,height:result.fitted_height+.1});assert(larger.pages.length>1||larger.pages[0].lines.length>lines.length);
 }
});
test('underlines preserve letter paths, split at verse breaks, respect indentation and fit/export',()=>{
 const records=files(),base={writer:'Writer',text_only:true,height:5,auto_join_preview:true,sentence:'ab ab\n\tab ab'};
 const plain=E.proofSheet(records,base),marked=E.proofSheet(records,{...base,underline:[{start:0,end:base.sentence.length}]});
 const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
 const before=paths(plain.svg),after=paths(marked.svg),rules=after.filter(p=>!before.includes(p));
 // Underlining reserves space beneath each row, so later baselines may move.
 assert.equal(after.length,before.length+2);assert.equal(rules.filter(p=>/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/.test(p)).length,2);
 const lastRule=after.at(-1);assert.match(lastRule,/^M 34\.000 /);
 assert.equal(marked.used_samples.length,plain.used_samples.length);
 const fitted=E.fitProofSheet(records,{...base,underline:[{start:0,end:base.sentence.length}]});assert.equal(fitted.pages.length,1);assert.equal(fitted.pages[0].lines.length,2);assert(E.validateDrawingSVG(fitted.svg));
 assert.throws(()=>E.compose(records,{writer:'Writer',phrase:'ab',underline:[{start:-1,end:2}]}),/valid text range/);
});
test('selected underline survives edits before it, is removable, resets for examples, and reaches G-code',async()=>{
 const w=await workspace(),e=w.ids,box=e['proof-sentence'];box.focus=()=>{};e['proof-mode'].value='passage';box.value='ab ab';box.listeners.input();box.selectionStart=3;box.selectionEnd=5;e['proof-underline'].onclick();await e['proof-refresh'].onclick();const marked=await w.urls.at(-1).text();assert.match(e['proof-underline-status'].textContent,/2 characters/);e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),marked);
 box.value='c ab ab';box.listeners.input();assert.match(e['proof-underline-status'].textContent,/2 characters/);
 box.selectionStart=5;box.selectionEnd=7;e['proof-ununderline'].onclick();assert.match(e['proof-underline-status'].textContent,/Select text/);
 box.selectionStart=0;box.selectionEnd=2;e['proof-underline'].onclick();e['proof-example'].value='quick-fox';e['proof-example'].listeners.change();assert.match(e['proof-underline-status'].textContent,/Select text/);
});
