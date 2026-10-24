const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const opentype=require('opentype.js'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const E=require('../static/font-engine'),S=require('../static/font-storage'),P=require('../static/plotter');
// Original synthetic shapes only: never commit a supplied commercial font.
function fixture(){
 const path=new opentype.Path();path.moveTo(-40,0);path.lineTo(450,0);path.quadraticCurveTo(650,250,450,500);path.lineTo(-40,500);path.close();
 path.moveTo(100,100);path.lineTo(100,400);path.lineTo(350,400);path.lineTo(350,100);path.close();
 const glyphs=[new opentype.Glyph({name:'.notdef',advanceWidth:600,path:new opentype.Path()})];
 for(const c of ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.')glyphs.push(new opentype.Glyph({name:c,unicode:c.codePointAt(0),advanceWidth:c===' '?300:620,path:c===' '?new opentype.Path():path}));
 const font=new opentype.Font({familyName:'Synthetic test',styleName:'Regular',unitsPerEm:1000,ascender:800,descender:-200,glyphs});font.numGlyphs=glyphs.length;font.kerningPairs={};glyphs.forEach((g,i)=>g.index=i);return font;
}
test('quadratic and cubic contours stay closed, separate and accurately flattened',()=>{
 const paths=E.contours([{type:'M',x:0,y:0},{type:'Q',x1:5,y1:10,x:10,y:0},{type:'Z'}, {type:'M',x:20,y:0},{type:'C',x1:30,y1:0,x2:10,y2:0,x:20,y:0},{type:'Z'}]);
 assert.equal(paths.length,2);for(const path of paths)assert.deepEqual(path[0],path.at(-1));
 assert(paths[0].some(p=>p[1]===5));assert(paths[1].some(p=>p[0]>22));assert(paths[1].some(p=>p[0]<18));
 assert.throws(()=>E.contours([{type:'M',x:NaN,y:0}]),/Invalid/);
});
test('font layouts keep counters, overhangs and every page within A4 plotting bounds',()=>{
 const font=fixture();
 for(const size of [3,5,8,12,20]){
  const drawing=E.compose(font,'abc '.repeat(80),size);assert(drawing.pages.length>=1);
  let paths=0;
  for(const svg of drawing.pages){
   assert(!svg.includes('<text'));assert(!svg.includes('<script'));assert(!svg.includes('font-face'));
   const ds=[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);paths+=ds.length;
   const code=P.generate(ds);assert.match(code,/G21/);assert.match(code,/Y-/);
   for(const d of ds){const points=P.flatten(d);assert.deepEqual(points[0],points.at(-1));}
  }
  assert.equal(paths,80*3*2,'both contours of each letter are retained');
 }
 assert(E.compose(font,'a\n'.repeat(50),20).pages.length>1);
 assert.equal(E.compose(font,'abc',5).pages[0],E.compose(font,'abc',5).pages[0]);
});
test('unsupported fonts, glyphs, empty text and oversized requests fail explicitly',()=>{
 assert.throws(()=>E.parse(new ArrayBuffer(2),opentype),/TrueType/);
 assert.throws(()=>E.parse(new ArrayBuffer(20),opentype),/TrueType/);
 const header=new ArrayBuffer(20);new DataView(header).setUint32(0,0x10000);
 assert.throws(()=>E.parse(header,opentype),/could not be read/);
 assert.equal(E.parse(header,{parse:fixture}).name,'Synthetic test Regular');
 for(const value of ['', '  ', 'a'.repeat(1001)])assert.throws(()=>E.compose(fixture(),value));
 assert.throws(()=>E.compose(fixture(),'a♥'),/no character for: ♥/);
 assert.throws(()=>E.compose(fixture(),'a',21),/writing size/);
});
test('font storage persists separately and aborts the entire batch on a conflict or capacity failure',async()=>{
 const db=new IDBFactory(),store=S.create(db),buffer=new ArrayBuffer(20);
 await store.add([{id:'first',buffer}]);assert.equal((await S.create(db).list()).length,1);
 await assert.rejects(store.add([{id:'second',buffer},{id:'first',buffer}]));
 assert.deepEqual((await store.list()).map(r=>r.id),['first']);
 await assert.rejects(store.add(Array.from({length:20},(_,i)=>({id:String(i),buffer}))),/full/);
 assert.equal((await store.list()).length,1);
 assert.deepEqual((await db.databases()).map(d=>d.name),['handwriting-studio-fonts']);
});
test('Fonts UI loads local fonts and invalidates downloads after text or font changes',async()=>{
 const dom=new JSDOM(fs.readFileSync('static/fonts.html','utf8'),{url:'http://localhost/fonts',runScripts:'outside-only'}),w=dom.window;
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 w.opentype={parse:fixture};w.StudioFontStorage={list:async()=>[]};
 const buffer=new w.ArrayBuffer(20);new w.DataView(buffer).setUint32(0,0x10000);
 w.fetch=async url=>({ok:true,json:async()=>({fonts:[{name:'one.ttf',size:20,url:'/api/fonts/one.ttf'},{name:'two.ttf',size:20,url:'/api/fonts/two.ttf'}]}),arrayBuffer:async()=>buffer});
 w.eval(fs.readFileSync('static/font-engine.js','utf8'));w.eval(fs.readFileSync('static/fonts.js','utf8'));
 await new Promise(r=>setTimeout(r,20));const $=id=>w.document.getElementById(id);
 assert.equal($('font-choice').options.length,2);assert.equal($('font-generate').disabled,false);assert.equal($('font-svg').disabled,true);
 const submit=()=> $('font-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 submit();assert.equal($('font-svg').disabled,false);assert.equal($('font-gcode').disabled,false);assert.match($('font-status').textContent,/ready/);
 $('font-phrase').value='abc';$('font-phrase').dispatchEvent(new w.Event('input'));assert.equal($('font-svg').disabled,true);assert.equal($('font-image').hidden,true);
 submit();assert.equal($('font-svg').disabled,false);
 $('font-choice').value='mac:two.ttf';$('font-choice').dispatchEvent(new w.Event('change'));assert.equal($('font-svg').disabled,true);
 $('font-phrase').value='♥';submit();assert.equal($('font-svg').disabled,true);assert.match($('font-status').textContent,/no character/);
 dom.window.close();
});
test('public Fonts page uses private browser imports and never the Mac catalog',()=>{
 const html=fs.readFileSync('docs/fonts.html','utf8');assert(!html.includes('/api/fonts'));assert(!html.includes('QERuth'));assert(!html.includes('QESam'));
 assert.match(html,/assets\/font-storage.js/);assert.match(html,/assets\/opentype.min.js/);
 assert(!fs.readdirSync('docs/assets').some(name=>/\.ttf$/i.test(name)));
});
