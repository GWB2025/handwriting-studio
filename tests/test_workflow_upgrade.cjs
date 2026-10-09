const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),{files}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
function review(records,sample,scale,shift=0){const key='letter_reviews/'+sample.capture_id+'.json',old=records.find(f=>f.key===key);const record=old||{key,value:{schema_version:1,capture_id:sample.capture_id,reviews:{}}};record.value.reviews[sample.letter]={included:true,baseline_shift_mm:shift,scale_factor:scale};if(!old)records.push(record);}
const originalAs=records=>E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a'&&!s.derived);
test('size scales both axes around the baseline once, retains physical shift, and leaves originals unchanged',()=>{
 const records=files(),before=JSON.stringify(records),s=originalAs(records)[0];review(records,s,1.5,2);
 const adjusted=originalAs(records)[0];assert.equal(adjusted.scale_factor,1.5);assert.equal(adjusted.baseline_shift_mm,2);
 s.processed_strokes.forEach((stroke,i)=>stroke.points.forEach((p,j)=>{const q=adjusted.processed_strokes[i].points[j];assert.equal(q.x,p.x*1.5);assert.equal(q.y,p.y*1.5);}));
 assert.equal(adjusted.bounds.right-adjusted.bounds.left,(s.bounds.right-s.bounds.left)*1.5);
 const p=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:s.capture_id});records.push(p);
 const output=E.compose(records,{writer:'Writer',phrase:'aa'});assert(output.svg.includes('stroke="black"'));
 assert.equal(JSON.stringify(records.filter(f=>f.key.startsWith('letters/'))),before);E.validateRecord(records.at(-2).key,records.at(-2).value);
 for(const scale_factor of [.49,2.01,'1',NaN])assert.throws(()=>E.validateReview({included:true,baseline_shift_mm:0,scale_factor}));
});
test('old and scaled blend recipes restore exactly after source reviews change size',()=>{
 const records=files(),sources=originalAs(records).slice(0,2),request={id:randomUUID(),writer:'Writer',letter:'a',source_ids:sources.map(s=>s.capture_id),horizontal:40,vertical:50};
 const legacy=E.createSavedBlend(records,request);assert.equal(legacy.schema_version,4);records.push({key:'blends/'+legacy.id+'.json',value:legacy});
 sources.forEach(s=>review(records,s,1.3,.5));
 const restored=E.createSavedBlend(records,{...E.savedBlendRecipe(records,legacy.id),id:randomUUID()});assert.deepEqual(restored.samples,legacy.samples);
 const scaled=E.createSavedBlend(records,{...request,id:randomUUID()});assert.equal(scaled.schema_version,5);assert.deepEqual(scaled.source_scales,[1.3,1.3]);records.push({key:'blends/'+scaled.id+'.json',value:scaled});
 sources.forEach(s=>review(records,s,.7,-2));E.validateBlendReferences(records);
 assert.deepEqual(E.createSavedBlend(records,{...E.savedBlendRecipe(records,scaled.id),id:randomUUID()}).samples,scaled.samples);
 const tampered=E.clone(records);tampered.find(f=>f.key.startsWith('blends/')&&f.value.schema_version===5).value.source_scales[0]=1.4;assert.throws(()=>E.validateBlendReferences(tampered),/match its sources/);
});
test('preferred sets cycle deterministically, respect exclusions and source filters, and retain legacy choices',()=>{
 const records=files(),[a,b,c]=originalAs(records),key=E.alphabetKey('Writer');records.push(E.choosePreferred(records,{writer:'Writer',letter:'b',capture_id:E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='b').capture_id}));
 records[records.findIndex(f=>f.key===key)]=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[c.capture_id,a.capture_id]});
 const r=E.compose(records,{writer:'Writer',phrase:'aaaa',samples:'latest_only'});assert.deepEqual(r.used_samples.map(s=>s.capture_id),[c,a,c,a].map(s=>s.capture_id));
 E.validateAlphabetReferences(records);E.validateRecord(key,records.find(f=>f.key===key).value);
 review(records,c,1);records.find(f=>f.key==='letter_reviews/'+c.capture_id+'.json').value.reviews.a.included=false;
 assert(E.compose(records,{writer:'Writer',phrase:'aaa'}).used_samples.every(s=>s.capture_id===a.capture_id));
 assert.throws(()=>E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[a.capture_id,a.capture_id]}));
 const cleared=E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[]});assert(cleared.value.choices.b);assert(!cleared.value.choices.a);
});
test('the draft word preview uses pending size and position without writing a review or changing preferences',()=>{
 const records=files(),s=originalAs(records)[0],before=JSON.stringify(records),data={writer:'Writer',capture_id:s.capture_id,letter:'a',text:'cat',included:true,baseline_shift_mm:1,scale_factor:1.7};
 const output=E.reviewWord(records,data);assert(output.used_samples.some(s=>s.capture_id===data.capture_id&&s.letter==='a'));assert.notEqual(output.svg,E.reviewWord(records,{...data,scale_factor:1}).svg);assert.equal(JSON.stringify(records),before);
 assert.throws(()=>E.reviewWord(records,{...data,text:'Z'}),/No included/);
});
test('inspection markers identify every stroke and do not alter the ink or exported path geometry',()=>{
 const sample=originalAs(files())[0];sample.processed_strokes.push({points:[{x:20,y:-90}]});
 const normal=E.reviewSVG(sample),inspection=E.reviewSVG(sample,{colourStrokes:true,showStarts:true});
 assert.equal([...inspection.matchAll(/data-stroke-start=/g)].length,2);assert(inspection.includes('#1463d6'));
 assert.deepEqual([...normal.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]),[...inspection.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]));
});
