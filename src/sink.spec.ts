// sink.spec.ts

import * as assert from 'assert';

import { from } from './index';

describe('sink', () => {
  describe('toArray', () => {
    it('converts an async iterable iterator into an array', async () => {
      assert.deepStrictEqual(await from(['abc', Promise.resolve('def')]).toArray(), ['abc', 'def']);
    });
  });
});
