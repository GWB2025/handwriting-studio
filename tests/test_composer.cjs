const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, (process.env.STUDIO_PAGES_TEST ? '../docs/assets/' : '../static/') + 'compose.js'), 'utf8');
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

async function composer(extended=false,savedCompositions=false,shuffle=false,layout=false) {
  function events(target) {
    const listeners = {};
    target.addEventListener = (name, fn) => (listeners[name] ??= []).push(fn);
    target.emit = (name, event = {}) => (listeners[name] || []).forEach(fn => fn(event));
    return target;
  }
  const elements = {};
  for (const id of ['compose-letter-spacing','compose-word-spacing','compose-line-spacing','compose-letter-value','compose-word-value','compose-line-value','compose-spacing-reset','compose-source','compose-preferred','compose-form','compose-writer','compose-size','compose-smooth','compose-samples',
    'blend-count','blend-vertical','blend-vertical-value','blend-mix','blend-mix-value','compose-gcode','compose-counts','phrase','generate','compose-download','refresh-writers','compose-status','composed-image','compose-empty','review-link','compose-variation','compose-joined']) {
    elements[id] = events({value: '', checked: true, disabled: false, hidden: false, textContent: '',
      replaceChildren() { this.value = ''; },
      append(option) { if (!this.value) this.value = option.value; },
      removeAttribute(name) { delete this[name]; }});
  }
  if(layout)for(const name of ['margin-top','margin-right','margin-bottom','margin-left','alignment','paragraph-gap','layout-reset','page-previous','page-next','page-select','page-status'])elements['compose-'+name]=events({value:name.startsWith('margin-')?'20':name==='alignment'?'left':'0',disabled:false,replaceChildren(){this.value='';},append(option){if(!this.value)this.value=option.value;}});
  if(shuffle){elements['compose-order']=events({value:'cycle',disabled:false});elements['compose-shuffle']=events({disabled:true});}
  for(const name of ['letter','word','line'])elements['compose-'+name+'-spacing'].value='100';elements['compose-source'].value='both';elements['compose-preferred'].checked=true;elements['blend-count'].value='2';elements['blend-vertical'].value='50';elements['blend-mix'].value='50';elements['compose-variation'].value='original';elements['compose-joined'].checked=true;
  elements.phrase.value = 'a bad cab';
  elements['compose-size'].value = '5';
  elements['compose-samples'].value = 'latest_three';
  const downloads = [];
  const document = events({hidden: false, getElementById: id => elements[id],
    body: {append(node) {node.attached = true;}},
    createElement: tag => tag === 'a' ? {
      click() {assert.equal(this.attached, true);downloads.push({url: this.href, name: this.download});},
      remove() {this.attached = false;}
    } : {}});
  const exported=[];
  const window = events({StudioPlotter:{fromSVG:svg=>{exported.push(svg);return 'G21\n';}},...(extended?{StudioEngine:require('../web/engine.js')} : {}),location: {search: '?writer=Writer'}});
  if(savedCompositions)window.StudioCompositions={init(handlers){window.compositions=handlers;}};
  const requests = [], revoked = [];
  const server = {count: 8, savedAt: '2026-10-05T10:15:00Z', offline: false, revision:'original'};
  let serial = 0;
  const context = vm.createContext({document, window, crypto:require('node:crypto').webcrypto, URLSearchParams, AbortController, Blob, setTimeout, clearTimeout,
    URL: {createObjectURL: () => 'blob:preview-' + (++serial), revokeObjectURL: url => revoked.push(url)},
    fetch: async (url, options = {}) => {
      requests.push({url, options});
      if (server.offline) throw Error('Offline');
      const limit = url === '/api/compose' && JSON.parse(options.body).samples === 'latest_only' ? 1 : 3;
      return {ok: !server.error, json: async () => server.error?{error:server.error}:url === '/api/letters/writers'
        ? {writers: [{writer: 'Writer', counts: Object.fromEntries([...('abcde')].map(c => [c, server.count])), original_counts:{a:7,b:8,c:8,d:8,e:8},blend_counts:{a:1},preferred:{},latest_saved_at: server.savedAt, revision:server.revision}]}
        : {svg: '<svg/>',...(server.pages?{pages:server.pages.map(svg=>({svg}))}:{}), used_samples: [{letter: 'a'}], sample_selection: {
          available_counts: Object.fromEntries([...('abcde')].map(c => [c, server.count])),
          counts: {a: limit, b: limit, c: limit, d: limit, e: limit}, newest_saved_at: server.savedAt,writer_revision:server.revision}}};
    }});
  context.window.studioFetch=context.fetch;
  vm.runInContext(source, context); await settle();
  return {elements, window, document, requests, revoked, downloads, server, exported};
}

test('sample choice reaches the server and changing it invalidates the old download', async () => {
  const c = await composer(), e = c.elements;
  await e['compose-form'].onsubmit({preventDefault() {}});
  let request = c.requests.at(-1);
  assert.equal(JSON.parse(request.options.body).samples, 'latest_three');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(e['compose-download'].disabled, false);
  assert.match(e['compose-counts'].textContent, /a × 3/);
  assert.match(e['compose-status'].textContent, /Newest sample used:/);
  const oldImage = e['composed-image'].src;
  e['compose-samples'].value = 'latest_only';e['compose-samples'].emit('change');
  assert.equal(e['compose-download'].disabled, true);
  assert.equal(e['composed-image'].hidden, true);
  assert.ok(c.revoked.includes(oldImage));
  await e['compose-form'].onsubmit({preventDefault() {}});
  request = c.requests.at(-1);
  assert.equal(JSON.parse(request.options.body).samples, 'latest_only');
  assert.match(e['compose-counts'].textContent, /a × 1/);
});

test('opening a saved composition restores the complete form and invalidates earlier exports',async()=>{
 const c=await composer(true,true),e=c.elements;await e['compose-form'].onsubmit({preventDefault(){}});assert.equal(e['compose-download'].disabled,false);
 const settings={...c.window.compositions.read(),phrase:'a saved letter',height:8,samples:'all',source:'blends',use_preferred:false,joined:false,smooth:false,letter_spacing:1.25,word_spacing:.8,line_spacing:1.5};
 await c.window.compositions.restore(settings);assert.deepEqual(JSON.parse(JSON.stringify(c.window.compositions.read())),settings);assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-gcode'].disabled,true);assert.equal(e['compose-letter-value'].textContent,'125%');
 await e['compose-form'].onsubmit({preventDefault(){}});assert.equal(JSON.parse(c.requests.at(-1).options.body).phrase,'a saved letter');
 await assert.rejects(c.window.compositions.restore({...settings,writer:'Missing'}),/Import the saved handwriting/);assert.equal(e.phrase.value,'a saved letter');
});

test('restored finished drawings remain downloadable after library changes, until the user edits or regenerates',async()=>{
 const c=await composer(true,true),e=c.elements,E=require('../web/engine'),svg=E.compose(require('./browser_helpers').files(),{writer:'Writer',phrase:'abc'}).svg,settings=c.window.compositions.read();
 await c.window.compositions.restore(settings,svg);assert.equal(c.window.compositions.readDrawing(),svg);assert.equal(e['compose-download'].disabled,false);assert.equal(e['compose-gcode'].disabled,false);
 c.server.revision='new-spacing';c.window.emit('pageshow',{persisted:true});await settle();assert.equal(c.window.compositions.readDrawing(),svg);assert.equal(e['compose-download'].disabled,false);assert.match(e['compose-status'].textContent,/exact saved drawing/);
 e['compose-gcode'].onclick();assert.equal(c.exported.at(-1),svg);
 await c.window.compositions.restore({...settings,writer:'Unavailable'},svg);assert.equal(e['compose-download'].disabled,false);assert.equal(e['compose-writer'].value,'Unavailable');
 e.phrase.value='edited';e.phrase.emit('input');assert.equal(c.window.compositions.readDrawing(),'');assert.equal(e['compose-download'].disabled,true);
});

test('returning to an unchanged composer keeps its preview and download ready', async () => {
  const c = await composer(), e = c.elements;
  e.phrase.value = 'dad cab';
  await e['compose-form'].onsubmit({preventDefault() {}});
  const preview = e['composed-image'].src;
  c.window.emit('pageshow', {persisted: true});await settle();
  assert.equal(c.requests.at(-1).url, '/api/letters/writers');
  assert.equal(e.phrase.value, 'dad cab');
  assert.equal(e['compose-download'].disabled, false);
  assert.equal(e['composed-image'].hidden, false);
  assert.equal(e['composed-image'].src, preview);
  c.document.emit('visibilitychange');await settle();
  assert.equal(c.requests.at(-1).url, '/api/letters/writers');
  assert.equal(e.phrase.value, 'dad cab');
  assert.equal(e['compose-download'].disabled, false);
  assert.equal(e['composed-image'].src, preview);
  assert.equal(c.revoked.includes(preview), false);
  assert.equal(e['compose-samples'].disabled, false);
});

test('new samples on return clear the old preview with a specific explanation', async () => {
  const c = await composer(), e = c.elements;
  e.phrase.value = 'dad cab';
  await e['compose-form'].onsubmit({preventDefault() {}});
  c.server.count++;c.server.savedAt = '2026-10-05T11:00:00Z';
  c.document.emit('visibilitychange');await settle();
  assert.equal(e['compose-download'].disabled, true);
  assert.equal(e['composed-image'].hidden, true);
  assert.equal(e.phrase.value, 'dad cab');
  assert.match(e['compose-status'].textContent, /Saved samples have changed/);
});

test('an offline freshness check does not destroy a downloadable preview', async () => {
  const c = await composer(), e = c.elements;
  await e['compose-form'].onsubmit({preventDefault() {}});
  const preview = e['composed-image'].src;c.server.offline = true;
  c.document.emit('visibilitychange');await settle();
  assert.equal(e['compose-download'].disabled, false);
  assert.equal(e['composed-image'].src, preview);
  assert.match(e['compose-status'].textContent, /still available to download/);
});

test('download uses the displayed SVG and reports the request without clearing it', async () => {
  const c = await composer(), e = c.elements;
  await e['compose-form'].onsubmit({preventDefault() {}});
  const preview = e['composed-image'].src;
  e['compose-download'].onclick();
  assert.deepEqual(c.downloads, [{url: preview, name: 'composed-handwriting-a4.svg'}]);
  assert.match(e['compose-status'].textContent, /download requested/);
  assert.equal(e['compose-download'].disabled, false);
  assert.equal(e['composed-image'].src, preview);
});

test('baseline review changes invalidate a previous composition even when counts stay equal', async () => {
  const c=await composer(),e=c.elements;
  await e['compose-form'].onsubmit({preventDefault(){}});
  c.server.revision='baseline-adjusted';
  c.document.emit('visibilitychange');await settle();
  assert.equal(e['compose-download'].disabled,true);
  assert.match(e['compose-status'].textContent,/Saved samples have changed/);
});


test('browser composer sends blending and joined options and invalidates preview when they change',async()=>{
 const c=await composer(true),e=c.elements;e['compose-variation'].value='blend';e['compose-joined'].checked=false;
 await e['compose-form'].onsubmit({preventDefault(){}});
 const data=JSON.parse(c.requests.at(-1).options.body);assert.equal(data.variation,'blend');assert.equal(data.joined,false);assert.ok(data.seed);
 e['compose-variation'].emit('change');assert.equal(e['compose-download'].disabled,true);
});

test('G-code export uses the displayed preview and clears when settings change',async()=>{
 const c=await composer(),e=c.elements;
 assert.equal(e['compose-gcode'].disabled,true);
 await e['compose-form'].onsubmit({preventDefault(){}});
 assert.equal(e['compose-gcode'].disabled,false);
 e['compose-gcode'].onclick();assert.deepEqual(c.exported,['<svg/>']);
 assert.equal(c.downloads.at(-1).name,'composed-handwriting-a4.gcode');
 e.phrase.value='abc';e.phrase.emit('input');assert.equal(e['compose-gcode'].disabled,true);
 e['compose-gcode'].onclick();assert.equal(c.exported.length,1);
});

test('blend mix reaches composition and slider input invalidates both exports',async()=>{
 const c=await composer(true),e=c.elements;e['compose-variation'].value='blend';e['blend-mix'].value='70';
 await e['compose-form'].onsubmit({preventDefault(){}});
 assert.equal(JSON.parse(c.requests.at(-1).options.body).blend_strength,70);
 e['blend-mix'].value='30';e['blend-mix'].emit('input');
 assert.equal(e['blend-mix-value'].textContent,'30% right source');
 assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-gcode'].disabled,true);
});

test('live slider rebuilds with a fixed seed and four-source settings',async()=>{
 const c=await composer(true),e=c.elements;e['compose-variation'].value='blend';
 await e['compose-form'].onsubmit({preventDefault(){}});
 const seed=JSON.parse(c.requests.at(-1).options.body).seed;
 e['blend-count'].value='4';e['blend-count'].emit('change');e['blend-vertical'].value='80';e['blend-vertical'].emit('input');
 assert.equal(e['compose-gcode'].disabled,true);await new Promise(r=>setTimeout(r,150));await settle();
 const body=JSON.parse(c.requests.at(-1).options.body);assert.equal(body.seed,seed);assert.equal(body.blend_count,4);assert.equal(body.blend_vertical,80);assert.equal(body.samples,'latest_four');assert.equal(e['compose-gcode'].disabled,false);
});

test('source and preferred controls reach Compose and invalidate both downloads without replacing typed text',async()=>{
 const c=await composer(true),e=c.elements;await e['compose-form'].onsubmit({preventDefault(){}});
 e.phrase.value='my phrase';e.phrase.emit('input');e['compose-source'].value='blends';e['compose-source'].emit('change');assert.equal(e.phrase.value,'my phrase');assert.equal(e['compose-gcode'].disabled,true);assert.equal(e['compose-download'].disabled,true);assert.match(e['compose-counts'].textContent,/a × 1/);assert(!e['compose-counts'].textContent.includes('b ×'));
 e['compose-preferred'].checked=false;e['compose-preferred'].emit('change');await e['compose-form'].onsubmit({preventDefault(){}});const data=JSON.parse(c.requests.at(-1).options.body);assert.equal(data.source,'blends');assert.equal(data.use_preferred,false);
 c.server.revision='new-preferred-version';c.document.emit('visibilitychange');await settle();assert.equal(e['compose-gcode'].disabled,true);assert.equal(e['compose-download'].disabled,true);
});

test('spacing updates live while keeping the image in place and downloads disabled until refreshed',async()=>{
 const c=await composer(true),e=c.elements;await e['compose-form'].onsubmit({preventDefault(){}});const old=e['composed-image'].src;
 e['compose-letter-spacing'].value='150';e['compose-letter-spacing'].emit('input');e['compose-word-spacing'].value='75';e['compose-word-spacing'].emit('input');
 assert.equal(e['composed-image'].src,old);assert.equal(e['composed-image'].hidden,false);assert.equal(e['compose-gcode'].disabled,true);assert.equal(e['compose-download'].disabled,true);
 await new Promise(r=>setTimeout(r,230));await settle();const body=JSON.parse(c.requests.at(-1).options.body);assert.equal(body.letter_spacing,1.5);assert.equal(body.word_spacing,.75);assert.equal(body.line_spacing,1);assert.equal(e['compose-download'].disabled,false);assert.notEqual(e['composed-image'].src,old);
 e['compose-spacing-reset'].onclick();assert.equal(e['compose-letter-spacing'].value,'100');assert.equal(e['compose-word-spacing'].value,'100');assert.equal(e['compose-download'].disabled,true);
 await new Promise(r=>setTimeout(r,230));await settle();assert.equal(JSON.parse(c.requests.at(-1).options.body).letter_spacing,1);
});

test('failed live spacing keeps the previous image labelled and cannot export old geometry',async()=>{
 const c=await composer(true),e=c.elements;await e['compose-form'].onsubmit({preventDefault(){}});const old=e['composed-image'].src;c.server.error='This phrase does not fit on one A4 page.';
 e['compose-line-spacing'].value='200';e['compose-line-spacing'].emit('input');await new Promise(r=>setTimeout(r,230));await settle();
 assert.equal(e['composed-image'].src,old);assert.match(e['compose-status'].textContent,/Previous preview shown/);assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-gcode'].disabled,true);e['compose-gcode'].onclick();e['compose-download'].onclick();assert.equal(c.exported.length,0);assert.equal(c.downloads.length,0);
 c.server.error='';e['compose-spacing-reset'].onclick();await new Promise(r=>setTimeout(r,230));await settle();assert.equal(e['compose-download'].disabled,false);
});

test('shuffled Compose persists its variation, keeps it through spacing and regenerate, and refreshes it on request',async()=>{
 const c=await composer(true,true,true),e=c.elements;assert.equal(e['compose-shuffle'].disabled,true);
 e['compose-order'].value='shuffle';e['compose-order'].emit('change');assert.equal(e['compose-shuffle'].disabled,false);
 await e['compose-form'].onsubmit({preventDefault(){}});const first=JSON.parse(c.requests.at(-1).options.body);assert.equal(first.sample_order,'shuffle');assert(first.sample_seed);
 await e['compose-form'].onsubmit({preventDefault(){}});assert.equal(JSON.parse(c.requests.at(-1).options.body).sample_seed,first.sample_seed);
 e['compose-letter-spacing'].value='120';e['compose-letter-spacing'].emit('input');await new Promise(resolve=>setTimeout(resolve,220));assert.equal(JSON.parse(c.requests.at(-1).options.body).sample_seed,first.sample_seed);
 const request=e['compose-shuffle'].onclick();assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-shuffle'].disabled,true);await request;assert.notEqual(JSON.parse(c.requests.at(-1).options.body).sample_seed,first.sample_seed);
 const settings=c.window.compositions.read();await c.window.compositions.restore(settings);await e['compose-form'].onsubmit({preventDefault(){}});assert.equal(JSON.parse(c.requests.at(-1).options.body).sample_seed,settings.sample_seed);
 const legacy={...settings};delete legacy.sample_order;delete legacy.sample_seed;await c.window.compositions.restore(legacy);assert.equal(e['compose-order'].value,'cycle');assert.equal(e['compose-shuffle'].disabled,true);
 c.server.error='Does not fit';e['compose-order'].value='shuffle';e['compose-order'].emit('change');await e['compose-shuffle'].onclick();assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-shuffle'].disabled,false);
});

test('page navigation exports the selected page and preserves all pages for saving without regenerating',async()=>{
 const c=await composer(true,true,true,true),e=c.elements;c.server.pages=['<svg id="one"/>','<svg id="two"/>','<svg id="three"/>'];
 await e['compose-form'].onsubmit({preventDefault(){}});assert.equal(JSON.parse(c.requests.at(-1).options.body).page_layout.margin_left,20);assert.equal(e['compose-page-status'].textContent,'Page 1 of 3');assert.equal(e['compose-page-previous'].disabled,true);
 const saved=JSON.stringify(c.window.compositions.readDrawings()),settings=JSON.stringify(c.window.compositions.read()),requests=c.requests.length,firstURL=e['composed-image'].src;
 e['compose-page-next'].onclick();e['compose-gcode'].onclick();e['compose-download'].onclick();assert.equal(c.exported.at(-1),c.server.pages[1]);assert.equal(c.downloads.at(-2).name,'composed-handwriting-a4-page-02-of-03.gcode');assert.equal(c.downloads.at(-1).name,'composed-handwriting-a4-page-02-of-03.svg');assert(c.revoked.includes(firstURL));
 e['compose-page-select'].value='2';e['compose-page-select'].emit('change');assert.equal(e['compose-page-next'].disabled,true);assert.equal(e['compose-page-status'].textContent,'Page 3 of 3');assert.equal(c.requests.length,requests);assert.equal(JSON.stringify(c.window.compositions.readDrawings()),saved);assert.equal(JSON.stringify(c.window.compositions.read()),settings);
 e.phrase.emit('input');assert.equal(c.window.compositions.readDrawings().length,0);assert.equal(e['compose-page-select'].disabled,true);assert.equal(e['compose-download'].disabled,true);assert.equal(e['compose-gcode'].disabled,true);
});
test('live page layout blocks exports while updating, preserves selection, and clamps removed pages',async()=>{
 const c=await composer(true,true,true,true),e=c.elements;c.server.pages=['<svg/>','<svg/>'];await e['compose-form'].onsubmit({preventDefault(){}});e['compose-page-next'].onclick();const seed=JSON.parse(c.requests.at(-1).options.body).sample_seed,oldURL=e['composed-image'].src;
 e['compose-margin-left'].value='35';e['compose-margin-left'].emit('input');assert.equal(e['composed-image'].src,oldURL);assert.equal(e['compose-gcode'].disabled,true);assert.equal(e['compose-page-select'].disabled,true);
 await new Promise(resolve=>setTimeout(resolve,220));assert.equal(e['compose-page-status'].textContent,'Page 2 of 2');assert.equal(JSON.parse(c.requests.at(-1).options.body).page_layout.margin_left,35);assert.equal(JSON.parse(c.requests.at(-1).options.body).sample_seed,seed);
 c.server.pages=['<svg/>'];e['compose-alignment'].value='centre';e['compose-alignment'].emit('change');await new Promise(resolve=>setTimeout(resolve,220));assert.equal(e['compose-page-status'].textContent,'Page 1 of 1');e['compose-download'].onclick();assert.equal(c.downloads.at(-1).name,'composed-handwriting-a4.svg');
 c.server.error='Margins must be 20–60 mm';e['compose-margin-top'].value='10';e['compose-margin-top'].emit('input');await new Promise(resolve=>setTimeout(resolve,220));assert.equal(e['compose-download'].disabled,true);assert.equal(c.window.compositions.readDrawings().length,0);assert.match(e['compose-status'].textContent,/Margins/);
 delete c.server.error;e['compose-layout-reset'].onclick();await new Promise(resolve=>setTimeout(resolve,220));assert.equal(e['compose-margin-top'].value,'20');assert.equal(e['compose-alignment'].value,'left');assert.equal(e['compose-download'].disabled,false);
});
test('reopening a finished document restores every page and layout even without source handwriting',async()=>{
 const c=await composer(true,true,true,true),e=c.elements,E=require('../web/engine'),files=require('./browser_helpers').files();const settings={...c.window.compositions.read(),writer:'Unavailable',page_layout:E.pageLayout({margin_left:35,alignment:'right',paragraph_gap:8})},pages=['abc','def'].map(phrase=>E.compose(files,{writer:'Writer',phrase}).svg);
 await c.window.compositions.restore(settings,'',pages);assert.equal(e['compose-margin-left'].value,'35');assert.equal(e['compose-alignment'].value,'right');assert.equal(e['compose-paragraph-gap'].value,'8');assert.equal(e['compose-page-status'].textContent,'Page 1 of 2');
 c.server.revision='changed';c.window.emit('pageshow',{persisted:true});await settle();assert.deepEqual([...c.window.compositions.readDrawings()],pages);e['compose-page-next'].onclick();e['compose-gcode'].onclick();assert.equal(c.exported.at(-1),pages[1]);
 const legacy={...settings,writer:'Writer'};delete legacy.page_layout;await c.window.compositions.restore(legacy,pages[0]);assert.equal(e['compose-margin-left'].value,'20');assert.equal(e['compose-alignment'].value,'left');assert.equal(e['compose-page-status'].textContent,'Page 1 of 1');
});
