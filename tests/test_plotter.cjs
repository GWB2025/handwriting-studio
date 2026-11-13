const test=require('node:test'),assert=require('node:assert/strict'),P=require('../static/plotter.js');
test('G-code preserves strokes, negates Y, lifts before travel and returns home',()=>{const g=P.generate(['M20 20 L25 25','M30 30 L30 30']);assert(g.includes('X25.0000 Y-25.0000 F900'));assert.equal(g.match(/Z5 /g).length,2);assert(g.includes('G4 P0.1'));assert(g.endsWith('G90 G1 X0 Y0 F2400\n'));});
test('quadratic flattening follows the curve with bounded interpolation error',()=>{const p=P.flatten('M20 20 Q30 40 40 20');assert.deepEqual(p[0],[20,20]);assert.deepEqual(p.at(-1),[40,20]);assert(p.some(([x,y])=>x===30&&y===30));for(let i=1;i<p.length;i++){const t=(p[i][0]-20)/20,prev=(p[i-1][0]-20)/20,mid=(t+prev)/2;const actual=20+40*mid*(1-mid),linear=(p[i][1]+p[i-1][1])/2;assert(Math.abs(actual-linear)<=.02001);}});
test('reject unsupported commands, missing points and outside-margin geometry',()=>{for(const d of ['M20 20 C1 2 3 4 5 6','M20','M20 20 LNaN 30','M20 20 M30 30'])assert.throws(()=>P.flatten(d));assert.throws(()=>P.generate(['M10 10 L30 30']));assert.throws(()=>P.generate([]));});
test('plot simplification removes redundant crossbar points while retaining corners and endpoints',()=>{
 const p=[[20,20],[20.1,20.002],[20.2,19.998],[21,20],[21,21]],copy=JSON.stringify(p),s=P.simplify(p);
 assert.deepEqual(s,[[20,20],[21,20],[21,21]]);assert.equal(JSON.stringify(p),copy);
 assert.deepEqual(P.simplify([[20,20],[21,20],[20,20]]),[[20,20],[21,20],[20,20]]);
});
test('dots retain pen lifts and a dwell without redundant zero-length moves; tiny loops remain shaped',()=>{
 const dot=P.generate(['M20 20 L20 20 L20 20']);assert.equal((dot.match(/G4 P0.1/g)||[]).length,1);assert.equal((dot.match(/F900/g)||[]).length,0);
 const loop=[[20,20],[20.05,20],[20.05,20.05],[20,20.05],[20,20]];assert.deepEqual(P.simplify(loop),loop);
 const code=P.generate(['M20 20 L20.1 20 L20.2 20','M21 21 L21 21']);assert.equal((code.match(/Z5 F3000/g)||[]).length,2);
 // Validate original points before simplification can hide an excursion.
 assert.throws(()=>P.generate(['M20 20 L19.999 20 L20 20']));
});
test('every simplified interval stays within 0.01 mm of its original points',()=>{
 const points=Array.from({length:501},(_,i)=>[20+i/100,30+Math.sin(i/40)*.2]),simple=P.simplify(points);let start=0;
 for(let k=1;k<simple.length;k++){const a=simple[k-1],b=simple[k],end=points.findIndex((p,i)=>i>start&&p[0]===b[0]);const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;
  for(let i=start;i<=end;i++){const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l));assert(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=.01000001);}start=end;
 }
 assert(simple.length<points.length/5);
});
