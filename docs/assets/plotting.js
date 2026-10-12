'use strict';
(function(root){
 const active=new Set(['connecting','homing','plotting','pausing','paused','reconnecting','finishing','cancelling']);
 function permissions(s,hasJob,ready){const idle=s.connected&&!s.busy&&!active.has(s.phase);return {
  file:!s.busy,refresh:!s.busy,connect:!s.connected&&!s.busy,disconnect:idle,home:idle,
  start:idle&&s.homed&&hasJob&&ready,pause:s.phase==='plotting'||s.phase==='finishing',
  continue:s.phase==='paused',cancel:['plotting','pausing','paused','reconnecting','finishing'].includes(s.phase)
 };}
 const duration=seconds=>seconds==null?'—':seconds<60?Math.ceil(seconds)+' sec':Math.ceil(seconds/60)+' min';
 const api={permissions,duration};if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document==='undefined')return;
 const token=document.querySelector('meta[name="plotter-token"]')?.content;if(!token)return;
 const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';let job=null,state={phase:'offline',connected:false,busy:false},busy=false,lastPhase='',travelGroup,cursor;
 $('plot-setup').hidden=true;$('plot-local').hidden=false;
 async function request(path,data){const response=await fetch('/api/'+path,{method:data?'POST':'GET',headers:{'X-Plotter-Token':token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error||'The plotting window did not respond.');return result;}
 function controls(){const p=permissions(state,!!job,$('plot-ready').checked);for(const [key,value] of Object.entries(p))$('plot-'+key).disabled=busy||!value;$('plot-port').disabled=busy||state.connected||state.busy;$('plot-ready').disabled=busy||state.busy;}
 function render(){
  $('plot-message').textContent=state.message;
  const accepted=state.accepted||0,total=state.total||0,percent=total?100*accepted/total:0;
  $('plot-progress').value=state.phase==='completed'?100:Math.min(percent,99.9);
  $('plot-progress-text').textContent=total?accepted.toLocaleString()+' of '+total.toLocaleString()+' commands sent ('+Math.floor(percent)+'%).'+(accepted===total&&state.phase!=='completed'?' Waiting for confirmed completion.':''):'No drawing started.';
  $('plot-time').textContent=state.elapsed?'Elapsed: '+duration(state.elapsed)+(state.remaining!=null&&active.has(state.phase)?' · remaining movement: at least '+duration(state.remaining):''):'';
  const pos=state.controller?.position;$('plot-position').textContent=pos?'Last reported position: X '+pos[0].toFixed(2)+' · Y '+pos[1].toFixed(2)+' mm · '+(Math.abs(pos[2]-.5)<.02?'pen up':Math.abs(pos[2]-5)<.02?'pen down':'pen moving'):'';
  if(cursor&&pos){cursor.setAttribute('cx',pos[0]);cursor.setAttribute('cy',-pos[1]);cursor.hidden=false;}
  $('plot-events').replaceChildren(...(state.events||[]).slice(-8).map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
  if(lastPhase!==state.phase&&['completed','cancelled','error','offline'].includes(state.phase))$('plot-ready').checked=false;
  lastPhase=state.phase;controls();
 }
 function draw(){const svg=$('plot-preview');svg.replaceChildren();function el(tag,attrs,parent=svg){const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);parent.append(node);return node;}
  el('rect',{x:0,y:0,width:210,height:297,fill:'white'});el('rect',{x:20,y:20,width:170,height:257,fill:'none',stroke:'#ccd8d0','stroke-width':.4,'stroke-dasharray':'2 2'});
  travelGroup=el('g',{fill:'none',stroke:'#7c9aad','stroke-width':.25,'stroke-dasharray':'1 1'});
  for(const path of job?.travel||[])el('path',{d:path.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')},travelGroup);
  const ink=el('g',{fill:'none',stroke:'#203832','stroke-width':.3,'stroke-linecap':'round','stroke-linejoin':'round'});
  for(const path of job?.paths||[]){if(path.length===1||path.every(p=>p[0]===path[0][0]&&p[1]===path[0][1]))el('circle',{cx:path[0][0],cy:path[0][1],r:.15,fill:'#203832'},ink);else el('path',{d:path.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')},ink);}
  cursor=el('circle',{cx:0,cy:0,r:1.7,fill:'#b56d29'});travelGroup.style.display=$('plot-travel').checked?'':'none';
 }
 function describeJob(){draw();if(!job)return;const b=job.bounds;$('plot-file-info').textContent=job.name+' · '+job.commands.toLocaleString()+' checked commands · '+(b?'drawing '+(b[2]-b[0]).toFixed(1)+' × '+(b[3]-b[1]).toFixed(1)+' mm':'pen-up movement or pen check')+'.';$('plot-estimate').textContent='Estimated movement time: at least '+duration(job.seconds)+' · '+(job.draw_mm/1000).toFixed(1)+' m drawn. Acceleration, pauses and connection delays add time.';}
 async function perform(fn){if(busy)return;busy=true;controls();$('plot-error').textContent='';try{await fn();}catch(error){$('plot-error').textContent=error.message;}finally{busy=false;controls();}}
 async function refreshPorts(){const data=await request('devices'),selected=$('plot-port').value;$('plot-port').replaceChildren(...data.devices.map(p=>{const option=document.createElement('option');option.value=p.port;option.textContent=p.name+' · '+p.port.split('/').pop();return option;}));if(!data.devices.length){const o=document.createElement('option');o.value='';o.textContent='No T-A4 plotter found';$('plot-port').append(o);}else if(data.devices.some(p=>p.port===selected))$('plot-port').value=selected;}
 $('plot-file').addEventListener('change',()=>perform(async()=>{const file=$('plot-file').files[0];if(!file)return;job=null;$('plot-ready').checked=false;draw();$('plot-file-info').textContent='Checking '+file.name+'…';$('plot-estimate').textContent='';if(file.size>32*1024*1024)throw Error('Choose a file no larger than 32 MB.');const result=await request('load',{name:file.name,text:await file.text()});job=result.job;describeJob();state=await request('status');render();}));
 for(const action of ['connect','disconnect','home','start','pause','continue','cancel'])$('plot-'+action).onclick=()=>perform(async()=>{state=await request('action',{action,port:$('plot-port').value,job_id:job?.id,ready:$('plot-ready').checked});render();});
 $('plot-refresh').onclick=()=>perform(refreshPorts);$('plot-ready').onchange=controls;$('plot-travel').onchange=()=>{if(travelGroup)travelGroup.style.display=$('plot-travel').checked?'':'none';};
 async function poll(){try{state=await request('status');render();}catch(error){state={...state,phase:'unavailable',connected:false,busy:true};controls();$('plot-error').textContent='Cannot reach the Mac sender. Check the plotter locally; movement may continue. '+error.message;}setTimeout(poll,750);}
 perform(async()=>{await refreshPorts();job=(await request('job')).job;describeJob();state=await request('status');render();}).finally(poll);
})(typeof window==='undefined'?globalThis:window);
