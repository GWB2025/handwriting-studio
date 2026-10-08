const assert=require('node:assert/strict'),test=require('node:test');
const E=require('../web/engine.js');
const {sheet,files}=require('./browser_helpers.js');
test('three full alphabet sets preserve raw data, order, sensor values and descenders',()=>{
  const records=files();assert.equal(records.length,18);
  const profile=E.catalog(records).writers[0];assert.equal(profile.next_order_index,0);
  for(const c of E.plan.alphabet)assert.equal(profile.counts[c],3);
  for(const f of records){E.validateRecord(f.key,f.value);assert.deepEqual(f.value.raw_strokes,sheet(f.value.order_index,f.value.order_index).strokes);
    for(const s of f.value.samples){const bottom=Math.max(...s.processed_strokes.flatMap(st=>st.points.map(p=>p.y)));assert.equal(bottom,E.plan.descenders.includes(s.letter)?70:0);}}
});
test('composition variants, reversible review, baseline shift and freshness revision',()=>{
  const records=files(),a=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a'),data={writer:'Writer',phrase:'aaaa',height:5,smooth:true};
  let result=E.compose(records,data);assert.deepEqual(result.used_samples.map(s=>s.capture_id),[a[0].capture_id,a[1].capture_id,a[2].capture_id,a[0].capture_id]);
  assert.match(result.svg,/width="210mm" height="297mm"/);assert.match(result.svg,/Q/);
  assert.equal(new Set(E.compose(records,{...data,samples:'latest_only'}).used_samples.map(s=>s.capture_id)).size,1);
  records.push({key:'letter_reviews/'+a[0].capture_id+'.json',value:{schema_version:1,capture_id:a[0].capture_id,reviews:{a:{included:false,baseline_shift_mm:0}}}});
  const revised=E.compose(records,data);assert.notEqual(result.sample_selection.writer_revision,revised.sample_selection.writer_revision);assert.equal(revised.sample_selection.counts.a,2);
  records.at(-1).value.reviews.a={included:true,baseline_shift_mm:2};assert.equal(E.compose(records,data).sample_selection.counts.a,3);
  assert.match(E.reviewSVG({...a[0],baseline_shift_mm:2}),/M0.0000 32.0000/);
});
test('reject invalid points, crossing boxes, missing letters and oversized layouts',()=>{
  const bad=sheet();bad.strokes[0].points[1].x=220;assert.throws(()=>E.capture(bad),/crosses/);
  const invalid=sheet();invalid.strokes[0].points[0].pressure=Infinity;assert.throws(()=>E.capture(invalid),/Invalid point/);
  const partial=sheet();partial.strokes.pop();assert.throws(()=>E.capture(partial),/Still needed/);
  assert.throws(()=>E.compose([],{writer:'Writer',phrase:'hello'}),/No included/);
  assert.throws(()=>E.compose(files(),{writer:'Writer',phrase:'Hello'}),/No included samples for: H/);
  assert.throws(()=>E.compose(files(),{writer:'Writer',phrase:Array(100).fill('b').join('\n'),height:8}),/does not fit/);
  const f=files()[0];f.value.samples[0].processed_strokes[0].points[0].x=999;assert.throws(()=>E.validateRecord(f.key,f.value),/do not match/);
});
test('Pages build contains relative navigation and no server or personal data assets',()=>{
  const fs=require('node:fs');
  for(const page of ['index','notebook','review','compose']){
    const html=fs.readFileSync('docs/'+page+'.html','utf8');assert.doesNotMatch(html,/(?:src|href)="\//);assert.match(html,/backup-open/);assert.match(html,/browser-api.js/);
  }
  for(const name of ['app','capture','review','compose','library']){
    const js=fs.readFileSync('docs/assets/'+name+'.js','utf8');assert.doesNotMatch(js,/(?<!studio)fetch\(/);assert.doesNotMatch(js,/['"]\/(?:compose|review|notebook)\?/);
  }
});

test('shuffled sets cover every letter once and saved orders survive resume and backup validation',()=>{
  let orders=E.clone(E.plan.orders);
  for(let i=0;i<18;i+=6)orders=E.shuffleSet(orders,i,()=>0);
  assert.notDeepEqual(orders,E.plan.orders);
  for(let i=0;i<18;i+=6)assert.equal([...orders.slice(i,i+6).join('')].sort().join(''),E.plan.alphabet);
  const records=[];
  for(let i=0;i<18;i++){
    const data={...sheet(i,i),capture_orders:orders};
    const record=E.capture(data);
    assert.equal(record.order,orders[i]);
    assert.deepEqual(record.samples.map(s=>s.letter),[...orders[i]]);
    E.validateRecord('letters/'+record.id+'.json',JSON.parse(JSON.stringify(record)));
    records.push({key:'letters/'+record.id+'.json',value:record});
  }
  const profile=E.catalog(records).writers[0];
  assert.deepEqual(profile.capture_orders,orders);
  for(const letter of E.plan.alphabet)assert.equal(profile.counts[letter],3);
  // Starting midway through an older set leaves completed sheets untouched.
  const partial=E.shuffleSet(E.plan.orders,2,()=>0);
  assert.deepEqual(partial.slice(0,2),E.plan.orders.slice(0,2));
  assert.equal([...partial.slice(0,6).join('')].sort().join(''),E.plan.alphabet);
  const invalid=E.clone(orders);invalid[0]=invalid[0].slice(0,-1)+invalid[0][0];
  assert.throws(()=>E.capture({...sheet(),capture_orders:invalid}),/every letter/);
  const tampered=E.clone(records[0].value);tampered.order=E.plan.orders[0];
  assert.throws(()=>E.validateRecord(records[0].key,tampered),/capture plan/);
});
