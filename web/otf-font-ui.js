'use strict';
(()=>{
 const writer=document.getElementById('alphabet-writer'),panel=document.getElementById('otf-font-export');if(!writer||!panel)return;
 const name=panel.querySelector('#otf-font-name'),build=panel.querySelector('#otf-font-build'),download=panel.querySelector('#otf-font-download'),status=panel.querySelector('#otf-font-status'),cards=panel.querySelector('#otf-font-preview');let url=null,ticket=0,face=null;
 function clear(){ticket++;if(face){document.fonts.delete(face);face=null;}panel.querySelector('#otf-font-text-preview').textContent='';if(url)URL.revokeObjectURL(url);url=null;download.hidden=true;download.removeAttribute('href');cards.replaceChildren();status.textContent='Prepare the font to inspect its characters and missing coverage.';}
 writer.addEventListener('change',()=>{clear();name.value='';});name.addEventListener('input',clear);
 const cursive=panel.querySelector('#otf-font-cursive'),text=panel.querySelector('#otf-font-text'),textPreview=panel.querySelector('#otf-font-text-preview');cursive.addEventListener('change',clear);text.addEventListener('input',()=>{if(face)textPreview.textContent=text.value;});
 const thickness=panel.querySelector('#otf-font-thickness');thickness.addEventListener('change',clear);
 document.getElementById('alphabet-refresh')?.addEventListener('click',clear);
 new MutationObserver(clear).observe(writer,{childList:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 build.onclick=async()=>{clear();const request=ticket,selected=writer.value,fontName=name.value.trim()||selected+' Handwriting';build.disabled=true;status.textContent='Preparing font…';try{
  const files=await window.StudioStorage.snapshot();if(request!==ticket||selected!==writer.value)return;
  const result=window.StudioOTFFont.create(files,{writer:selected,name:fontName,thickness:Number(thickness.value),cursive:cursive.checked});name.value=result.name;
  if(window.FontFace){const loaded=await new FontFace('StudioExport'+request,result.buffer).load();if(request!==ticket)return;face=loaded;document.fonts.add(face);textPreview.style.fontFamily='StudioExport'+request;textPreview.textContent=text.value;}
  status.textContent=(result.joins.length+' safe cursive connections. ')+result.glyphs.length+' characters plus space. '+result.glyphs.filter(g=>g.preferred&&g.source==='Saved blend').length+' preferred blends. '+(result.missing.length?'Missing (omitted): '+result.missing.join(' ')+'.':'All supported characters included.');
  for(const g of result.glyphs){const card=document.createElement('div'),label=document.createElement('p');label.textContent=g.letter+' · '+(g.preferred?'Preferred ':'')+g.source.toLowerCase();
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');let min=0,max=g.advance;for(const s of g.strokes)for(const p of s){min=Math.min(min,p.x);max=Math.max(max,p.x);}
   svg.setAttribute('viewBox',[min-40,-result.ascent-40,max-min+80,result.ascent+result.descent+80].join(' '));svg.style.height='150px';svg.style.width='100%';svg.setAttribute('role','img');svg.setAttribute('aria-label',g.letter+' exported strokes');path.setAttribute('d',result.font.charToGlyph(g.letter).path.toPathData(3));path.setAttribute('transform','scale(1,-1)');path.setAttribute('fill','#203832');path.setAttribute('stroke-linecap','round');svg.append(path);card.append(label,svg);cards.append(card);}
  url=URL.createObjectURL(new Blob([result.buffer],{type:'font/otf'}));download.href=url;download.download=result.filename;download.hidden=false;
 }catch(error){status.textContent=error.message;}finally{build.disabled=false;}};
 panel.addEventListener('toggle',()=>{if(panel.open&&!url)clear();});window.addEventListener('pagehide',clear);
})();
