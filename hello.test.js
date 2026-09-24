const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

test('hello.js prints the greeting and exits successfully', () => {
  const result = spawnSync(process.execPath, [`${__dirname}/hello.js`], {
    encoding: 'utf8',
  });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout.trim(), 'Hello from Codex');
});
