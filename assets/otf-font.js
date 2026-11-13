'use strict';
(function(root){
 const S=typeof module==='undefined'?root.StudioSVGFont:require('./svg-font');
 const E=typeof module==='undefined'?root.StudioEngine:require('./engine');
 const O=typeof module==='undefined'?root.opentype:require('opentype.js');
 const C=typeof module==='undefined'?root.ClipperLib:require('clipper-lib');
 // Offset each open centreline with round caps, then union all ink so crossings
 // and retraced strokes have no overlapping contours or accidental holes.
 function outline(strokes,width){
  const offset=new C.ClipperOffset(2,.25),scale=64;
  for(const stroke of strokes){
   const points=stroke.map(p=>({X:Math.round(p.x*scale),Y:Math.round(p.y*scale)})).filter((p,i,a)=>!i||p.X!==a[i-1].X||p.Y!==a[i-1].Y);
   if(!points.length)continue;
   offset.AddPath(points,C.JoinType.jtRound,C.EndType.etOpenRound);
  }
  const polygons=[];offset.Execute(polygons,width*scale/2);
  const clip=new C.Clipper(),union=[];clip.AddPaths(polygons,C.PolyType.ptSubject,true);
  clip.Execute(C.ClipType.ctUnion,union,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);
  const path=new O.Path();
  for(const polygon of union){polygon.forEach((p,i)=>i?path.lineTo(p.X/scale,p.Y/scale):path.moveTo(p.X/scale,p.Y/scale));path.close();}
  return path;
 }
 // Match punctuation to the Writer's actual lowercase body height, not the
 // nominal capture guides. Apply a uniform transform only to outlying marks.
 function fitPunctuation(source){
  const bounds=g=>{const p=g.strokes.flat();return {left:Math.min(...p.map(p=>p.x)),right:Math.max(...p.map(p=>p.x)),top:Math.max(...p.map(p=>p.y)),bottom:Math.min(...p.map(p=>p.y))};};
  const heights=source.glyphs.filter(g=>'acemnorsuvwx'.includes(g.letter)).map(g=>{const b=bounds(g);return b.top-b.bottom;}).filter(h=>h>0).sort((a,b)=>a-b);
  if(heights.length<3)return source;
  const height=heights[Math.floor(heights.length/2)];
  const groups=[['.',.18,0], [',',.4,-.22], [':',1,0], [';',1.22,-.22], ['!?',1.7,0], ["'\"‘’“”",.45,1.15], ['-–—',.12,.45]];
  return {...source,glyphs:source.glyphs.map(g=>{
   const rule=groups.find(([chars])=>chars.includes(g.letter));if(!rule)return g;
   const b=bounds(g),h=b.top-b.bottom,target=rule[1]*height,bottom=rule[2]*height;
   // Leave proportionate punctuation and intentional small positioning differences alone.
   if(h<=target*1.3&&b.bottom>=bottom-height*.25&&b.top<=bottom+target+height*.25)return g;
   const scale=h>target?target/h:1,shift=bottom-b.bottom*scale;
   const strokes=g.strokes.map(s=>s.map(p=>({x:b.left+(p.x-b.left)*scale,y:p.y*scale+shift})));
   const d=strokes.map(s=>s.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')).join(' ');
   return {...g,strokes,d,advance:g.advance-(b.right-b.left)*(1-scale)};
  })};
 }
 function create(files,{writer,name,thickness=20,cursive=true}){
  if(!Number.isFinite(thickness)||thickness<5||thickness>60)throw Error('Choose a stroke thickness between 5 and 60.');
  const source=fitPunctuation(S.create(files,{writer,name})),missing=new O.Path();
  missing.moveTo(50,0);missing.lineTo(50,700);missing.lineTo(450,700);missing.lineTo(450,0);missing.close();
  missing.moveTo(90,40);missing.lineTo(410,40);missing.lineTo(410,660);missing.lineTo(90,660);missing.close();
  const glyphs=[new O.Glyph({name:'.notdef',advanceWidth:500,path:missing}),new O.Glyph({name:'space',unicode:32,advanceWidth:350,path:new O.Path()})];
  for(const g of source.glyphs){const path=outline(g.strokes,thickness);const b=path.getBoundingBox();
   if(!path.commands.length||[b.x1,b.y1,b.x2,b.y2].some(v=>!Number.isFinite(v)||Math.abs(v)>16000)||g.advance>32000)throw Error('A character is too large for an installable font. Check its size and spacing in My alphabet.');
   glyphs.push(new O.Glyph({name:'uni'+g.letter.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'),unicode:g.letter.codePointAt(0),advanceWidth:Math.round(g.advance),path}));}
  const joins=[],lookups=[{lookupType:6,lookupFlag:0,subtables:[]}];
  if(cursive){
   const profile=E.catalog(files).writers.find(p=>p.writer===writer);
   const letters=source.glyphs.map((g,i)=>({...g,index:i+2,sample:{baseline_shift_mm:0,processed_strokes:g.strokes.map(points=>({points:points.map(p=>({x:p.x/100,y:-p.y/100}))}))}}));
   const cov=index=>({format:1,glyphs:[index]});
   for(const a of letters.filter(g=>/^[a-z]$/.test(g.letter)||profile.uppercase_joins.includes(g.letter)&&/^[A-Z]$/.test(g.letter)))for(const b of letters.filter(g=>/^[a-z]$/.test(g.letter))){
    const geometry=E.connectorGeometry(a.sample,b.sample,0,Math.round(a.advance)/100,0,1,5);if(!geometry)continue;
    const curve=[geometry.start];
    for(const [p,c,q] of [[geometry.start,geometry.control1,geometry.middle],[geometry.middle,geometry.control2,geometry.end]])for(let i=1;i<=16;i++){const t=i/16,u=1-t;curve.push({x:u*u*p.x+2*u*t*c.x+t*t*q.x,y:u*u*p.y+2*u*t*c.y+t*t*q.y});}
    const path=outline([...a.strokes,curve.map(p=>({x:p.x*100,y:-p.y*100}))],thickness),index=glyphs.length;
    glyphs.push(new O.Glyph({name:'join_'+a.letter+'_'+b.letter,advanceWidth:Math.round(a.advance),path}));
    const lookupListIndex=lookups.length;
    lookups.push({lookupType:1,lookupFlag:0,subtables:[{substFormat:2,coverage:cov(a.index),substitute:[index]}]});
    lookups[0].subtables.push({substFormat:3,backtrackCoverage:[],inputCoverage:[cov(a.index)],lookaheadCoverage:[cov(b.index)],lookupRecords:[{sequenceIndex:0,lookupListIndex}]});
    joins.push({left:a.letter,right:b.letter,index});
   }
  }
  const font=new O.Font({familyName:source.name,styleName:'Regular',unitsPerEm:1000,ascender:Math.ceil(source.ascent+thickness/2),descender:-Math.max(200,Math.ceil(source.descent+thickness/2)),glyphs});
  if(joins.length){const lang={reserved:0,reqFeatureIndex:65535,featureIndexes:[0]};font.tables.gsub={version:1,scripts:[{tag:'DFLT',script:{defaultLangSys:lang,langSysRecords:[]}},{tag:'latn',script:{defaultLangSys:lang,langSysRecords:[]}}],features:[{tag:'calt',feature:{featureParams:0,lookupListIndexes:[0]}}],lookups};}
  const buffer=font.toArrayBuffer();
  return {...source,font,buffer,joins,filename:source.filename.replace('-single-line.svg','.otf')};
 }
 const api={create,outline,fitPunctuation};if(typeof module!=='undefined')module.exports=api;else root.StudioOTFFont=api;
})(typeof window==='undefined'?globalThis:window);
