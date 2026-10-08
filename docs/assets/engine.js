'use strict';
// Pure capture and layout rules shared by the browser app and verification.
(function(root) {
  const alphabet='abcdefghijklmnopqrstuvwxyz', groups=['acebd','fhjgi','kmln','oqpr','sutv','wyxz'];
  const plan={id:'lowercase-v2',alphabet,orders:[],sheets_per_set:6,guides:{ascender:170,x_height:250,baseline:330,descender:410},descenders:'fgjpqy',tall_letters:'bdfhklt'};
  for(let repeat=0;repeat<3;repeat++)for(const group of groups){const shift=(group.length===5?repeat*2:repeat)%group.length;plan.orders.push(group.slice(shift)+group.slice(0,shift));}
  const legacy=['acebd','ebdac','daceb'],clone=value=>JSON.parse(JSON.stringify(value));
  const fail=message=>{throw Error(message);};
  const finite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
  const same=(a,b)=>stable(a)===stable(b);
  function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
  function validateContent(writer,strokes,smooth){
    if(typeof writer!=='string'||!writer.trim()||writer.trim().length>80)fail('Enter a writer name (up to 80 characters).');
    if(!Array.isArray(strokes)||!strokes.length||strokes.length>1000)fail('Draw a page before saving.');
    if(typeof smooth!=='boolean')fail('Invalid smoothing setting.');
    let count=0,last=-1;
    for(const stroke of strokes){
      if(!stroke||!['pen','mouse'].includes(stroke.pointerType)||!Array.isArray(stroke.points)||!stroke.points.length)fail('Invalid stroke.');
      count+=stroke.points.length;if(count>100000)fail('Too many points. Download SVG and start a smaller page.');
      for(const p of stroke.points){
        if(!p||typeof p!=='object')fail('Invalid point.');
        for(const [key,lo,hi] of [['x',0,1000],['y',0,500],['t',0,86400000],['pressure',0,1],['tiltX',-90,90],['tiltY',-90,90]]){
          if(p[key]==null&&['pressure','tiltX','tiltY'].includes(key))continue;
          if(!finite(p[key],lo,hi))fail('Invalid point value.');
        }
        if(p.t<last)fail('Invalid point order.');last=p.t;
      }
    }
  }
  function extract(strokes,order,version=2){
    const cells=Array.from(order,()=>[]),width=1000/order.length;
    strokes.forEach((stroke,index)=>{
      const positions=new Set(stroke.points.map(p=>Math.min(order.length-1,Math.floor(p.x/width))));
      if(positions.size!==1)fail('A stroke crosses between letter boxes. Undo it or clear the sheet, then keep each letter inside its own box.');
      cells[[...positions][0]].push(index);
    });
    const missing=[...order].filter((_,i)=>!cells[i].length);
    if(missing.length)fail('Write one letter in each box. Still needed: '+missing.join(', ')+'.');
    return [...order].map((letter,i)=>{
      const points=cells[i].flatMap(index=>strokes[index].points);
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const p of points){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}
      if(right-left<2||bottom-top<2)fail('The '+letter+' box contains only a very small mark. Please draw the whole letter.');
      const processed=clone(cells[i].map(index=>strokes[index]));
      const baseline=version===2&&plan.descenders.includes(letter)?330:bottom;
      for(const stroke of processed)for(const p of stroke.points){p.x-=left;p.y-=baseline;}
      return {letter,raw_stroke_indices:cells[i],bounds:{left,top,right,bottom},processed_strokes:processed};
    });
  }
  function capture(data){
    validateContent(data.writer,data.strokes,data.smooth);
    if(!uuid(data.request_id))fail('Invalid save identifier.');
    if(data.plan_id!=null&&data.plan_id!==plan.id)fail('Unknown capture plan.');
    const version=data.plan_id==null?1:2,orders=version===1?legacy:plan.orders;
    if(!Number.isInteger(data.order_index)||!orders[data.order_index])fail('Invalid letter order.');
    const record={schema_version:version,id:data.request_id,writer:data.writer.trim(),saved_at:new Date().toISOString(),order_index:data.order_index,order:orders[data.order_index],display_smoothing:data.smooth,
      coordinates:{width:1000,height:500,y:'down',time:'milliseconds from first contact'},guides:clone(plan.guides),
      processing:{version,method:version===2?'translate left edge to x=0; baseline from capture guide for f/g/j/p/q/y, bottom otherwise; no resizing':'translate left edge to x=0, bottom to y=0; no resizing'},raw_strokes:clone(data.strokes),samples:extract(data.strokes,orders[data.order_index],version)};
    if(version===2)record.plan_id=plan.id;else delete record.guides.descender;
    size(record);return record;
  }
  function size(record){if(new TextEncoder().encode(JSON.stringify(record)).length>8*1024*1024)fail('This page is too large to save. Download its SVG and start a smaller page.');}
  function validateReview(review){if(!review||typeof review.included!=='boolean'||!finite(review.baseline_shift_mm,-10,10))fail('Choose whether to use this sample and a baseline shift between −10 and 10 mm.');}
  function validateRecord(key,r){
    if(!r||!uuid(r.id||r.capture_id))fail('Unsupported backup record.');
    if(key==='letter_reviews/'+r.capture_id+'.json'){
      if(r.schema_version!==1||!r.reviews||typeof r.reviews!=='object'||Array.isArray(r.reviews))fail('Invalid review record.');
      for(const [letter,review] of Object.entries(r.reviews)){if(letter.length!==1||!alphabet.includes(letter))fail('Invalid review letter.');validateReview(review);}return;
    }
    size(r);validateContent(r.writer,r.raw_strokes,r.display_smoothing);
    if(typeof r.saved_at!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(r.saved_at)||!Number.isFinite(Date.parse(r.saved_at)))fail('Invalid save time.');
    if(r.coordinates?.width!==1000||r.coordinates?.height!==500||r.coordinates?.y!=='down')fail('Unsupported coordinates.');
    if(key===r.id+'.json'){if(r.schema_version!==2)fail('Unsupported notebook format.');return;}
    if(key!=='letters/'+r.id+'.json'||![1,2].includes(r.schema_version))fail('Unsupported backup path or format.');
    const orders=r.schema_version===1?legacy:plan.orders;
    if(!Number.isInteger(r.order_index)||r.order!==orders[r.order_index]||(r.schema_version===2&&r.plan_id!==plan.id))fail('Unsupported capture plan.');
    if(!same(r.samples,extract(r.raw_strokes,r.order,r.schema_version)))fail('Processed samples do not match the original writing.');
  }
  function catalog(files){
    const records=files.filter(f=>f.key.startsWith('letters/')).map(f=>f.value).sort((a,b)=>Date.parse(b.saved_at)-Date.parse(a.saved_at)||b.id.localeCompare(a.id));
    const reviews=new Map(files.filter(f=>f.key.startsWith('letter_reviews/')).map(f=>[f.value.capture_id,f.value.reviews]));
    const profiles=new Map(),byWriter=new Map(),states=new Map(),next=new Set();
    for(const r of records){
      if(!profiles.has(r.writer)){profiles.set(r.writer,{writer:r.writer,counts:{},total_counts:{},latest_saved_at:r.saved_at,next_order_index:0});byWriter.set(r.writer,[]);states.set(r.writer,[]);}
      const profile=profiles.get(r.writer),review=reviews.get(r.id)||{};
      if(r.schema_version===2&&!next.has(r.writer)){profile.next_order_index=(r.order_index+1)%plan.orders.length;next.add(r.writer);}
      states.get(r.writer).push([r.id,r.saved_at,review]);
      for(const s of r.samples){const setting=review[s.letter]||{included:true,baseline_shift_mm:0};
        profile.total_counts[s.letter]=(profile.total_counts[s.letter]||0)+1;profile.counts[s.letter]=(profile.counts[s.letter]||0)+Number(setting.included);
        byWriter.get(r.writer).push({...s,...setting,capture_id:r.id,saved_at:r.saved_at});
      }
    }
    for(const [writer,p] of profiles){p.counts=Object.fromEntries(Object.entries(p.counts).sort());p.total_counts=Object.fromEntries(Object.entries(p.total_counts).sort());p.revision=stable(states.get(writer));}
    return {writers:[...profiles.values()].sort((a,b)=>a.writer.toLowerCase().localeCompare(b.writer.toLowerCase())),byWriter};
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function pathData(points,smooth,x,baseline,scale){
    const xy=p=>[x+p.x*scale,baseline+p.y*scale],command=(op,v)=>op+v.map(n=>n.toFixed(4)).join(' '),parts=[command('M',xy(points[0]))];
    if(points.length===1)parts.push(command('L',xy(points[0])));
    else if(!smooth||points.length<3)for(const p of points.slice(1))parts.push(command('L',xy(p)));
    else{for(let i=1;i<points.length-1;i++){const [ax,ay]=xy(points[i]),[bx,by]=xy(points[i+1]);parts.push(command('Q',[ax,ay,(ax+bx)/2,(ay+by)/2]));}parts.push(command('L',xy(points.at(-1))));}
    return parts.join(' ');
  }
  function compose(files,data){
    const {writer,phrase,height=5,smooth=true,samples:mode='latest_three'}=data;
    if(!['latest_three','latest_only','all'].includes(mode))fail('Choose which saved samples to use.');
    if(typeof writer!=='string'||!writer.trim()||writer.trim().length>80)fail('Choose a writer.');
    if(typeof phrase!=='string'||phrase.length>200||![...phrase].some(c=>alphabet.includes(c)))fail('Type a short lowercase phrase (up to 200 characters).');
    if([...phrase].some(c=>!(alphabet+' \n').includes(c)))fail('Use lowercase a–z, spaces and line breaks. Capitals and punctuation come later.');
    if(!finite(height,2,12)||typeof smooth!=='boolean')fail('Choose a writing size from 2 to 12 mm.');
    const cat=catalog(files),all=cat.byWriter.get(writer.trim())||[],variants={},available={};
    for(const s of all){variants[s.letter]??=[];if(s.included)variants[s.letter].push(s);}
    for(const [letter,list] of Object.entries(variants)){available[letter]=list.length;variants[letter]=list.slice(0,{latest_three:3,latest_only:1,all:undefined}[mode]);}
    const missing=[...new Set([...phrase].filter(c=>alphabet.includes(c)&&!variants[c]?.length))].sort();
    if(missing.length)fail('No included samples for: '+missing.join(', ')+'. Capture them or include a saved example in Review samples.');
    const occurrence={},used=[...phrase].map(c=>{if(!alphabet.includes(c))return null;const n=occurrence[c]||0;occurrence[c]=n+1;return variants[c][n%variants[c].length];});
    const scale=height/80;let above=0,below=0;
    for(const s of used)if(s)for(const stroke of s.processed_strokes)for(const p of stroke.points){const y=p.y*scale+s.baseline_shift_mm;above=Math.max(above,-y);below=Math.max(below,y);}
    let x=20,baseline=20+above;const line=above+below+height*.8,paths=[],chosen=[];
    [...phrase].forEach((c,i)=>{
      if(c==='\n'){x=20;baseline+=line;return;}if(c===' '){x+=height*.7;return;}
      const s=used[i],width=(s.bounds.right-s.bounds.left)*scale;
      if(width>170)fail('A letter is too wide for the page. Choose a smaller writing size.');
      if(x+width>190){x=20;baseline+=line;}
      if(baseline+below>277)fail('This phrase does not fit on one A4 page. Use fewer words or a smaller writing size.');
      for(const stroke of s.processed_strokes)paths.push('<path d="'+pathData(stroke.points,smooth,x,baseline+s.baseline_shift_mm,scale)+'"/>');
      chosen.push({letter:c,capture_id:s.capture_id});x+=width+height*.22;
    });
    const dates=used.filter(Boolean).map(s=>s.saved_at).sort((a,b)=>Date.parse(a)-Date.parse(b)),profile=cat.writers.find(p=>p.writer===writer.trim());
    return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Handwriting: '+escape(phrase)+'</title><g fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round">'+paths.join('')+'</g></svg>',used_samples:chosen,unavailable_count:0,
      sample_selection:{mode,available_counts:available,writer_revision:profile.revision,latest_saved_at:profile.latest_saved_at,counts:Object.fromEntries(Object.entries(variants).map(([c,v])=>[c,v.length])),newest_saved_at:dates.at(-1),oldest_saved_at:dates[0]}};
  }
  function reviewSVG(sample){
    const shift=sample.baseline_shift_mm*16;let top=-180,bottom=110,width=240;
    for(const stroke of sample.processed_strokes)for(const p of stroke.points){top=Math.min(top,p.y+shift-25);bottom=Math.max(bottom,p.y+shift+25);width=Math.max(width,p.x+60);}
    let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 '+top+' '+width+' '+(bottom-top)+'">';
    for(const [y,label] of [[-80,'small-letter height'],[0,'baseline'],[80,'tail guide']])svg+='<line x1="-20" x2="'+(width-40)+'" y1="'+y+'" y2="'+y+'" stroke="'+(y===0?'#93ad9b':'#d1dcd1')+'" stroke-width="1" stroke-dasharray="'+(y===0?'none':'4 4')+'"/><text x="-18" y="'+(y-5)+'" fill="#52675f" font-size="9" font-family="sans-serif">'+label+'</text>';
    for(const stroke of sample.processed_strokes)svg+='<path d="'+pathData(stroke.points,true,0,shift,1)+'" fill="none" stroke="#203832" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return svg+'</svg>';
  }
  const api={plan,clone,same,uuid,validateContent,validateReview,validateRecord,extract,capture,catalog,compose,reviewSVG,size};
  if(typeof module!=='undefined')module.exports=api;else{root.StudioEngine=api;root.capturePlan=plan;}
})(typeof window==='undefined'?globalThis:window);
