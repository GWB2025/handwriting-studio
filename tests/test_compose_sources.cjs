const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),{files}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
test('source summary reports the samples actually selected and honours source filters',()=>{
 const records=files(),sources=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a').slice(0,2);
 const blend=E.createSavedBlend(records,{writer:'Writer',letter:'a',source_ids:sources.map(s=>s.capture_id),horizontal:50,vertical:50,id:randomUUID()});
 records.push({key:'blends/'+blend.id+'.json',value:blend});
 records.push({key:E.alphabetKey('Writer'),value:{schema_version:2,writer:'Writer',choices:{a:[blend.id]}}});
 const options={writer:'Writer',phrase:'aba',height:5};
 assert.deepEqual(E.compose(records,options).source_usage,[{letter:'a',label:'Preferred saved blend'},{letter:'b',label:'original capture'}]);
 const original=E.compose(records,{...options,source:'originals'});
 assert.ok(original.source_usage.every(s=>s.label==='original capture'));
 assert.equal(E.compose(records,{...options,use_preferred:false}).source_usage.some(s=>s.label.startsWith('Preferred')),false);
});
