const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),E=require('../web/engine'),{files}=require('./browser_helpers');
async function workspace(){
 function node(){return {value:'',textContent:'',disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},replaceChildren(){this.empty=true;},querySelector(tag){return tag==='svg'?this.svg:tag==='g'?{getBBox:()=>({x:20,y:20,width:25,height:8})}:null;},set innerHTML(value){this.svg=node();this.html=value;}};}
 const ids=Object.fromEntries(['character-spacing','spacing-title','spacing-before','spacing-after','spacing-before-value','spacing-after-value','spacing-zero','spacing-save','spacing-reset','spacing-word','spacing-status','spacing-preview'].map(id=>[id,node()])),records=files(),requests=[],events={};let fail=false,saved=0,locks=0;
 const context={document:{getElementById:id=>ids[id]},StudioEngine:E,setTimeout,clearTimeout,addEventListener:(name,fn)=>events[name]=fn,studioFetch:async(url,options)=>{const request=JSON.parse(options.body);requests.push({url,request});if(fail&&url==='/api/character-spacing')return {ok:false,json:async()=>({error:'Storage unavailable'})};let data;if(url==='/api/spacing-preview')data=E.spacingPreview(records,request);else{const record=E.characterSpacing(records,request),i=records.findIndex(f=>f.key===record.key);if(i<0)records.push(record);else records[i]=record;data={saved:true};}return {ok:true,json:async()=>data};}};context.window=context;
 vm.runInNewContext(fs.readFileSync(process.env.STUDIO_PAGES_TEST?'docs/assets/character-spacing.js':'web/character-spacing.js','utf8'),context);
 const controls=context.StudioCharacterSpacing.init({onSaved:async()=>{saved++;},onDirty:()=>locks++});controls.show({writer:'Writer',letter:'a',available:true});
 return {ids,records,requests,events,controls,get saved(){return saved;},get locks(){return locks;},set fail(v){fail=v;}};
}
test('spacing sliders preview pending values, protect navigation and save only on request',async()=>{
 const w=await workspace(),e=w.ids;e['spacing-before'].value='.4';e['spacing-before'].oninput();e['spacing-after'].value='1.2';e['spacing-after'].oninput();
 assert(w.controls.isLocked());assert.equal(e['spacing-save'].disabled,false);w.controls.show({writer:'Writer',letter:'b',available:true});assert.equal(e['spacing-title'].textContent,'Spacing for a');
 await new Promise(resolve=>setTimeout(resolve,180));assert.equal(w.requests.length,1);assert.equal(w.requests[0].url,'/api/spacing-preview');assert.equal(w.requests[0].request.before_mm,.4);assert.equal(w.records.length,18);
 let prevented=false;w.events.beforeunload({preventDefault(){prevented=true;}});assert(prevented);
 await e['spacing-save'].onclick();assert.equal(w.saved,1);assert.equal(w.controls.isLocked(),false);assert.deepEqual(E.catalog(w.records).writers[0].character_spacing.a,{before_mm:.4,after_mm:1.2});
 e['spacing-before'].value='2';e['spacing-before'].oninput();e['spacing-reset'].onclick();assert.equal(e['spacing-before'].value,'0.4');assert.equal(w.controls.isLocked(),false);
 e['spacing-zero'].onclick();assert.equal(e['spacing-after'].value,'0');assert(w.controls.isLocked());await e['spacing-save'].onclick();assert(!E.catalog(w.records).writers[0].character_spacing.a);
 await new Promise(resolve=>setTimeout(resolve,180));
});
test('failed spacing saves retain adjustments and keyboard controls respect the limits',async()=>{
 const w=await workspace(),e=w.ids;w.fail=true;const key=(key,shiftKey=false)=>e['spacing-before'].onkeydown({key,shiftKey,preventDefault(){}});
 key('ArrowRight');assert.equal(Number(e['spacing-before'].value),.1);key('ArrowRight',true);assert.equal(Number(e['spacing-before'].value),.6);
 e['spacing-before'].value='3';key('ArrowUp');assert.equal(Number(e['spacing-before'].value),3);await e['spacing-save'].onclick();assert(w.controls.isLocked());assert.match(e['spacing-status'].textContent,/adjustments are still here/);assert.equal(e['spacing-save'].disabled,false);
 e['spacing-reset'].onclick();assert.equal(Number(e['spacing-before'].value),0);assert.equal(w.controls.isLocked(),false);await new Promise(resolve=>setTimeout(resolve,180));
});
