const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),C=require('../web/proof-comparison'),P=require('../static/plotter'),{files}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
const starts=svg=>paths(svg).map(d=>P.flatten(d)[0]);
const close=(a,b)=>assert(Math.abs(a-b)<.0002,`${a} differs from ${b}`);
function upsert(records,file){const i=records.findIndex(f=>f.key===file.key);if(i<0)records.push(file);else records[i]=file;}
test('character side spacing changes layout proportionally without changing captured or blended geometry',()=>{
 const records=files(),before=JSON.stringify(records),base={writer:'Writer',phrase:'aba',smooth:false,joined:false},normal=E.compose(records,base),a=starts(normal.svg),revision=E.catalog(records).writers[0].revision;
 upsert(records,E.characterSpacing(records,{writer:'Writer',letter:'a',before_mm:.4,after_mm:1.2}));
 const adjusted=E.compose(records,base),b=starts(adjusted.svg);[.4,1.6,2].forEach((shift,i)=>close(b[i][0]-a[i][0],shift));assert.deepEqual(b.map(p=>p[1]),a.map(p=>p[1]));
 assert.notEqual(E.catalog(records).writers[0].revision,revision);assert.equal(JSON.stringify(records.filter(f=>f.key.startsWith('letters/'))),before);
 for(const height of [3,8]){const plain=starts(E.compose(files(),{...base,height}).svg),scaled=starts(E.compose(records,{...base,height}).svg);[.4,1.6,2].forEach((shift,i)=>close(scaled[i][0]-plain[i][0],shift*height/5));P.generate(paths(E.compose(records,{...base,height}).svg));}
 upsert(records,E.characterSpacing(records,{writer:'Writer',letter:'a',before_mm:0,after_mm:0}));assert.equal(E.compose(records,base).svg,normal.svg);
 for(const value of [-2.1,3.1,NaN,'1'])assert.throws(()=>E.characterSpacing(records,{writer:'Writer',letter:'a',before_mm:value,after_mm:0}));
});
test('tight spacing preserves left-to-right order and word wrapping stays inside A4',()=>{
 const records=files();for(const letter of ['a','b'])upsert(records,E.characterSpacing(records,{writer:'Writer',letter,before_mm:-2,after_mm:-2}));
 const result=E.compose(records,{writer:'Writer',phrase:'abababab',joined:false,smooth:false}),points=starts(result.svg);for(let i=1;i<points.length;i++)assert(points[i][0]>points[i-1][0]);P.generate(paths(result.svg));
 for(const letter of ['a','b'])upsert(records,E.characterSpacing(records,{writer:'Writer',letter,before_mm:3,after_mm:3}));
 const wrapped=E.compose(records,{writer:'Writer',phrase:Array(7).fill('abab').join(' '),height:8,joined:false});P.generate(paths(wrapped.svg));assert(new Set(starts(wrapped.svg).map(p=>p[1])).size>1);
});
test('spacing word previews are non-destructive and obey pending settings',()=>{
 const records=files(),before=JSON.stringify(records),request={writer:'Writer',letter:'a',text:'cat',before_mm:1,after_mm:1};
 assert.notEqual(E.spacingPreview(records,request).svg,E.spacingPreview(records,{...request,before_mm:0,after_mm:0}).svg);assert.equal(JSON.stringify(records),before);
});
test('comparison separates originals, blends and preferred choices at physical sizes, with plotted labels',()=>{
 const records=files(),sources=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a').slice(0,2),blend=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'a',source_ids:sources.map(s=>s.capture_id),horizontal:40,vertical:50});records.push({key:'blends/'+blend.id+'.json',value:blend});
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[sources[1].capture_id,blend.id]}));const before=JSON.stringify(records),result=C.comparisonProof(records,{writer:'Writer',text:'aa'});
 assert.deepEqual(result.heights,[3,5,8]);assert.equal(result.rows.length,3);assert.equal(result.missing.length,0);
 for(const row of result.rows){assert(row.columns[0].used_samples.every(s=>s.capture_id===sources[0].capture_id));assert(row.columns[1].used_samples.every(s=>s.capture_id===blend.id));assert.deepEqual(row.columns[2].used_samples.map(s=>s.capture_id),[sources[1].capture_id,blend.id]);}
 assert(!result.svg.includes('<text'));assert(paths(result.svg).length>18);E.validateDrawingSVG(result.svg);P.generate(paths(result.svg));assert.equal(JSON.stringify(records),before);
 const missing=C.comparisonProof(files(),{writer:'Writer',text:'f i j l t z\nfizz\njilt'});assert.equal(missing.missing.length,12);assert(missing.rows.every(r=>r.columns[1].used_samples.length===0&&r.columns[2].used_samples.length===0));P.generate(paths(missing.svg));
 assert.throws(()=>C.comparisonProof(records,{writer:'Writer',text:'a'.repeat(100)}),/shorter/);
});
test('finished compositions retain exact safe A4 geometry independently of later handwriting changes',()=>{
 const records=files(),settings=E.compositionSettings({writer:'Writer',phrase:'abc'}),svg=E.compose(records,settings).svg,record=E.createComposition({id:randomUUID(),title:'Finished page',settings,drawing:svg});
 E.validateRecord('compositions/'+record.id+'.json',record);assert.equal(record.schema_version,2);assert.equal(record.drawing,svg);
 records.push(E.characterSpacing(records,{writer:'Writer',letter:'a',before_mm:1,after_mm:2}));assert.notEqual(E.compose(records,settings).svg,record.drawing);assert.equal(P.generate(paths(record.drawing)),P.generate(paths(svg)));
 const legacy=E.createComposition({id:randomUUID(),title:'Draft',settings});assert.equal(legacy.schema_version,1);E.validateRecord('compositions/'+legacy.id+'.json',legacy);
 for(const bad of [svg.replace('</svg>','<script>alert(1)</script></svg>'),svg.replace('<path d="','<path onload="alert(1)" d="'),svg.replace(/M[\d.]+ [\d.]+/,'M0 0'),svg.replace('viewBox="0 0 210 297"','viewBox="0 0 10 10"'),svg.replace(/M[\d.]+ [\d.]+/,'MNaN 20')])assert.throws(()=>E.validateDrawingSVG(bad));
});
