// operator/filter.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('filter', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await all([])
        .filter(() => {
          throw new Error('This should not happen');
        })
        .toArray(),
      []
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual(await iterable.filter((value) => value !== 2).toArray(), [1, 3]);
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(await iterable.filter(() => true).toArray(), ['a', 'bb', 'ccc']);
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      await iterable
        .filter((value) => value !== 'a')
        .filter((value) => value !== 'ccc')
        .toArray(),
      ['bb']
    );
  });

  it('reject if filter function throws an exception', async () => {
    await assert.rejects(
      from([1])
        .filter(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
    await assert.rejects(
      all([Promise.resolve(1)])
        .filter(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
  });
});
