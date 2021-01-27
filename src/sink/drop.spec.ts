// sink/drop.spec.ts

import * as assert from 'assert';

import { from } from '../index';

describe('drop', () => {
  it('drops async iterable iterator into /dev/null', async () => {
    assert.deepStrictEqual(await from(['abc', Promise.resolve('def')]).drop(), undefined);
  });
});
