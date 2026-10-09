'use strict';
window.StudioCharacterSpacing={init({onSaved,onDirty}){
 const $=id=>document.getElementById(id);let selected=null,saved={before_mm:0,after_mm:0},dirty=false,busy=false,timer=null,ticket=0;
 const values=()=>({before_mm:Number($('spacing-before').value),after_mm:Number($('spacing-after').value)});
 const valid=()=>Object.values(values()).every(n=>Number.isFinite(n)&&n>=-2&&n<=3);
 const status=text=>$('spacing-status').textContent=text;
 function controls(){$('spacing-save').disabled=busy||!dirty||!valid();$('spacing-reset').disabled=busy||!dirty;for(const id of ['spacing-before','spacing-after','spacing-zero'])$(id).disabled=busy||!selected;onDirty();}
 async function api(url,body){const response=await window.studioFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw Error(data.error);return data;}
 function preview(){clearTimeout(timer);const serial=++ticket;if(!selected||!valid())return;const request={...selected,...values(),text:$('spacing-word').value};
  timer=setTimeout(async()=>{try{const result=await api('/api/spacing-preview',request);if(serial!==ticket)return;$('spacing-preview').innerHTML=result.svg;const svg=$('spacing-preview').querySelector('svg'),box=svg.querySelector('g').getBBox();svg.setAttribute('viewBox',`${box.x-2} ${box.y-2} ${box.width+4} ${box.height+4}`);svg.removeAttribute('width');svg.removeAttribute('height');if(!request.text.includes(request.letter))status('Add '+request.letter+' to this text to compare its spacing.');}
   catch(error){if(serial===ticket){$('spacing-preview').replaceChildren();status(error.message);}}},140);
 }
 function changed(){if(busy||!selected)return;const v=values();dirty=v.before_mm!==saved.before_mm||v.after_mm!==saved.after_mm;for(const side of ['before','after'])$('spacing-'+side+'-value').textContent=Number(v[side+'_mm'].toFixed(2))+' mm';controls();status(dirty?'Live preview · spacing not saved. Save or reset before changing characters.':'Saved spacing shown.');preview();}
 for(const side of ['before','after']){$('spacing-'+side).oninput=changed;$('spacing-'+side).onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||busy)return;event.preventDefault();const sign=['ArrowRight','ArrowUp'].includes(event.key)?1:-1;$('spacing-'+side).value=Math.min(3,Math.max(-2,Number((Number($('spacing-'+side).value)+sign*(event.shiftKey?.5:.1)).toFixed(6))));changed();};}
 $('spacing-zero').onclick=()=>{if(busy)return;for(const side of ['before','after'])$('spacing-'+side).value='0';changed();};
 $('spacing-reset').onclick=()=>{if(busy)return;for(const side of ['before','after'])$('spacing-'+side).value=String(saved[side+'_mm']);changed();};
 $('spacing-word').oninput=preview;
 $('spacing-save').onclick=async()=>{if(busy||!dirty||!valid())return;const request={...selected,...values()};busy=true;controls();status('Saving spacing…');try{await api('/api/character-spacing',request);saved=values();dirty=false;busy=false;await onSaved();status('Spacing saved for all '+selected.letter+' versions. Generate a new Compose preview to use it.');}catch(error){status('Could not save: '+error.message+' Your adjustments are still here.');}finally{busy=false;controls();}};
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 return {isLocked:()=>dirty||busy,show({writer,letter,setting,available}){if(dirty||busy)return;const switched=selected?.writer!==writer||selected?.letter!==letter;selected=writer&&available?{writer,letter}:null;saved=setting||{before_mm:0,after_mm:0};$('character-spacing').disabled=!selected;$('spacing-title').textContent='Spacing for '+letter;
  for(const side of ['before','after']){$('spacing-'+side).value=String(saved[side+'_mm']);$('spacing-'+side+'-value').textContent=Number(saved[side+'_mm'].toFixed(2))+' mm';}
  if(switched){$('spacing-word').value=letter.repeat(3);$('spacing-preview').replaceChildren();}status(selected?'Adjust spacing and try a word below.':'Include a sample of this character to adjust its spacing.');controls();preview();
 }};
}};
