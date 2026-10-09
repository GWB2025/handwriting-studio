const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine.js');
function sample(id,strokes){
 const points=strokes.flat();return {capture_id:id,letter:'f',included:true,baseline_shift_mm:0,bounds:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x))},processed_strokes:strokes.map(points=>({pointerType:'pen',points}))};
}
const line=(offset=0)=>[{x:0,y:-60+offset},{x:12,y:offset}];
test('tall narrow letters and separate dots allow natural size and position differences',()=>{
 const a=sample('a',[line()]),b=sample('b',[line(18)]),before=JSON.stringify([a,b]);
 assert.equal(E.compatible(a,b),true);const blended=E.blendMany([a,b],[.5,.5]);assert(blended);
 assert.equal(blended.processed_strokes[0].points[0].y,-51);assert.equal(JSON.stringify([a,b]),before);
 const body=[{x:0,y:-16},{x:4,y:0}],i=sample('i',[body,[{x:2,y:-20}]]),j=sample('j',[body,[{x:2,y:-40}]]);
 const dotted=E.blendMany([i,j],[.5,.5]);assert(dotted);assert.equal(dotted.processed_strokes.length,2);
 assert(dotted.processed_strokes[1].points.every(p=>p.x===2&&p.y===-30));
});
test('compatibility still rejects reversed, missing and substantially displaced strokes',()=>{
 const a=sample('a',[line()]),reversed=sample('reverse',[line().reverse()]),extra=sample('extra',[line(),[{x:2,y:-75}]]),far=sample('far',[line(80)]);
 for(const b of [reversed,extra,far])assert.equal(E.blendMany([a,b],[.5,.5]),null);
 assert.match(E.blendConflict(a,reversed),/starts, order or direction/);
 assert.match(E.blendConflict(a,extra),/stroke counts/);
 assert.match(E.blendConflict(a,far),/differ too much/);
});
test('source search checks every pair in a quartet and retains the preferred order when possible',()=>{
 const candidates=[0,-10,10,0,0].map((offset,i)=>sample(String(i),[[{x:0,y:offset-20},{x:2,y:offset}]])),before=JSON.stringify(candidates);
 assert(candidates.slice(1).every(s=>E.compatible(candidates[0],s)));
 assert.equal(E.compatible(candidates[1],candidates[2]),false);
 const selected=E.findCompatibleSources(candidates,4);
 assert.deepEqual(selected.map(s=>s.capture_id),['0','1','3','4']);assert(E.blendMany(selected,[.25,.25,.25,.25]));
 assert.deepEqual(E.findCompatibleSources(candidates,2,['4','2']).map(s=>s.capture_id),['4','2']);assert.equal(JSON.stringify(candidates),before);
});
test('source search can replace an incompatible first source and skips duplicates, excluded and derived samples',()=>{
 const a=sample('a',[line()]),reverse=sample('reverse',[line().reverse()]),others=['b','c','d'].map(id=>sample(id,[line()]));
 const candidates=[reverse,a,...others,{...a},{...a,capture_id:'excluded',included:false},{...a,capture_id:'blend',derived:true}];
 assert.deepEqual(E.findCompatibleSources(candidates,4,['reverse','a']).map(s=>s.capture_id),['a','b','c','d']);
 assert.deepEqual(E.findCompatibleSources(candidates.slice(0,3),4),[]);
 assert.deepEqual(E.findCompatibleSources([a,{...a,capture_id:'different',letter:'i'}],2),[]);
 assert.deepEqual(E.findCompatibleSources([a,{...a,capture_id:'excluded',included:false},{...a,capture_id:'blend',derived:true}],2),[]);
});
