const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{IDBFactory}=require('fake-indexeddb'),{webcrypto}=require('node:crypto'),E=require('../web/engine'),{files,sheet}=require('./browser_helpers');
const source=name=>fs.readFileSync((process.env.STUDIO_PAGES_TEST?'docs/assets/':'web/')+name,'utf8');
const clone=v=>JSON.parse(JSON.stringify(v)),settle=()=>new Promise(resolve=>setImmediate(resolve));
function events(target={}){const handlers={};target.addEventListener=(n,fn)=>(handlers[n]??=[]).push(fn);target.emit=(n,e={})=>(handlers[n]||[]).forEach(fn=>fn(e));return target;}
function context(db=new IDBFactory()){
 const c={indexedDB:db,StudioEngine:E,crypto:webcrypto,TextEncoder,structuredClone,console,setTimeout,clearTimeout,Date,Response,URL,DOMException,location:{href:'https://example.github.io/handwriting-studio/'},navigator:{}};events(c);c.window=c;vm.createContext(c);vm.runInContext(source('recovery-store.js'),c);return c;
}
function element(){return events({value:'',textContent:'',hidden:false,disabled:false,children:[],classList:{classes:new Set(),toggle(name,on){on?this.classes.add(name):this.classes.delete(name);}},append(child){this.children.push(child);if(!this.value)this.value=child.value;},replaceChildren(){this.children=[];this.value='';},showModal(){this.open=true;},close(){this.open=false;}});}
const writing=()=>({writer:'Writer',strokes:sheet().strokes.slice(0,1),undone:[],smooth:true});
function ui(c,ids){const elements=Object.fromEntries(ids.map(id=>[id,element()]));c.document=events({hidden:false,getElementById:id=>elements[id],createElement:element});c.confirm=()=>true;return elements;}
async function recovery(c=context(),initial=null){
 const els=ui(c,['recovery-dialog','draft-status','recovery-open','recovery-list','recovery-detail','recovery-status','recovery-restore','recovery-discard','recovery-later']);let value=initial,fail=false;
 vm.runInContext(source('recovery.js'),c);const api=c.StudioRecovery.init({kind:'notebook',read:()=>value,restore:async p=>{if(fail)throw Error('Cannot restore');value=p;}});await api.ready;
 return {c,els,api,get value(){return value;},set value(v){value=v;},set fail(v){fail=v;}};
}
test('recovery records persist separately from library backups and accept incomplete sheets and redo history',async()=>{
 const db=new IDBFactory(),c=context(db),S=c.StudioRecoveryStore,p=writing(),capture={...p,phase:'capture',plan_id:E.plan.id,sheet:2,orders:E.shuffleSet(E.plan.orders,0,()=>.2),request_id:webcrypto.randomUUID()};
 const record=await S.put('capture',capture);assert.equal(record.payload.strokes.length,1);
 const next=context(db);assert.deepEqual(clone(await next.StudioRecoveryStore.list('capture')),[clone(record)]);
 vm.runInContext(fs.readFileSync('web/browser-api.js','utf8'),next);assert.equal((await next.StudioStorage.backup()).files.length,0);
 const redo={...p,undone:p.strokes,strokes:[]};await S.put('notebook',redo);assert.deepEqual(clone((await S.list('notebook'))[0].payload),redo);
 await assert.rejects(S.put('capture',{...capture,orders:['wrong']}),/shuffled/);
 await assert.rejects(S.put('notebook',{...p,strokes:[{pointerType:'pen',points:[{x:Infinity,y:0,t:0}]}]}),/point/);
});
test('separate tabs, stale writes and conditional removals cannot overwrite newer recovery copies',async()=>{
 const db=new IDBFactory(),a=context(db).StudioRecoveryStore,b=context(db).StudioRecoveryStore,original=await a.put('notebook',writing()),second=await b.put('notebook',{...writing(),writer:'Other tab'});
 const newer=await a.put('notebook',{...writing(),writer:'Newer work'},original),stale=await b.put('notebook',{...writing(),writer:'Stale tab work'},original);
 assert.notEqual(stale.id,original.id);assert.equal(await b.remove(original),false);assert.equal((await a.list('notebook')).length,3);
 assert.equal(await a.remove(newer),true);const resumed=await a.put('notebook',{...writing(),writer:'Resumed tab'},newer);assert.notEqual(resumed.id,newer.id);assert((await a.list('notebook')).some(r=>r.id===second.id));
});
test('startup offers restore/discard without changing the editor, and restore keeps a separate working copy',async()=>{
 const c=context(),old=await c.StudioRecoveryStore.put('notebook',writing()),w=await recovery(c);
 assert.equal(w.els['recovery-dialog'].open,true);assert.equal(w.value,null);await w.els['recovery-restore'].onclick();
 assert.deepEqual(clone(w.value),writing());const records=await c.StudioRecoveryStore.list('notebook');assert.equal(records.length,1);assert.notEqual(records[0].id,old.id);assert.equal(w.els['recovery-dialog'].open,false);
 w.value=null;await w.api.flush();assert.equal((await c.StudioRecoveryStore.list('notebook')).length,0);
});
test('restoring preserves current unfinished work and leaves a concurrently changed candidate intact',async()=>{
 const c=context(),S=c.StudioRecoveryStore,old=await S.put('notebook',writing()),w=await recovery(c);w.value={...writing(),writer:'Current editor'};
 const newer=await S.put('notebook',{...writing(),writer:'Other tab update'},old);await w.els['recovery-restore'].onclick();
 const records=await S.list('notebook');assert.equal(records.length,3);assert(records.some(r=>r.id===newer.id));assert(records.some(r=>r.payload.writer==='Current editor'));assert.equal(w.value.writer,'Writer');
});
test('failed recovery writes and failed restores retain the earlier copy and show an honest status',async()=>{
 const c=context(),S=c.StudioRecoveryStore;await S.put('notebook',writing());const w=await recovery(c);w.fail=true;await w.els['recovery-restore'].onclick();assert.equal((await S.list('notebook')).length,1);assert.match(w.els['recovery-status'].textContent,/Cannot restore/);
 const put=S.put;S.put=async()=>{throw Error('Storage full');};w.value=writing();await w.api.flush();assert.match(w.els['draft-status'].textContent,/not saved.*Storage full/);assert.equal((await S.list('notebook')).length,1);S.put=put;
});
test('discard requires a deliberate choice and refuses to delete a newer draft',async()=>{
 const c=context(),S=c.StudioRecoveryStore,old=await S.put('notebook',writing()),w=await recovery(c);c.confirm=()=>false;await w.els['recovery-discard'].onclick();assert.equal((await S.list('notebook')).length,1);
 c.confirm=()=>true;await S.put('notebook',{...writing(),writer:'Newer'},old);await w.els['recovery-discard'].onclick();assert.equal((await S.list('notebook')).length,1);assert.match(w.els['recovery-status'].textContent,/changed in another tab/);
 await w.els['recovery-discard'].onclick();assert.equal((await S.list('notebook')).length,0);
});
test('queued edits and a subsequent explicit save finish without resurrecting an old draft',async()=>{
 const w=await recovery();await w.api.flush();const S=w.c.StudioRecoveryStore,put=S.put;let release;const gate=new Promise(resolve=>release=resolve);S.put=async(...args)=>{await gate;return put(...args);};
 w.value=writing();const one=w.api.flush();w.value={...writing(),writer:'Second edit'};const two=w.api.flush();w.value=null;const clear=w.api.flush();release();await Promise.all([one,two,clear]);assert.equal((await S.list('notebook')).length,0);
});
test('backup manifests detect edits without count changes, remain stable across key order, and exclude recovery data',async()=>{
 const c=context(),S=c.StudioRecoveryStore,records=files(),manifest=await S.manifest(records),copy=clone(records);copy[0].value.display_smoothing=false;
 assert.equal(S.changed(await S.manifest(copy),manifest),1);assert.equal(S.changed(await S.manifest(records.slice().reverse()),manifest),0);await S.put('notebook',writing());await S.confirmBackup(manifest);
 const next=context(c.indexedDB);assert.deepEqual(clone((await next.StudioRecoveryStore.receipt()).manifest),clone(manifest));assert.equal(S.changed(await S.manifest(records),manifest),0);assert.equal((await next.StudioRecoveryStore.list('notebook')).length,1);
});
async function backupUI(){
 const c=context(),els=ui(c,['backup-dialog','backup-status','backup-file','backup-open','backup-close','backup-download','backup-confirm','backup-history','backup-reminder','backup-import']);let records=files(),clicked=0,failClick=false;
 c.StudioStorage={snapshot:async()=>clone(records),backup:async()=>({format:'handwriting-studio-backup',version:1,files:clone(records)}),importBackup:async()=>0};
 c.document.body={append(){}};c.document.createElement=()=>({click(){if(failClick)throw Error('Download blocked');clicked++;},remove(){}});c.URL={createObjectURL:()=>'/blob',revokeObjectURL(){}};c.Blob=Blob;
 // Download cleanup timers should not keep a test process alive for a minute.
 c.setTimeout=(fn,delay)=>{const id=setTimeout(fn,delay);id.unref();return id;};vm.runInContext(source('backup.js'),c);
 return {c,els,get records(){return records;},get clicked(){return clicked;},set failClick(v){failClick=v;}};
}
test('requesting or failing a backup download never clears the reminder without confirmation',async()=>{
 const w=await backupUI(),e=w.els;await e['backup-download'].onclick();assert.equal(w.clicked,1);assert.equal(await w.c.StudioRecoveryStore.receipt(),null);assert.equal(e['backup-confirm'].hidden,false);assert.match(e['backup-status'].textContent,/request alone does not clear/);
 w.failClick=true;await e['backup-download'].onclick();assert.equal(e['backup-confirm'].hidden,true);assert.equal(await w.c.StudioRecoveryStore.receipt(),null);assert.match(e['backup-status'].textContent,/Download blocked/);
});
test('confirming a downloaded snapshot still reminds about changes made after that download',async()=>{
 const w=await backupUI(),e=w.els;await e['backup-download'].onclick();w.records[0].value.display_smoothing=false;await e['backup-confirm'].onclick();assert.match(e['backup-reminder'].textContent,/1 saved item has changed/);assert(e['backup-open'].classList.classes.has('backup-due'));
 await e['backup-download'].onclick();await e['backup-confirm'].onclick();assert.match(e['backup-reminder'].textContent,/All saved work matches/);assert.equal(e['backup-open'].classList.classes.has('backup-due'),false);
});

test('restore waits for an operation in progress rather than replacing its editor',async()=>{
 const c=context(),S=c.StudioRecoveryStore;await S.put('notebook',writing());const w=await recovery(c);w.value=undefined;await w.els['recovery-restore'].onclick();assert.equal(w.value,undefined);assert.match(w.els['recovery-status'].textContent,/Wait for the current operation/);assert.equal((await S.list('notebook')).length,1);
});
