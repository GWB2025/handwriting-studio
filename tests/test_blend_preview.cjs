const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('comparison displays sources and result, switches examples and releases stale images',()=>{
 const make=()=>({value:'',children:[],listeners:{},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.listeners[name]=fn;}});
 const ids=Object.fromEntries(['blend-comparison','blend-example','blend-cards','blend-mix','compose-variation','blend-mix-label'].map(id=>[id,make()]));ids['compose-variation'].value='original';let n=0;const revoked=[];
 const window={},document={getElementById:id=>ids[id],createElement:make};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../web/blend-preview.js'),'utf8'),{window,document,Blob,URL:{createObjectURL:()=>String(++n),revokeObjectURL:url=>revoked.push(url)}});
 assert.equal(ids['blend-mix'].disabled,true);ids['compose-variation'].value='blend';ids['compose-variation'].listeners.change();assert.equal(ids['blend-mix'].disabled,false);
 const example={letter:'j',source_a:'aaaaaaaa-id',source_b:'bbbbbbbb-id',source_b_percent:70,svgs:['<svg/>','<svg/>','<svg/>']};
 window.StudioBlendPreview.show({mode:'blend',previews:[example,example]});assert.equal(ids['blend-cards'].children.length,3);assert.equal(ids['blend-cards'].children[2].children[0].textContent,'Result · 70% source B');
 ids['blend-example'].value='1';ids['blend-example'].listeners.change();assert.equal(revoked.length,3);
 window.StudioBlendPreview.clear();assert.equal(revoked.length,6);assert.equal(ids['blend-comparison'].hidden,true);
 window.StudioBlendPreview.show({mode:'blend',previews:[]});assert(ids['blend-cards'].textContent.includes('Not enough compatible'));
});
