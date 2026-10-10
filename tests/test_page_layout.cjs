const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),P=require('../static/plotter'),{files,sheet}=require('./browser_helpers'),{randomUUID}=require('node:crypto');
const paths=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} differs from ${b}`);
const base={writer:'Writer',phrase:'a bad cab\na quick brown fox',joined:false,page_layout:{}};
function checkPages(result,layout={}){
 const l=E.pageLayout(layout);assert(result.pages.length>0);
 for(const page of result.pages){E.validateDrawingSVG(page.svg);const gcode=P.generate(paths(page.svg));assert(gcode.endsWith('G90 G1 X0 Y0 F2400\n'));for(const path of paths(page.svg))for(const [x,y] of P.flatten(path)){assert(x>=l.margin_left-.001&&x<=210-l.margin_right+.001);assert(y>=l.margin_top-.001&&y<=297-l.margin_bottom+.001);}}
 assert.deepEqual(result.pages.flatMap(p=>p.used_samples),result.used_samples);
}
test('default document layout preserves existing single-page handwriting, including custom spacing',()=>{
 const records=files();records.push(E.characterSpacing(records,{writer:'Writer',letter:'a',before_mm:.3,after_mm:.8}));
 for(const height of [3,5,8])for(const smooth of [false,true]){const settings={...base,height,smooth},legacy={...settings};delete legacy.page_layout;const a=paths(E.compose(records,settings).svg),b=paths(E.compose(records,legacy).svg);assert.equal(a.length,b.length);a.forEach((d,i)=>{assert.equal(d.replace(/[0-9.]+/g,''),b[i].replace(/[0-9.]+/g,''));const coords=b[i].match(/[0-9.]+/g).map(Number);d.match(/[0-9.]+/g).map(Number).forEach((v,j)=>near(v,coords[j]));});checkPages(E.compose(records,settings));}
});
test('independent margins and visual line alignment affect placement without resizing strokes',()=>{
 const records=files(),layout={margin_left:35,margin_right:45,margin_top:40,margin_bottom:50};
 const left=E.compose(records,{...base,smooth:false,page_layout:layout}),centre=E.compose(records,{...base,smooth:false,page_layout:{...layout,alignment:'centre'}}),right=E.compose(records,{...base,smooth:false,page_layout:{...layout,alignment:'right'}});
 for(const result of [left,centre,right])checkPages(result,layout);
 left.pages[0].lines.forEach((line,i)=>{near(line.left,35);near((centre.pages[0].lines[i].left+centre.pages[0].lines[i].right)/2,100);near(right.pages[0].lines[i].right,165);near(line.right-line.left,right.pages[0].lines[i].right-right.pages[0].lines[i].left);});
 const top=Math.min(...paths(left.svg).flatMap(d=>P.flatten(d).map(p=>p[1])));near(top,40);
});
test('paragraph spacing adds only to blank-line breaks and avoids empty pages',()=>{
 const records=files(),request={...base,phrase:'a\nb\n\nc\n \nd'},normal=E.compose(records,request),spaced=E.compose(records,{...request,page_layout:{paragraph_gap:10}});
 normal.pages[0].lines.forEach((line,i)=>near(spaced.pages[0].lines[i].baseline-line.baseline,[0,0,10,20][i]));
 const padded=E.compose(records,{...base,phrase:'\n'.repeat(100)+'a'+'\n'.repeat(1000)});assert.equal(padded.pages.length,1);assert.equal(padded.used_samples.length,1);
 const separated=E.compose(records,{...base,phrase:'a'+'\n'.repeat(1000)+'b',page_layout:{paragraph_gap:30}});assert.equal(separated.pages.length,2);near(separated.pages[0].lines[0].baseline,separated.pages[1].lines[0].baseline);checkPages(separated);
});
test('whole words wrap across pages, retaining every character and sample selection in order',()=>{
 const records=files(),phrase=Array(180).fill('a bad cab').join(' '),layout={margin_left:50,margin_right:55,margin_top:40,margin_bottom:45};
 const result=E.compose(records,{...base,phrase,height:8,page_layout:layout});assert(result.pages.length>1);assert.equal(result.used_samples.map(s=>s.letter).join(''),phrase.replaceAll(' ',''));
 // Every row contains whole words from the repeating sequence.
 const words=phrase.split(' ');for(const line of result.pages.flatMap(p=>p.lines)){let remaining=line.characters;while(remaining){const word=words.shift();assert(remaining.startsWith(word));remaining=remaining.slice(word.length);}}assert.equal(words.length,0);checkPages(result,layout);
});
test('shuffle choices carry through page breaks and remain fixed when margins or alignment change',()=>{
 const records=files(),request={...base,phrase:Array(120).fill('aaa bbb ccc').join(' '),sample_order:'shuffle',sample_seed:'page-layout',height:8};
 for(const i of [0,0]){const value=E.capture(sheet(i,12));records.push({key:'letters/'+value.id+'.json',value});}
 const one=E.compose(records,request),two=E.compose(records,{...request,page_layout:{margin_left:60,margin_right:60,alignment:'right'}});
 assert(two.pages.length>one.pages.length);assert.deepEqual(two.used_samples,one.used_samples);checkPages(one);checkPages(two,{margin_left:60,margin_right:60});
});
test('page and text limits fail as a whole, including invalid margins, missing letters and oversized words',()=>{
 const records=files(),request={...base,height:12,phrase:Array(30).fill('b').join('\n')},capacity=E.compose(records,request).pages[0].lines.length;
 const maximum=E.compose(records,{...request,phrase:Array(capacity*20).fill('b').join('\n')});assert.equal(maximum.pages.length,20);checkPages(maximum);
 assert.throws(()=>E.compose(records,{...request,phrase:Array(capacity*20+1).fill('b').join('\n')}),/more than 20 pages/);
 for(const page_layout of [{margin_left:19},{margin_bottom:61},{alignment:'justify'},{paragraph_gap:31},{margin_top:NaN},{margin_top:null},{paragraph_gap:null},null])assert.throws(()=>E.compose(records,{...base,page_layout}));
 assert.throws(()=>E.compose(records,{...base,phrase:'a '.repeat(5001)}),/10,000/);
 assert.throws(()=>E.compose(records,{...base,phrase:'a\nZ'}),/No included samples/);
 assert.throws(()=>E.compose(records,{...base,phrase:'b'.repeat(200)}),/word is too wide/);
 const long=E.compose(records,{...base,height:3,phrase:'a '.repeat(1200)});assert(long.pages.length>0);checkPages(long);
});
test('finished documents validate every page and retain old draft and single-page record formats',()=>{
 const settings=E.compositionSettings({...base,phrase:Array(90).fill('a bad cab').join('\n')}),drawings=E.compose(files(),settings).pages.map(p=>p.svg),id=randomUUID();assert(drawings.length>1);
 const record=E.createComposition({id,title:'Long letter',settings,drawings});assert.equal(record.schema_version,3);assert.deepEqual(record.drawings,drawings);E.validateRecord('compositions/'+id+'.json',record);
 for(const invalid of [[...drawings.slice(0,-1),drawings[0].replace('</svg>','<script/></svg>')],Array(21).fill(drawings[0]),[drawings[0].replace(/M[\d.]+ [\d.]+/,'M0 0')]])assert.throws(()=>E.createComposition({id,title:'Bad',settings,drawings:invalid}));
 assert.throws(()=>E.createComposition({id,title:'Ambiguous',settings,drawings,drawing:drawings[0]}));
 assert.equal(E.createComposition({id,title:'Draft',settings,drawings:[]}).schema_version,1);
 const legacy=E.createComposition({id,title:'Old page',settings:E.compositionSettings({writer:'Writer',phrase:'abc'}),drawing:drawings[0]});assert.equal(legacy.schema_version,2);assert.equal(legacy.settings.page_layout,undefined);E.validateRecord('compositions/'+id+'.json',legacy);
});
