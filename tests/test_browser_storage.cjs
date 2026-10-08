const assert=require('node:assert/strict'),test=require('node:test'),vm=require('node:vm'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb'),{webcrypto}=require('node:crypto');
const E=require('../web/engine.js'),{sheet,files}=require('./browser_helpers.js');
function browser(indexedDB=new IDBFactory()){
  const context={indexedDB,StudioEngine:E,location:{href:'https://example.github.io/handwriting-studio/'},navigator:{},crypto:webcrypto,Response,URL,DOMException,TextEncoder,structuredClone};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('web/browser-api.js','utf8'),context);return context;
}
async function call(b,url,data){const response=await b.studioFetch(url,data?{method:'POST',body:JSON.stringify(data)}:{});return {status:response.status,data:await response.json()};}
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
