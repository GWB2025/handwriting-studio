'use strict';
(()=>{
 const script=document.currentScript,info=JSON.parse(script.dataset.version),box=document.createElement('aside');box.className='studio-version';box.style.cssText='padding:12px;text-align:center;font-size:0.85rem';
 const label=document.createElement('span'),button=document.createElement('button'),status=document.createElement('span'),link=document.createElement('a');
 label.textContent='Handwriting Studio · '+(info.channel==='live'?'Live':'Preview')+' · '+info.revision.slice(0,8)+' · '+info.built.slice(0,10)+' ';
 button.type='button';button.id='studio-version-check';button.textContent='Check for updates';status.setAttribute('role','status');status.style.margin='0 10px';
 link.href='https://gwb2025.github.io/handwriting-studio/';link.textContent='Open live app';link.hidden=true;
 box.append(label,button,status,link);document.body.append(box);
 button.onclick=async()=>{button.disabled=true;status.textContent='Checking the published live version…';
  try{const response=await fetch('https://gwb2025.github.io/handwriting-studio/version.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const latest=await response.json();if(typeof latest.revision!=='string'||typeof latest.build!=='string')throw Error();
   const same=latest.build===info.build;
   status.textContent=same?'You are using the latest published live version.':info.channel==='live'?'A different live version is available. Open the live app to reload it.':'This is a preview, not the live release. Latest live version: '+latest.revision.slice(0,8)+'.';link.hidden=same;
  }catch{status.textContent='Could not check the live version. You may be offline, or version information is not published yet. Try again later.';}finally{button.disabled=false;}
 };
})();
