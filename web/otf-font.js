'use strict';
(function(root){
 const S=typeof module==='undefined'?root.StudioSVGFont:require('./svg-font');
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
 function create(files,{writer,name,thickness=20}){
  if(!Number.isFinite(thickness)||thickness<5||thickness>60)throw Error('Choose a stroke thickness between 5 and 60.');
  const source=S.create(files,{writer,name}),missing=new O.Path();
  missing.moveTo(50,0);missing.lineTo(50,700);missing.lineTo(450,700);missing.lineTo(450,0);missing.close();
  missing.moveTo(90,40);missing.lineTo(410,40);missing.lineTo(410,660);missing.lineTo(90,660);missing.close();
  const glyphs=[new O.Glyph({name:'.notdef',advanceWidth:500,path:missing}),new O.Glyph({name:'space',unicode:32,advanceWidth:350,path:new O.Path()})];
  for(const g of source.glyphs){const path=outline(g.strokes,thickness);const b=path.getBoundingBox();
   if(!path.commands.length||[b.x1,b.y1,b.x2,b.y2].some(v=>!Number.isFinite(v)||Math.abs(v)>16000)||g.advance>32000)throw Error('A character is too large for an installable font. Check its size and spacing in My alphabet.');
   glyphs.push(new O.Glyph({name:'uni'+g.letter.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'),unicode:g.letter.codePointAt(0),advanceWidth:Math.round(g.advance),path}));}
  const font=new O.Font({familyName:source.name,styleName:'Regular',unitsPerEm:1000,ascender:Math.ceil(source.ascent+thickness/2),descender:-Math.max(200,Math.ceil(source.descent+thickness/2)),glyphs});
  const buffer=font.toArrayBuffer();
  return {...source,font,buffer,filename:source.filename.replace('-single-line.svg','.otf')};
 }
 const api={create,outline};if(typeof module!=='undefined')module.exports=api;else root.StudioOTFFont=api;
})(typeof window==='undefined'?globalThis:window);
