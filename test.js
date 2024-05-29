'use strict';

const assert = require('assert');
const bech32 = require('./bech32');

// decode
const addr = 'bc1qkg62ae0wwntkzhq8td87s87c4nj5zdlj2ga8j7';
const {version, program} = bech32.decode('bc', addr);
assert.strictEqual(version, 0);
assert.strictEqual(
  Buffer.from(program).toString('hex'),
  'b234aee5ee74d7615c075b4fe81fd8ace54137f2');

// encode
const pubKeyHash = Buffer.from(
  '8bf743f3fd7f46804c39711af735b121747ef6b4',
  'hex');
assert.strictEqual(
  bech32.encode('bc', 0, pubKeyHash),
  'bc1q30m58ula0argqnpewyd0wdd3y968aa457pksa3');

console.log('OK');
