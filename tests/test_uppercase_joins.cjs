const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),{files}=require('./browser_helpers');
function records(){const result=files(),copy=E.clone(result);for(const f of copy){f.value.id=require('node:crypto').randomUUID();f.key='letters/'+f.value.id+'.json';f.value.order=f.value.order.toUpperCase();for(const sample of f.value.samples)sample.letter=sample.letter.toUpperCase();}return result.concat(copy);}
test('uppercase join choices affect only the selected Writer and uppercase-to-lowercase boundary',()=>{
 const source=records(),base={writer:'Writer',phrase:'Ab ab Ac',height:5,auto_join_preview:true,page_layout:{}},all=E.compose(source,base),revision=E.catalog(source).writers[0].revision;
 const preference=E.setUppercaseJoins(source,{writer:'Writer',letters:'B'}),restricted=[...source,preference];E.validateRecord(preference.key,preference.value);
 const limited=E.compose(restricted,base);assert.equal(all.pages[0].generated_joins-limited.pages[0].generated_joins,2);assert.equal(limited.pages[0].generated_joins,1);assert.deepEqual(all.used_samples,limited.used_samples);assert.notEqual(E.catalog(restricted).writers[0].revision,revision);
 const restored=[...source,E.setUppercaseJoins(restricted,{writer:'Writer',letters:'AB'})];assert.equal(E.compose(restored,base).svg,all.svg);
 assert.equal(E.compose(source,{...base,auto_join_preview:false}).svg,E.compose(restricted,{...base,auto_join_preview:false}).svg);
 const proof=E.proofSheet(restricted,{writer:'Writer',text_only:true,sentence:'Ab ab Ac',height:5,auto_join_preview:true});assert.equal(proof.pages[0].generated_joins,1);
 const other=source.map(f=>({key:f.key,value:{...f.value,writer:'Other'}}));assert.equal(E.compose([...restricted,...other],{...base,writer:'Other'}).pages[0].generated_joins,3);
});
test('uppercase join preferences round trip and survive preferred sample changes',()=>{
 const source=files(),pref=E.setUppercaseJoins(source,{writer:'Writer',letters:''});E.validateRecord(pref.key,JSON.parse(JSON.stringify(pref.value)));assert.equal(E.catalog([...source,pref]).writers[0].uppercase_joins,'');
 const sample=E.catalog(source).byWriter.get('Writer')[0],changed=E.choosePreferred([...source,pref],{writer:'Writer',letter:sample.letter,capture_id:sample.capture_id});assert.equal(changed.value.uppercase_joins,'');E.validateRecord(changed.key,changed.value);
 for(const letters of ['AA','a','A!',null])assert.throws(()=>E.setUppercaseJoins(source,{writer:'Writer',letters}),/uppercase/);
 assert.throws(()=>E.validateRecord(pref.key,{...pref.value,uppercase_joins:'a'}),/uppercase/);
});
