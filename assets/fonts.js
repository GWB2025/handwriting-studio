'use strict';
(()=>{
  const $=id=>document.getElementById(id),E=window.StudioFonts,library=new Map();let pages=[],index=0,imageURL='',busy=false;
  const same=(a,b)=>{const other=new Uint8Array(b);return a.byteLength===b.byteLength&&new Uint8Array(a).every((v,i)=>v===other[i]);};
  function id(){return [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  function invalidate(){pages=[];if(imageURL)URL.revokeObjectURL(imageURL);imageURL='';$('font-image').hidden=true;$('font-image').removeAttribute('src');$('font-empty').hidden=false;for(const key of ['font-svg','font-gcode','font-page'])$(key).disabled=true;$('font-page').replaceChildren(new Option('No preview yet','0'));}
  function choices(selected=$('font-choice').value){
    const select=$('font-choice');select.replaceChildren();
    for(const [key,r] of library)select.append(new Option(r.name+' · outline font',key));
    if(library.has(selected))select.value=selected;
    if(!library.size)select.append(new Option('Add a TrueType font',''));
    select.disabled=!library.size||busy;$('font-generate').disabled=!library.size||busy;
    $('font-credit').textContent=library.get(select.value)?.credit||'';
  }
  function addMemory(records){for(const r of records)library.set(r.id,{...r,...E.parse(r.buffer,window.opentype)});}
  async function start(){
    busy=true;$('font-files').disabled=true;
    let skipped=0,notice='';
    try{for(const r of await window.StudioFontStorage.list()){try{addMemory([r]);}catch{skipped++;}}}catch{notice='Browser storage could not be opened. Fonts supplied by the Mac can still be used. ';}
    if(document.body.dataset.fontCatalog){
      try{
        const response=await fetch(document.body.dataset.fontCatalog,{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();
        for(const record of data.fonts.slice(0,20))try{
          const url=new URL(record.url,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/fonts/')||record.size>E.MAX_BYTES)throw Error();
          const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error();
          addMemory([{id:'mac:'+record.name,buffer:await response.arrayBuffer()}]);
        }catch{skipped++;}
      }catch{notice+='Could not load the Mac’s fonts. You can add the original .ttf files below. ';}
    }
    busy=false;$('font-files').disabled=false;choices();$('font-status').textContent=notice+(library.size?library.size+' fonts ready. Choose one and generate a preview.':'Add your TrueType files to start.')+(skipped?' '+skipped+' unreadable fonts were left untouched.':'');
  }
  $('font-files').addEventListener('change',async()=>{
    if(busy)return;busy=true;choices();$('font-files').disabled=true;invalidate();$('font-status').textContent='Reading fonts…';
    try{
      const files=[...$('font-files').files];if(files.length>20)throw Error('Choose at most 20 fonts.');
      const records=[];
      for(const file of files){
        if(!/\.ttf$/i.test(file.name)||file.size>E.MAX_BYTES)throw Error('Choose .ttf files smaller than 2 MB.');
        const buffer=await file.arrayBuffer();E.parse(buffer,window.opentype);
        if([...library.values(),...records].some(r=>same(r.buffer,buffer)))continue;
        records.push({id:id(),buffer});
      }
      if(records.length){await window.StudioFontStorage.add(records);addMemory(records);}
      choices(records.at(-1)?.id);$('font-status').textContent=records.length?records.length+' fonts added and saved in this browser.':'These fonts are already available.';
    }catch(error){$('font-status').textContent=error.message+' Existing fonts have been kept.';}
    finally{busy=false;$('font-files').disabled=false;$('font-files').value='';choices();}
  });
  function show(){
    if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(new Blob([pages[index]],{type:'image/svg+xml'}));
    $('font-image').src=imageURL;$('font-image').hidden=false;$('font-empty').hidden=true;
    $('font-page').value=String(index);for(const key of ['font-svg','font-gcode','font-page'])$(key).disabled=false;
  }
  $('font-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy)return;invalidate();
    try{const r=library.get($('font-choice').value);if(!r)throw Error('Choose a font first.');
      pages=E.compose(r.font,$('font-phrase').value,Number($('font-size').value)).pages;index=0;
      $('font-page').replaceChildren(...pages.map((_,i)=>new Option('Page '+(i+1)+' of '+pages.length,String(i))));show();
      $('font-status').textContent=r.name+' ready · '+pages.length+' page'+(pages.length===1?'':'s')+'. Preview and downloads trace the letter outlines.';
    }catch(error){$('font-status').textContent=error.message;}
  });
  for(const key of ['font-choice','font-size','font-phrase'])$(key).addEventListener(key==='font-phrase'?'input':'change',()=>{invalidate();choices();$('font-status').textContent='Settings changed. Generate a new preview.';});
  $('font-page').addEventListener('change',()=>{index=Number($('font-page').value);show();});
  function download(extension){
    if(!pages[index])return;
    try{
      const content=extension==='svg'?pages[index]:window.StudioPlotter.fromSVG(pages[index]);
      const url=URL.createObjectURL(new Blob([content],{type:extension==='svg'?'image/svg+xml':'text/plain'})),a=document.createElement('a');
      a.href=url;a.download='font-outlines-a4-page-'+(index+1)+'.'+extension;a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1000);
      $('font-status').textContent='Download requested: '+a.download+'. This drawing traces font outlines.';
    }catch(error){$('font-status').textContent=error.message;}
  }
  $('font-svg').onclick=()=>download('svg');$('font-gcode').onclick=()=>download('gcode');start();
})();
