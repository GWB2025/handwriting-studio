const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {permissions,duration}=require('../web/plotting');
test('public plotting page never contacts localhost or opens a connection automatically',()=>{
 let calls=0;vm.runInNewContext(fs.readFileSync('web/plotting.js','utf8'),{document:{querySelector(){return null;}},fetch(){calls++;}});assert.equal(calls,0);
});
test('movement controls require connection, homing, preview and readiness',()=>{
 const ready={phase:'ready',connected:true,homed:true,busy:false};assert(permissions(ready,true,true).start);
 for(const patch of [{connected:false},{homed:false},{busy:true},{phase:'homing'}])assert(!permissions({...ready,...patch},true,true).start);
 assert(!permissions(ready,false,true).start);assert(!permissions(ready,true,false).start);
 const running=permissions({...ready,phase:'plotting',busy:true},true,true);assert(running.pause&&running.cancel);assert(!running.home&&!running.start&&!running.file&&!running.disconnect);
 const paused=permissions({...ready,phase:'paused',busy:true},true,true);assert(paused.continue&&paused.cancel);assert(!paused.pause&&!paused.start);
 const retry=permissions({...ready,phase:'reconnecting',busy:true},true,true);assert(retry.cancel);assert(!retry.start&&!retry.home);
});
test('estimates distinguish unavailable durations and round movement time upward',()=>{assert.equal(duration(null),'—');assert.equal(duration(49.3*60),'50 min');assert.equal(duration(.1),'1 sec');});

test('local window loads previews and sends explicit controls with its session token',async()=>{
 const {environment}=require('./tooltip_dom'),w=environment(),{doc,add,Element}=w;
 Element.prototype.replaceChildren=function(...nodes){this.children.slice().forEach(n=>n.remove());this.append(...nodes);};
 doc.createElementNS=(ns,tag)=>doc.createElement(tag);
 const meta=add('meta','',doc.body,{name:'plotter-token'});meta.content='test-token';
 const html=fs.readFileSync('web/plotting.html','utf8');
 for(const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const e=add(match[1],match[2]);e.value='';e.checked=false;}
 let state={phase:'offline',message:'Offline',connected:false,homed:false,busy:false,total:0,accepted:0,events:[]},loaded=null,rejectLoad=false;
 const job={id:'checked-file',name:'example.gcode',commands:8,paths:[[[20,20],[30,30]]],travel:[[[0,0],[20,20]]],bounds:[20,20,30,30],seconds:61,draw_mm:14};
 const requests=[];
 async function fetch(url,options){
  assert.equal(options.headers['X-Plotter-Token'],'test-token');requests.push([url,options.method]);let result={};
  if(url==='/api/devices')result={devices:[]};
  else if(url==='/api/job')result={job:loaded};
  else if(url==='/api/status')result=state;
  else if(url==='/api/load'){if(rejectLoad)return {ok:false,json:async()=>({error:'Invalid file'})};loaded=job;state={...state,total:8};result={job};}
  else if(url==='/api/action'){
   const data=JSON.parse(options.body);
   if(data.action==='connect')state={...state,connected:true,phase:'ready'};
   if(data.action==='home')state={...state,homed:true};
   if(data.action==='start'){assert.equal(data.job_id,job.id);assert.equal(data.ready,true);state={...state,phase:'plotting',busy:true};}
   if(data.action==='pause')state={...state,phase:'paused'};
   if(data.action==='continue')state={...state,phase:'plotting'};
   if(data.action==='cancel')state={...state,phase:'cancelled',homed:false,busy:false};
   result=state;
  }else throw Error('Unexpected request '+url);
  return {ok:true,json:async()=>structuredClone(result)};
 }
 const flush=()=>new Promise(setImmediate),$=id=>doc.getElementById('plot-'+id);
 vm.runInNewContext(fs.readFileSync('web/plotting.js','utf8'),{document:doc,fetch,AbortSignal,setTimeout:w.win.setTimeout});await flush();
 assert.equal($('setup').hidden,true);assert.equal($('local').hidden,false);assert(!requests.some(r=>r[1]==='POST'));
 await $('connect').onclick();await $('home').onclick();
 $('file').files=[{name:'example.gcode',size:100,text:async()=>'checked gcode'}];w.emit($('file'),'change');await flush();
 assert.match($('file-info').textContent,/10.0 × 10.0 mm/);assert.match($('estimate').textContent,/2 min/);assert($('preview').querySelectorAll('path').length>=2);
 assert($('start').disabled);$('ready').checked=true;$('ready').onchange();assert(!$('start').disabled);
 await $('start').onclick();assert($('home').disabled&&$('file').disabled);assert(!$('pause').disabled);
 await $('pause').onclick();assert(!$('continue').disabled);await $('continue').onclick();await $('cancel').onclick();assert.equal($('ready').checked,false);assert($('start').disabled);
 rejectLoad=true;$('file').files=[{name:'bad.gcode',size:10,text:async()=>'G91'}];w.emit($('file'),'change');await flush();
 assert.match($('error').textContent,/Invalid file/);$('ready').checked=true;$('ready').onchange();assert($('start').disabled);
});
