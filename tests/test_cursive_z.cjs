const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const E=require('../web/engine'),{sheet}=require('./browser_helpers');
function capture(bottom=395){
 const index=E.plan.orders.findIndex(order=>order.includes('z')),data=sheet(index),z=data.strokes[[...E.plan.orders[index]].indexOf('z')];
 z.points[0].y=330;z.points[1].y=250;z.points[2].y=bottom;
 const value=E.capture(data);return {key:'letters/'+value.id+'.json',value};
}
const z=files=>E.catalog(files).byWriter.get('Writer').find(s=>s.letter==='z');
const ys=sample=>sample.processed_strokes.flatMap(s=>s.points.map(p=>p.y));
test('existing cursive z automatically keeps its tail below the guide without mutating backups',()=>{
 const f=capture(),before=JSON.stringify(f),sample=z([f]);
 assert.deepEqual(ys(sample),[0,-80,65]);assert.equal(sample.baseline_shift_mm,0);
 E.validateRecord(f.key,f.value);assert.equal(JSON.stringify(f),before);
 const resized=E.sampleAtSize([f],sample,2);assert.deepEqual(ys(resized),[0,-160,130]);
 assert.match(E.compose([f],{writer:'Writer',phrase:'z',height:8}).svg,/210mm/);
 for(const smooth of [true,false]){
  const proof=E.compose([f],{writer:'Writer',phrase:'zz',height:8,smooth,auto_join_preview:true,page_layout:{}});
  E.validateDrawingSVG(proof.svg);assert.equal(JSON.stringify(f),before);
 }
});
test('ordinary z and explicitly repositioned or legacy captures retain their alignment',()=>{
 for(const bottom of [330,340])assert.equal(Math.max(...ys(z([capture(bottom)]))),0);
 const f=capture();
 const review={key:'letter_reviews/'+f.value.id+'.json',value:{schema_version:1,capture_id:f.value.id,reviews:{z:{included:true,baseline_shift_mm:2}}}};
 assert.equal(Math.max(...ys(z([f,review]))),0);assert.equal(z([f,review]).baseline_shift_mm,2);
 f.value.schema_version=1;assert.equal(Math.max(...ys(z([f]))),0);
});
test('new z blends and historical blends both validate against untouched original captures',()=>{
 const originals=[capture(),capture(390)],source_ids=originals.map(f=>f.value.id);
 const data={writer:'Writer',letter:'z',source_ids,horizontal:50,vertical:50,id:randomUUID()};
 const blend=E.createSavedBlend(originals,data),file={key:'blends/'+blend.id+'.json',value:blend};
 assert.ok(Math.max(...ys(blend.samples[0]))>0);
 E.validateRecord(file.key,file.value);E.validateBlendReferences([...originals,file]);
 const historical=structuredClone(blend),raw=originals.map(f=>({...f.value.samples.find(s=>s.letter==='z'),baseline_shift_mm:0})),result=E.blendMany(raw,[.5,.5]);
 historical.samples=[{letter:'z',processed_strokes:result.processed_strokes,bounds:result.bounds,baseline_shift_mm:0}];
 E.validateBlendReferences([...originals,{key:file.key,value:historical}]);
});
