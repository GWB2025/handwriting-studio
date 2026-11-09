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
