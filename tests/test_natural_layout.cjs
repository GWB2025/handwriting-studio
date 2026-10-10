const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),P=require('../static/plotter'),{files,strokeFiles}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
const coordinates=path=>[...path.matchAll(/[MLQ]([^MLQ]*)/g)].flatMap(m=>{const n=m[1].trim().split(/\s+/).map(Number);return Array.from({length:n.length/2},(_,i)=>n.slice(i*2,i*2+2));});
const near=(a,b)=>assert(Math.abs(a-b)<.0002,`${a} differs from ${b}`);
const natural=(level='subtle',seed='writing-test')=>({level,seed});
const request={writer:'Writer',phrase:'the quick brown fox jumps over the lazy dog',height:5,joined:false,page_layout:{}};
test('Off preserves exact geometry; natural variation is repeatable and independent of sample selection',()=>{
 const records=files(),before=JSON.stringify(records),plain=E.compose(records,request);
 assert.deepEqual(E.compose(records,{...request,natural_variation:natural('off')}),plain);
 for(const level of ['subtle','pronounced']){
  const options={...request,natural_variation:natural(level)},one=E.compose(records,options),again=E.compose(records,options),changed=E.compose(records,{...options,natural_variation:natural(level,'another-pattern')});
  assert.deepEqual(one,again);assert.notEqual(one.svg,plain.svg);assert.notEqual(one.svg,changed.svg);
  assert.deepEqual(one.used_samples.map(s=>s.capture_id),changed.used_samples.map(s=>s.capture_id));
  assert.equal(P.generate(paths(one.svg)),P.generate(paths(again.svg)));
  const limit=level==='subtle'?.015:.03;assert(one.used_samples.every(s=>Math.abs(s.natural_scale-1)<=limit));
  assert(one.used_samples.slice(1).every((s,i)=>Math.abs(s.natural_scale-one.used_samples[i].natural_scale)<limit*.51));
 }
 assert.equal(JSON.stringify(records),before);
});
test('word gaps vary within their selected amount and respect the user word-spacing setting',()=>{
 const records=files(),source=E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='a');
 for(const [level,limit] of [['subtle',.05],['pronounced',.10]]){
  const r=E.compose(records,{...request,phrase:Array(10).fill('a').join(' '),height:3,samples:'latest_only',word_spacing:1.4,smooth:false,natural_variation:natural(level)}),starts=paths(r.svg).map(d=>coordinates(d)[0][0]),ratios=[];
  assert.equal(r.pages[0].lines.length,1);
  for(let i=0;i<starts.length-1;i++){const width=(source.bounds.right-source.bounds.left)*3/80*r.used_samples[i].natural_scale;ratios.push((starts[i+1]-starts[i]-width-3*.22)/(3*.7*1.4));}
  assert(ratios.every(v=>Math.abs(v-1)<=limit+.0001));assert(Math.max(...ratios)-Math.min(...ratios)>.001);
 }
});
test('all strokes of a glyph scale together around the reviewed baseline before line drift',()=>{
 const records=strokeFiles(),catalog=E.catalog(records),s=catalog.byWriter.get('Writer').find(s=>s.letter==='t');
 records.push({key:'letter_reviews/'+s.capture_id+'.json',value:{schema_version:1,capture_id:s.capture_id,reviews:{t:{included:true,baseline_shift_mm:2,scale_factor:1.5}}}});
 const adjusted=E.catalog(records).byWriter.get('Writer').find(a=>a.capture_id===s.capture_id&&a.letter==='t');
 const r=E.compose(records,{...request,phrase:'t',samples:'latest_only',smooth:false,natural_variation:natural('pronounced')}),factor=r.used_samples[0].natural_scale,line=r.pages[0].lines[0],rendered=paths(r.svg).map(coordinates);
 assert.equal(rendered.length,adjusted.processed_strokes.length);
 for(let i=0;i<rendered.length;i++)for(let j=0;j<rendered[i].length;j++){
  const [x,y]=rendered[i][j],p=adjusted.processed_strokes[i].points[j];near(x,20+p.x*5/80*factor);
  const drift=line.natural_line.slope*(x-105)+line.natural_line.bend*Math.sin(Math.PI*(x-20)/170);
  near(y-drift,line.baseline+2+p.y*5/80*factor);
 }
});
test('natural lines and letter scaling remain within every A4 margin after wrapping, alignment and page breaks',()=>{
 const records=files(),phrase=Array(35).fill('a big fox jumps quickly\nthen a lazy dog rests').join('\n'),raw=JSON.stringify(records);
 for(const alignment of ['left','centre','right'])for(const height of [3,5,8])for(const level of ['subtle','pronounced']){
  const page_layout={margin_top:37,margin_bottom:53,margin_left:42,margin_right:51,alignment},r=E.compose(records,{...request,phrase,height,page_layout,line_spacing:.5,natural_variation:natural(level,alignment+height)});
  assert(r.pages.length>1);assert.equal(r.used_samples.map(s=>s.letter).join(''),phrase.replace(/\s/g,''));
  for(const page of r.pages){
   E.validateDrawingSVG(page.svg);P.generate(paths(page.svg));
   for(const path of paths(page.svg))for(const [x,y] of coordinates(path)){assert(x>=42-.0001&&x<=159+.0001);assert(y>=37-.0001&&y<=244+.0001);}
   for(const line of page.lines){assert(Math.abs(Math.atan(line.natural_line.slope)*180/Math.PI)<=(level==='subtle'?.15:.35));assert(Math.abs(line.natural_line.bend)<=(level==='subtle'?.15:.35));}
  }
 }
 assert.equal(JSON.stringify(records),raw);
 const options={...request,phrase,natural_variation:natural('pronounced')},a=E.compose(records,options),b=E.compose(records,{...options,page_layout:{margin_left:60,margin_right:60,alignment:'right'}});
 assert.deepEqual(a.used_samples,b.used_samples);
});
test('natural settings and exact pages save without changing older composition formats; malformed options fail',()=>{
 const records=files(),settings=E.compositionSettings({...request,natural_variation:natural('pronounced')}),result=E.compose(records,settings),record=E.createComposition({id:randomUUID(),title:'Natural letter',settings,drawings:result.pages.map(p=>p.svg)});
 E.validateRecord('compositions/'+record.id+'.json',record);assert.deepEqual(record.settings.natural_variation,settings.natural_variation);assert.equal(E.compose(records,record.settings).svg,record.drawings[0]);
 const legacy=E.createComposition({id:randomUUID(),title:'Earlier letter',settings:E.compositionSettings(request),drawings:result.pages.map(p=>p.svg)});assert.equal(legacy.settings.natural_variation,undefined);E.validateRecord('compositions/'+legacy.id+'.json',legacy);
 for(const value of [null,[],{},'subtle',{level:'heavy',seed:'0'},{level:'off',seed:''},{level:'subtle',seed:4},{level:'subtle',seed:'a'.repeat(81)}]){assert.throws(()=>E.compose(records,{...request,natural_variation:value}),/natural variation/);assert.throws(()=>E.compositionSettings({...request,natural_variation:value}),/natural variation/);}
 assert.throws(()=>E.compose(records,{...request,phrase:'a\n'.repeat(600),height:8,natural_variation:natural('pronounced')}),/20 pages/);
});
