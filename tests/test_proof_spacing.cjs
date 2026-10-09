const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),P=require('../static/plotter'),{files}=require('./browser_helpers'),{extendedFiles}=require('./extended_helpers'),{randomUUID}=require('node:crypto');
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
const starts=svg=>paths(svg).map(d=>P.flatten(d)[0]);
test('proof sheet uses preferred samples, lists gaps and exports within A4 margins',()=>{
 const records=files(),orig=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a'),blend=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'a',source_ids:orig.slice(0,2).map(s=>s.capture_id),horizontal:40,vertical:50});records.push({key:'blends/'+blend.id+'.json',value:blend});records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:blend.id}));
 const before=JSON.stringify(records);
 for(const height of [3,5,8]){const r=E.proofSheet(records,{writer:'Writer',height,sentence:'a bad cab'});assert.equal(r.characters.length,26);assert.equal(r.missing.length,0);assert(r.used_samples.filter(s=>s.letter==='a').every(s=>s.capture_id===blend.id));assert.doesNotThrow(()=>P.generate(paths(r.svg)));}
 const only=E.proofSheet(records,{writer:'Writer',source:'blends',sentence:'aaa'});assert.deepEqual(only.characters,['a']);assert.equal(only.missing.length,25);assert.throws(()=>E.proofSheet(records,{writer:'Writer',source:'blends',sentence:'abc'}),/No included saved blends/);assert.equal(JSON.stringify(records),before);
 assert(E.proofSheet(records,{writer:'Writer',source:'originals'}).used_samples.every(s=>s.capture_id!==blend.id));
 for(const kind of ['uppercase','numbers','symbols','pairs']){const r=E.proofSheet(extendedFiles(kind),{writer:'Writer',kind});assert.equal(r.characters.length,E.tokens(E.plans[kind].alphabet).length);assert.equal(r.used_samples.length,r.characters.length);assert.doesNotThrow(()=>P.generate(paths(r.svg)));}
});
test('spacing changes character, word and line distances without mutating shapes or exceeding margins',()=>{
 const records=files(),raw=JSON.stringify(records),base={writer:'Writer',phrase:'aa aa\naa',smooth:false},normal=E.compose(records,base),a=starts(normal.svg);
 assert.equal(E.compose(records,{...base,letter_spacing:1,word_spacing:1,line_spacing:1}).svg,normal.svg);
 const letter=starts(E.compose(records,{...base,letter_spacing:1.5}).svg);assert(letter[1][0]-letter[0][0]>a[1][0]-a[0][0]);
 const word=starts(E.compose(records,{...base,word_spacing:2}).svg);assert(word[2][0]>a[2][0]);assert.equal(word[1][0],a[1][0]);
 const line=starts(E.compose(records,{...base,line_spacing:2}).svg);assert(line[4][1]>a[4][1]);assert.equal(line[0][1],a[0][1]);
 for(const value of [.5,2]){const r=E.compose(records,{writer:'Writer',phrase:Array(8).fill('abcde').join(' '),height:8,letter_spacing:value,word_spacing:value,line_spacing:value});assert.doesNotThrow(()=>P.generate(paths(r.svg)));}
 for(const name of ['letter_spacing','word_spacing','line_spacing'])for(const bad of [0,2.1,NaN,'1'])assert.throws(()=>E.compose(records,{...base,[name]:bad}),/Spacing/);
 assert.throws(()=>E.compose(records,{writer:'Writer',phrase:Array(100).fill('abcde').join(' '),height:8,line_spacing:2}),/does not fit/);assert.equal(JSON.stringify(records),raw);
});
test('saved recipes reject excluded sources and invalid source shifts',()=>{
 const records=files(),sources=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a').slice(0,2),data={id:randomUUID(),writer:'Writer',letter:'a',source_ids:sources.map(s=>s.capture_id),source_shifts:[1,2],horizontal:20,vertical:50},blend=E.createSavedBlend(records,data);records.push({key:'blends/'+blend.id+'.json',value:blend});
 E.validateBlendReferences(records);assert.deepEqual(E.savedBlendRecipe(records,blend.id).source_shifts,[1,2]);
 for(const shifts of [[1],[1,11],[1,'2']])assert.throws(()=>E.createSavedBlend(records,{...data,source_shifts:shifts}),/baseline adjustments/);
 records.push({key:'letter_reviews/'+sources[0].capture_id+'.json',value:{capture_id:sources[0].capture_id,reviews:{a:{included:false,baseline_shift_mm:0}}}});assert.throws(()=>E.savedBlendRecipe(records,blend.id),/unavailable or excluded/);
});
