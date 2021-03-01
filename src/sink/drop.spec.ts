// sink/drop.spec.ts

import * as assert from 'assert';

import { drop, from, pipeline } from '../index';

describe('drop', () => {
  it('drops async iterable iterator into /dev/null', async () => {
    assert.deepStrictEqual(await pipeline(from(['abc', Promise.resolve('def')]), drop), undefined);
  });
});
