const assert=require('node:assert/strict'),test=require('node:test'),vm=require('node:vm'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb'),{webcrypto}=require('node:crypto');
const E=require('../web/engine.js'),{sheet,files}=require('./browser_helpers.js');
function browser(indexedDB=new IDBFactory()){
  const context={indexedDB,StudioEngine:E,location:{href:'https://example.github.io/handwriting-studio/'},navigator:{},crypto:webcrypto,Response,URL,DOMException,TextEncoder,structuredClone};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('web/browser-api.js','utf8'),context);return context;
}
async function call(b,url,data){const response=await b.studioFetch(url,data?{method:'POST',body:JSON.stringify(data)}:{});return {status:response.status,data:await response.json()};}

test('natural variation and every finished page round-trip in backups and reject saves from an older form',async()=>{
 const b=browser();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:files()});
 const settings=E.compositionSettings({writer:'Writer',phrase:Array(70).fill('a bad cab').join('\n'),page_layout:{},natural_variation:{level:'pronounced',seed:'backup-pattern'}}),result=await call(b,'/api/compose',settings),drawings=result.data.pages.map(p=>p.svg);assert(drawings.length>1);
 const id=webcrypto.randomUUID();assert.equal((await call(b,'/api/compositions',{id,title:'Natural pages',settings,drawings})).status,200);
 const backup=await b.StudioStorage.backup(),fresh=browser();await fresh.StudioStorage.importBackup(backup);const restored=(await call(fresh,'/api/compositions')).data.compositions[0];assert.deepEqual(restored.settings,settings);assert.deepEqual(restored.drawings,drawings);
 assert.deepEqual((await call(fresh,'/api/compose',restored.settings)).data.pages.map(p=>p.svg),drawings);
 const older={...settings};delete older.natural_variation;assert.equal((await call(fresh,'/api/compositions',{id,title:'Older form',settings:older,drawings})).status,400);assert.deepEqual((await call(fresh,'/api/compositions')).data.compositions[0],restored);
 const invalid=structuredClone(backup);invalid.files.find(f=>f.key.startsWith('compositions/')).value.settings.natural_variation.level='extreme';await assert.rejects(fresh.StudioStorage.importBackup(invalid));assert.deepEqual(await fresh.StudioStorage.snapshot(),backup.files);
});

test('spacing and exact drawings survive backup import; invalid geometry or draft saves preserve finished work',async()=>{
 const b=browser(),original=files();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:original});
 assert.equal((await call(b,'/api/character-spacing',{writer:'Writer',letter:'a',before_mm:.3,after_mm:.8})).status,200);
 const settings=E.compositionSettings({writer:'Writer',phrase:'abc'}),svg=(await call(b,'/api/compose',settings)).data.svg,id=webcrypto.randomUUID();
 const saved=await call(b,'/api/compositions',{id,title:'Finished',settings,drawing:svg});assert.equal(saved.status,200);assert.equal(saved.data.record.schema_version,2);
 assert.equal((await call(b,'/api/compositions',{id,title:'Draft',settings})).status,400);
 const snapshot=await b.StudioStorage.backup(),next=browser();await next.StudioStorage.importBackup(snapshot);assert.deepEqual(await next.StudioStorage.snapshot(),snapshot.files);
 const drawings=(await call(next,'/api/compositions')).data.compositions;assert.equal(drawings[0].drawing,svg);
 await call(next,'/api/character-spacing',{writer:'Writer',letter:'a',before_mm:0,after_mm:0});assert.notEqual((await call(next,'/api/compose',settings)).data.svg,svg);assert.equal((await call(next,'/api/compositions')).data.compositions[0].drawing,svg);
 const bad=E.clone(snapshot);bad.files.find(f=>f.key.startsWith('compositions/')).value.drawing=svg.replace('</svg>','<script/> </svg>');const before=await next.StudioStorage.snapshot();await assert.rejects(next.StudioStorage.importBackup(bad));assert.deepEqual(await next.StudioStorage.snapshot(),before);
 assert.deepEqual(snapshot.files.filter(f=>f.key.startsWith('letters/')).sort((a,b)=>a.key.localeCompare(b.key)),original.sort((a,b)=>a.key.localeCompare(b.key)));
});
test('committed saves survive new page context, retries do not duplicate, conflicts keep original',async()=>{
  const b=browser(),payload=sheet(),original=JSON.stringify(payload.strokes);
  assert.equal((await call(b,'/api/letters/pages',payload)).status,201);
  assert.equal((await call(b,'/api/letters/pages',payload)).status,200);
  assert.equal((await call(b,'/api/letters/pages',{...payload,writer:'Different'})).status,409);
  const reloaded=browser(b.indexedDB);assert.equal((await call(reloaded,'/api/letters/writers')).data.writers[0].counts.a,1);
  const saved=await b.StudioStorage.snapshot();assert.equal(saved.length,1);assert.equal(JSON.stringify(saved[0].value.raw_strokes),original);
});
test('backup import is atomic, repeat import is idempotent and conflicting/invalid data leaves all originals intact',async()=>{
  const b=browser(),backup={format:'handwriting-studio-backup',version:1,files:files()};
  assert.equal(await b.StudioStorage.importBackup(backup),18);assert.equal(await b.StudioStorage.importBackup(backup),0);
  const original=await b.StudioStorage.backup();assert.equal(original.files.length,18);
  const conflict=E.clone(backup);conflict.files[0].value.writer='Changed';conflict.files.push({key:'letters/'+E.capture(sheet()).id+'.json',value:{}});
  await assert.rejects(b.StudioStorage.importBackup(conflict));assert.equal((await b.StudioStorage.snapshot()).length,18);
  const conflicting=E.clone(backup);conflicting.files[0].value.writer='Changed';await assert.rejects(b.StudioStorage.importBackup(conflicting),/different content/);
  assert.deepEqual(await b.StudioStorage.snapshot(),original.files);
  const r=await call(b,'/api/letters/samples?writer=Writer&letter=a');assert.equal(r.data.samples.length,3);
  const a=r.data.samples[0],revision=(await call(b,'/api/letters/writers')).data.writers[0].revision;
  assert.equal((await call(b,'/api/letters/samples/'+a.capture_id+'/a/review',{included:false,baseline_shift_mm:1})).status,200);
  assert.notEqual((await call(b,'/api/letters/writers')).data.writers[0].revision,revision);
  const restored=browser();await restored.StudioStorage.importBackup(await b.StudioStorage.backup());assert.equal((await call(restored,'/api/letters/writers')).data.writers[0].counts.a,2);
});
test('free writing and review survive export/import, and storage failure gives a useful response',async()=>{
  const b=browser();assert.equal((await call(b,'/api/pages',sheet())).status,201);
  const pages=(await call(b,'/api/pages')).data.pages;assert.equal(pages.length,1);
  assert.equal((await call(b,'/api/pages/'+pages[0].id)).data.raw_strokes.length,5);
  const restored=browser();await restored.StudioStorage.importBackup(await b.StudioStorage.backup());assert.equal((await call(restored,'/api/pages')).data.pages.length,1);
  const broken=browser(null);const response=await call(broken,'/api/letters/pages',sheet());assert.equal(response.status,400);assert.match(response.data.error,/storage is unavailable/);
});

test('new character and joined-pair reviews survive backup and encoded punctuation routes',async()=>{
 const {extendedFiles}=require('./extended_helpers');const b=browser();
 const backup={format:'handwriting-studio-backup',version:1,files:[...extendedFiles('symbols'),...extendedFiles('uppercase'),...extendedFiles('pairs')]};
 await b.StudioStorage.importBackup(backup);
 for(const token of ['/','+','Z','th']){
  const samples=(await call(b,'/api/letters/samples?'+new URLSearchParams({writer:'Writer',letter:token}))).data.samples;
  assert.equal(samples.length,1);
  const result=await call(b,'/api/letters/samples/'+samples[0].capture_id+'/'+encodeURIComponent(token)+'/review',{included:false,baseline_shift_mm:1});assert.equal(result.status,200);
 }
 const restored=browser();await restored.StudioStorage.importBackup(await b.StudioStorage.backup());
 const profile=(await call(restored,'/api/letters/writers')).data.writers[0];for(const token of ['/','+','Z','th'])assert.equal(profile.counts[token],0);
});
test('saved single-character blends persist, retry safely, review and round-trip through backup',async()=>{
 const {files}=require('./browser_helpers');const originals=files(),b=browser();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:originals});
 const samples=E.catalog(originals).byWriter.get('Writer').filter(s=>s.letter==='a'),request={id:webcrypto.randomUUID(),writer:'Writer',letter:'a',source_ids:samples.slice(0,2).map(s=>s.capture_id),horizontal:30,vertical:50};
 const saved=await call(b,'/api/blends',request);assert.equal(saved.status,201);assert.equal((await call(b,'/api/blends',request)).status,200);
 const snapshot=await b.StudioStorage.snapshot();assert.equal(snapshot.filter(f=>f.key.startsWith('blends/')).length,1);for(const f of originals)assert.deepEqual(snapshot.find(s=>s.key===f.key).value,f.value);
 const derived=E.catalog(snapshot).byWriter.get('Writer').find(s=>s.derived);assert(derived);assert.equal(derived.letter,'a');
 assert.equal((await call(b,'/api/letters/samples/'+request.id+'/a/review',{included:false,baseline_shift_mm:0})).status,200);
 const backup=await b.StudioStorage.backup(),fresh=browser();assert.equal(await fresh.StudioStorage.importBackup(backup),backup.files.length);
 assert.equal(E.catalog(await fresh.StudioStorage.snapshot()).byWriter.get('Writer').find(s=>s.capture_id===request.id).included,false);
 const broken=structuredClone(backup);broken.files.find(f=>f.key.startsWith('blends/')).value.samples[0].processed_strokes[0].points[0].x+=1;
 await assert.rejects(browser().StudioStorage.importBackup(broken),/match its sources/);
 const incomplete=structuredClone(backup);incomplete.files=incomplete.files.filter(f=>f.key!=='letters/'+request.source_ids[0]+'.json');await assert.rejects(browser().StudioStorage.importBackup(incomplete),/missing an original source/);
});

test('four sets under separate writer names can save a cross-set blend without renaming originals',async()=>{
 const base=files()[0],records=Array.from({length:4},(_,i)=>{const r=E.clone(base);r.value.id=webcrypto.randomUUID();r.key='letters/'+r.value.id+'.json';r.value.writer='Gordon-00'+(i+1)+'-lower';return r;}),b=browser();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:records});
 const request={id:webcrypto.randomUUID(),writer:records[0].value.writer,letter:'a',source_ids:records.map(r=>r.value.id),horizontal:50,vertical:50};assert.equal((await call(b,'/api/blends',request)).status,201);
 const backup=await b.StudioStorage.backup();assert.equal(await browser().StudioStorage.importBackup(backup),5);for(const r of records)assert.deepEqual(backup.files.find(f=>f.key===r.key).value,r.value);
});
test('alphabet preferences save atomically, affect composition and survive backup without changing captures',async()=>{
 const b=browser(),originals=files();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:originals});
 const samples=E.catalog(originals).byWriter.get('Writer').filter(s=>s.letter==='a'),request={writer:'Writer',letter:'a',capture_id:samples.at(-1).capture_id};
 assert.equal((await call(b,'/api/alphabet/preferred',request)).status,200);
 assert.equal((await call(b,'/api/alphabet/preferred',{writer:'Writer',letter:'b',capture_id:E.catalog(originals).byWriter.get('Writer').find(s=>s.letter==='b').capture_id})).status,200);
 const backup=await b.StudioStorage.backup(),fresh=browser();assert.equal(backup.files.filter(f=>f.key.startsWith('alphabets/')).length,1);assert.equal(await fresh.StudioStorage.importBackup(backup),backup.files.length);
 const composed=await call(fresh,'/api/compose',{writer:'Writer',phrase:'aa',source:'originals',samples:'latest_only'});assert(composed.data.used_samples.every(s=>s.capture_id===request.capture_id));
 const state=await fresh.StudioStorage.snapshot();for(const original of originals)assert.deepEqual(state.find(f=>f.key===original.key).value,original.value);
 const bad=structuredClone(backup);bad.files.find(f=>f.key.startsWith('alphabets/')).value.choices.a=webcrypto.randomUUID();await assert.rejects(browser().StudioStorage.importBackup(bad),/missing its saved sample/);
 const invalid=await call(b,'/api/alphabet/preferred',{writer:'Writer',letter:'a',capture_id:webcrypto.randomUUID()});assert.equal(invalid.status,400);assert.equal((await call(b,'/api/letters/writers')).data.writers[0].preferred.a,request.capture_id);
 assert.equal((await call(b,'/api/alphabet/preferred',{writer:'Writer',letter:'a',capture_id:null})).status,200);assert.equal((await call(b,'/api/letters/writers')).data.writers[0].preferred.a,undefined);
});

test('size reviews, frozen blend sizes, multiple preferences and compositions round-trip in one backup',async()=>{
 const b=browser(),originals=files();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:originals});
 const sources=E.catalog(originals).byWriter.get('Writer').filter(s=>s.letter==='a').slice(0,2);
 for(const s of sources)assert.equal((await call(b,'/api/letters/samples/'+s.capture_id+'/a/review',{included:true,baseline_shift_mm:.5,scale_factor:1.4})).status,200);
 const blend=await call(b,'/api/blends',{id:webcrypto.randomUUID(),writer:'Writer',letter:'a',source_ids:sources.map(s=>s.capture_id),horizontal:50,vertical:50});assert.equal(blend.status,201);
 await call(b,'/api/alphabet/preferred',{writer:'Writer',letter:'a',capture_ids:[sources[0].capture_id,blend.data.id]});
 const composition={id:webcrypto.randomUUID(),title:'Practice page',settings:{writer:'Writer',phrase:'a cat',height:8,letter_spacing:1.25,word_spacing:.8,line_spacing:1.5,source:'both',use_preferred:true,samples:'latest_four',smooth:true,joined:false}};
 assert.equal((await call(b,'/api/compositions',composition)).status,200);const fresh=browser();await fresh.StudioStorage.importBackup(await b.StudioStorage.backup());
 assert.deepEqual((await call(fresh,'/api/compositions')).data.compositions[0].settings,composition.settings);
 const catalog=E.catalog(await fresh.StudioStorage.snapshot());assert.deepEqual(catalog.writers[0].preferred_sets.a,[sources[0].capture_id,blend.data.id]);assert.equal(catalog.byWriter.get('Writer').find(s=>s.capture_id===sources[0].capture_id&&s.letter==='a').scale_factor,1.4);
 assert.equal((await call(fresh,'/api/compose',composition.settings)).status,200);
 const state=await fresh.StudioStorage.snapshot();for(const original of originals)assert.deepEqual(state.find(f=>f.key===original.key).value,original.value);
 const bad=await fresh.StudioStorage.backup();bad.files.find(f=>f.key.startsWith('compositions/')).value.settings.letter_spacing=0;await assert.rejects(browser().StudioStorage.importBackup(bad),/composition settings/);
 const invalid=await call(fresh,'/api/compositions',{...composition,settings:{...composition.settings,height:99}});assert.equal(invalid.status,400);assert.equal((await call(fresh,'/api/compositions')).data.compositions[0].settings.height,8);
});

test('stroke repairs, frozen blend recipes and shuffled settings round-trip without altering original captures',async()=>{
 const b=browser(),original=require('./browser_helpers').strokeFiles();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:original});
 const samples=(await call(b,'/api/letters/samples?writer=Writer&letter=t')).data.samples,sourceIDs=original.map(f=>f.value.id),revision=(await call(b,'/api/letters/writers')).data.writers[0].revision;
 assert.equal(samples[0].stroke_sample.processed_strokes.length,2);
 for(const [i,id] of sourceIDs.entries()){
  const edit=i%2?{order:[1,0],reversed:[false,true]}:E.originalStrokeEdit(2),result=await call(b,'/api/letters/samples/'+id+'/t/review',{included:true,baseline_shift_mm:0,stroke_edit:edit});assert.equal(result.status,200);assert.deepEqual(result.data.stroke_edit,edit);
 }
 assert.notEqual((await call(b,'/api/letters/writers')).data.writers[0].revision,revision);
 const blend=await call(b,'/api/blends',{id:webcrypto.randomUUID(),writer:'Writer',letter:'t',source_ids:sourceIDs,horizontal:40,vertical:60});assert.equal(blend.status,201);
 const settings=E.compositionSettings({writer:'Writer',phrase:'tut tutu',sample_order:'shuffle',sample_seed:'saved-variation'}),drawing=(await call(b,'/api/compose',settings)).data.svg;
 const composition=await call(b,'/api/compositions',{id:webcrypto.randomUUID(),title:'Shuffled drawing',settings,drawing});assert.equal(composition.status,200);
 const reviewURL='/api/letters/samples/'+sourceIDs[1]+'/t/review';await call(b,reviewURL,{included:true,baseline_shift_mm:1});assert.deepEqual((await call(b,'/api/letters/samples?writer=Writer&letter=t')).data.samples.find(s=>s.capture_id===sourceIDs[1]).stroke_edit,{order:[1,0],reversed:[false,true]});
 const before=await b.StudioStorage.snapshot();assert.equal((await call(b,reviewURL,{included:true,baseline_shift_mm:0,stroke_edit:E.originalStrokeEdit(1)})).status,400);assert.deepEqual(await b.StudioStorage.snapshot(),before);
 const backup=await b.StudioStorage.backup(),next=browser();await next.StudioStorage.importBackup(backup);assert.deepEqual(await next.StudioStorage.snapshot(),backup.files);assert.equal((await call(next,'/api/compositions')).data.compositions[0].drawing,drawing);
 const importedBlend=backup.files.find(f=>f.key==='blends/'+blend.data.id+'.json');assert.equal(importedBlend.value.schema_version,6);
 const bad=E.clone(backup);bad.files.find(f=>f.key==='letter_reviews/'+sourceIDs[0]+'.json').value.reviews.t.stroke_edit=E.originalStrokeEdit(1);const blank=browser();await assert.rejects(blank.StudioStorage.importBackup(bad));assert.equal((await blank.StudioStorage.snapshot()).length,0);
 const wrong=E.clone(backup);wrong.files.find(f=>f.key===importedBlend.key).value.source_edits[0].reversed[0]=true;await assert.rejects(blank.StudioStorage.importBackup(wrong));assert.equal((await blank.StudioStorage.snapshot()).length,0);
 assert.deepEqual(backup.files.filter(f=>f.key.startsWith('letters/')).sort((a,b)=>a.key.localeCompare(b.key)),original.sort((a,b)=>a.key.localeCompare(b.key)));
});

test('multi-page compositions round-trip atomically and reject old-client or invalid-page overwrites',async()=>{
 const b=browser(),original=files();await b.StudioStorage.importBackup({format:'handwriting-studio-backup',version:1,files:original});
 const settings=E.compositionSettings({writer:'Writer',phrase:Array(90).fill('a bad cab').join('\n'),page_layout:{margin_left:35,paragraph_gap:6}}),generated=await call(b,'/api/compose',settings);assert.equal(generated.status,200);const drawings=generated.data.pages.map(p=>p.svg);assert(drawings.length>1);
 const payload={id:webcrypto.randomUUID(),title:'Full letter',settings,drawings};assert.equal((await call(b,'/api/compositions',payload)).status,200);
 const before=await b.StudioStorage.snapshot();for(const invalid of [{...payload,drawings:[]},{...payload,drawings:undefined,drawing:drawings[0]},{...payload,drawings:[drawings[0],drawings[0].replace('</svg>','<script/></svg>')]}])assert.equal((await call(b,'/api/compositions',invalid)).status,400);assert.deepEqual(await b.StudioStorage.snapshot(),before);
 const backup=await b.StudioStorage.backup(),next=browser();await next.StudioStorage.importBackup(backup);assert.deepEqual(await next.StudioStorage.snapshot(),backup.files);
 const invalid=E.clone(backup);invalid.files.find(f=>f.key.startsWith('compositions/')).value.drawings[1]=drawings[1].replace(/M[\d.]+ [\d.]+/,'M0 0');await assert.rejects(next.StudioStorage.importBackup(invalid));assert.deepEqual(await next.StudioStorage.snapshot(),backup.files);
 const shorter={...payload,settings:{...settings,phrase:'abc'},drawings:[drawings[0]]};assert.equal((await call(next,'/api/compositions',shorter)).status,200);assert.equal((await call(next,'/api/compositions')).data.compositions[0].drawings.length,1);
});
