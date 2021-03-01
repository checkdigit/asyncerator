// sink/to-array.spec.ts

import * as assert from 'assert';

import { from, pipeline, toArray } from '../index';

describe('toArray', () => {
  it('converts an async iterable iterator into an array', async () => {
    assert.deepStrictEqual(await pipeline(from(['abc', Promise.resolve('def')]), toArray), ['abc', 'def']);
  });
});
