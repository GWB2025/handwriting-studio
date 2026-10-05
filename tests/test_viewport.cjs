// Simulate keyboard timing that desktop browser resizing cannot reproduce.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');

function notebook(guided = false, profiles = []) {
  const listeners = target => {
    const events = {};
    target.addEventListener = (name, fn) => (events[name] ??= []).push(fn);
    target.emit = (name, event = {}) => (events[name] || []).forEach(fn => fn(event));
    return target;
  };
  let now = 0, serial = 0;
  const frames = new Map(), timers = new Map(), styles = {}, elements = {};
  const document = listeners({activeElement: null, hidden: false,
    documentElement: {style: {setProperty: (key, value) => styles[key] = value}},
    getElementById: id => elements[id], createElement: () => ({})});
  for (const id of ['notebook','paper','writer','writer-done','saved-pages','save','status','input','smooth','guides','focus','guidance','undo','redo','clear','export',
    'compose-link','review-link','sample-counts','known-writers','capture-step','capture-instruction','more-sheets','guide-small','guide-tall','guide-tail','guide-shading']) {
    elements[id] = listeners({value: '', checked: true, hidden: true, style: {},
      attributes: {}, classList: {toggle() {}},
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      append() {}, replaceChildren() {},
      focus() { document.activeElement = this; this.emit('focus'); },
      blur() { if (document.activeElement === this) { document.activeElement = null; this.emit('blur'); } },
      getBoundingClientRect: () => ({width: 1000, height: 500, left: 0, top: 0}),
      setPointerCapture() {}, hasPointerCapture: () => false});
  }
  elements.paper.parentElement = elements.paper;
  elements.paper.getContext = () => new Proxy({}, {get: () => () => {}});
  const viewport = listeners({height: 680, width: 1180, pageTop: 0, pageLeft: 0});
  const window = listeners({visualViewport: viewport, innerHeight: 680, innerWidth: 1180,
    devicePixelRatio: 1, scrollY: 0, scrollX: 0, capturePlan: {id:'lowercase-v2', orders:['acebd','fhjgi','kmln','oqpr','sutv','wyxz'],
      sheets_per_set:6, tall_letters:'bdfhklt',descenders:'fgjpqy',guides:{ascender:170,x_height:250,baseline:330,descender:410}}});
  const context = vm.createContext({document, window, crypto:require('node:crypto').webcrypto, AbortController,
    localStorage: {getItem() {return null;}, setItem() {}},
    fetch: async () => ({ok: true, json: async () => ({writers: profiles, unavailable_count: 0, saved_at:'2026-10-05T12:00:00Z'})}),
    requestAnimationFrame: fn => {frames.set(++serial, fn); return serial;},
    setTimeout: (fn, delay) => {timers.set(++serial, {fn, due: now + delay}); return serial;},
    clearTimeout: id => timers.delete(id), ResizeObserver: class {observe() {}}});
  function flush() {
    for (let i = 0; i < 4 && frames.size; i++) {
      const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn());
    }
  }
  function advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.due <= now) {timers.delete(id); timer.fn();}
    flush();
  }
  vm.runInContext(source, context);
  if (guided) vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../static/capture.js'), 'utf8'), context);
  flush();
  return {elements, styles, viewport, window, document, context, flush, advance};
}

test('viewport event can arrive before dimensions change', () => {
  const n = notebook();
  n.viewport.emit('resize');
  n.viewport.height = 350;
  n.flush();
  assert.equal(n.styles['--visible-height'], '350px');
});

test('Done restores size after delayed keyboard close without a second event', () => {
  const n = notebook();
  n.elements.writer.focus();
  n.viewport.height = 350; n.viewport.emit('resize'); n.flush();
  n.elements.writer.value = 'Writer'; n.elements.writer.oninput();
  n.elements['writer-done'].onclick(); n.flush();
  assert.equal(n.document.activeElement, null);
  // Safari updates its dimensions later without emitting another resize.
  n.viewport.height = 680;
  n.advance(300);
  assert.equal(n.styles['--visible-height'], '680px');
  assert.equal(vm.runInContext('strokes.length', n.context), 0);
});

test('first Pencil contact ends name entry without dropping or moving the stroke', () => {
  const n = notebook();
  n.elements.writer.focus(); n.viewport.height = 350; n.viewport.emit('resize'); n.flush();
  const pen = {pointerType: 'pen', pointerId: 7, clientX: 150, clientY: 100,
    timeStamp: 100, pressure: .5, tiltX: 0, tiltY: 0, preventDefault() {}};
  n.elements.paper.emit('pointerdown', pen);
  assert.equal(n.document.activeElement, null);
  n.viewport.height = 680; n.viewport.emit('resize'); n.advance(300);
  assert.equal(n.styles['--visible-height'], '350px');
  assert.equal(vm.runInContext('active.points.length', n.context), 1);
  n.window.emit('pointerup', {...pen, clientX: 200, timeStamp: 120}); n.flush();
  assert.equal(n.styles['--visible-height'], '680px');
  assert.equal(vm.runInContext('strokes.length', n.context), 1);
  assert.equal(vm.runInContext('strokes[0].points[0].x', n.context), 150);
});

function draw(n, x, time) {
  const pen = {pointerType: 'pen', pointerId: 7, clientX: x, clientY: 100,
    timeStamp: time, pressure: .4, tiltX: 12, tiltY: -5, preventDefault() {}};
  n.elements.paper.emit('pointerdown', pen);
  n.window.emit('pointerup', {...pen, clientX: x + 30, timeStamp: time + 10});
  n.flush();
}

test('multiple undo and redo preserve exact stroke data and order', () => {
  const n = notebook();
  assert.equal(n.elements.undo.disabled, true);
  assert.equal(n.elements.redo.disabled, true);
  draw(n, 100, 0); draw(n, 200, 100); draw(n, 300, 200);
  const original = vm.runInContext('JSON.stringify(strokes)', n.context);
  n.elements.undo.onclick(); n.elements.undo.onclick();
  assert.equal(vm.runInContext('strokes.length', n.context), 1);
  assert.equal(n.elements.redo.disabled, false);
  n.elements.redo.onclick(); n.elements.redo.onclick();
  assert.equal(vm.runInContext('JSON.stringify(strokes)', n.context), original);
  assert.equal(n.elements.redo.disabled, true);
  n.elements.redo.onclick();
  assert.equal(vm.runInContext('JSON.stringify(strokes)', n.context), original);
});

test('cancelled contact preserves redo, but completed new writing replaces it', () => {
  const n = notebook();
  draw(n, 100, 0); draw(n, 200, 100); n.elements.undo.onclick();
  n.elements.paper.emit('pointerdown', {pointerType: 'pen', pointerId: 7,
    clientX: 300, clientY: 100, timeStamp: 200, preventDefault() {}});
  assert.equal(n.elements.redo.disabled, true);
  n.window.emit('pointercancel', {pointerId: 7});
  assert.equal(n.elements.redo.disabled, false);
  draw(n, 400, 300);
  assert.equal(n.elements.redo.disabled, true);
  assert.equal(vm.runInContext('strokes.length', n.context), 2);
  n.elements.undo.onclick(); n.elements.clear.onclick();
  assert.equal(n.elements.undo.disabled, true);
  assert.equal(n.elements.redo.disabled, true);
  n.elements.redo.onclick();
  assert.equal(vm.runInContext('strokes.length', n.context), 0);
});

test('undo and redo cannot alter a page while it is saving', () => {
  const n = notebook();
  draw(n, 100, 0); draw(n, 200, 100); n.elements.undo.onclick();
  const before = vm.runInContext('JSON.stringify({strokes,undone})', n.context);
  vm.runInContext('saving=true; updateSave()', n.context);
  assert.equal(n.elements.undo.disabled, true);
  assert.equal(n.elements.redo.disabled, true);
  n.elements.redo.onclick(); n.elements.undo.onclick();
  assert.equal(vm.runInContext('JSON.stringify({strokes,undone})', n.context), before);
});

test('Writer tap requests focus immediately without waiting for a timer', () => {
  const n = notebook();
  n.elements.writer.emit('click');
  assert.equal(n.document.activeElement, n.elements.writer);
});


test('Pencil tap requests Writer focus in the pen gesture', () => {
  const n = notebook(); let prevented = false;
  n.elements.writer.emit('pointerdown', {pointerType: 'pen', preventDefault() {prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(n.document.activeElement, n.elements.writer);
  assert.equal(vm.runInContext('strokes.length', n.context), 0);
});


test('opening a page restores an independent copy and appends times in order', () => {
  const n = notebook(); draw(n, 100, 0); n.elements.undo.onclick();
  const page = {writer: 'Saved writer', saved_at: '2026-10-04T10:00:00+00:00', display_smoothing: false,
    raw_strokes: [{pointerType: 'pen', points: [{x: 5, y: 8, t: 5000, pressure: .8, tiltX: 10, tiltY: -20}]}]};
  n.context.loadedPage = page;
  vm.runInContext('openSavedPage(loadedPage)', n.context); n.flush();
  assert.equal(n.elements.writer.value, 'Saved writer');
  assert.equal(n.elements.smooth.checked, false);
  assert.equal(n.elements.redo.disabled, true);
  assert.equal(n.elements.save.disabled, true);
  assert.equal(vm.runInContext('hasUnsavedWriting()', n.context), false);
  const original = JSON.stringify(page);
  draw(n, 200, 100);
  assert.equal(vm.runInContext('strokes[1].points[0].t', n.context), 5000);
  assert.equal(vm.runInContext('strokes[1].points[1].t', n.context), 5010);
  assert.equal(vm.runInContext('hasUnsavedWriting()', n.context), true);
  assert.equal(JSON.stringify(page), original);
  vm.runInContext('strokes[0].points[0].x=99', n.context);
  assert.equal(page.raw_strokes[0].points[0].x, 5);
});

test('undoing all unsaved strokes still protects the redo history', () => {
  const n = notebook(); draw(n, 100, 0); n.elements.undo.onclick();
  assert.equal(vm.runInContext('strokes.length', n.context), 0);
  assert.equal(vm.runInContext('hasUnsavedWriting()', n.context), true);
});


test('palm cannot select interface text, while normal writer editing still works', () => {
  const n = notebook();
  for (const type of ['selectstart','contextmenu']) {
    let blocked = false;
    n.elements.notebook.emit(type, {target: n.elements.status, preventDefault() {blocked = true;}});
    assert.equal(blocked, true);
    blocked = false;
    n.elements.notebook.emit(type, {target: n.elements.writer, preventDefault() {blocked = true;}});
    assert.equal(blocked, false);
  }
  const pen = {pointerType: 'pen', pointerId: 7, clientX: 50, clientY: 100,
    timeStamp: 100, pressure: .5, tiltX: 0, tiltY: 0, preventDefault() {}};
  n.elements.paper.emit('pointerdown', pen);
  assert.equal(n.elements.writer.disabled, true);
  let blocked = false;
  n.elements.notebook.emit('selectstart', {target: n.elements.writer, preventDefault() {blocked = true;}});
  assert.equal(blocked, true);
  assert.equal(vm.runInContext('active.points.length', n.context), 1);
  n.window.emit('pointerup', {...pen, timeStamp: 110});
  assert.equal(n.elements.writer.disabled, false);
  assert.equal(vm.runInContext('strokes.length', n.context), 1);
});

test('Start capture prompts for a missing name without losing practice or redo strokes', async () => {
  const n = notebook(true);
  assert.equal(n.elements.save.disabled, false);
  draw(n, 100, 0); draw(n, 200, 100); n.elements.undo.onclick();
  const before = vm.runInContext('JSON.stringify({strokes,undone,dirty,saved})', n.context);
  await n.elements.save.onclick();
  assert.equal(n.document.activeElement, n.elements.writer);
  assert.equal(n.elements.writer.attributes['aria-invalid'], 'true');
  assert.match(n.elements.status.textContent, /Enter a writer name/);
  assert.equal(n.elements['capture-step'].textContent, 'Practice · not saved');
  assert.equal(vm.runInContext('JSON.stringify({strokes,undone,dirty,saved})', n.context), before);
  n.elements.writer.value = '  ';
  await n.elements.save.onclick();
  assert.equal(n.elements['capture-step'].textContent, 'Practice · not saved');
});

test('selecting a writer then starting opens the first blank capture sheet', async () => {
  const n = notebook(true);
  draw(n, 100, 0);
  await n.elements.save.onclick();
  n.elements.writer.value = 'Writer'; n.elements.writer.emit('change');
  assert.equal(n.elements.writer.attributes['aria-invalid'], undefined);
  assert.equal(n.elements['writer-done'].disabled, false);
  await n.elements.save.onclick();n.flush();
  assert.equal(n.elements['capture-step'].textContent, 'Capture · set 1 · sheet 1 of 6');
  assert.equal(n.elements.writer.disabled, true);
  assert.equal(n.elements.save.textContent, 'Save sheet 1 of 6');
  assert.equal(n.elements.save.disabled, true);
  assert.equal(vm.runInContext('strokes.length + undone.length', n.context), 0);
});

test('six-sheet alphabet capture reaches review and resumes after the latest saved sheet', async () => {
  const n=notebook(true,[{writer:'Writer',counts:{a:1},total_counts:{a:1},next_order_index:4}]);
  for(let i=0;i<10;i++)await Promise.resolve();
  n.elements.writer.value='Writer';n.elements.writer.emit('change');
  await n.elements.save.onclick();
  assert.equal(n.elements.save.textContent,'Save sheet 5 of 6');
  draw(n,100,0);await n.elements.save.onclick();
  assert.equal(n.elements.save.textContent,'Save sheet 6 of 6');
  draw(n,100,100);await n.elements.save.onclick();
  assert.equal(n.elements['capture-step'].textContent,'Alphabet set complete');
  assert.equal(n.elements['more-sheets'].hidden,false);
  assert.match(n.elements['review-link'].href,/writer=Writer/);
});
