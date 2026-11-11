const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
for(const pages of [false,true])test(`cursive preview zoom and scrolling preserve composition geometry (${pages?'Pages':'server'})`,async()=>{
 const html=fs.readFileSync(pages?'docs/cursive.html':'static/cursive.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window,d=w.document;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><path d="M20 20L30 30"/></svg>';
 const requests=[],blobs=[];
 w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:proof-'+blobs.length;};w.URL.revokeObjectURL=()=>{};
 w.fetch=async(url,options)=>{if(options)requests.push(JSON.parse(options.body));return {ok:true,json:async()=>url.includes('writers')?{writers:[{writer:'Writer',counts:{}}]}:url.includes('samples')?{samples:[]}:{pages:[{svg}]}};};
 w.studioFetch=w.fetch;
 w.eval(fs.readFileSync(pages?'docs/assets/cursive.js':'static/cursive.js','utf8'));
 const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
 d.getElementById('cursive-generate').click();await settle();
 const image=d.getElementById('proof-image'),viewport=d.getElementById('proof-viewport'),zoom=d.getElementById('cursive-zoom');
 assert.equal(image.hidden,false);assert.equal(viewport.tabIndex,0);
 assert.equal(viewport.getAttribute('role'),'region');
 const source=image.src,blob=blobs.at(-1),request=JSON.stringify(requests[0]);
 for(const value of ['150','200','300','400']){
  zoom.value=value;zoom.dispatchEvent(new w.Event('change'));
  assert.equal(image.style.width,`min(${value}%, ${650*Number(value)/100}px)`);
  assert.match(d.getElementById('proof-view-status').textContent,new RegExp(value+'%'));
  assert.equal(image.src,source);assert.equal(blobs.at(-1),blob);assert.equal(requests.length,1);
 }
 viewport.scrollTop=120;viewport.scrollLeft=90;
 d.getElementById('cursive-zoom-reset').click();
 assert.equal(zoom.value,'100');assert.equal(viewport.scrollTop,0);assert.equal(viewport.scrollLeft,0);
 assert.equal(image.style.width,'min(100%, 650px)');
 viewport.scrollTop=500;viewport.scrollLeft=80;
 image.dispatchEvent(new w.Event('load'));assert.equal(viewport.scrollTop,0);assert.equal(viewport.scrollLeft,0);
 d.getElementById('cursive-generate').click();await settle();
 assert.equal(JSON.stringify(requests[1]),request);assert.equal(requests[1].height,8);
 assert.match(html,/#proof-viewport\{[^}]*overflow:auto;[^}]*max-height:70vh/);
 assert.match(html,/touch-action:pan-x pan-y/);
 assert.match(html,/main\.studio-page\{[^}]*position:static;[^}]*height:auto/);
 dom.window.close();
});
