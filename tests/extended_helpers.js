const E=require('../web/engine.js'),{randomUUID}=require('node:crypto');
function extended(kind,index=0,variant=0){
 const plan=E.plans[kind],order=plan.orders[index];
 return {writer:'Writer',plan_id:plan.id,order_index:index,request_id:randomUUID(),smooth:true,
  strokes:Array.from(order,(c,i)=>({pointerType:'pen',points:[
   {x:i*1000/order.length+30,y:330,t:i*100,pressure:.4,tiltX:0,tiltY:0},
   {x:i*1000/order.length+40,y:170,t:i*100+1,pressure:.4,tiltX:0,tiltY:0},
   {x:i*1000/order.length+70+variant,y:330,t:i*100+2,pressure:.4,tiltX:0,tiltY:0}]}))};
}
function extendedFiles(kind){return E.plans[kind].orders.map((_,i)=>{const value=E.capture(extended(kind,i));return {key:'letters/'+value.id+'.json',value};});}
module.exports={extended,extendedFiles};
