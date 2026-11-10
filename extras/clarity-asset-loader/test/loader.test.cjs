const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { parseHTML } = require('linkedom');
const loader = fs.readFileSync(__dirname + '/../src/main/resources/asset-loader.js', 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup(body = '', fail = () => false) {
  const { document } = parseHTML(`<html><head>
    <template data-clarity-feature="steam"><script src="/steam.js"></script></template>
    <template data-clarity-feature="steam"><link rel="stylesheet" href="/steam.css"></template>
    <template data-clarity-feature="shiki"><script type="module" src="/shiki.js"></script></template>
    <template data-clarity-feature="hyperlink"><script src="/hyperlink.js"></script></template>
    <template data-clarity-feature="summary"><script src="/summary.js"></script></template>
    </head><body>${body}</body></html>`);
  Object.defineProperty(document, 'readyState', { value: 'complete' });
  const fetched = [], timers = [], warnings = [];
  const append = document.head.appendChild.bind(document.head);
  document.head.appendChild = node => {
    const result = append(node);
    const url = node.getAttribute('src') || node.getAttribute('href');
    fetched.push(url);
    queueMicrotask(() => fail(url) ? node.onerror() : node.onload());
    return result;
  };
  const window = {};
  const context = vm.createContext({ document, window, MutationObserver: document.defaultView.MutationObserver,
    queueMicrotask, setTimeout: callback => timers.push(callback), console: { warn: (...args) => warnings.push(args) } });
  vm.runInContext(loader, context);
  return { document, window, fetched, timers, warnings, context };
}

test('empty homepage does not download any selected plugin asset', async () => {
  const env = setup('<main>Homepage</main>');
  await settle();
  assert.deepEqual(env.fetched, []);
});

test('loads only components present, including AI summary and code module', async () => {
  const env = setup('<ai-summaraidgpt></ai-summaraidgpt><shiki-code></shiki-code>');
  await settle();
  assert.deepEqual(env.fetched.sort(), ['/shiki.js', '/summary.js']);
  assert.equal(env.document.head.querySelector('script[src="/shiki.js"]').type, 'module');
});

test('dynamic components load and duplicate inserts do not reload', async () => {
  const env = setup();
  await settle();
  env.document.body.innerHTML = '<steam-game-card></steam-game-card><hyperlink-inline-card></hyperlink-inline-card>';
  await settle();
  assert.deepEqual(env.fetched.sort(), ['/hyperlink.js', '/steam.css', '/steam.js']);
  env.document.body.innerHTML += '<steam-game-card></steam-game-card>';
  vm.runInContext(loader, env.context);
  await settle();
  assert.equal(env.fetched.length, 3);
});

test('network failures retry twice and terminate without mutation loops', async () => {
  const env = setup('<shiki-code></shiki-code>', () => true);
  await settle();
  assert.equal(env.fetched.length, 1);
  assert.equal(env.timers.length, 1);
  env.timers.shift()(); await settle();
  env.timers.shift()(); await settle();
  assert.equal(env.fetched.length, 3);
  assert.equal(env.timers.length, 0);
  assert.equal(env.warnings.length, 3);
});
