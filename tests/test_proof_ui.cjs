const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine'),{files}=require('./browser_helpers');
async function workspace(){
 function element(tag='div'){return {tag,value:'',hidden:false,disabled:false,checked:true,children:[],listeners:{},append(...nodes){this.children.push(...nodes);if(tag==='select'&&!this.value)this.value=nodes[0]?.value||'';},replaceChildren(){this.children=[];this.value='';},addEventListener(name,fn){this.listeners[name]=fn;},click(){downloads.push(this.download);},remove(){}};}
 const ids={};for(const id of ['proof-writer','proof-kind','proof-source','proof-size','proof-smooth','proof-sentence','proof-refresh','proof-svg','proof-gcode','proof-status','proof-missing','proof-image'])ids[id]=element(['proof-writer','proof-kind','proof-source','proof-size'].includes(id)?'select':'div');
 ids['proof-kind'].value='lowercase';ids['proof-source'].value='both';ids['proof-size'].value='5';const records=files(),urls=[],downloads=[],exported=[];let snapshot=async()=>records;
 const doc={getElementById:id=>ids[id],createElement:element,body:element(),addEventListener(){}},context={document:doc,StudioEngine:E,StudioStorage:{snapshot:()=>snapshot()},StudioPlotter:{fromSVG(svg){exported.push(svg);return 'G21\n';}},Blob,URLSearchParams,URL:{createObjectURL(blob){urls.push(blob);return 'blob:'+urls.length;},revokeObjectURL(){}},setTimeout,clearTimeout,location:{search:'?writer=Writer'},addEventListener(){}};context.window=context;
 await vm.runInNewContext(fs.readFileSync('web/proof.js','utf8'),context);return {ids,records,urls,downloads,exported,setSnapshot(fn){snapshot=fn;}};
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
