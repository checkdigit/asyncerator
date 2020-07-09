// source/all.spec.ts

import * as assert from 'assert';

import { all } from '../index';

describe('all', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(await all([]).toArray(), []);
  });

  it('converts array of promises into async iterable iterator', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual((await iterable.toArray()).sort(), [1, 2, 3]);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(all([Promise.reject(new Error('Reject'))]).toArray(), /^Error: Reject$/u);
    await assert.rejects(
      all([Promise.resolve(1), Promise.reject(new Error('Reject')), Promise.resolve(3)]).toArray(),
      /^Error: Reject$/u
    );
  });
});
