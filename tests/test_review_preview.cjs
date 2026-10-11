const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const E=require('../web/engine'),{files}=require('./browser_helpers'),{extended,extendedFiles}=require('./extended_helpers');
// Compare exact endpoints/control points; adaptive curve flattening changes its subdivision with scale.
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>{const n=m[1].match(/-?\d+(?:\.\d+)?/g).map(Number);return Array.from({length:n.length/2},(_,i)=>n.slice(i*2,i*2+2));});
const box=svg=>svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const bounds=points=>({width:Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),height:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))});
const request=(sample,text)=>({writer:'Writer',capture_id:sample.capture_id,letter:sample.letter,text,included:true,baseline_shift_mm:0,scale_factor:1});
const close=(a,b)=>assert(Math.abs(a-b)<.0002,`${a} != ${b}`);
test('every joined-pair preview uses the selected whole sample even with no individual letters captured',()=>{
 const records=extendedFiles('pairs'),before=JSON.stringify(records),samples=E.catalog(records).byWriter.get('Writer');
 for(const letter of E.pairs){
  const sample=samples.find(s=>s.letter===letter),data=request(sample,letter.repeat(3)),normal=E.reviewWord(records,data),small=E.reviewWord(records,{...data,scale_factor:.7712});
  assert.deepEqual(normal.used_samples.map(s=>[s.letter,s.capture_id]),Array(3).fill([letter,sample.capture_id]));assert.notEqual(normal.svg,small.svg);assert.equal(box(normal.svg)[3],box(small.svg)[3]);
  const a=bounds(paths(normal.svg)[0]),b=bounds(paths(small.svg)[0]);close(b.width,a.width*.7712);close(b.height,a.height*.7712);
 }
 assert.equal(JSON.stringify(records),before);
});
test('the inspected pair wins over overlapping other pairs and single-letter reviews remain individual letters',()=>{
 const records=[...files(),...extendedFiles('pairs')],samples=E.catalog(records).byWriter.get('Writer'),th=samples.find(s=>s.letter==='th'),t=samples.find(s=>s.letter==='t');
 const reviewed=E.reviewWord(records,request(th,'ath the'));assert.deepEqual(reviewed.used_samples.map(s=>s.letter),['a','th','th','e']);assert(reviewed.used_samples.filter(s=>s.letter==='th').every(s=>s.capture_id===th.capture_id));
 assert.deepEqual(E.reviewWord(records,request(t,'ththth')).used_samples.map(s=>s.letter),['t','h','t','h','t','h']);
 assert.deepEqual(E.compose(records,{writer:'Writer',phrase:'ath the'}).used_samples.map(s=>s.letter),['at','h','th','e']);
 assert.throws(()=>E.reviewWord(extendedFiles('pairs'),request(th,'xth')),/unavailable/);
 const pairOnly=extendedFiles('pairs'),pair=E.catalog(pairOnly).byWriter.get('Writer').find(s=>s.letter==='th');assert.throws(()=>E.reviewWord(pairOnly,request(pair,'xth')),/No included samples for: x/);
});
test('pending size and position change the ink against a fixed baseline and display scale, including repeated single letters',()=>{
 const records=[...files(),...extendedFiles('pairs')];
 for(const letter of ['a','th']){
  const sample=E.catalog(records).byWriter.get('Writer').find(s=>s.letter===letter),data=request(sample,letter.repeat(3)),base=E.reviewWord(records,data),height=box(base.svg)[3];
  for(const scale_factor of [.5,.7712,1,2,3,4])for(const baseline_shift_mm of [-10,.587,10]){
   const result=E.reviewWord(records,{...data,scale_factor,baseline_shift_mm}),frame=box(result.svg);assert.equal(frame[3],height);
   const original=bounds(paths(base.svg)[0]),changed=bounds(paths(result.svg)[0]);close(changed.width,original.width*scale_factor);close(changed.height,original.height*scale_factor);
   const unshifted=paths(E.reviewWord(records,{...data,scale_factor}).svg),shifted=paths(result.svg);
   shifted.forEach((stroke,i)=>stroke.forEach((point,j)=>{close(point[1]-unshifted[i][j][1],baseline_shift_mm);assert(point[0]>=0&&point[0]<=frame[2]);assert(point[1]>=0&&point[1]<=frame[3]);}));
  }
  const long=E.reviewWord(records,{...data,text:letter.repeat(Math.floor(40/letter.length)),scale_factor:4});assert.equal(box(long.svg)[3],height);assert(box(long.svg)[2]>box(base.svg)[2]);
 }
});
test('reviewing an excluded original or a saved joined blend uses its pending edits without changing saved records',()=>{
 const records=extendedFiles('pairs'),extra=E.capture(extended('pairs',0,3));records.push({key:'letters/'+extra.id+'.json',value:extra});
 const sources=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='th'),blend=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'th',source_ids:sources.slice(0,2).map(s=>s.capture_id),horizontal:50,vertical:50});records.push({key:'blends/'+blend.id+'.json',value:blend});
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'th',capture_id:blend.id}));records.push({key:'letter_reviews/'+sources[0].capture_id+'.json',value:{schema_version:1,capture_id:sources[0].capture_id,reviews:{th:{included:false,baseline_shift_mm:2,scale_factor:1.4}}}});
 const before=JSON.stringify(records);for(const sample of [sources[0],{capture_id:blend.id,letter:'th'}]){
  const data={...request(sample,'ththth'),scale_factor:.75,baseline_shift_mm:-1,stroke_edit:{order:[0],reversed:[true]}},result=E.reviewWord(records,data);
  assert(result.used_samples.every(s=>s.capture_id===sample.capture_id));assert.notEqual(result.svg,E.reviewWord(records,{...data,stroke_edit:{order:[0],reversed:[false]}}).svg);
 }
 assert.equal(JSON.stringify(records),before);
});
