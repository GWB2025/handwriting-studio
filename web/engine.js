'use strict';
// Pure capture and layout rules shared by the browser app and verification.
(function(root) {
  const alphabet='abcdefghijklmnopqrstuvwxyz', groups=['acebd','fhjgi','kmln','oqpr','sutv','wyxz'];
  const plan={id:'lowercase-v2',alphabet,orders:[],sheets_per_set:6,guides:{ascender:170,x_height:250,baseline:330,descender:410},descenders:'fgjpqy',tall_letters:'bdfhklt'};
  for(let repeat=0;repeat<3;repeat++)for(const group of groups){const shift=(group.length===5?repeat*2:repeat)%group.length;plan.orders.push(group.slice(shift)+group.slice(0,shift));}
  const characters=alphabet+'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'+".,!?;:'\"-()[]{}@£$€%&+=/#_“”‘’–—";
  const pairs=['th','he','in','er','an','re','on','at','en','nd','oo','fi','of','tt'];
  const plans={lowercase:plan};
  for(const [name,tokens] of Object.entries({uppercase:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],numbers:[...'0123456789'],symbols:[...characters.slice(62)],pairs})){
    const orders=[];for(let i=0;i<tokens.length;i+=4)orders.push(tokens.slice(i,i+4));
    plans[name]={...plan,id:name+'-v3',alphabet:tokens,orders,sheets_per_set:orders.length,tall_letters:name==='uppercase'?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':plan.tall_letters};
  }
  const getPlan=id=>Object.values(plans).find(p=>p.id===id);
  const tokens=order=>Array.from(order);
  const legacy=['acebd','ebdac','daceb'],clone=value=>JSON.parse(JSON.stringify(value));
  const fail=message=>{throw Error(message);};
  const finite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
  const same=(a,b)=>stable(a)===stable(b);
  function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
  function validateOrders(orders,p=plan){
    if(!Array.isArray(orders)||orders.length!==p.orders.length)fail('Invalid shuffled alphabet.');
    for(let i=0;i<orders.length;i++)if(!(typeof orders[i]==='string'||Array.isArray(orders[i]))||orders[i].length!==p.orders[i].length)fail('Invalid shuffled sheet.');
    for(let i=0;i<orders.length;i+=p.sheets_per_set){
      if(JSON.stringify(orders.slice(i,i+p.sheets_per_set).flatMap(tokens).sort())!==JSON.stringify(tokens(p.alphabet).sort()))fail('Each shuffled set must contain every letter exactly once.');
    }
    return orders;
  }
  function shuffleSet(orders,index,random=Math.random,p=plan){
    const result=clone(validateOrders(orders,p)),end=(Math.floor(index/p.sheets_per_set)+1)*p.sheets_per_set;
    const letters=result.slice(index,end).flatMap(tokens);
    for(let i=letters.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[letters[i],letters[j]]=[letters[j],letters[i]];}
    let offset=0;
    for(let i=index;i<end;i++){const length=result[i].length;result[i]=typeof result[i]==='string'?letters.slice(offset,offset+length).join(''):letters.slice(offset,offset+length);offset+=length;}
    return result;
  }
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
      if((version!==3 && (right-left<2||bottom-top<2)) || (version===3 && right-left<2 && bottom-top<2 && !".,:'\"".includes(letter)))fail('The '+letter+' box contains only a very small mark. Please draw the whole letter.');
      const processed=clone(cells[i].map(index=>strokes[index]));
      const baseline=version===3?330:version===2&&plan.descenders.includes(letter)?330:bottom;
      for(const stroke of processed)for(const p of stroke.points){p.x-=left;p.y-=baseline;}
      return {letter,raw_stroke_indices:cells[i],bounds:{left,top,right,bottom},processed_strokes:processed};
    });
  }
  function capture(data){
    validateContent(data.writer,data.strokes,data.smooth);
    if(!uuid(data.request_id))fail('Invalid save identifier.');
    const p=data.plan_id==null?plan:getPlan(data.plan_id);if(!p)fail('Unknown capture plan.');
    const version=data.plan_id==null?1:p.id===plan.id?2:3,orders=version===1?legacy:(data.capture_orders==null?p.orders:validateOrders(data.capture_orders,p));
    if(!Number.isInteger(data.order_index)||!orders[data.order_index])fail('Invalid letter order.');
    const record={schema_version:version,id:data.request_id,writer:data.writer.trim(),saved_at:new Date().toISOString(),order_index:data.order_index,order:orders[data.order_index],display_smoothing:data.smooth,
      coordinates:{width:1000,height:500,y:'down',time:'milliseconds from first contact'},guides:clone(plan.guides),
      processing:{version,method:version===3?'translate left edge to x=0; baseline from capture guide; no resizing':version>=2?'translate left edge to x=0; baseline from capture guide for f/g/j/p/q/y, bottom otherwise; no resizing':'translate left edge to x=0, bottom to y=0; no resizing'},raw_strokes:clone(data.strokes),samples:extract(data.strokes,orders[data.order_index],version)};
    if(version>=2)record.plan_id=p.id;else delete record.guides.descender;
    if(data.capture_orders!=null)record.capture_orders=clone(orders);
    size(record);return record;
  }
  function size(record){if(new TextEncoder().encode(JSON.stringify(record)).length>8*1024*1024)fail('This page is too large to save. Download its SVG and start a smaller page.');}
  function validateReview(review){if(!review||typeof review.included!=='boolean'||!finite(review.baseline_shift_mm,-10,10)||!finite(review.scale_factor??1,.5,2))fail('Choose inclusion, a position within 10 mm of the baseline, and a size from 50% to 200%.');}
  function scaleSample(sample,factor){
    const result=clone(sample);if(factor===1)return result;
    for(const stroke of result.processed_strokes)for(const p of stroke.points){p.x*=factor;p.y*=factor;}
    result.bounds={...result.bounds,left:0,right:(sample.bounds.right-sample.bounds.left)*factor};return result;
  }
  function sampleAtSize(files,s,factor){const raw=files.find(f=>(f.key==='letters/'+s.capture_id+'.json'||f.key==='blends/'+s.capture_id+'.json'))?.value.samples.find(p=>p.letter===s.letter);if(!raw)fail('This sample is unavailable.');return {...s,...scaleSample(raw,factor),baseline_shift_mm:s.baseline_shift_mm,scale_factor:factor};}
  const preferenceIDs=value=>Array.isArray(value)?value:value?[value]:[];
  function compositionSettings(data){
    if(!data||typeof data.writer!=='string'||!data.writer.trim()||data.writer.length>80||typeof data.phrase!=='string'||!data.phrase.trim()||data.phrase.length>2000)fail('Choose a writer and enter text before saving a composition.');
    const result={writer:data.writer,phrase:data.phrase,height:data.height??5,smooth:data.smooth??true,samples:data.samples??'latest_three',source:data.source??'both',use_preferred:data.use_preferred??true,joined:data.joined??true,letter_spacing:data.letter_spacing??1,word_spacing:data.word_spacing??1,line_spacing:data.line_spacing??1};
    if(![3,5,8].includes(result.height)||!['latest_three','latest_four','latest_only','all'].includes(result.samples)||!['both','originals','blends'].includes(result.source)||!['smooth','use_preferred','joined'].every(k=>typeof result[k]==='boolean')||!['letter_spacing','word_spacing','line_spacing'].every(k=>finite(result[k],.5,2)))fail('Invalid composition settings.');
    return result;
  }
  function createComposition(data){
    if(!data||!uuid(data.id)||typeof data.title!=='string'||!data.title.trim()||data.title.length>100)fail('Give the composition a name (up to 100 characters).');
    return {schema_version:1,id:data.id,title:data.title.trim(),updated_at:new Date().toISOString(),settings:compositionSettings(data.settings)};
  }
  function reviewWord(files,data){
    validateReview(data);if(typeof data.text!=='string'||data.text.length>40)fail('Use up to 40 characters in the word preview.');
    const copy=clone(files),key='letter_reviews/'+data.capture_id+'.json',old=copy.find(f=>f.key===key),r=old?.value||{schema_version:1,capture_id:data.capture_id,reviews:{}};
    r.reviews[data.letter]={included:true,baseline_shift_mm:data.baseline_shift_mm,scale_factor:data.scale_factor??1};if(!old)copy.push({key,value:r});
    const sample=catalog(copy).byWriter.get(data.writer)?.find(s=>s.capture_id===data.capture_id&&s.letter===data.letter);if(!sample)fail('This sample is unavailable.');
    const pref=choosePreferred(copy,{writer:data.writer,letter:data.letter,capture_id:data.capture_id}),index=copy.findIndex(f=>f.key===pref.key);if(index<0)copy.push(pref);else copy[index]=pref;
    return compose(copy,{writer:data.writer,phrase:data.text,height:5,joined:false,samples:'latest_only'});
  }
  function createSavedBlend(files,data){
    if(!uuid(data.id)||(typeof data.writer!=='string'||!data.writer.trim()||data.writer.length>80)||!Array.isArray(data.source_ids)||![2,4].includes(data.source_ids.length)||new Set(data.source_ids).size!==data.source_ids.length||!finite(data.horizontal,0,100)||!finite(data.vertical,0,100))fail('Choose two or four distinct source samples and valid mix controls.');
    const all=[...catalog(files).byWriter.values()].flat();
    if(data.source_shifts!==undefined&&(!Array.isArray(data.source_shifts)||data.source_shifts.length!==data.source_ids.length||!data.source_shifts.every(v=>finite(v,-10,10))))fail('Invalid source baseline adjustments.');
    if(data.source_scales!==undefined&&(!Array.isArray(data.source_scales)||data.source_scales.length!==data.source_ids.length||!data.source_scales.every(v=>finite(v,.5,2))))fail('Invalid source sizes.');
    const sources=data.source_ids.map((id,i)=>{const s=all.find(s=>s.capture_id===id&&s.letter===data.letter&&s.included&&!s.derived),factor=data.source_scales?.[i]??s?.scale_factor??1;return s&&{...sampleAtSize(files,s,factor),scale_factor:factor,baseline_shift_mm:data.source_shifts?.[i]??s.baseline_shift_mm};});
    if(sources.some(s=>!s))fail('A source is unavailable or excluded. Reload the samples.');
    const h=data.horizontal/100,v=data.vertical/100,weights=sources.length===2?[1-h,h]:[(1-h)*(1-v),h*(1-v),(1-h)*v,h*v],result=blendMany(sources,weights);
    if(!result)fail('These samples have incompatible strokes. Choose samples with matching stroke order and direction.');
    const sample={letter:data.letter,processed_strokes:result.processed_strokes,bounds:result.bounds,baseline_shift_mm:result.baseline_shift_mm};
    return {schema_version:sources.some(s=>s.scale_factor!==1)?5:4,...(sources.some(s=>s.scale_factor!==1)?{source_scales:sources.map(s=>s.scale_factor)}:{}),derived:true,id:data.id,writer:data.writer,saved_at:new Date().toISOString(),order:[data.letter],samples:[sample],source_ids:data.source_ids.slice(),source_shifts:sources.map(s=>s.baseline_shift_mm),weights,horizontal:data.horizontal,vertical:data.vertical};
  }
  function savedBlendRecipe(files,id){
    const record=files.find(f=>f.key==='blends/'+id+'.json')?.value;
    if(!record)fail('This saved blend is unavailable.');
    const recipe={writer:record.writer,letter:record.order[0],source_ids:record.source_ids.slice(),source_shifts:record.source_shifts.slice(),source_scales:record.source_scales?.slice()||record.source_ids.map(()=>1),horizontal:record.horizontal,vertical:record.vertical};
    // Validate availability without changing the saved record or its source adjustments.
    createSavedBlend(files,{...recipe,id:record.id});return recipe;
  }
  function proofSheet(files,data){
    const {writer,kind='lowercase',source='both',height=5,sentence=''}=data,p=plans[kind];
    if(!p)fail('Choose a proof sheet group.');
    if(typeof sentence!=='string')fail('Enter a test sentence.');
    const profile=catalog(files).writers.find(p=>p.writer===writer),counts=countsFor(profile,source);
    const ready=tokens(p.alphabet).filter(c=>counts[c]>0),missing=tokens(p.alphabet).filter(c=>!counts[c]);
    if(!ready.length)fail('No included samples for this group and source type.');
    const result=compose(files,{writer,source,height,smooth:data.smooth??true,use_preferred:true,samples:'latest_only',joined:true,phrase:ready.join(' ')+(sentence.trim()?'\n\n'+sentence.trim():'')});
    return {...result,missing,characters:ready};
  }
  function validateBlendReferences(files){
    const map=new Map(files.map(f=>[f.key,f.value]));
    for(const f of files.filter(f=>f.key.startsWith('blends/'))){const r=f.value,sources=r.source_ids.map((id,i)=>{const capture=map.get('letters/'+id+'.json'),sample=capture?.samples.find(s=>s.letter===r.order[0]);if(!sample)fail('A saved blend is missing an original source.');return {...scaleSample(sample,r.source_scales?.[i]??1),capture_id:id,baseline_shift_mm:r.source_shifts[i]};});
      const result=blendMany(sources,r.weights);if(!result||!same(r.samples[0],{letter:r.order[0],processed_strokes:result.processed_strokes,bounds:result.bounds,baseline_shift_mm:result.baseline_shift_mm}))fail('Saved blend does not match its sources.');
    }
  }
  const alphabetKey=writer=>'alphabets/'+encodeURIComponent(writer)+'.json';
  function validateAlphabetReferences(files){
    const cat=catalog(files);
    for(const f of files.filter(f=>f.key.startsWith('alphabets/'))){const r=f.value,all=cat.byWriter.get(r.writer)||[];
      for(const [letter,ids] of Object.entries(r.choices))for(const id of preferenceIDs(ids))if(!all.some(s=>s.letter===letter&&s.capture_id===id))fail('A preferred character is missing its saved sample.');
    }
  }
  function choosePreferred(files,data){
    if(!data||typeof data.writer!=='string'||!data.writer.trim()||data.writer.length>80||![...characters,...pairs].includes(data.letter))fail('Choose a writer, character and preferred sample.');
    const ids=data.capture_ids??(data.capture_id===null?[]:[data.capture_id]);
    if(!Array.isArray(ids)||ids.length>100||new Set(ids).size!==ids.length||!ids.every(uuid))fail('Choose distinct preferred samples.');
    const all=catalog(files).byWriter.get(data.writer);if(!all)fail('This writer is unavailable.');
    if(ids.some(id=>!all.some(s=>s.letter===data.letter&&s.capture_id===id&&(s.included||(data.capture_ids&&preferenceIDs(files.find(f=>f.key===alphabetKey(data.writer))?.value.choices[data.letter]).includes(id))))))fail('Choose an included sample belonging to this writer and character.');
    const key=alphabetKey(data.writer),old=files.find(f=>f.key===key)?.value,multi=data.capture_ids!==undefined||old?.schema_version===2;
    const choices=clone(old?.choices||{});if(multi)for(const letter of Object.keys(choices))choices[letter]=preferenceIDs(choices[letter]);
    if(!ids.length)delete choices[data.letter];else choices[data.letter]=multi?ids.slice():ids[0];
    return {key,value:old&&same(old.choices,choices)?old:{schema_version:multi?2:1,writer:data.writer,choices,updated_at:new Date().toISOString()}};
  }
  function countsFor(profile,source='both'){
    return profile?(source==='originals'?profile.original_counts||profile.counts:source==='blends'?profile.blend_counts||{}:profile.counts):{};
  }
  function validateRecord(key,r){
    if(key.startsWith('compositions/')){
      if(!r||r.schema_version!==1||!uuid(r.id)||key!=='compositions/'+r.id+'.json'||!Number.isFinite(Date.parse(r.updated_at)))fail('Invalid saved composition.');
      const normalized=createComposition(r);if(r.title!==normalized.title||!same(r.settings,normalized.settings))fail('Invalid saved composition settings.');size(r);return;
    }
    if(key.startsWith('alphabets/')){
      if(!r||![1,2].includes(r.schema_version)||typeof r.writer!=='string'||!r.writer.trim()||r.writer.length>80||key!==alphabetKey(r.writer)||!r.choices||typeof r.choices!=='object'||Array.isArray(r.choices)||!Number.isFinite(Date.parse(r.updated_at)))fail('Invalid alphabet preferences.');
      size(r);for(const [letter,value] of Object.entries(r.choices)){const ids=preferenceIDs(value);if(![...characters,...pairs].includes(letter)||(r.schema_version===1?!uuid(value):!Array.isArray(value))||!ids.length||ids.length>100||new Set(ids).size!==ids.length||!ids.every(uuid))fail('Invalid preferred character.');}return;
    }
    if(!r||!uuid(r.id||r.capture_id))fail('Unsupported backup record.');
    if(key==='letter_reviews/'+r.capture_id+'.json'){
      if(r.schema_version!==1||!r.reviews||typeof r.reviews!=='object'||Array.isArray(r.reviews))fail('Invalid review record.');
      for(const [letter,review] of Object.entries(r.reviews)){if(!([...characters,...pairs].includes(letter)))fail('Invalid review letter.');validateReview(review);}return;
    }
    if(key==='blends/'+r.id+'.json'){
      size(r);if(![4,5].includes(r.schema_version)||r.derived!==true||typeof r.writer!=='string'||!r.writer.trim()||r.writer.length>80||!Number.isFinite(Date.parse(r.saved_at))||!Array.isArray(r.order)||r.order.length!==1||![...characters,...pairs].includes(r.order[0])||!Array.isArray(r.source_ids)||![2,4].includes(r.source_ids.length)||new Set(r.source_ids).size!==r.source_ids.length||!r.source_ids.every(uuid)||!Array.isArray(r.source_shifts)||r.source_shifts.length!==r.source_ids.length||!r.source_shifts.every(v=>finite(v,-10,10))||!finite(r.horizontal,0,100)||!finite(r.vertical,0,100))fail('Invalid saved blend.');
      if((r.schema_version===4&&r.source_scales!==undefined)||(r.schema_version===5&&(!Array.isArray(r.source_scales)||r.source_scales.length!==r.source_ids.length||!r.source_scales.every(v=>finite(v,.5,2)))))fail('Invalid saved blend sizes.');
      const h=r.horizontal/100,v=r.vertical/100,w=r.source_ids.length===2?[1-h,h]:[(1-h)*(1-v),h*(1-v),(1-h)*v,h*v];if(!same(r.weights,w)||!Array.isArray(r.samples)||r.samples.length!==1)fail('Invalid blend weights.');return;
    }
    size(r);validateContent(r.writer,r.raw_strokes,r.display_smoothing);
    if(typeof r.saved_at!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(r.saved_at)||!Number.isFinite(Date.parse(r.saved_at)))fail('Invalid save time.');
    if(r.coordinates?.width!==1000||r.coordinates?.height!==500||r.coordinates?.y!=='down')fail('Unsupported coordinates.');
    if(key===r.id+'.json'){if(r.schema_version!==2)fail('Unsupported notebook format.');return;}
    if(key!=='letters/'+r.id+'.json'||![1,2,3].includes(r.schema_version))fail('Unsupported backup path or format.');
    const p=r.schema_version===3?getPlan(r.plan_id):plan;if(!p)fail('Unsupported capture plan.');
    const orders=r.schema_version===1?legacy:(r.capture_orders==null?p.orders:validateOrders(r.capture_orders,p));
    if(!Number.isInteger(r.order_index)||!same(r.order,orders[r.order_index])||(r.schema_version===2&&r.plan_id!==plan.id))fail('Unsupported capture plan.');
    if(!same(r.samples,extract(r.raw_strokes,r.order,r.schema_version)))fail('Processed samples do not match the original writing.');
  }
  function catalog(files){
    const records=files.filter(f=>f.key.startsWith('letters/')||f.key.startsWith('blends/')).map(f=>f.value).sort((a,b)=>Date.parse(b.saved_at)-Date.parse(a.saved_at)||b.id.localeCompare(a.id));
    const reviews=new Map(files.filter(f=>f.key.startsWith('letter_reviews/')).map(f=>[f.value.capture_id,f.value.reviews]));
    const profiles=new Map(),byWriter=new Map(),states=new Map(),next=new Set();
    for(const r of records){
      if(!profiles.has(r.writer)){profiles.set(r.writer,{writer:r.writer,counts:{},original_counts:{},blend_counts:{},total_counts:{},latest_saved_at:r.saved_at,next_order_index:0});byWriter.set(r.writer,[]);states.set(r.writer,[]);}
      const profile=profiles.get(r.writer),review=reviews.get(r.id)||{};
      profile.capture_progress??={};
      if(r.schema_version>=2&&r.schema_version<=3&&!profile.capture_progress[r.plan_id])profile.capture_progress[r.plan_id]={next_order_index:(r.order_index+1)%getPlan(r.plan_id).orders.length,capture_orders:clone(r.capture_orders||getPlan(r.plan_id).orders)};
      if(r.schema_version===2&&!next.has(r.writer)){profile.next_order_index=(r.order_index+1)%plan.orders.length;if(r.capture_orders)profile.capture_orders=clone(r.capture_orders);next.add(r.writer);}
      states.get(r.writer).push([r.id,r.saved_at,review]);
      for(const s of r.samples){const setting=review[s.letter]||{included:true,baseline_shift_mm:s.baseline_shift_mm||0};
        profile.total_counts[s.letter]=(profile.total_counts[s.letter]||0)+1;profile.counts[s.letter]=(profile.counts[s.letter]||0)+Number(setting.included);
        if(setting.included){const counts=r.derived?profile.blend_counts:profile.original_counts;counts[s.letter]=(counts[s.letter]||0)+1;}
        byWriter.get(r.writer).push({...scaleSample(s,setting.scale_factor??1),...setting,scale_factor:setting.scale_factor??1,capture_id:r.id,saved_at:r.saved_at,derived:!!r.derived});
      }
    }
    for(const [writer,p] of profiles){const choices=clone(files.find(f=>f.key===alphabetKey(writer))?.value.choices||{});p.preferred_sets=Object.fromEntries(Object.entries(choices).map(([c,ids])=>[c,preferenceIDs(ids)]));p.preferred=Object.fromEntries(Object.entries(p.preferred_sets).map(([c,ids])=>[c,ids[0]]));states.get(writer).push(['preferred',choices]);p.counts=Object.fromEntries(Object.entries(p.counts).sort());p.total_counts=Object.fromEntries(Object.entries(p.total_counts).sort());p.revision=stable(states.get(writer));}
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
  function resample(points,count=64){
    const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    const total=distances.at(-1);if(!total)return Array.from({length:count},()=>({x:points[0].x,y:points[0].y}));
    let j=1;return Array.from({length:count},(_,i)=>{const d=total*i/(count-1);while(j<points.length-1 && distances[j]<d)j++;const ratio=(d-distances[j-1])/(distances[j]-distances[j-1]||1);return {x:points[j-1].x+(points[j].x-points[j-1].x)*ratio,y:points[j-1].y+(points[j].y-points[j-1].y)*ratio};});
  }
  function blendConflict(a,b){
    if(a.processed_strokes.length!==b.processed_strokes.length)return 'different stroke counts';
    // Narrow letters still need room for natural height and dot-position variation.
    // Derive height from the ink: older saved blends only store horizontal bounds.
    const extent=sample=>{let top=Infinity,bottom=-Infinity;for(const stroke of sample.processed_strokes)for(const p of stroke.points){top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}return Math.max(sample.bounds.right-sample.bounds.left,bottom-top,20);};
    const tolerance=Math.max(extent(a),extent(b))*.6;
    for(let i=0;i<a.processed_strokes.length;i++){
      const x=resample(a.processed_strokes[i].points),y=resample(b.processed_strokes[i].points);
      const direct=x.reduce((sum,p,j)=>sum+Math.hypot(p.x-y[j].x,p.y-y[j].y),0)/x.length;
      const reverse=x.reduce((sum,p,j)=>sum+Math.hypot(p.x-y.at(-1-j).x,p.y-y.at(-1-j).y),0)/x.length;
      if(direct>reverse+1)return 'different stroke starts, order or direction';
      if(direct>tolerance)return 'shapes or positions that differ too much';
    }
    return '';
  }
  function compatible(a,b){return !blendConflict(a,b);}
  function findCompatibleSources(samples,count,preferredIDs=[]){
    if(![2,4].includes(count))return [];
    const unique=new Map();for(const s of samples)if(!s.derived&&s.included!==false&&!unique.has(s.capture_id))unique.set(s.capture_id,s);
    const preferred=[...new Set(preferredIDs)].filter(id=>unique.has(id));
    const candidates=[...preferred.map(id=>unique.get(id)),...[...unique.values()].filter(s=>!preferred.includes(s.capture_id))];
    // Search all pairs in each proposed group, not just each source against A.
    // Bound the search so a large, incompatible library cannot lock up the page.
    const cache=new Map();let attempts=0;
    function matches(a,b){const key=a+':'+b;if(!cache.has(key))cache.set(key,candidates[a].letter===candidates[b].letter&&compatible(candidates[a],candidates[b]));return cache.get(key);}
    function search(chosen,start){
      if(chosen.length===count)return chosen.map(i=>candidates[i]);
      for(let i=start;i<=candidates.length-(count-chosen.length);i++){
        if(++attempts>10000)return [];
        if(chosen.every(j=>matches(j,i))){const found=search([...chosen,i],i+1);if(found.length)return found;}
      }
      return [];
    }
    return search([],0);
  }
  function blend(a,b,weight){
    if(!compatible(a,b))return null;
    const result=clone(a);result.sources=[a.capture_id,b.capture_id];result.weight=weight;
    result.processed_strokes=a.processed_strokes.map((s,i)=>{const other=resample(b.processed_strokes[i].points);return {pointerType:s.pointerType,points:resample(s.points).map((p,j)=>{const q=other[j];return {x:p.x*(1-weight)+q.x*weight,y:p.y*(1-weight)+q.y*weight};})};});
    const points=result.processed_strokes.flatMap(s=>s.points),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
    for(const p of points)p.x-=left;
    result.bounds={left:0,right};result.bounds.right=right-left;
    result.baseline_shift_mm=a.baseline_shift_mm*(1-weight)+b.baseline_shift_mm*weight;
    return result;
  }
  function blendMany(samples,weights){
    if(samples.length!==weights.length||samples.length<2||weights.some(w=>!finite(w,0,1))||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-8)return null;
    for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++)if(!compatible(samples[i],samples[j]))return null;
    const result=clone(samples[0]);result.sources=samples.map(s=>s.capture_id);result.weights=weights.slice();
    result.processed_strokes=samples[0].processed_strokes.map((stroke,i)=>{const normalized=samples.map(s=>resample(s.processed_strokes[i].points));return {pointerType:stroke.pointerType,points:normalized[0].map((_,j)=>({x:normalized.reduce((v,p,k)=>v+p[j].x*weights[k],0),y:normalized.reduce((v,p,k)=>v+p[j].y*weights[k],0)}))};});
    const points=result.processed_strokes.flatMap(s=>s.points),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));for(const p of points)p.x-=left;result.bounds={left:0,right:right-left};result.baseline_shift_mm=samples.reduce((v,s,i)=>v+s.baseline_shift_mm*weights[i],0);return result;
  }
  function spacing(a,b,scale,height){
    function envelope(sample){const rows=new Map();for(const stroke of sample.processed_strokes){const points=resample(stroke.points,128);for(const p of points){const row=Math.floor((p.y*scale+sample.baseline_shift_mm)/.5),x=p.x*scale;for(const key of [row-1,row,row+1]){const r=rows.get(key)||[Infinity,-Infinity];r[0]=Math.min(r[0],x);r[1]=Math.max(r[1],x);rows.set(key,r);}}}return rows;}
    const ar=envelope(a),br=envelope(b),width=(a.bounds.right-a.bounds.left)*scale;let advance=height*.25;
    for(const [row,r] of ar)if(br.has(row))advance=Math.max(advance,r[1]-br.get(row)[0]+height*.18);
    return Math.max(width*.45,Math.min(width+height*.22,advance));
  }
  function compose(files,data){
    const {writer,phrase,height=5,smooth=true,samples:mode='latest_three',variation='original',seed='0',joined=true,blend_strength,blend_count=2,blend_vertical=50,source='both',use_preferred=true,letter_spacing=1,word_spacing=1,line_spacing=1}=data;
    if(![letter_spacing,word_spacing,line_spacing].every(v=>finite(v,.5,2)))fail('Spacing must be between 50% and 200%.');
    if(!['originals','blends','both'].includes(source)||typeof use_preferred!=='boolean')fail('Choose original samples, saved blends or both.');
    if(!['latest_three','latest_four','latest_only','all'].includes(mode))fail('Choose which saved samples to use.');
    if(!['original','blend'].includes(variation))fail('Choose an available variation mode.');
    if(typeof writer!=='string'||!writer.trim()||writer.trim().length>80)fail('Choose a writer.');
    if(typeof phrase!=='string'||phrase.length>2000||![...phrase].some(c=>characters.includes(c)))fail('Type a phrase (up to 2000 characters).');
    if([...phrase].some(c=>!(characters+' \n').includes(c)))fail('Use captured letters, numbers and supported punctuation.');
    if(!finite(height,2,12)||typeof smooth!=='boolean'||typeof joined!=='boolean')fail('Choose a writing size from 2 to 12 mm.');
    if(blend_strength!==undefined&&!finite(blend_strength,0,100))fail('Choose a blend mix from 0 to 100 percent.');
    if(![2,4].includes(blend_count)||!finite(blend_vertical,0,100))fail('Choose two or four sources and valid blend controls.');
    const previews=[];
    const cat=catalog(files),all=cat.byWriter.get(writer.trim())||[],variants={},available={},preferences=cat.writers.find(p=>p.writer===writer.trim())?.preferred_sets||{};
    for(const s of all){variants[s.letter]??=[];if(s.included&&(source==='both'||(source==='blends')===s.derived))variants[s.letter].push(s);}
    for(const [letter,list] of Object.entries(variants)){available[letter]=list.length;const preferred=use_preferred?preferenceIDs(preferences[letter]).map(id=>list.find(s=>s.capture_id===id)).filter(Boolean):[];variants[letter]=preferred.length?preferred:list.slice(0,{latest_three:3,latest_four:4,latest_only:1,all:undefined}[mode]);}
    const letters=[];for(let i=0;i<phrase.length;i++){const pair=phrase.slice(i,i+2);if(joined&&pairs.includes(pair)&&variants[pair]?.length){letters.push(pair);i++;}else letters.push(phrase[i]);}
    const missing=[...new Set(letters.filter(c=>c!==' '&&c!=='\n'&&!variants[c]?.length))].sort();
    if(missing.length)fail('No included '+(source==='blends'?'saved blends':source==='originals'?'original samples':'samples')+' for: '+missing.join(', ')+'. '+(source==='blends'?'Save blends for these characters or choose Both.':'Capture them or include a saved example in Review samples.'));
    let state=2166136261;for(const c of String(seed)+phrase)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    let blended=0,fallback=0;const occurrence={},used=letters.map(c=>{
      if(c===' '||c==='\n')return null;const n=occurrence[c]||0;occurrence[c]=n+1;const list=variants[c],original=list[n%list.length];
      if(variation==='blend'){
        const candidates=list.filter(s=>s!==original&&compatible(original,s));
        // Seeded selection stays fixed when only the mix controls change.
        const sources=[original];while(candidates.length&&sources.length<blend_count){const i=Math.floor(random()*candidates.length),candidate=candidates.splice(i,1)[0];if(sources.every(s=>compatible(s,candidate)))sources.push(candidate);}
        if(sources.length===blend_count){const h=blend_strength===undefined?.2+random()*.6:blend_strength/100,v=blend_vertical/100,weights=blend_count===2?[1-h,h]:[(1-h)*(1-v),h*(1-v),(1-h)*v,h*v];
          const result=blendMany(sources,weights);result.weight=h;
          if(previews.length<6)previews.push({letter:c,source_a:sources[0].capture_id,source_b:sources[1].capture_id,source_b_percent:Math.round(h*100),source_ids:sources.map(s=>s.capture_id),weights,svgs:comparisonMany(sources,result)});
          blended++;return result;
        }fallback++;
      }return original;
    });
    const scale=height/80;let above=0,below=0;
    for(const s of used)if(s)for(const stroke of s.processed_strokes)for(const p of stroke.points){const y=p.y*scale+s.baseline_shift_mm;above=Math.max(above,-y);below=Math.max(below,y);}
    let x=20,baseline=20+above;const line=above+below+height*.8*line_spacing,paths=[],chosen=[];
    for(let i=0;i<letters.length;){
      if(letters[i]==='\n'){x=20;baseline+=line;i++;continue;}if(letters[i]===' '){x+=height*.7*word_spacing;i++;continue;}
      let end=i;while(end<letters.length && used[end])end++;
      const advances=[];for(let j=i;j<end;j++)advances.push(j+1<end?spacing(used[j],used[j+1],scale,height)*letter_spacing:(used[j].bounds.right-used[j].bounds.left)*scale);
      const wordWidth=Math.max(...advances.map((_,j)=>advances.slice(0,j).reduce((a,b)=>a+b,0)+(used[i+j].bounds.right-used[i+j].bounds.left)*scale));
      if(wordWidth>170)fail('A word is too wide for the page. Choose a smaller writing size or add a space.');
      if(x+wordWidth>190){x=20;baseline+=line;}
      if(baseline+below>277)fail('This phrase does not fit on one A4 page. Use fewer words or a smaller writing size.');
      for(let j=i;j<end;j++){const s=used[j];for(const stroke of s.processed_strokes)paths.push('<path d="'+pathData(stroke.points,smooth,x,baseline+s.baseline_shift_mm,scale)+'"/>');chosen.push({letter:letters[j],capture_id:s.capture_id,...(s.sources?{sources:s.sources,weight:s.weight,weights:s.weights}:{})});x+=advances[j-i];}
      x+=height*.22;i=end;
    }
    const dates=used.filter(Boolean).map(s=>s.saved_at).sort((a,b)=>Date.parse(a)-Date.parse(b)),profile=cat.writers.find(p=>p.writer===writer.trim());
    return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Handwriting: '+escape(phrase)+'</title><g fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round">'+paths.join('')+'</g></svg>',used_samples:chosen,unavailable_count:0,variation:{mode:variation,blended,fallback,seed:String(seed),blend_count,previews},
      sample_selection:{mode,source,use_preferred,all_counts:profile.counts,original_counts:profile.original_counts,blend_counts:profile.blend_counts,preferred:profile.preferred,available_counts:available,writer_revision:profile.revision,latest_saved_at:profile.latest_saved_at,counts:Object.fromEntries(Object.entries(variants).map(([c,v])=>[c,v.length])),newest_saved_at:dates.at(-1),oldest_saved_at:dates[0]}};
  }
  function comparisonMany(sources,result){
    const svgs=[...sources,result].map(reviewSVG),boxes=svgs.map(svg=>svg.match(/viewBox="([^" ]+) ([^" ]+) ([^" ]+) ([^" ]+)"/).slice(1).map(Number));
    const left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.max(...boxes.map(b=>b[1]+b[3]));
    return svgs.map(svg=>svg.replace(/viewBox="[^"]+"/,`viewBox="${left} ${top} ${right-left} ${bottom-top}"`));
  }
  function reviewSVG(sample,{colourStrokes=false,showStarts=false}={}){
    const shift=sample.baseline_shift_mm*16;let top=-180,bottom=110,width=240;
    for(const stroke of sample.processed_strokes)for(const p of stroke.points){top=Math.min(top,p.y+shift-25);bottom=Math.max(bottom,p.y+shift+25);width=Math.max(width,p.x+60);}
    let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 '+top+' '+width+' '+(bottom-top)+'">';
    for(const [y,label] of [[-80,'small-letter height'],[0,'baseline'],[80,'tail guide']])svg+='<line x1="-20" x2="'+(width-40)+'" y1="'+y+'" y2="'+y+'" stroke="'+(y===0?'#93ad9b':'#d1dcd1')+'" stroke-width="1" stroke-dasharray="'+(y===0?'none':'4 4')+'"/><text x="-18" y="'+(y-5)+'" fill="#52675f" font-size="9" font-family="sans-serif">'+label+'</text>';
    const colours=['#203832','#1463d6','#a74700','#813ca6','#06736e','#ba285f'];
    sample.processed_strokes.forEach((stroke,i)=>{svg+='<path d="'+pathData(stroke.points,true,0,shift,1)+'" fill="none" stroke="'+colours[colourStrokes?i%colours.length:0]+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';});
    if(showStarts)sample.processed_strokes.forEach((stroke,i)=>{const p=stroke.points[0];svg+='<g class="stroke-start" data-stroke-start="'+i+'" transform="translate('+p.x+' '+(p.y+shift)+')" fill="'+colours[colourStrokes?i%colours.length:0]+'"><circle r="3"/><text x="5" y="-5" font-size="10" font-family="sans-serif">'+(i+1)+'</text></g>';});
    return svg+'</svg>';
  }
  const api={sampleAtSize,scaleSample,preferenceIDs,compositionSettings,createComposition,reviewWord,savedBlendRecipe,proofSheet,alphabetKey,choosePreferred,validateAlphabetReferences,countsFor,createSavedBlend,validateBlendReferences,blendMany,resample,blendConflict,compatible,findCompatibleSources,blend,spacing,plan,plans,characters,pairs,tokens,getPlan,shuffleSet,validateOrders,clone,same,uuid,validateContent,validateReview,validateRecord,extract,capture,catalog,compose,reviewSVG,size};
  if(typeof module!=='undefined')module.exports=api;else{root.StudioEngine=api;root.capturePlan=plan;}
})(typeof window==='undefined'?globalThis:window);
