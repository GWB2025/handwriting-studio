const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),E=require('../web/engine'),{files}=require('./browser_helpers');
test('Compose fitting preserves explicit indented lines, selected paper and saved fractional size',()=>{
 const data={writer:'Writer',phrase:'the quick brown fox jumps over the lazy dog\n\tso long lives this',height:8,paper:{size:'a5',orientation:'landscape'},page_layout:{},auto_join_preview:true};
 const r=E.fitComposition(files(),data);assert.equal(r.pages.length,1);assert.equal(r.pages[0].lines.length,2);assert.match(r.svg,/width="210mm" height="148mm"/);assert(r.fitted_height>=2&&r.fitted_height<=20);assert.equal(E.validateDrawingSVG(r.svg),r.svg);
 const settings=E.compositionSettings({...data,height:r.fitted_height});assert.deepEqual(settings.paper,data.paper);assert.equal(settings.height,r.fitted_height);
 assert.throws(()=>E.validateDrawingSVG(r.svg.replace('210mm','211mm')),/supported/);
 assert.throws(()=>E.fitComposition(files(),{...data,phrase:'a'.repeat(1000)}),/cannot fit/);
});
test('Compose tab, paper and fit controls operate in the built page',async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/compose.html','utf8'),{url:'https://example.test/compose.html',runScripts:'outside-only'}),w=dom.window,d=w.document,records=files();let last;
 w.StudioEngine=E;w.StudioStorage={snapshot:async()=>records};w.URL.createObjectURL=()=> 'blob:preview';w.URL.revokeObjectURL=()=>{};
 w.studioFetch=async(url,options)=>{if(url.includes('/writers'))return {ok:true,json:async()=>({writers:E.catalog(records).writers})};last=JSON.parse(options.body);return {ok:true,json:async()=>E.compose(records,last)};};
 try{w.eval(fs.readFileSync('docs/assets/compose.js','utf8'));await new Promise(r=>setTimeout(r,20));const phrase=d.getElementById('phrase');phrase.value='the quick brown fox\nso long';phrase.dispatchEvent(new w.Event('input'));phrase.setSelectionRange(20,20);d.getElementById('compose-tab').click();assert(phrase.value.includes('\t'));d.getElementById('compose-paper').value='a5';await d.getElementById('compose-fit').onclick();assert.equal(last.paper.size,'a5');assert.match(d.getElementById('compose-status').textContent,/Ready/);assert.equal(d.getElementById('compose-gcode').disabled,true);assert.equal(d.getElementById('compose-download').disabled,false);}finally{w.close();}
});
test('version check distinguishes current live, preview, different live and failed checks',async()=>{
 for(const [channel,build,expected] of [['live','same','latest published'],['preview','other','preview, not'],['live','other','different live']]){
 const dom=new JSDOM('<script></script>',{runScripts:'outside-only'}),w=dom.window,d=w.document;Object.defineProperty(d,'currentScript',{value:d.querySelector('script')});d.currentScript.dataset.version=JSON.stringify({channel,build,revision:'123456789',built:'2026-11-13'});w.AbortSignal.timeout=()=>undefined;w.fetch=async()=>({ok:true,json:async()=>({revision:'123456789',build:'same'})});
 try{w.eval(fs.readFileSync('web/version.js','utf8'));await d.querySelector('button').onclick();assert.match(d.querySelector('[role=status]').textContent,new RegExp(expected));w.fetch=async()=>{throw Error()};await d.querySelector('button').onclick();assert.match(d.querySelector('[role=status]').textContent,/Could not check/);}finally{w.close();}}
});
