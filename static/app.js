'use strict';
const $=id=>document.getElementById(id), canvas=$('paper'), ctx=canvas.getContext('2d');
let strokes=[],undone=[],active=null,origin=null,dirty=false,frame=null,saving=false;
let activeBounds=null;
let saved=false,finishedWriter='';
function updateSave(){
  // Prevent palm contact from focusing/selecting the name during a Pencil stroke.
  $('writer').disabled=saving || active?.pointerType==='pen';
  $('saved-pages').disabled=saving || !!active;
  const writer=$('writer').value.trim();
  $('writer-done').disabled=$('writer').disabled || !writer || writer===finishedWriter;
  $('save').textContent=saving?'Saving…':saved&&!dirty?'✓ Saved':'Save page';
  $('save').disabled=saving || (saved&&!dirty);
  $('save').classList.toggle('saved',saved&&!dirty);
  $('undo').disabled=saving || (!active && !strokes.length);
  $('redo').disabled=saving || !!active || !undone.length;
  window.notebookMode?.updateControls();
}
const message=text=>{$('status').textContent=text;updateSave();};
let layoutFrame=null,layoutRetries=[];
function fitPage(){
  // Safari may deliver viewport events before updating the dimensions.
  // Measure on the next frame, and never move the paper during a stroke.
  if(layoutFrame!==null)return;
  layoutFrame=requestAnimationFrame(()=>{
    layoutFrame=null;
    if(active)return;
    const viewport=window.visualViewport;
    document.documentElement.style.setProperty('--visible-height',`${viewport?.height || window.innerHeight}px`);
    document.documentElement.style.setProperty('--visible-top',`${viewport?.pageTop ?? window.scrollY}px`);
    document.documentElement.style.setProperty('--visible-left',`${viewport?.pageLeft ?? window.scrollX}px`);
    document.documentElement.style.setProperty('--visible-width',`${viewport?.width || window.innerWidth}px`);
    redraw();
  });
}
function settlePage(){
  fitPage();
  layoutRetries.forEach(clearTimeout);
  // A bounded retry also covers keyboard dismissal without a final resize event.
  layoutRetries=[100,300,700,1200].map(delay=>setTimeout(fitPage,delay));
}
function finishWriter(){
  if(saving)return;
  const writer=$('writer').value.trim();
  if(writer)finishedWriter=writer;
  updateSave();
  $('writer').blur();
  settlePage();
}

function pathCommands(points,smooth){
  if(!points.length)return [];
  const p=points[0],commands=[['M',p.x,p.y]];
  if(points.length===1)return [...commands,['L',p.x,p.y]];
  if(!smooth || points.length<3)return [...commands,...points.slice(1).map(p=>['L',p.x,p.y])];
  for(let i=1;i<points.length-1;i++){
    const a=points[i],b=points[i+1];commands.push(['Q',a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2]);
  }
  const end=points.at(-1);commands.push(['L',end.x,end.y]);return commands;
}
function render(){
  frame=null;
  // Keep the paper and its coordinate mapping fixed until the Pencil lifts.
  if(!active){
    const box=canvas.parentElement.getBoundingClientRect();
    const cw=Math.max(2,Math.min(box.width-2,(box.height-2)*2));
    canvas.style.width=cw+'px';canvas.style.height=(cw/2)+'px';
    const dpr=window.devicePixelRatio||1,r=canvas.getBoundingClientRect();
    const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  ctx.setTransform(canvas.width/1000,0,0,canvas.height/500,0,0);ctx.clearRect(0,0,1000,500);
  if(window.notebookMode)window.notebookMode.drawGuides(ctx);
  else if($('guides').checked){ctx.strokeStyle='#dce2d8';ctx.lineWidth=.7;for(let y=90;y<500;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}}
  ctx.strokeStyle='#203832';ctx.fillStyle='#203832';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';
  for(const s of [...strokes,...(active?[active]:[])]){
    ctx.beginPath();for(const [op,...v] of pathCommands(s.points,$('smooth').checked)){if(op==='M')ctx.moveTo(...v);else if(op==='L')ctx.lineTo(...v);else ctx.quadraticCurveTo(...v);}ctx.stroke();
    if(s.points.length && s.points.every(p=>p.x===s.points[0].x && p.y===s.points[0].y)){const p=s.points[0];ctx.beginPath();ctx.arc(p.x,p.y,.9,0,Math.PI*2);ctx.fill();}
  }
}
function redraw(){if(frame===null)frame=requestAnimationFrame(render);}
function point(e){
  const r=activeBounds;
  const prev=active.points.at(-1)?.t??strokes.at(-1)?.points.at(-1)?.t??0;
  // Continue a reopened page's timeline without modifying its recorded points.
  if(origin===null)origin=e.timeStamp-prev;
  active.points.push({x:Math.max(0,Math.min(1000,(e.clientX-r.left)*1000/r.width)),y:Math.max(0,Math.min(500,(e.clientY-r.top)*500/r.height)),t:Math.max(prev,e.timeStamp-origin),pressure:Number.isFinite(e.pressure)?e.pressure:null,tiltX:Number.isFinite(e.tiltX)?e.tiltX:null,tiltY:Number.isFinite(e.tiltY)?e.tiltY:null});
}
function release(){if(!active)return;const id=active.id;active=null;activeBounds=null;try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{}fitPage();}
function interrupt(){if(!active)return;release();message('Contact interrupted; unfinished stroke discarded. Completed strokes remain.');redraw();}
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='pen' && !(e.pointerType==='mouse' && e.button===0))return;
  if(saving){message('Saving this page — please wait.');return;}
  if(active)return;
  e.preventDefault();activeBounds=canvas.getBoundingClientRect();active={id:e.pointerId,pointerType:e.pointerType,points:[]};point(e);dirty=true;
  // preventDefault keeps input focus; explicitly dismiss name entry without
  // discarding this first point or resizing the paper until the stroke ends.
  if(document.activeElement===$('writer'))finishWriter();
  $('input').textContent=e.pointerType==='pen'?'Pencil connected':'Mouse input';
  message('Writing · not saved');redraw();
  try{canvas.setPointerCapture(e.pointerId);}catch{}
});
window.addEventListener('pointermove',e=>{
  if(!active || active.id!==e.pointerId)return;
  e.preventDefault();
  const coalesced=e.getCoalescedEvents?.()||[];
  for(const item of coalesced.length?coalesced:[e])point(item);redraw();
});
window.addEventListener('pointerup',e=>{
  if(!active || active.id!==e.pointerId)return;
  e.preventDefault();
  point(e);const {id,...stroke}=active;release();strokes.push(stroke);undone=[];updateSave();redraw();
});
// Safari can treat short Pencil contacts or palm touches as browser gestures,
// even with touch-action on the absolutely positioned drawing canvas. Keep
// native gestures off the paper only; controls and name entry stay native.
for(const name of ['touchstart','touchmove','touchend','gesturestart','gesturechange','gestureend','dblclick']){
  canvas.parentElement.addEventListener(name,e=>e.preventDefault(),{passive:false});
}
window.addEventListener('pointercancel',e=>{if(active?.id===e.pointerId)interrupt();});
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
window.addEventListener('resize',settlePage);
window.addEventListener('pageshow',settlePage);
window.addEventListener('orientationchange',settlePage);
window.visualViewport?.addEventListener('resize',settlePage);
window.visualViewport?.addEventListener('scroll',fitPage);
$('focus').onclick=()=>{interrupt();const help=$('guidance');help.hidden=!help.hidden;$('focus').textContent=help.hidden?'Show help':'Hide help';$('focus').setAttribute('aria-expanded',String(!help.hidden));fitPage();};
new ResizeObserver(redraw).observe(canvas.parentElement);
$('undo').onclick=()=>{
  if(saving)return;
  if(active){release();redraw();message('Unfinished stroke removed.');return;}
  if(!strokes.length)return;
  undone.push(strokes.pop());dirty=true;redraw();message('Last stroke removed. Tap Redo to restore it.');
};
$('redo').onclick=()=>{
  if(saving || active || !undone.length)return;
  strokes.push(undone.pop());dirty=true;redraw();message('Undone stroke restored.');
};
$('clear').onclick=()=>{if(saving)return;release();strokes=[];undone=[];origin=null;dirty=false;saved=false;redraw();message('Page cleared. Previously saved pages are kept.');};
// Keep focus inside the user gesture so Safari can show its keyboard.
function requestWriterKeyboard(){
  if(saving)return;
  $('writer').focus({preventScroll:true});
  settlePage();
}
// Keep native editing in the Writer field; reject selection/copy popups elsewhere.
for(const eventName of ['selectstart','contextmenu']){
  $('notebook').addEventListener(eventName,event=>{
    if(event.target!==$('writer') || $('writer').disabled)event.preventDefault();
  });
}
$('writer').addEventListener('click',requestWriterKeyboard);
$('writer').addEventListener('pointerdown',e=>{
  if(e.pointerType!=='pen' || saving)return;
  // Request typed entry for a Pencil tap, leaving native finger text editing intact.
  // iPadOS ultimately decides whether to offer its keyboard or Scribble.
  e.preventDefault();requestWriterKeyboard();
});
$('writer').addEventListener('focus',settlePage);
$('writer').addEventListener('blur',settlePage);
$('writer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finishWriter();}});
$('writer-done').onclick=finishWriter;
$('writer').oninput=()=>{dirty=true;updateSave();};
$('smooth').onchange=()=>{dirty=true;updateSave();redraw();};$('guides').onchange=redraw;
$('save').onclick=async()=>{
  if(saving)return;
  if(active){message('Lift the Pencil before saving.');return;}
  if(!$('writer').value.trim()){message('Enter the writer’s name above, then press Save page.');$('writer').focus();return;}
  if(!strokes.length){message('Write something before saving.');return;}
  saving=true;$('writer').disabled=true;$('smooth').disabled=true;message('Saving…');
  try{const r=await fetch('/api/pages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({writer:$('writer').value.trim(),strokes,smooth:$('smooth').checked})});const data=await r.json();if(!r.ok)throw Error(data.error);dirty=false;saved=true;message('✓ Saved on this Mac at '+new Date(data.saved_at).toLocaleTimeString()+'. You can clear the page or keep writing.');}
  catch(e){message('Could not save: '+e.message+' Your writing is still here.');}
  finally{saving=false;$('writer').disabled=false;$('smooth').disabled=false;updateSave();}
};
$('export').onclick=()=>{
  if(active || !strokes.length){message('Finish writing before exporting.');return;}
  const paths=strokes.map(s=>'<path d="'+pathCommands(s.points,$('smooth').checked).map(c=>c.map(v=>typeof v==='number'?v.toFixed(3):v).join(' ')).join(' ')+'"/>').join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="100mm" viewBox="0 0 1000 500"><g fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths+'</g></svg>';
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='handwriting-page.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
};
function hasUnsavedWriting(){return dirty && !!(strokes.length || undone.length || active);}
function openSavedPage(page){
  release();
  strokes=page.raw_strokes.map(stroke=>({...stroke,points:stroke.points.map(point=>({...point}))}));
  undone=[];origin=null;dirty=false;saved=true;
  $('writer').value=page.writer;finishedWriter=page.writer.trim();
  $('smooth').checked=page.display_smoothing;
  $('input').textContent='Ready for Pencil';
  message('Opened '+page.writer+' · saved '+new Date(page.saved_at).toLocaleString()+'. Changes save as a new page.');
  redraw();settlePage();
}
window.addEventListener('beforeunload',e=>{if(hasUnsavedWriting()){e.preventDefault();e.returnValue='';}});
fitPage();
updateSave();
