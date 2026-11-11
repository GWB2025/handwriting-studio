const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine'),P=require('../static/plotter'),{extendedFiles}=require('./extended_helpers');
test('Compose connects letters and pairs, tightens layout, exports safe joins and preserves saved settings',()=>{
 const files=[...extendedFiles('lowercase'),...extendedFiles('pairs')];
 for(const {value:r} of files){for(const st of r.raw_strokes)st.points[1].y=318;r.samples=E.extract(r.raw_strokes,r.order,r.schema_version);}
 const before=JSON.stringify(files),opts={writer:'Writer',phrase:'the thing in the rain',height:8,smooth:true,joined:true,page_layout:{}};
 const plain=E.compose(files,opts),joined=E.compose(files,{...opts,auto_join_preview:true});
 assert.ok(joined.pages[0].generated_joins>0);assert.ok(joined.used_samples.some(s=>s.letter==='th'));
 E.validateDrawingSVG(joined.svg);
 const paths=[...joined.svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);assert.ok(P.generate(paths).includes('G90'));
 assert.equal(JSON.stringify(files),before);
 assert.equal(E.compositionSettings({...opts,auto_join_preview:true}).auto_join_preview,true);
 assert.equal(E.compositionSettings(opts).auto_join_preview,undefined);
 const lastX=r=>Math.max(...[...r.svg.matchAll(/d="M([\d.]+)/g)].map(m=>Number(m[1])));
 assert.ok(lastX(joined)<lastX(plain));
 assert.throws(()=>E.compose(files,{...opts,auto_join_preview:true,natural_variation:{level:'subtle',seed:'x'}}),/Natural variation/);
});
