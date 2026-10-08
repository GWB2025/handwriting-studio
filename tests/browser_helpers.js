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
