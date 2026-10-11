const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),E=require('../web/engine'),P=require('../static/plotter'),{files}=require('./browser_helpers');
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
test('published proof and compose size choices agree and retain the 5 mm default',()=>{
 for(const [page,id] of [['proof','proof-size'],['compose','compose-size']]){
  const html=fs.readFileSync('docs/'+page+'.html','utf8'),select=html.match(new RegExp('<select id="'+id+'">(.*?)</select>'))[1];
  const options=[...select.matchAll(/<option value="(\d+)"( selected)?>/g)];assert.deepEqual(options.map(m=>Number(m[1])),[3,5,8,10,12,16,20]);assert.deepEqual(options.filter(m=>m[2]).map(m=>Number(m[1])),[5]);
 }
 const comparison=fs.readFileSync('docs/proof.html','utf8').match(/<select id="proof-compare-size">(.*?)<\/select>/)[1];
 assert.deepEqual([...comparison.matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1])),[3,5,8,10,12,16,20]);assert.match(comparison,/<option value="classic" selected>/);
 assert.match(fs.readFileSync('docs/review.html','utf8'),/<input id="sample-size" type="range" min="50" max="400"/);
});
test('larger writing scales the ink physically and keeps every page inside the A4 plot area',()=>{
 const records=files(),before=JSON.stringify(records);
 for(const height of [3,5,8,10,12,16,20]){
  const result=E.compose(records,{writer:'Writer',phrase:'a',height,smooth:false,page_layout:{}}),points=P.flatten(paths(result.svg)[0]),ys=points.map(p=>p[1]);
  assert(Math.abs(Math.max(...ys)-Math.min(...ys)-height)<.0001);
  for(const alignment of ['left','centre','right']){
   const proof=E.compose(records,{writer:'Writer',phrase:Array(12).fill('big letters\na bad cab').join('\n'),height,page_layout:{alignment,margin_left:30,margin_right:30},natural_variation:{level:'pronounced',seed:'sizes'}});
   assert.equal(proof.used_samples.map(s=>s.letter).join(''),'biglettersabadcab'.repeat(12));
   for(const page of proof.pages){E.validateDrawingSVG(page.svg);assert.doesNotThrow(()=>P.generate(paths(page.svg)));}
  }
 }
 assert.equal(JSON.stringify(records),before);
 for(const height of [0,20.1,NaN,'20'])assert.throws(()=>E.compose(records,{writer:'Writer',phrase:'a',height,page_layout:{}}),/writing size/);
 assert.throws(()=>E.compose(records,{writer:'Writer',phrase:'a'.repeat(40),height:20,page_layout:{}}),/word is too wide/);
});

test('a 400% reviewed letter scales correctly at every physical size and exports within the page margins',()=>{
 const records=files(),sample=E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='a');
 records.push({key:'letter_reviews/'+sample.capture_id+'.json',value:{schema_version:1,capture_id:sample.capture_id,reviews:{a:{included:true,baseline_shift_mm:0,scale_factor:4}}}});
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:sample.capture_id}));
 for(const height of [3,5,8,10,12,16,20]){
  const result=E.compose(records,{writer:'Writer',phrase:'a',height,smooth:false,page_layout:{}}),points=P.flatten(paths(result.svg)[0]),ys=points.map(p=>p[1]);
  assert(Math.abs(Math.max(...ys)-Math.min(...ys)-height*4)<.0001);E.validateDrawingSVG(result.svg);P.generate(paths(result.svg));
 }
});
