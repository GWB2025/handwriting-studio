const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto'),{JSDOM}=require('jsdom');
const E=require('../web/engine'),F=require('../web/svg-font'),{files,strokeFiles}=require('./browser_helpers');
const exportFont=records=>F.create(records,{writer:'Writer',name:'My font'});
test('font is valid SVG XML with Unicode glyphs, space, deterministic centreline paths and no mutation',()=>{
 const records=files(),before=JSON.stringify(records),result=exportFont(records),doc=new JSDOM(result.svg,{contentType:'image/svg+xml'}).window.document;
 assert.equal(doc.querySelectorAll('font').length,1);assert.equal(doc.querySelectorAll('glyph').length,27);assert.equal(doc.querySelector('font-face').getAttribute('units-per-em'),'1000');assert.equal(doc.querySelector('glyph[unicode=" "]').getAttribute('horiz-adv-x'),'350');
 assert.equal(result.glyphs.length,26);assert(result.missing.includes('A'));assert(!result.glyphs.some(g=>g.letter.length>1));assert(result.glyphs.every(g=>!/[Zz]/.test(g.d)));assert.equal(JSON.stringify(records),before);assert.equal(exportFont(records).svg,result.svg);
 const escaped=F.create(records,{writer:'Writer',name:'A "font" & <ink>'});assert.equal(new JSDOM(escaped.svg,{contentType:'image/svg+xml'}).window.document.querySelector('font-face').getAttribute('font-family'),'A "font" & <ink>');
});
test('preferred blend wins over preferred original; excluded blends fall back without crossing Writers',()=>{
 const records=files(),originals=E.catalog(records).byWriter.get('Writer').filter(s=>s.letter==='a'),b=E.createSavedBlend(records,{id:randomUUID(),writer:'Writer',letter:'a',source_ids:originals.slice(0,2).map(s=>s.capture_id),horizontal:50,vertical:50});records.push({key:'blends/'+b.id+'.json',value:b});
 assert.equal(exportFont(records).glyphs.find(g=>g.letter==='a').capture_id,originals[0].capture_id);
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'a',capture_ids:[originals[1].capture_id,b.id]}));assert.equal(exportFont(records).glyphs.find(g=>g.letter==='a').capture_id,b.id);
 records.push({key:'letter_reviews/'+b.id+'.json',value:{capture_id:b.id,reviews:{a:{included:false,baseline_shift_mm:0}}}});assert.equal(exportFont(records).glyphs.find(g=>g.letter==='a').capture_id,originals[1].capture_id);
 assert.throws(()=>F.create(records,{writer:'Unknown',name:'Font'}),/Choose a Writer/);assert.throws(()=>F.create(records,{writer:'Writer',name:'\nBad'}),/font name/);
});
test('reviewed baseline, scale, pen lifts, reversal and spacing survive font coordinate conversion',()=>{
 const records=strokeFiles(),s=E.catalog(records).byWriter.get('Writer').find(s=>s.letter==='t');records.push(E.choosePreferred(records,{writer:'Writer',letter:'t',capture_id:s.capture_id}));
 records.push({key:'letter_reviews/'+s.capture_id+'.json',value:{capture_id:s.capture_id,reviews:{t:{included:true,baseline_shift_mm:1,scale_factor:1.5,stroke_edit:{order:[1,0],reversed:[true,false]}}}}});records.push(E.characterSpacing(records,{writer:'Writer',letter:'t',before_mm:.5,after_mm:1}));
 const sample=E.catalog(records).byWriter.get('Writer').find(x=>x.capture_id===s.capture_id&&x.letter==='t'),g=exportFont(records).glyphs.find(g=>g.letter==='t'),points=sample.processed_strokes.flatMap(s=>s.points),left=Math.min(...points.map(p=>p.x));
 assert.equal((g.d.match(/M/g)||[]).length,2);sample.processed_strokes.forEach((stroke,i)=>stroke.points.forEach((p,j)=>assert.deepEqual(g.strokes[i][j],{x:(p.x-left)*6.25+100,y:-(p.y+16)*6.25})));assert.equal(g.advance,(Math.max(...points.map(p=>p.x))-left)*6.25+250);
});
test('legacy descending z stays below baseline and unreviewed suggestions are omitted',()=>{
 const records=files(),z=records.find(f=>f.value.samples.some(s=>s.letter==='z'));z.value.samples.find(s=>s.letter==='z').bounds.bottom=390;z.value.samples.find(s=>s.letter==='z').bounds.top=250;
 records.push(E.choosePreferred(records,{writer:'Writer',letter:'z',capture_id:z.value.id}));const result=exportFont(records);assert(result.glyphs.find(g=>g.letter==='z').strokes.flat().some(p=>p.y<0));assert(result.descent>0);
 const suggestion=E.clone(z);suggestion.value.id=randomUUID();suggestion.key='letters/'+suggestion.value.id+'.json';suggestion.value.schema_version=7;suggestion.value.samples=[{...suggestion.value.samples[0],letter:'&'}];records.push(suggestion);assert(exportFont(records).missing.includes('&'));
 records.push({key:'letter_reviews/'+suggestion.value.id+'.json',value:{capture_id:suggestion.value.id,reviews:{'&':{included:true,baseline_shift_mm:0}}}});const svg=exportFont(records).svg;assert(new JSDOM(svg,{contentType:'image/svg+xml'}).window.document.querySelector('glyph[unicode="&"]'));
});
test('generated My alphabet prepares a downloadable font, revokes stale links and handles errors',async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/alphabet.html','utf8'),{url:'https://example.test/alphabet.html',runScripts:'outside-only'}),w=dom.window,d=w.document;let revoked=[],snapshot=files();
 w.StudioStorage={snapshot:async()=>snapshot};w.StudioSVGFont=F;w.URL.createObjectURL=()=> 'blob:font';w.URL.revokeObjectURL=url=>revoked.push(url);
 d.getElementById('alphabet-writer').innerHTML='<option>Writer</option><option>Unknown</option>';w.eval(fs.readFileSync('web/svg-font-ui.js','utf8'));
 try{const build=d.getElementById('svg-font-build'),download=d.getElementById('svg-font-download');await build.onclick();assert.equal(download.hidden,false);assert.equal(download.download,'Writer-Single-Line-single-line.svg');assert.equal(d.querySelectorAll('#svg-font-preview svg').length,26);
 d.getElementById('alphabet-writer').value='Unknown';d.getElementById('alphabet-writer').dispatchEvent(new w.Event('change'));assert(download.hidden);assert.deepEqual(revoked,['blob:font']);await build.onclick();assert.match(d.getElementById('svg-font-status').textContent,/Choose a Writer/);assert(download.hidden);
 }finally{w.close();}
});
