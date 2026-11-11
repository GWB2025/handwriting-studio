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


test('primary joining stroke ignores a short dot or crossbar stroke',()=>{
  const sample={processed_strokes:[
    {pointerType:'pen',points:[{x:0,y:0},{x:20,y:-40},{x:45,y:-10},{x:60,y:0}]},
    {pointerType:'pen',points:[{x:25,y:-55},{x:27,y:-55}]}
  ]};
  assert.equal(E.primaryStrokeIndex(sample),0);
  assert.ok(E.strokeLength(sample.processed_strokes[0])>E.strokeLength(sample.processed_strokes[1]));
  const metric=E.connectionMetrics(sample);
  assert.equal(metric.join_stroke_index,0);
  assert.equal(metric.auxiliary_stroke_count,1);
  assert.deepEqual(metric.entry,{x:0,y:0});
  assert.deepEqual(metric.exit,{x:60,y:0});
});

test('primary joining stroke can be later in captured stroke order',()=>{
  const sample={processed_strokes:[
    {pointerType:'pen',points:[{x:10,y:-30},{x:18,y:-30}]},
    {pointerType:'pen',points:[{x:0,y:0},{x:20,y:-45},{x:50,y:-15},{x:70,y:0}]}
  ]};
  assert.equal(E.primaryStrokeIndex(sample),1);
  const metric=E.connectionMetrics(sample);
  assert.equal(metric.join_stroke_index,1);
  assert.deepEqual(metric.entry,{x:0,y:0});
  assert.deepEqual(metric.exit,{x:70,y:0});
});


test('connector geometry follows primary exit and entry tangents within a safe gap',()=>{
  const left={baseline_shift_mm:0,processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:30,y:-15},{x:60,y:0}]}]};
  const right={baseline_shift_mm:0,processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:25,y:-12},{x:50,y:0}]}]};
  const join=E.connectorGeometry(left,right,20,28,30,.1,8);
  assert.ok(join);
  assert.deepEqual(join.start,{x:26,y:30});
  assert.deepEqual(join.end,{x:28,y:30});
  assert.ok(Number.isFinite(join.control.x)&&Number.isFinite(join.control.y));
  assert.match(E.connectorPath(join),/^M26\.0000 30\.0000 Q/);
});

test('connector geometry rejects implausibly distant joins',()=>{
  const sample={baseline_shift_mm:0,processed_strokes:[{pointerType:'pen',points:[{x:0,y:0},{x:40,y:0}]}]};
  assert.equal(E.connectorGeometry(sample,sample,0,100,20,.1,5),null);
});

test('cursive proof can add preview-only connectors between uncaptured neighbours',()=>{
  const files=extendedFiles('lowercase');
  const result=E.compose(files,{writer:'Writer',phrase:'xyz',height:8,smooth:true,joined:true,auto_join_preview:true,page_layout:{}});
  assert.equal(result.pages.length,1);
  assert.equal(result.pages[0].generated_joins,2);
  assert.match(result.pages[0].svg,/ Q/);
  const plain=E.compose(files,{writer:'Writer',phrase:'xyz',height:8,smooth:true,joined:true,auto_join_preview:false,page_layout:{}});
  assert.equal(plain.pages[0].generated_joins,undefined);
});


test('cursive preview imports backups directly and preview publishing cancels stale runs',()=>{
  const fs=require('node:fs');
  const ui=fs.readFileSync('static/cursive.js','utf8');
  const html=fs.readFileSync('static/cursive.html','utf8');
  const workflow=fs.readFileSync('.github/workflows/static-preview.yml','utf8');
  assert.match(html,/id="cursive-backup-file"/);
  assert.match(ui,/cursive-backup-file/);
  assert.match(ui,/\.click\(\)/);
  assert.match(ui,/StudioStorage\.importBackup/);
  assert.match(workflow,/group: cursive-milestone-2-preview/);
  assert.match(workflow,/cancel-in-progress: true/);
});
