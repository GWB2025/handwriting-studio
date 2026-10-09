const E=require('../web/engine.js');
const {randomUUID}=require('node:crypto');
function sheet(index=0,variant=0){
  const order=E.plan.orders[index],strokes=[...order].map((c,i)=>({pointerType:'pen',points:[
    {x:i*1000/order.length+30,y:330,t:i*100,pressure:.4,tiltX:10,tiltY:-4},
    {x:i*1000/order.length+40,y:c==='b'?170:250,t:i*100+1,pressure:.5,tiltX:10,tiltY:-4},
    {x:i*1000/order.length+70+variant,y:E.plan.descenders.includes(c)?400:330,t:i*100+2,pressure:.4,tiltX:10,tiltY:-4}]}));
  return {writer:'Writer',strokes,smooth:true,order_index:index,plan_id:E.plan.id,request_id:randomUUID()};
}
const files=()=>E.plan.orders.map((_,i)=>{const r=E.capture(sheet(i,i));r.saved_at=new Date(Date.UTC(2026,9,1,0,i)).toISOString();return {key:'letters/'+r.id+'.json',value:r};});
module.exports={sheet,files};
// Four captures whose t strokes differ only in order/direction and a small width variation.
function strokeFiles(){return Array.from({length:4},(_,variant)=>{
 const data=sheet(4,variant);data.strokes=data.strokes.flatMap((stroke,i)=>{
  if(E.plan.orders[4][i]!=='t')return [stroke];
  const bar={pointerType:'pen',points:[{x:stroke.points[0].x-5,y:270},{x:stroke.points[0].x+45+variant,y:270}]};
  if(variant%2){stroke.points.reverse();return [bar,stroke];}return [stroke,bar];
 });let t=0;for(const stroke of data.strokes)for(const p of stroke.points)Object.assign(p,{t:t++,pressure:.5});
 const value=E.capture(data);value.saved_at=new Date(Date.UTC(2026,9,9,0,variant)).toISOString();return {key:'letters/'+value.id+'.json',value};
});}
module.exports.strokeFiles=strokeFiles;
