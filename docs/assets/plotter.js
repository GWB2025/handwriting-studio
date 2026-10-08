(function(root){
'use strict';
const tolerance=0.02;
function flatten(d){
 const tokens=d.match(/[MLQ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)||[];
 if(d.replace(/[MLQ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[\s,]/g,''))throw Error('Unsupported drawing command.');
 let i=0,p=null,points=[];
 const read=()=>{const n=Number(tokens[i++]);if(!Number.isFinite(n))throw Error('Invalid drawing coordinates.');return n;};
 const point=()=>[read(),read()];
 function curve(a,b,c,depth=0){const error=Math.hypot(a[0]-2*b[0]+c[0],a[1]-2*b[1]+c[1])/4;
  if(error<=tolerance){points.push(c);return;}if(depth>=20)throw Error('Curve too complex.');
  const ab=a.map((n,j)=>(n+b[j])/2),bc=b.map((n,j)=>(n+c[j])/2),mid=ab.map((n,j)=>(n+bc[j])/2);curve(a,ab,mid,depth+1);curve(mid,bc,c,depth+1);}
 while(i<tokens.length){const op=tokens[i++];if(op==='M'){if(p)throw Error('Separate strokes must have separate paths.');p=point();points.push(p);}else if(op==='L'&&p){p=point();points.push(p);}else if(op==='Q'&&p){const b=point(),c=point();curve(p,b,c);p=c;}else throw Error('Unsupported drawing command.');if(points.length>100000)throw Error('Drawing too complex.');}
 if(!points.length)throw Error('Empty drawing stroke.');return points;
}
function generate(paths){if(!paths.length)throw Error('No strokes to plot.');
 const strokes=paths.map(flatten);let count=0;
 for(const stroke of strokes)for(const [x,y] of stroke){if(!Number.isFinite(x)||!Number.isFinite(y)||x<20-0.0001||x>190.0001||y<20-0.0001||y>277.0001)throw Error('Handwriting extends outside the 20 mm A4 margins.');if(++count>500000)throw Error('Drawing too complex.');}
 const lines=['; Handwriting Studio - A4 portrait, top-left home','; +X right, -Y down; pen up Z0.5, pen down Z5','; Smoothed curves approximated within 0.02 mm','G21','G90 G1 Z0.5 F1200'];
 for(const stroke of strokes){const [x,y]=stroke[0];lines.push(`G90 G1 X${x.toFixed(4)} Y${(-y).toFixed(4)} F2400`,'G90 G1 Z5 F3000');
 if(stroke.length===1||stroke.every(p=>p[0]===x&&p[1]===y))lines.push('G4 P0.1');
 for(const [x,y] of stroke.slice(1))lines.push(`G90 G1 X${x.toFixed(4)} Y${(-y).toFixed(4)} F900`);
 lines.push('G90 G1 Z0.5 F3000');}
 lines.push('G90 G1 X0 Y0 F2400');return lines.join('\n')+'\n';
}
function fromSVG(svg){const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Could not read the preview.');const el=doc.documentElement;
 if(el.localName!=='svg'||el.getAttribute('viewBox')!=='0 0 210 297')throw Error('Expected an A4 handwriting preview.');
 if(doc.querySelector('[transform]'))throw Error('Transformed drawings are not supported.');return generate([...doc.querySelectorAll('path')].map(p=>p.getAttribute('d')));}
const api={flatten,generate,fromSVG};if(typeof module!=='undefined')module.exports=api;else root.StudioPlotter=api;
})(typeof window==='undefined'?globalThis:window);
