'use strict';
(function(root){
  const MAX_BYTES=2*1024*1024, MAX_POINTS=450000;
  function parse(buffer,parser){
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<12||buffer.byteLength>MAX_BYTES)throw Error('Choose a TrueType font smaller than 2 MB.');
    const signature=new DataView(buffer).getUint32(0);
    if(signature!==0x00010000&&signature!==0x74727565)throw Error('Choose a .ttf TrueType font. SVG fonts and other file types need a different importer.');
    let font;try{font=parser.parse(buffer);}catch{throw Error('This TrueType font could not be read. The existing fonts have been kept.');}
    if(!Number.isFinite(font.unitsPerEm)||font.unitsPerEm<16||font.unitsPerEm>16384||!Number.isInteger(font.numGlyphs)||font.numGlyphs<1||font.numGlyphs>10000)throw Error('This font has unsupported dimensions or too many characters.');
    const name=String(font.getEnglishName('fullName')||font.getEnglishName('fontFamily')||'Imported font').slice(0,120);
    return {font,name,credit:String(font.getEnglishName('copyright')||'').slice(0,500)};
  }
  // Turn each font contour into a separate plotter path. Closing a contour
  // deliberately traces its outline; this is never a centre-line conversion.
  function contours(commands,tolerance=0.015){
    if(!Array.isArray(commands)||commands.length>20000)throw Error('A font character is too complex.');
    const paths=[];let points=[],p=null,start=null,total=0;
    const point=(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>100000||Math.abs(y)>100000)throw Error('Invalid font coordinates.');return [x,y];};
    function add(q){if(++total>100000)throw Error('A font character is too complex.');if(!points.length||q[0]!==points.at(-1)[0]||q[1]!==points.at(-1)[1])points.push(q);p=q;}
    function finish(){if(points.length>1)paths.push(points);points=[];p=null;start=null;}
    const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
    function curve(poly,depth=0){
      const a=poly[0],z=poly.at(-1),dx=z[0]-a[0],dy=z[1]-a[1],length=Math.hypot(dx,dy);
      const error=Math.max(...poly.slice(1,-1).map(b=>length?Math.abs(dy*b[0]-dx*b[1]+z[0]*a[1]-z[1]*a[0])/length:Math.hypot(b[0]-a[0],b[1]-a[1])));
      // Also bound control-polygon length: collinear curves can turn back.
      const excess=poly.slice(1).reduce((s,b,i)=>s+Math.hypot(b[0]-poly[i][0],b[1]-poly[i][1]),0)-length;
      if(error<=tolerance&&excess<=tolerance){add(z);return;}
      if(depth>=18)throw Error('A font curve is too complex.');
      const rows=[poly];while(rows.at(-1).length>1)rows.push(rows.at(-1).slice(1).map((b,i)=>mid(rows.at(-1)[i],b)));
      curve(rows.map(r=>r[0]),depth+1);curve(rows.map(r=>r.at(-1)).reverse(),depth+1);
    }
    for(const c of commands){
      if(c.type==='M'){finish();start=point(c.x,c.y);add(start);}
      else if(c.type==='L'&&p)add(point(c.x,c.y));
      else if(c.type==='Q'&&p)curve([p,point(c.x1,c.y1),point(c.x,c.y)]);
      else if(c.type==='C'&&p)curve([p,point(c.x1,c.y1),point(c.x2,c.y2),point(c.x,c.y)]);
      else if(c.type==='Z'&&p){add(start);finish();}
      else throw Error('Unsupported font outline.');
    }
    finish();return paths;
  }
  function compose(font,text,height=5){
    if(typeof text!=='string'||text.length>1000||!text.trim())throw Error('Enter up to 1,000 characters.');
    if(!Number.isFinite(height)||height<3||height>20)throw Error('Choose a writing size from 3 to 20 mm.');
    text=text.replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
    if(/[\x00-\x08\x0b-\x1f\x7f]/.test(text))throw Error('The text contains an unsupported control character.');
    const missing=[...new Set([...text].filter(c=>c!=='\n'&&c!==' '&&!font.charToGlyphIndex(c)))];
    if(missing.length)throw Error('This font has no character for: '+missing.slice(0,20).join(' ')+'. Edit the text or choose another font.');
    const x=font.charToGlyph('x').getMetrics(),xHeight=x.yMax-x.yMin;
    if(!font.charToGlyphIndex('x')||!Number.isFinite(xHeight)||xHeight<=0)throw Error('This font needs a lowercase x to set its writing size.');
    const scale=height/xHeight,cache=new Map();let ascent=height,descent=0;
    for(const c of new Set(text.replace(/\n/g,''))){
      const glyph=font.charToGlyph(c),advance=glyph.advanceWidth*scale;
      if(!Number.isFinite(advance)||advance<0||advance>1000)throw Error('Unsupported font spacing.');
      // getPath() omits closing commands for filled fonts in OpenType.js 2.
      // Scale the original commands instead so every outline closes on paper.
      const commands=glyph.path.commands;
      if(!Array.isArray(commands)||commands.length>20000)throw Error('A font character is too complex.');
      const paths=contours(commands.map(c=>{
        const out={type:c.type};
        for(const key of ['x','x1','x2'])if(key in c)out[key]=c[key]*scale;
        for(const key of ['y','y1','y2'])if(key in c)out[key]=-c[key]*scale;
        return out;
      }));
      let left=0,right=advance;
      for(const path of paths)for(const [px,py] of path){left=Math.min(left,px);right=Math.max(right,px);ascent=Math.max(ascent,-py);descent=Math.max(descent,py);}
      cache.set(c,{glyph,advance,paths,left,right});
    }
    function measure(chars){
      let cursor=0,left=0,right=0,previous=null;const placed=[];
      for(const c of chars){const g=cache.get(c);const kern=previous?font.getKerningValue(previous,g.glyph)*scale:0;if(!Number.isFinite(kern))throw Error('Invalid font spacing.');cursor+=kern;placed.push({g,x:cursor});left=Math.min(left,cursor+g.left);right=Math.max(right,cursor+g.right);cursor+=g.advance;previous=g.glyph;}
      return {placed,left,width:Math.max(cursor,right)-left};
    }
    const lines=[];
    for(const paragraph of text.split('\n')){
      let line='';
      for(const token of paragraph.match(/ +|[^ ]+/gu)||[]){
        if(measure(line+token).width<=170){line+=token;continue;}
        if(line){lines.push(line.trimEnd());line='';}
        if(!token.trim())continue;
        for(const c of token){
          if(measure(line+c).width>170){if(!line)throw Error('A character is too wide for A4. Choose a smaller writing size.');lines.push(line);line='';}
          if(measure(c).width>170)throw Error('A character is too wide for A4. Choose a smaller writing size.');
          line+=c;
        }
      }
      lines.push(line);
    }
    const lineHeight=ascent+descent+height*.6;
    if(ascent+descent>257)throw Error('The font is too tall for A4. Choose a smaller writing size.');
    const pages=[[]];let top=20,total=0;
    for(const line of lines){
      if(top+ascent+descent>277+1e-8){if(pages.length>=20)throw Error('This text needs more than 20 pages. Use less text or smaller writing.');pages.push([]);top=20;}
      const measured=measure(line),baseline=top+ascent;
      for(const {g,x} of measured.placed)for(const path of g.paths){
        const moved=path.map(([px,py])=>[px+x+20-measured.left,py+baseline]);
        for(const [px,py] of moved){if(px<20-1e-6||px>190+1e-6||py<20-1e-6||py>277+1e-6||++total>MAX_POINTS)throw Error('The drawing is too large or complex. Use less text or smaller writing.');}
        pages.at(-1).push(moved);
      }
      top+=lineHeight;
    }
    const drawings=pages.filter(p=>p.length).map(paths=>'<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>TrueType font outlines</title><g fill="none" stroke="#203832" stroke-width="0.3" stroke-linejoin="round" stroke-linecap="round">'+paths.map(points=>'<path d="'+points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(4)+' '+y.toFixed(4)).join(' ')+'"/>').join('')+'</g></svg>');
    if(!drawings.length)throw Error('This text contains no drawable characters.');
    return {pages:drawings,points:total};
  }
  const api={parse,contours,compose,MAX_BYTES};if(typeof module!=='undefined')module.exports=api;else root.StudioFonts=api;
})(typeof window==='undefined'?globalThis:window);
