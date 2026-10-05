import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '../src/lib/id.ts';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const nativeCrypto = globalThis.crypto;

function withCrypto(value: unknown, run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value });
  try { run(); } finally { Object.defineProperty(globalThis, 'crypto', descriptor); }
}

test('createId prefers native randomUUID and preserves its receiver', () => {
  const expected = '00112233-4455-4677-8899-aabbccddeeff';
  const crypto = {
    randomUUID() { assert.equal(this, crypto); return expected; },
    getRandomValues() { assert.fail('Native UUID generation must not use the fallback'); },
  };
  withCrypto(crypto, () => assert.equal(createId(), expected));
});

test('fallback sets UUID v4 version and variant bits while preserving other random bits', () => {
  for (const fill of [0x00, 0x55, 0xaa, 0xff]) {
    let calls = 0;
    const crypto = {
      getRandomValues(bytes: Uint8Array) {
        assert.equal(this, crypto);
        assert.ok(bytes instanceof Uint8Array);
        assert.equal(bytes.length, 16);
        calls++;
        return bytes.fill(fill);
      },
    };
    withCrypto(crypto, () => {
      const id = createId();
      assert.match(id, uuidV4);
      const actual = Buffer.from(id.replaceAll('-', ''), 'hex');
      const expected = Buffer.alloc(16, fill);
      expected[6] = (fill & 0x0f) | 0x40;
      expected[8] = (fill & 0x3f) | 0x80;
      assert.deepEqual(actual, expected);
      assert.equal(calls, 1);
    });
  }
});

test('fallback handles a non-callable randomUUID and produces distinct valid IDs', () => {
  withCrypto({ randomUUID: null, getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto) }, () => {
    const ids = Array.from({ length: 1000 }, () => createId());
    for (const id of ids) assert.match(id, uuidV4);
    assert.equal(new Set(ids).size, ids.length);
  });
});

test('missing Web Crypto fails explicitly instead of generating weak IDs', () => {
  for (const crypto of [undefined, {}]) {
    withCrypto(crypto, () => assert.throws(createId, /generazione sicura/));
  }
});
