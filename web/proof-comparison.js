(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.StudioEngine;
// Small single-line labels are paths, so the plotter draws the same labels as the SVG.
const font={
 A:'0,1 .5,0 1,1|.25,.5 .75,.5',B:'0,1 0,0 .7,0 1,.2 .7,.5 0,.5|.7,.5 1,.75 .7,1 0,1',
 C:'1,0 0,0 0,1 1,1',D:'0,1 0,0 .6,0 1,.3 1,.7 .6,1 0,1',E:'1,0 0,0 0,1 1,1|0,.5 .8,.5',
 F:'0,1 0,0 1,0|0,.5 .8,.5',G:'1,0 0,0 0,1 1,1 1,.5 .5,.5',I:'0,0 1,0|.5,0 .5,1|0,1 1,1',
 L:'0,0 0,1 1,1',M:'0,1 0,0 .5,.6 1,0 1,1',N:'0,1 0,0 1,1 1,0',O:'0,0 1,0 1,1 0,1 0,0',
 P:'0,1 0,0 1,0 1,.5 0,.5',R:'0,1 0,0 1,0 1,.5 0,.5|.5,.5 1,1',S:'1,0 0,0 0,.5 1,.5 1,1 0,1',
 X:'0,0 1,1|0,1 1,0','3':'0,0 1,0 1,1 0,1|.3,.5 1,.5','5':'1,0 0,0 0,.5 1,.5 1,1 0,1','8':'0,.5 0,0 1,0 1,1 0,1 0,.5 1,.5'
};
function label(text,x,y,height=2.5){const paths=[];for(const [i,c] of [...text].entries()){if(c===' ')continue;if(!font[c])throw Error('Unsupported proof label.');for(const line of font[c].split('|'))paths.push(line.split(' ').map((p,j)=>{const [px,py]=p.split(',').map(Number);return (j?'L':'M')+(x+i*height*.85+px*height*.55).toFixed(4)+' '+(y+py*height).toFixed(4);}).join(' '));}return paths;}
function comparisonProof(files,{writer,text='f i j l t z\nfizz\njilt',smooth=true}={}){
 if(typeof text!=='string'||!text.trim()||text.length>120||text.split('\n').length>6||[...text].some(c=>!(E.characters+' \n').includes(c)))throw Error('Enter up to six short lines using captured characters (120 characters maximum).');
 if(typeof smooth!=='boolean')throw Error('Choose a smoothing setting.');
 const cat=E.catalog(files),profile=cat.writers.find(p=>p.writer===writer),all=(cat.byWriter.get(writer)||[]).filter(s=>s.included);
 if(!profile||!all.length)throw Error('Choose a writer with included samples.');
 const columns=[{name:'ORIGINAL',source:'originals'},{name:'BLENDED',source:'blends'},{name:'PREFERRED',source:'preferred'}],rows=[],missing=new Map(),paths=label('PROOF',20,20,3),lines=text.split('\n').filter(s=>s.trim());
 const pools=columns.map(column=>Object.fromEntries([...new Set([...text].filter(c=>E.characters.includes(c)))].map(c=>{
  const available=all.filter(s=>s.letter===c);return [c,column.source==='preferred'?(profile.preferred_sets[c]||[]).map(id=>available.find(s=>s.capture_id===id)).filter(Boolean):available.filter(s=>s.derived===(column.source==='blends')).slice(0,1)];
 })));
 columns.forEach((column,i)=>paths.push(...label(column.name,20+i*59,27)));paths.push(...label('X MISSING',138,20,2));
 let y=36;
 for(const height of [3,5,8]){
  if(y+3>277)throw Error('Comparison does not fit on A4. Use fewer or shorter test lines.');
  paths.push(...label(height+' MM',20,y));y+=7;
  const occurrence=columns.map(()=>({}));
  for(const textLine of lines){
   const letters=[...textLine],selected=columns.map((column,i)=>{
    const absent=[...new Set(letters.filter(c=>c!==' '&&!pools[i][c]?.length))];
    for(const c of absent)missing.set(column.name+':'+c,{column:column.name,letter:c});
    return {missing:absent,used:letters.map(c=>{if(c===' ')return null;if(!pools[i][c]?.length)return {letter:c,missing:true,bounds:{left:0,right:24},baseline_shift_mm:0,processed_strokes:[[[0,-40],[24,-40],[24,0],[0,0],[0,-40]],[[0,-40],[24,0]],[[0,0],[24,-40]]].map(points=>({points:points.map(([x,y])=>({x,y}))}))};const n=occurrence[i][c]||0;occurrence[i][c]=n+1;return pools[i][c][n%pools[i][c].length];})};
   });
   const extents=E.writingExtents(selected.flatMap(c=>c.used),height);let rowHeight=4;
   const row={height,text:textLine,columns:[]};
   selected.forEach((selection,i)=>{
    try{const layout=E.layoutWriting(letters,selection.used,{height,smooth},{x:20+i*59,y,width:52,bottom:277},profile.character_spacing,extents);paths.push(...layout.paths);rowHeight=Math.max(rowHeight,layout.height);row.columns.push({source:columns[i].source,missing:selection.missing,used_samples:layout.chosen.filter(s=>s.capture_id)});}
    catch(error){throw Error('Comparison does not fit at '+height+' mm. Use shorter words or fewer test lines.');}
   });
   if(y+rowHeight>277)throw Error('Comparison does not fit on A4. Use fewer or shorter test lines.');
   rows.push(row);y+=rowHeight+height*.7;
  }
  y+=5;
 }
 const svg=E.drawingSVG(paths,'Handwriting comparison: '+text);E.validateDrawingSVG(svg);
 return {svg,rows,missing:[...missing.values()],heights:[3,5,8]};
}
const api={comparisonProof};if(typeof module!=='undefined')module.exports=api;else root.StudioComparison=api;
})(typeof window==='undefined'?globalThis:window);
