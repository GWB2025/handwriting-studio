const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto'),E=require('../web/engine');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function workspace(){
 function element(){return {value:'',disabled:false,children:[],replaceChildren(){this.value='';this.children=[];},append(child){this.children.push(child);if(!this.value)this.value=child.value;}};}
 const ids=Object.fromEntries(['composition-title','composition-save','composition-copy','composition-open','composition-list','composition-status'].map(id=>[id,element()])),records=[],requests=[],events={},restored=[];
 let draft=E.compositionSettings({writer:'Writer',phrase:'a test',height:8,letter_spacing:1.2}),confirm=true,fail=false,failRestore=false,gate=null,confirmCalls=0;
 const context={document:{getElementById:id=>ids[id],createElement:element},crypto:webcrypto,StudioStorage:{snapshot:async()=>records},addEventListener:(name,fn)=>events[name]=fn,confirm:()=>{confirmCalls++;return confirm;},studioFetch:async(url,options)=>{const request=JSON.parse(options.body);requests.push(request);if(gate)await gate;if(fail)return {ok:false,json:async()=>({error:'Storage full'})};const record=E.createComposition(request),key='compositions/'+record.id+'.json',old=records.find(f=>f.key===key);if(old)old.value=record;else records.push({key,value:record});return {ok:true,json:async()=>({record})};}};context.window=context;
 vm.runInNewContext(fs.readFileSync(process.env.STUDIO_PAGES_TEST?'docs/assets/compositions.js':'web/compositions.js','utf8'),context);
 const api=context.StudioCompositions.init({read:()=>E.clone(draft),restore:async settings=>{if(failRestore)throw Error('Missing writer');draft=E.clone(settings);restored.push(draft);}});await settle();
 return {ids,records,requests,events,restored,api,get draft(){return draft;},set draft(v){draft=v;},set confirm(v){confirm=v;},set fail(v){fail=v;},set failRestore(v){failRestore=v;},set gate(v){gate=v;},get confirmCalls(){return confirmCalls;}};
}
test('saved compositions update in place, copy independently and reopen every saved setting',async()=>{
 const w=await workspace(),{ids}=w;assert.equal(ids['composition-open'].disabled,true);assert.equal(w.api.hasUnsavedChanges(),false);
 ids['composition-title'].value='Test letter';await ids['composition-save'].onclick();const first=w.records[0].value.id;
 assert.equal(w.records.length,1);assert.equal(w.api.hasUnsavedChanges(),false);assert.equal(ids['composition-open'].disabled,false);
 w.draft={...w.draft,phrase:'new words',source:'blends',samples:'all',use_preferred:false,joined:false,smooth:false,word_spacing:1.5,line_spacing:.75,height:3};await ids['composition-save'].onclick();
 assert.equal(w.records.length,1);assert.equal(w.records[0].value.id,first);const saved=E.clone(w.draft);
 ids['composition-title'].value='Second version';await ids['composition-copy'].onclick();assert.equal(w.records.length,2);assert.notEqual(w.records[1].value.id,first);
 w.draft={...w.draft,phrase:'unfinished'};ids['composition-list'].value=first;w.confirm=false;await ids['composition-open'].onclick();assert.equal(w.draft.phrase,'unfinished');assert.equal(w.restored.length,0);
 w.confirm=true;await ids['composition-open'].onclick();assert.deepEqual(w.draft,saved);assert.equal(ids['composition-title'].value,'Test letter');assert.equal(w.api.hasUnsavedChanges(),false);assert.match(ids['composition-status'].textContent,/current saved handwriting/);
 w.draft={...w.draft,phrase:'changed'};let prevented=false;w.events.beforeunload({preventDefault(){prevented=true;}});assert(prevented);
});
test('failed saves preserve the draft and retry identifier; failed opens preserve unsaved settings',async()=>{
 const w=await workspace(),{ids}=w;ids['composition-title'].value='Draft';w.fail=true;await ids['composition-save'].onclick();
 assert.equal(w.records.length,0);assert.equal(ids['composition-title'].value,'Draft');assert.equal(w.api.hasUnsavedChanges(),true);assert.match(ids['composition-status'].textContent,/Storage full/);assert.equal(ids['composition-save'].disabled,false);
 w.fail=false;await ids['composition-save'].onclick();assert.equal(w.requests[0].id,w.requests[1].id);assert.equal(w.records.length,1);
 w.draft={...w.draft,phrase:'keep this draft'};w.failRestore=true;await ids['composition-open'].onclick();assert.equal(w.draft.phrase,'keep this draft');assert.equal(w.api.hasUnsavedChanges(),true);assert.match(ids['composition-status'].textContent,/Missing writer/);
});
test('edits made while a composition saves remain visibly unsaved',async()=>{
 const w=await workspace(),{ids}=w;let release;w.gate=new Promise(resolve=>release=resolve);ids['composition-title'].value='Letter';const saving=ids['composition-save'].onclick();
 assert.equal(ids['composition-copy'].disabled,true);w.draft={...w.draft,phrase:'edited while saving'};release();await saving;
 assert.equal(w.records[0].value.settings.phrase,'a test');assert.equal(w.draft.phrase,'edited while saving');assert.equal(w.api.hasUnsavedChanges(),true);assert.match(ids['composition-status'].textContent,/Further edits are not yet saved/);
});
