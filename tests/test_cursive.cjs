const assert=require('node:assert/strict'),test=require('node:test');
const E=require('../web/engine.js');
const {extendedFiles}=require('./extended_helpers.js');

test('cursive milestone exposes 24 common joined pairs',()=>{
  assert.equal(E.pairs.length,24);
  for(const pair of ['th','he','in','er','an','re','on','at','to','it','of','st','ng','ll','ou','ch','sh','ee'])assert.ok(E.pairs.includes(pair));
  assert.equal(E.plans.pairs.alphabet.length,24);
});

test('connection metrics preserve captured entry and exit directions',()=>{
  const files=extendedFiles('pairs'),sample=E.catalog(files).byWriter.get('Writer').find(s=>s.letter==='th');
  const metric=E.connectionMetrics(sample);
  assert.equal(metric.stroke_count,1);
  assert.deepEqual(metric.entry,{x:0,y:0,t:0,pressure:.4,tiltX:0,tiltY:0});
  assert.equal(metric.exit.x,40);
  assert.equal(metric.exit.y,0);
  assert.ok(Number.isFinite(metric.entry_tangent.angle));
  assert.ok(Number.isFinite(metric.exit_tangent.angle));
});

test('joined composition prefers captured cursive pairs and falls back to letters',()=>{
  const files=[...extendedFiles('lowercase'),...extendedFiles('pairs')];
  const joined=E.compose(files,{writer:'Writer',phrase:'th in xyz',height:5,smooth:true,joined:true});
  assert.ok(joined.used_samples.some(s=>s.letter==='th'));
  assert.ok(joined.used_samples.some(s=>s.letter==='in'));
  assert.ok(joined.used_samples.some(s=>s.letter==='x'));
  const plain=E.compose(files,{writer:'Writer',phrase:'th in xyz',height:5,smooth:true,joined:false});
  assert.equal(plain.used_samples.some(s=>s.letter.length>1),false);
});

test('pair proof reports all captured cursive joins',()=>{
  const files=[...extendedFiles('lowercase'),...extendedFiles('pairs')];
  const proof=E.proofSheet(files,{writer:'Writer',kind:'pairs',height:5,sentence:'the thing'});
  assert.equal(proof.characters.length,24);
  assert.equal(proof.missing.length,0);
  assert.match(proof.svg,/Handwriting/);
});


test('joined-pair advance uses drawn ink rather than stale capture bounds',()=>{
  const pair={letter:'th',capture_id:'00000000-0000-4000-8000-000000000001',baseline_shift_mm:0,bounds:{left:0,right:240},processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:80,y:-20},{x:96,y:0}]}]};
  const e={letter:'e',capture_id:'00000000-0000-4000-8000-000000000002',baseline_shift_mm:0,bounds:{left:0,right:52},processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:26,y:-12},{x:52,y:0}]}]};
  assert.equal(E.sampleInkWidth(pair),96);
  assert.equal(E.sampleInkWidth(e),52);
  const layout=E.layoutWriting(['th','e'],[pair,e],{height:8,smooth:false,letter_spacing:1,word_spacing:1,line_spacing:1},{x:20,y:20,width:170,bottom:277});
  assert.ok(layout.width<30,'short cursive word should not inherit the obsolete 240-unit pair bound');
});

test('ink-width advance leaves ordinary samples unchanged when bounds match strokes',()=>{
  const a={letter:'a',bounds:{left:0,right:70},processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:35,y:-40},{x:70,y:0}]}]};
  assert.equal(E.sampleInkWidth(a),a.bounds.right-a.bounds.left);
});
