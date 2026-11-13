const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),O=require('opentype.js'),{JSDOM}=require('jsdom');
const F=require('../web/otf-font'),S=require('../web/svg-font'),{files}=require('./browser_helpers');
test('installable OpenType round trip preserves Unicode, preferred selection, baseline and spacing without changing captures',()=>{
 const records=files(),before=JSON.stringify(records),options={writer:'Writer',name:'Test Handwriting',cursive:false},result=F.create(records,options),source=S.create(records,options),parsed=O.parse(result.buffer);
 assert.equal(parsed.names.windows.fontFamily.en,'Test Handwriting');assert.equal(parsed.unitsPerEm,1000);assert.equal(parsed.glyphs.length,28);assert.equal(parsed.charToGlyph(' ').advanceWidth,350);
 for(const g of source.glyphs){const exported=parsed.charToGlyph(g.letter);assert.equal(exported.unicode,g.letter.codePointAt(0));assert.equal(exported.advanceWidth,Math.round(g.advance));assert(exported.path.commands.some(c=>c.type==='Z'));assert.equal(result.glyphs.find(x=>x.letter===g.letter).capture_id,g.capture_id);}
 assert(result.missing.includes('A'));assert.equal(parsed.charToGlyphIndex('A'),0);assert.equal(JSON.stringify(records),before);
});
test('round outlines preserve isolated dots, pen lifts and closed-loop holes',()=>{
 const dot=F.outline([[{x:50,y:-200}]],20).getBoundingBox();assert(Math.abs(dot.x1-40)<.1);assert(Math.abs(dot.y1+210)<.1);
 const path=F.outline([[{x:0,y:0},{x:100,y:0}],[{x:200,y:0},{x:300,y:0}]],20);assert.equal(path.commands.filter(c=>c.type==='M').length,2);
 const ring=F.outline([[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100},{x:0,y:0}]],10);assert.equal(ring.commands.filter(c=>c.type==='M').length,2);
 assert.throws(()=>F.create(files(),{writer:'Writer',name:'Font',thickness:NaN}),/thickness/);
});
test('crossing and retraced strokes merge into one ink outline',()=>{
 const p=F.outline([[{x:0,y:0},{x:100,y:0},{x:0,y:0}],[{x:50,y:-50},{x:50,y:50}]],20);assert.equal(p.commands.filter(c=>c.type==='M').length,1);
});
test('Word export controls render filled previews and invalidate downloads on thickness or Writer changes',async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/alphabet.html','utf8'),{runScripts:'outside-only'}),w=dom.window,d=w.document;w.StudioStorage={snapshot:async()=>files()};w.StudioOTFFont=F;let revokes=0;w.URL.createObjectURL=()=> 'blob:otf';w.URL.revokeObjectURL=()=>revokes++;
 d.getElementById('alphabet-writer').innerHTML='<option>Writer</option><option>Unknown</option>';w.eval(fs.readFileSync('web/otf-font-ui.js','utf8'));
 try{const build=d.getElementById('otf-font-build'),download=d.getElementById('otf-font-download');await build.onclick();assert(!download.hidden);assert.equal(download.download,'Writer-Handwriting.otf');assert.equal(d.querySelectorAll('#otf-font-preview svg').length,26);assert.equal(d.querySelector('#otf-font-preview path').getAttribute('fill'),'#203832');d.getElementById('otf-font-thickness').dispatchEvent(new w.Event('change'));assert(download.hidden);assert.equal(revokes,1);d.getElementById('alphabet-writer').value='Unknown';await build.onclick();assert(download.hidden);assert.match(d.getElementById('otf-font-status').textContent,/Choose a Writer/);}finally{w.close();}
});
test('shipped browser libraries generate a readable font without a server',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
 try{w.StudioSVGFont=S;w.StudioEngine=require('../web/engine');for(const file of ['opentype.min.js','clipper.js','otf-font.js'])w.eval(fs.readFileSync('docs/assets/'+file,'utf8'));const result=w.StudioOTFFont.create(files(),{writer:'Writer',name:'Browser Font'});assert.equal(O.parse(result.buffer).names.windows.fontFamily.en,'Browser Font');}finally{w.close();}
});
test('contextual cursive alternates retain base outlines and advances and exclude punctuation',()=>{
 const options={writer:'Writer',name:'Cursive'},plain=F.create(files(),{...options,cursive:false}),joined=F.create(files(),options),parsed=O.parse(joined.buffer);
 assert(joined.joins.length>0);assert.equal(parsed.tables.gsub.features[0].tag,'calt');
 for(let i=0;i<plain.font.glyphs.length;i++)assert.deepEqual(joined.font.glyphs.get(i).path.commands,plain.font.glyphs.get(i).path.commands);
 for(const j of joined.joins){assert.match(j.left,/^[A-Za-z]$/);assert.match(j.right,/^[a-z]$/);assert.equal(joined.font.glyphs.get(j.index).advanceWidth,plain.font.charToGlyph(j.left).advanceWidth);}
 assert.equal(plain.joins.length,0);
});
