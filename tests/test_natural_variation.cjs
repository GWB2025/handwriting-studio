const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),P=require('../static/plotter'),{files,strokeFiles}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
function review(records,id,edit){const key='letter_reviews/'+id+'.json',value={schema_version:1,capture_id:id,reviews:{t:{included:true,baseline_shift_mm:.2,scale_factor:1.1,stroke_edit:edit}}},i=records.findIndex(f=>f.key===key);if(i<0)records.push({key,value});else records[i]={key,value};}
const ids=result=>result.used_samples.map(s=>s.capture_id);
test('shuffled sample bags avoid immediate repeats, use each eligible sample, and stay fixed as layout changes',()=>{
 const records=files(),before=JSON.stringify(records),settings={writer:'Writer',phrase:Array(24).fill('a').join(' '),joined:false,sample_order:'shuffle',sample_seed:'first'},first=E.compose(records,settings),sequence=ids(first);
 for(let i=0;i<sequence.length;i+=3)assert.equal(new Set(sequence.slice(i,i+3)).size,3);
 for(let i=1;i<sequence.length;i++)assert.notEqual(sequence[i],sequence[i-1]);
 assert.deepEqual(ids(E.compose(records,{...settings,height:8,letter_spacing:1.5,word_spacing:1.5,smooth:false})),sequence);
 assert.deepEqual(ids(E.compose(records,settings)),sequence);assert.notDeepEqual(ids(E.compose(records,{...settings,sample_seed:'second'})),sequence);
 const cycle=E.compose(records,{...settings,sample_order:'cycle'});assert.deepEqual(ids(cycle).slice(0,3),ids(cycle).slice(3,6));
 assert.equal(new Set(ids(E.compose(records,{...settings,samples:'latest_only'}))).size,1);
 for(const [sample_order,sample_seed] of [['bad','ok'],['shuffle',null],['shuffle',''],['shuffle','x'.repeat(81)]])assert.throws(()=>E.compose(records,{...settings,sample_order,sample_seed}));
 assert.equal(JSON.stringify(records),before);P.generate([...first.svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]));
});
test('shuffling honours preferred choices, source restrictions and excluded samples, and survives composition save',()=>{
 const records=files(),all=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a'),source_ids=all.slice(0,2).map(s=>s.capture_id),blend=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'a',source_ids,horizontal:50,vertical:50});records.push({key:'blends/'+blend.id+'.json',value:blend});
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[all[0].capture_id,blend.id]}));
 const settings=E.compositionSettings({writer:'Writer',phrase:'aaaa aa',sample_order:'shuffle',sample_seed:'saved'}),both=E.compose(records,settings);
 assert.deepEqual(new Set(ids(both)),new Set([all[0].capture_id,blend.id]));assert.deepEqual(new Set(ids(E.compose(records,{...settings,source:'blends'}))),new Set([blend.id]));
 records.push({key:'letter_reviews/'+all[0].capture_id+'.json',value:{schema_version:1,capture_id:all[0].capture_id,reviews:{a:{included:false,baseline_shift_mm:0}}}});
 assert.deepEqual(new Set(ids(E.compose(records,settings))),new Set([blend.id]));
 const saved=E.createComposition({id:randomUUID(),title:'Variation',settings,drawing:both.svg});E.validateRecord('compositions/'+saved.id+'.json',saved);assert.equal(saved.settings.sample_seed,'saved');
 const legacy=E.createComposition({id:randomUUID(),title:'Old draft',settings:{writer:'Writer',phrase:'a'}});assert.equal(legacy.settings.sample_order,undefined);E.validateRecord('compositions/'+legacy.id+'.json',legacy);
});
test('stroke corrections enable two and four source blends while preserving captured sensor data and previous recipes',()=>{
 const records=strokeFiles(),original=JSON.stringify(records),even=records.filter((_,i)=>i%2===0),allIDs=records.map(f=>f.value.id);
 const base={id:randomUUID(),writer:'Writer',letter:'t',source_ids:allIDs,horizontal:35,vertical:60};assert.throws(()=>E.createSavedBlend(records,base),/incompatible/);
 const old=E.createSavedBlend(records,{...base,id:randomUUID(),source_ids:even.map(f=>f.value.id)});records.push({key:'blends/'+old.id+'.json',value:old});
 for(const [i,id] of allIDs.entries())review(records,id,i%2?{order:[1,0],reversed:[false,true]}:E.originalStrokeEdit(2));
 const cat=E.catalog(records),samples=cat.byWriter.get('Writer').filter(s=>s.letter==='t'&&!s.derived);for(const a of samples)for(const b of samples)assert(E.compatible(a,b));
 const four=E.createSavedBlend(records,base);assert.equal(four.schema_version,6);records.push({key:'blends/'+four.id+'.json',value:four});
 const two=E.createSavedBlend(records,{...base,id:randomUUID(),source_ids:allIDs.slice(0,2)});assert.equal(two.schema_version,6);records.push({key:'blends/'+two.id+'.json',value:two});
 for(const f of records)E.validateRecord(f.key,f.value);E.validateBlendReferences(records);
 for(const id of allIDs)review(records,id,{order:[0,1],reversed:[true,true]});
 for(const blend of [old,two,four]){const recipe=E.savedBlendRecipe(records,blend.id),reopened=E.createSavedBlend(records,{...recipe,id:randomUUID()});assert.deepEqual(reopened.samples,blend.samples);}
 E.validateBlendReferences(records);assert.equal(JSON.stringify(records.filter(f=>f.key.startsWith('letters/'))),original);
 const invalid=E.clone(four);invalid.source_edits[0].order=[0,0];assert.throws(()=>E.validateRecord('blends/'+invalid.id+'.json',invalid));
 const count=E.clone(four);count.source_edits[0]=E.originalStrokeEdit(1);assert.throws(()=>E.validateBlendReferences(records.filter(f=>f.value.id!==four.id).concat({key:'blends/'+count.id+'.json',value:count})),/stroke/);
});
test('pending stroke review changes order and direction in word previews without changing saved files',()=>{
 const records=strokeFiles(),id=records[0].value.id,before=JSON.stringify(records),sample=records[0].value.samples.find(s=>s.letter==='t'),edit={order:[1,0],reversed:[true,false]};
 const corrected=E.editStrokes(sample,edit);assert.deepEqual(corrected.processed_strokes[1].points[0],sample.processed_strokes[0].points.at(-1));
 const request={writer:'Writer',capture_id:id,letter:'t',included:true,baseline_shift_mm:0,scale_factor:1,text:'tt',stroke_edit:edit};
 const changed=E.reviewWord(records,request),normal=E.reviewWord(records,{...request,stroke_edit:E.originalStrokeEdit(2)});assert.notEqual(changed.svg,normal.svg);assert.equal(JSON.stringify(records),before);
 for(const bad of [{order:[0,1],reversed:[false]}, {order:[0,2],reversed:[false,false]}, {order:[0,1],reversed:[0,1]}, E.originalStrokeEdit(1)])assert.throws(()=>E.editStrokes(sample,bad));
});
