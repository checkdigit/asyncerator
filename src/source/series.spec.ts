// source/series.spec.ts

import * as assert from 'assert';

import { from, series } from '../index';

describe('series', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(await series(from([])).toArray(), []);
  });

  it('works for a sequence of non-promises', async () => {
    assert.deepStrictEqual(await series(from([1, 2]), from([3]), from([4, 5])).toArray(), [1, 2, 3, 4, 5]);
  });

  it('works for a mixed sequence of promises and non-promises', async () => {
    assert.deepStrictEqual(await series(from([1, Promise.resolve(2)]), from([3])).toArray(), [1, 2, 3]);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(series(from([Promise.reject(new Error('Reject'))])).toArray(), /^Error: Reject$/u);
  });
});
