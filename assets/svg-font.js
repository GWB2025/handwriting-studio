'use strict';
(function(root){
 const E=typeof module==='undefined'?root.StudioEngine:require('./engine.js');
 const xml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const num=n=>{if(!Number.isFinite(n))throw Error('A sample contains invalid coordinates.');return String(Number(n.toFixed(4)));};
 // Capture guide x-height is 80 units. Use 500 font units without rescaling individual glyphs.
 function create(files,{writer,name}){
  if(typeof name!=='string'||!name.trim()||name.trim().length>80||/[\x00-\x1f\x7f]/.test(name))throw Error('Enter a font name of 1–80 characters.');
  name=name.trim();const cat=E.catalog(files),profile=cat.writers.find(p=>p.writer===writer);
  if(!profile)throw Error('Choose a Writer with saved captures.');
  const all=cat.byWriter.get(writer).filter(s=>s.included&&Array.from(s.letter).length===1),glyphs=[],missing=[];
  for(const letter of E.characters){
   const samples=all.filter(s=>s.letter===letter),preferred=E.preferenceIDs(profile.preferred_sets[letter]).map(id=>samples.find(s=>s.capture_id===id)).filter(Boolean);
   const sample=preferred.find(s=>s.derived)||preferred[0]||samples.find(s=>!s.derived&&!s.suggested)||samples.find(s=>s.derived)||samples[0];
   if(!sample){missing.push(letter);continue;}
   const points=sample.processed_strokes.flatMap(s=>s.points);if(!points.length)throw Error('A sample has no pen strokes.');
   let left=Infinity,right=-Infinity;for(const p of points){num(p.x);num(p.y);left=Math.min(left,p.x);right=Math.max(right,p.x);}
   const setting=profile.character_spacing[letter]||{},before=50+(setting.before_mm||0)*100,after=50+(setting.after_mm||0)*100;
   const strokes=sample.processed_strokes.map(s=>s.points.map(p=>({x:(p.x-left)*6.25+before,y:-(p.y+sample.baseline_shift_mm*16)*6.25})));
   const d=strokes.map(points=>{if(!points.length)throw Error('A sample has an empty pen stroke.');return points.map((p,i)=>(i?'L':'M')+num(p.x)+' '+num(p.y)).join(' ')+(points.length===1?' L'+num(points[0].x)+' '+num(points[0].y):'');}).join(' ');
   glyphs.push({letter,d,advance:Math.max(1,(right-left)*6.25+before+after),strokes,source:sample.suggested?'Accepted suggested symbol':sample.derived?'Saved blend':'Original capture',preferred:preferred.includes(sample),capture_id:sample.capture_id});
  }
  if(!glyphs.length)throw Error('This Writer has no included single-character samples.');
  let ascent=1000,descent=0;for(const g of glyphs)for(const s of g.strokes)for(const p of s){ascent=Math.max(ascent,p.y);descent=Math.max(descent,-p.y);}
  const svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1">\n<metadata>'+xml('Handwriting Studio single-line font. One included sample per character; preferred blends first, then preferred samples, newest original, newest blend, accepted suggestions. No automatic cursive joins or pair ligatures. Capture guide x-height: 500 units. Missing characters: '+missing.join(' '))+ '</metadata>\n<defs><font id="handwriting-studio-font" horiz-adv-x="500" fill="none" stroke="black" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><font-face font-family="'+xml(name)+'" units-per-em="1000" ascent="'+num(ascent)+'" descent="'+num(descent)+'" x-height="500"/><missing-glyph horiz-adv-x="500"/><glyph unicode=" " glyph-name="space" horiz-adv-x="350"/>\n'+glyphs.map(g=>'<glyph unicode="'+xml(g.letter)+'" glyph-name="uni'+g.letter.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+'" horiz-adv-x="'+num(g.advance)+'" d="'+g.d+'"/>').join('\n')+'\n</font></defs></svg>\n';
  return {svg,name,filename:(name.replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'')||'handwriting')+'-single-line.svg',glyphs,missing,ascent,descent};
 }
 const api={create};if(typeof module!=='undefined')module.exports=api;else root.StudioSVGFont=api;
})(typeof window==='undefined'?globalThis:window);
