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

test('backwards and vertical pen finishes keep their direction without a tall control point',()=>{
 const normal=sample([[0,0],[30,-10],[60,0]]);
 for(const left of [sample([[0,0],[60,0],[55,-5]]),sample([[0,0],[55,0],[55,-5]])]){
  const join=E.connectorGeometry(left,normal,20,28,30,.1,8);assert.ok(join);
  const t=E.connectionMetrics(left).exit_tangent;
  assert.ok(Math.abs(cross(delta(join.start,join.control1),{x:t.dx,y:t.dy}))<1e-9);
  for(const p of [join.control1,join.control2])assert.ok(p.y>=Math.min(join.start.y,join.end.y)-.64&&p.y<=Math.max(join.start.y,join.end.y)+.64);
 }
});
