const assert=require('node:assert/strict'),test=require('node:test');
const E=require('../web/engine.js'),{files}=require('./browser_helpers'),{extended,extendedFiles}=require('./extended_helpers');
test('all new capture types preserve originals, guides, labels and backup validation',()=>{
 for(const kind of ['uppercase','numbers','symbols','pairs']){
  const plan=E.plans[kind],orders=E.shuffleSet(plan.orders,0,()=>0,plan);
  E.validateOrders(orders,plan);
  const records=[];
  for(let i=0;i<orders.length;i++){
   const data={...extended(kind,i),capture_orders:orders};const original=E.clone(data.strokes),r=E.capture(data);
   assert.deepEqual(r.raw_strokes,original);assert.deepEqual(r.order,orders[i]);
   assert.deepEqual(r.samples.map(s=>s.letter),orders[i]);
   E.validateRecord('letters/'+r.id+'.json',E.clone(r));records.push({key:'letters/'+r.id+'.json',value:r});
   assert.equal(r.samples[0].processed_strokes[0].points[0].y,0);
  }
  const profile=E.catalog(records).writers[0];for(const token of plan.alphabet)assert.equal(profile.counts[token],1);
  assert.deepEqual(profile.capture_progress[plan.id].capture_orders,orders);
 }
});
test('mixed case, digits and punctuation compose and report missing characters exactly',()=>{
 const records=[...files(),...extendedFiles('uppercase'),...extendedFiles('numbers'),...extendedFiles('symbols')];
 const result=E.compose(records,{writer:'Writer',phrase:'Hello, World! 123 £5.',height:5});
 assert.equal(result.used_samples.map(s=>s.letter).join(''),'Hello,World!123£5.');
 assert.throws(()=>E.compose(files(),{writer:'Writer',phrase:'Hello!'}),/H, !|!, H/);
});
test('stationary dots and horizontal punctuation can be captured without accepting empty sheets',()=>{
 const p=E.plans.symbols,index=p.orders.findIndex(o=>o.includes('.')),data=extended('symbols',index);
 const i=p.orders[index].indexOf('.');data.strokes[i].points=data.strokes[i].points.slice(0,1);
 assert.doesNotThrow(()=>E.capture(data));
 data.strokes=[];assert.throws(()=>E.capture(data),/Draw/);
});
test('normalisation and blending leave originals untouched; reversed and different stroke counts fall back',()=>{
 const records=files(),a=records[0].value.samples[0],b=E.clone(a);b.capture_id='other';a.capture_id='first';a.baseline_shift_mm=0;b.baseline_shift_mm=1;
 b.processed_strokes[0].points[1].x+=4;
 const originals=JSON.stringify([a,b]),blended=E.blend(a,b,.5);
 assert.ok(blended);assert.equal(blended.processed_strokes[0].points.length,64);
 assert.equal(JSON.stringify([a,b]),originals);
 assert.equal(blended.baseline_shift_mm,.5);
 const reversed=E.clone(b);reversed.processed_strokes[0].points.reverse();assert.equal(E.compatible(a,reversed),false);
 const extra=E.clone(b);extra.processed_strokes.push(extra.processed_strokes[0]);assert.equal(E.blend(a,extra,.5),null);
 const result=E.compose(files(),{writer:'Writer',phrase:'aaaa',variation:'blend',seed:'fixed'});
 assert.equal(result.variation.blended,4);assert.deepEqual(E.compose(files(),{writer:'Writer',phrase:'aaaa',variation:'blend',seed:'fixed'}).svg,result.svg);
});
test('joined pairs substitute only when included and can be disabled',()=>{
 const records=[...files(),...extendedFiles('pairs')];
 assert.deepEqual(E.compose(records,{writer:'Writer',phrase:'the'}).used_samples.map(s=>s.letter),['th','e']);
 assert.deepEqual(E.compose(records,{writer:'Writer',phrase:'the',joined:false}).used_samples.map(s=>s.letter),['t','h','e']);
 const f=records.find(f=>f.value.samples.some(s=>s.letter==='th'));
 records.push({key:'letter_reviews/'+f.value.id+'.json',value:{capture_id:f.value.id,reviews:{th:{included:false,baseline_shift_mm:0}}}});
 assert.deepEqual(E.compose(records,{writer:'Writer',phrase:'the'}).used_samples.map(s=>s.letter),['t','he']);
});
test('whole words share a baseline at wrap and oversized words are rejected',()=>{
 const result=E.compose(files(),{writer:'Writer',phrase:Array(10).fill('abcde').join(' '),height:12});
 const starts=[...result.svg.matchAll(/d="M([\d.-]+) ([\d.-]+)/g)].map(m=>Number(m[2]));
 for(let i=0;i<starts.length;i+=5)assert.equal(new Set(starts.slice(i,i+5)).size,1);
 assert.ok(new Set(starts).size>1);
 assert.throws(()=>E.compose(files(),{writer:'Writer',phrase:'a'.repeat(150),height:12}),/word is too wide/);
});
