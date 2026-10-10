const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine'),{files}=require('./browser_helpers');
async function workspace(){
 function element(tag='div'){return {tag,value:'',hidden:false,disabled:false,checked:true,style:{},children:[],listeners:{},append(...nodes){this.children.push(...nodes);if(tag==='select'&&!this.value)this.value=nodes[0]?.value||'';},replaceChildren(){this.children=[];this.value='';},addEventListener(name,fn){this.listeners[name]=fn;},click(){downloads.push(this.download);},remove(){}};}
 const ids={};for(const id of ['proof-zoom','proof-view-status','proof-natural','proof-natural-new','proof-natural-controls','proof-example','proof-example-note','proof-text-credit','proof-text-label','proof-previous','proof-next','proof-page-number','proof-mode','proof-alphabet-text','proof-comparison-text','proof-compare-text','proof-writer','proof-kind','proof-source','proof-size','proof-smooth','proof-sentence','proof-refresh','proof-svg','proof-gcode','proof-status','proof-missing','proof-image'])ids[id]=element(['proof-writer','proof-kind','proof-source','proof-size'].includes(id)?'select':'div');
 ids['proof-zoom'].value='100';ids['proof-mode'].value='alphabet';ids['proof-natural'].value='off';ids['proof-compare-text'].value='f i j l t z\nfizz\njilt';ids['proof-kind'].value='lowercase';ids['proof-source'].value='both';ids['proof-size'].value='5';const records=files(),urls=[],downloads=[],exported=[];let snapshot=async()=>records;
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

test('comparison mode shows three sizes, reports missing versions and exports the labelled preview',async()=>{
 const w=await workspace(),e=w.ids;e['proof-mode'].value='comparison';e['proof-mode'].listeners.change();assert.equal(e['proof-kind'].disabled,true);assert.equal(e['proof-size'].disabled,true);assert.equal(e['proof-comparison-text'].hidden,false);await e['proof-refresh'].onclick();
 assert.equal(e['proof-svg'].disabled,false);assert.match(e['proof-status'].textContent,/3, 5 and 8/);assert.match(e['proof-missing'].textContent,/Crossed boxes/);const svg=await w.urls.at(-1).text();
 e['proof-gcode'].onclick();assert.equal(w.exported.at(-1),svg);assert.equal(w.downloads.at(-1),'comparison-proof-a4.gcode');
 e['proof-compare-text'].value='a'.repeat(100);e['proof-compare-text'].listeners.input();await e['proof-refresh'].onclick();assert.equal(e['proof-svg'].disabled,true);assert.match(e['proof-status'].textContent,/shorter/);
 e['proof-mode'].value='alphabet';e['proof-mode'].listeners.change();await e['proof-refresh'].onclick();assert.equal(e['proof-size'].disabled,false);assert.equal(e['proof-svg'].disabled,false);
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
 const w=await workspace(),e=w.ids,plain=await w.urls.at(-1).text();assert.equal(e['proof-natural-new'].disabled,true);
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
 const w=await workspace(),e=w.ids,plain=await w.urls.at(-1).text();
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
