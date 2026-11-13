'use strict';
(()=>{
 const writer=document.getElementById('alphabet-writer'),panel=document.getElementById('svg-font-export');if(!writer||!panel)return;
 const name=panel.querySelector('#svg-font-name'),build=panel.querySelector('#svg-font-build'),download=panel.querySelector('#svg-font-download'),status=panel.querySelector('#svg-font-status'),cards=panel.querySelector('#svg-font-preview');let url=null,ticket=0;
 function clear(){ticket++;if(url)URL.revokeObjectURL(url);url=null;download.hidden=true;download.removeAttribute('href');cards.replaceChildren();status.textContent='Prepare the font to inspect its characters and missing coverage.';}
 writer.addEventListener('change',()=>{clear();name.value='';});name.addEventListener('input',clear);
 document.getElementById('alphabet-refresh')?.addEventListener('click',clear);
 new MutationObserver(clear).observe(writer,{childList:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 build.onclick=async()=>{clear();const request=ticket,selected=writer.value,fontName=name.value.trim()||selected+' Single Line';build.disabled=true;status.textContent='Preparing font…';try{
  const files=await window.StudioStorage.snapshot();if(request!==ticket||selected!==writer.value)return;
  const result=window.StudioSVGFont.create(files,{writer:selected,name:fontName});name.value=result.name;
  status.textContent=result.glyphs.length+' characters plus space. '+result.glyphs.filter(g=>g.preferred&&g.source==='Saved blend').length+' preferred blends. '+(result.missing.length?'Missing (omitted): '+result.missing.join(' ')+'.':'All supported characters included.');
  for(const g of result.glyphs){const card=document.createElement('div'),label=document.createElement('p');label.textContent=g.letter+' · '+(g.preferred?'Preferred ':'')+g.source.toLowerCase();
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');let min=0,max=g.advance;for(const s of g.strokes)for(const p of s){min=Math.min(min,p.x);max=Math.max(max,p.x);}
   svg.setAttribute('viewBox',[min-40,-result.ascent-40,max-min+80,result.ascent+result.descent+80].join(' '));svg.style.height='150px';svg.style.width='100%';svg.setAttribute('role','img');svg.setAttribute('aria-label',g.letter+' exported strokes');path.setAttribute('d',g.d);path.setAttribute('transform','scale(1,-1)');path.setAttribute('fill','none');path.setAttribute('stroke','#203832');path.setAttribute('stroke-width','7');path.setAttribute('stroke-linecap','round');svg.append(path);card.append(label,svg);cards.append(card);}
  url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));download.href=url;download.download=result.filename;download.hidden=false;
 }catch(error){status.textContent=error.message;}finally{build.disabled=false;}};
 panel.addEventListener('toggle',()=>{if(panel.open&&!url)clear();});window.addEventListener('pagehide',clear);
})();
