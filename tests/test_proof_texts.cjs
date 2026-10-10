const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),T=require('../web/proof-texts'),P=require('../static/plotter'),{files}=require('./browser_helpers'),{extendedFiles}=require('./extended_helpers');
const text=id=>T.examples.find(e=>e.id===id).text;
test('every suggested pangram contains the entire alphabet and needs only lowercase samples',()=>{
 assert.equal(T.pangrams.length,8);assert.equal(new Set(T.examples.map(p=>p.id)).size,T.examples.length);
 for(const p of T.pangrams){assert.equal([...new Set(p.text.replace(/ /g,''))].sort().join(''),'abcdefghijklmnopqrstuvwxyz');assert.doesNotThrow(()=>E.proofSheet(files(),{writer:'Writer',sentence:p.text}));}
});
test('sonnets retain all fourteen lines, with explicit lowercase alternatives and distinct attribution',()=>{
 const original=text('sonnet-original');assert.equal(original.split('\n').length,14);assert(original.startsWith("Shall I compare thee to a summer's day?\nThou art more lovely and more temperate:"));assert(original.endsWith('So long lives this and this gives life to thee.'));
 assert.equal(text('sonnet-lowercase'),original.toLowerCase().replace(/[^a-z \n]/g,''));
 const handwriting=text('handwriting-sonnet-original');assert.equal(handwriting.split('\n').length,14);assert.equal(text('handwriting-sonnet-lowercase'),handwriting.toLowerCase().replace(/[^a-z \n]/g,''));
 for(const example of T.examples.filter(e=>e.id.startsWith('handwriting-sonnet-'))){assert.equal(example.sonnet,undefined);assert.match(example.note,/original sonnet by Codex/);}
});
test('passages preserve every character, line and preference across A4 pages at all writing sizes',()=>{
 const records=files(),originals=[...records,...extendedFiles('uppercase'),...extendedFiles('symbols')],before=JSON.stringify(originals);
 const selected=E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='a');records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_id:selected.capture_id}));
 for(const example of T.examples.filter(e=>e.passage))for(const height of [3,5,8]){
  const sentence=example.text,lowercaseOnly=/^[a-z \n]+$/.test(sentence),r=E.proofSheet(lowercaseOnly?records:originals,{writer:'Writer',kind:'numbers',sentence,height,text_only:true});
  assert.equal(r.used_samples.map(s=>s.letter).join(''),sentence.replace(/\s/g,''));
  if(lowercaseOnly)assert(r.used_samples.filter(s=>s.letter==='a').every(s=>s.capture_id===selected.capture_id));
  // Every explicit line ends at a layout line, even when a long verse wraps.
  const breaks=new Set();let count=0;for(const line of r.pages.flatMap(p=>p.lines)){count+=line.characters.length;breaks.add(count);}count=0;for(const line of sentence.split('\n')){count+=line.replace(/ /g,'').length;if(count)assert(breaks.has(count));}
  for(const page of r.pages){E.validateDrawingSVG(page.svg);const paths=[...page.svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);assert.doesNotThrow(()=>P.generate(paths));}
 }
 assert.equal(JSON.stringify(originals),before);
 const r=E.proofSheet(records,{writer:'Writer',sentence:Array(80).fill('a bad cab').join('\n'),height:8});assert(r.pages.length>1);assert.equal(r.used_samples.map(s=>s.letter).join(''),'abcdefghijklmnopqrstuvwxyz'+'abadcab'.repeat(80));
});
test('passages reject missing handwriting, blank text and excessive length without silently dropping text',()=>{
 const records=files();assert.throws(()=>E.proofSheet(records,{writer:'Writer',sentence:text('sonnet-original'),text_only:true}),/No included samples/);
 assert.throws(()=>E.proofSheet(records,{writer:'Writer',sentence:' ',text_only:true}),/Enter a passage/);
 assert.throws(()=>E.proofSheet(records,{writer:'Writer',sentence:'a'.repeat(10001),text_only:true}),/10,000/);
 assert.throws(()=>E.proofSheet(records,{writer:'Writer',sentence:'abc',source:'blends',text_only:true}),/No included saved blends/);
});
