// operator/map.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('map', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await all([])
        .map(() => {
          throw new Error('This should not happen');
        })
        .toArray(),
      []
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual(await iterable.map((value) => value * 2).toArray(), [2, 4, 6]);
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(await iterable.map((value) => value.length).toArray(), [1, 2, 3]);
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      await iterable
        .map((value) => value.length)
        .map((value) => value * 2)
        .map((value) => ''.padStart(value, ' '))
        .toArray(),
      ['  ', '    ', '      ']
    );
  });

  it('reject if map function throws an exception', async () => {
    await assert.rejects(
      from([1])
        .map(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
    await assert.rejects(
      all([Promise.resolve(1)])
        .map(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
  });
});
