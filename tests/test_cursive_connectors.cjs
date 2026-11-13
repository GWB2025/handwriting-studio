const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine');
const sample=points=>({baseline_shift_mm:0,processed_strokes:[{pointerType:'pen',points:points.map(([x,y])=>({x,y}))}]});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const delta=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
test('joins preserve both endpoint directions and a smooth midpoint with bounded handles',()=>{
 const a=sample([[0,0],[30,-10],[60,0]]),b=sample([[0,0],[30,-12],[60,0]]);
 const join=E.connectorGeometry(a,b,20,28,30,.1,8);assert.ok(join);
 assert.ok(Math.abs(cross(delta(join.start,join.control1),{x:30,y:10}))<1e-9);
 assert.ok(Math.abs(cross(delta(join.control2,join.end),{x:30,y:-12}))<1e-9);
 for(const axis of ['x','y'])assert.ok(Math.abs(delta(join.control1,join.middle)[axis]-delta(join.middle,join.control2)[axis])<1e-9);
 for(const p of [join.control1,join.middle,join.control2])assert.ok(p.x>=join.start.x&&p.x<=join.end.x);
 const path=E.connectorPath(join);assert.equal((path.match(/Q/g)||[]).length,2);
 E.validateDrawingSVG(E.drawingSVG([path],'smooth join'));
});
test('overlapping gaps and tall-stem entry points never create a spike',()=>{
 const normal=sample([[0,0],[30,-10],[60,0]]);
 for(const [left,right,x] of [
  [normal,normal,25],
  [normal,sample([[0,-100],[30,-40],[60,0]]),28],
 ])assert.equal(E.connectorGeometry(left,right,20,x,30,.1,8),null);
});
test('stationary endpoint samples do not erase the joining direction or change saved strokes',()=>{
 const s=sample([[0,0],[0,0],[30,-10],[60,0],[60,0]]),before=JSON.stringify(s),m=E.connectionMetrics(s);
 assert.deepEqual(m.entry_tangent,{dx:30,dy:-10,angle:Math.atan2(-10,30)*180/Math.PI});
 assert.equal(m.exit_tangent.dx,30);assert.equal(m.exit_tangent.dy,10);
 assert.ok(E.connectorGeometry(s,s,20,28,30,.1,8));assert.equal(JSON.stringify(s),before);
});

test('backwards flourishes and long gaps use pen lifts without changing captured strokes',()=>{
 const normal=sample([[0,0],[30,-10],[60,0]]),backwards=sample([[0,0],[60,0],[55,-5]]),before=JSON.stringify(backwards);
 assert.equal(E.connectorGeometry(backwards,normal,20,28,30,.1,8),null);
 assert.equal(E.connectorGeometry(normal,normal,20,34,30,.1,8),null);
 assert.equal(JSON.stringify(backwards),before);
});
test('a connector cannot cross an auxiliary stroke inside its gap',()=>{
 const left=sample([[0,0],[30,-10],[60,0]]),right=sample([[0,0],[30,-12],[60,0]]);
 left.processed_strokes.push({points:[{x:70,y:-10},{x:70,y:10}]});
 assert.equal(E.connectorGeometry(left,right,20,28,30,.1,8),null);
});

 test('punctuation and digits break cursive runs while letters and saved pairs still connect',()=>{
 const glyph={...sample([[0,0],[30,-10],[60,0]]),bounds:{min_x:0,max_x:60,min_y:-10,max_y:0,width:60,height:10}};
 const render=(letters,join)=>E.layoutDocument(letters,letters.map(()=>glyph),{height:5,smooth:true,auto_join_preview:join})[0];
 for(const mark of ['.',',',';',':','!','?','\"',"'",'’','-','(',')','1']){
   const letters=['a',mark,'b'],before=JSON.stringify(glyph),on=render(letters,true),off=render(letters,false);
   assert.equal(on.generated_joins||0,0,mark);
   assert.deepEqual(on.paths,off.paths,'punctuation must keep original spacing and strokes: '+mark);
   assert.equal(JSON.stringify(glyph),before);
 }
 assert.equal(render(['a','b'],true).generated_joins,1);
 assert.equal(render(['th','e'],true).generated_joins,1);
 assert.equal(render(['a','b',',','c','d'],true).generated_joins,2);
 });
