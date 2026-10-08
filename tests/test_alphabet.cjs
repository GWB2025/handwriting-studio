const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),{files}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
function setup(){const records=files(),originals=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a');const blend=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'a',source_ids:originals.slice(0,2).map(s=>s.capture_id),horizontal:50,vertical:50});records.push({key:'blends/'+blend.id+'.json',value:blend});return {records,originals,blend};}
test('Compose keeps originals and saved blends separate with no silent fallback',()=>{
 const {records,originals,blend}=setup(),profile=E.catalog(records).writers[0];assert.equal(profile.original_counts.a,3);assert.equal(profile.blend_counts.a,1);assert.equal(profile.counts.a,4);
 for(const source of ['originals','blends','both']){const r=E.compose(records,{writer:'Writer',phrase:'aaaa',source,samples:'all'});assert.equal(r.sample_selection.source,source);if(source==='originals')assert(r.used_samples.every(s=>originals.some(o=>o.capture_id===s.capture_id)));if(source==='blends')assert(r.used_samples.every(s=>s.capture_id===blend.id));if(source==='both')assert.equal(new Set(r.used_samples.map(s=>s.capture_id)).size,4);}
 assert.throws(()=>E.compose(records,{writer:'Writer',phrase:'ab',source:'blends'}),/No included saved blends for: b/);
 assert.throws(()=>E.compose(records,{writer:'Writer',phrase:'a',source:'invalid'}),/Choose original/);
});
test('a preferred version overrides recency within its source type and can be cleared',()=>{
 const {records,originals,blend}=setup(),oldest=originals.at(-1);const pref=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:oldest.capture_id});records.push(pref);
 let r=E.compose(records,{writer:'Writer',phrase:'aaa',samples:'latest_only'});assert(r.used_samples.every(s=>s.capture_id===oldest.capture_id));
 assert.equal(E.compose(records,{writer:'Writer',phrase:'a',use_preferred:false}).used_samples[0].capture_id,blend.id);
 assert.equal(E.compose(records,{writer:'Writer',phrase:'a',source:'blends'}).used_samples[0].capture_id,blend.id);
 records[records.length-1]=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:blend.id});
 assert(E.compose(records,{writer:'Writer',phrase:'a',source:'originals'}).used_samples.every(s=>s.capture_id!==blend.id));
 records[records.length-1]=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:null});assert.deepEqual(E.catalog(records).writers[0].preferred,{});
});
test('excluded preferences are reported but never used and preference revisions invalidate previews',()=>{
 const {records,originals}=setup(),id=originals[0].capture_id,before=E.catalog(records).writers[0].revision;records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:id}));assert.notEqual(E.catalog(records).writers[0].revision,before);
 records.push({key:'letter_reviews/'+id+'.json',value:{schema_version:1,capture_id:id,reviews:{a:{included:false,baseline_shift_mm:0}}}});
 assert(E.compose(records,{writer:'Writer',phrase:'aaa'}).used_samples.every(s=>s.capture_id!==id));
 assert.throws(()=>E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:id}),/included sample/);
 assert.throws(()=>E.choosePreferred(records,{writer:'Writer',letter:'z',capture_id:id}),/included sample/);
});
