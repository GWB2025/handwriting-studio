const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, (process.env.STUDIO_PAGES_TEST ? '../docs/assets/' : '../static/') + 'compose.js'), 'utf8');
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

async function composer(extended=false) {
  function events(target) {
    const listeners = {};
    target.addEventListener = (name, fn) => (listeners[name] ??= []).push(fn);
    target.emit = (name, event = {}) => (listeners[name] || []).forEach(fn => fn(event));
    return target;
  }
  const elements = {};
  for (const id of ['compose-form','compose-writer','compose-size','compose-smooth','compose-samples',
    'compose-counts','phrase','generate','compose-download','refresh-writers','compose-status','composed-image','compose-empty','review-link','compose-variation','compose-joined']) {
    elements[id] = events({value: '', checked: true, disabled: false, hidden: false, textContent: '',
      replaceChildren() { this.value = ''; },
      append(option) { if (!this.value) this.value = option.value; },
      removeAttribute(name) { delete this[name]; }});
  }
  elements['compose-variation'].value='original';elements['compose-joined'].checked=true;
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
  const window = events({...(extended?{StudioEngine:require('../web/engine.js')} : {}),location: {search: '?writer=Writer'}});
  const requests = [], revoked = [];
  const server = {count: 8, savedAt: '2026-10-05T10:15:00Z', offline: false, revision:'original'};
  let serial = 0;
  const context = vm.createContext({document, window, crypto:require('node:crypto').webcrypto, URLSearchParams, AbortController, Blob, setTimeout, clearTimeout,
    URL: {createObjectURL: () => 'blob:preview-' + (++serial), revokeObjectURL: url => revoked.push(url)},
    fetch: async (url, options = {}) => {
      requests.push({url, options});
      if (server.offline) throw Error('Offline');
      const limit = url === '/api/compose' && JSON.parse(options.body).samples === 'latest_only' ? 1 : 3;
      return {ok: true, json: async () => url === '/api/letters/writers'
        ? {writers: [{writer: 'Writer', counts: Object.fromEntries([...('abcde')].map(c => [c, server.count])), latest_saved_at: server.savedAt, revision:server.revision}]}
        : {svg: '<svg/>', used_samples: [{letter: 'a'}], sample_selection: {
          available_counts: Object.fromEntries([...('abcde')].map(c => [c, server.count])),
          counts: {a: limit, b: limit, c: limit, d: limit, e: limit}, newest_saved_at: server.savedAt,writer_revision:server.revision}}};
    }});
  context.window.studioFetch=context.fetch;
  vm.runInContext(source, context); await settle();
  return {elements, window, document, requests, revoked, downloads, server};
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
