'use strict';
(()=>{
 const section=document.getElementById('blend-comparison'),select=document.getElementById('blend-example'),cards=document.getElementById('blend-cards'),mix=document.getElementById('blend-mix');
 let examples=[],urls=[];
 const release=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[];cards.replaceChildren();};
 function render(){release();const example=examples[Number(select.value)];if(!example)return;
  example.svgs.forEach((svg,i)=>{const figure=document.createElement('figure'),caption=document.createElement('figcaption'),image=document.createElement('img');
   caption.textContent=['Source A · '+example.source_a.slice(0,8),'Source B · '+example.source_b.slice(0,8),'Result · '+example.source_b_percent+'% source B'][i];
   const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));urls.push(url);image.src=url;image.alt=caption.textContent+' for '+example.letter;figure.append(caption,image);cards.append(figure);});
 }
 function controls(){const enabled=document.getElementById('compose-variation').value==='blend';mix.disabled=!enabled;document.getElementById('blend-mix-label').hidden=!enabled;}
 select.addEventListener('change',render);document.getElementById('compose-variation').addEventListener('change',controls);controls();
 window.StudioBlendPreview={clear(){release();examples=[];select.replaceChildren();section.hidden=true;},show(variation){this.clear();if(variation?.mode!=='blend')return;examples=variation.previews||[];section.hidden=false;
  if(!examples.length){cards.textContent='No compatible pair was available. The preview uses original samples. Capture more examples with matching stroke order and direction.';return;}
  examples.forEach((example,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=example.letter+' · occurrence '+(i+1);select.append(option);});select.value='0';render();}};
})();
