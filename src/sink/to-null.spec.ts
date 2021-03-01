// sink/to-null.spec.ts

import * as assert from 'assert';

import { from, pipeline, toNull } from '../index';

describe('toNull', () => {
  it('drops async iterable iterator into /dev/null', async () => {
    assert.deepStrictEqual(await pipeline(from(['abc', Promise.resolve('def')]), toNull), undefined);
  });
});
