const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),G=require('../static/symbol-guides'),{extended,extendedFiles}=require('./extended_helpers');
test('every captured symbol has context and appropriate placement against the fixed guides',()=>{
 const g=E.plan.guides;
 for(const character of E.plans.symbols.alphabet){const p=G.placement(character,g);assert(p,character);assert(p.name&&p.lines.length&&p.top<p.bottom);assert(p.top>85&&p.bottom<410);}
 for(const c of ['"',"'",'“','”','‘','’','^'])assert(G.placement(c,g).bottom<g.x_height,c+' belongs above the small-letter line');
 assert(G.placement('_',g).top>g.baseline);
 for(const c of [';',','])assert(G.placement(c,g).top<g.baseline&&G.placement(c,g).bottom>g.baseline);
 for(const c of ['{','}','(',')','[',']']){assert.equal(G.placement(c,g).top,g.ascender);assert(G.placement(c,g).bottom>g.baseline);}
 assert.equal(G.placement('.',g).bottom,g.baseline);assert.equal(G.placement('a',g),null);
});
test('old shuffled symbol captures still validate while new captures and composition include the caret',()=>{
 const legacy=E.getPlan('symbols-v3'),oldAlphabet=[...".,!?;:'\"-()[]{}@£$€%&+=/#_“”‘’–—"];
 assert.deepEqual(legacy.alphabet,oldAlphabet);assert.equal(legacy.sheets_per_set,8);
 const orders=E.shuffleSet(legacy.orders,0,()=>.4,legacy);
 for(let i=0;i<8;i++){
  const input={...extended('symbols',i),plan_id:'symbols-v3',capture_orders:orders},record=E.capture(input);
  assert.deepEqual(record.order,orders[i]);assert.deepEqual(record.raw_strokes,input.strokes);assert.doesNotThrow(()=>E.validateRecord('letters/'+record.id+'.json',record));
  const unshuffled=E.capture({...input,capture_orders:undefined});assert.deepEqual(unshuffled.order,oldAlphabet.slice(i*4,i*4+4));assert.doesNotThrow(()=>E.validateRecord('letters/'+unshuffled.id+'.json',unshuffled));
 }
 assert.throws(()=>E.validateOrders(orders,E.plans.symbols),/shuffled/);
 const records=extendedFiles('symbols'),composed=E.compose(records,{writer:'Writer',phrase:'^ _ ; " { }',height:5});assert.equal(composed.used_samples.map(s=>s.letter).join(''),'^_;"{}');
 const caret=records.find(f=>f.value.samples.some(s=>s.letter==='^'));assert.doesNotThrow(()=>E.validateRecord(caret.key,caret.value));
});
