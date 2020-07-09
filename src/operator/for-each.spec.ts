// operator/for-each.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('forEach', () => {
  it('works for an empty array', async () => {
    const results: unknown[] = [];
    await all([])
      .forEach((item) => results.push(item))
      .toArray();
    assert.deepStrictEqual(results, []);
  });

  it('operates on sequence of promises', async () => {
    const results: number[] = [];
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    await iterable.forEach((value) => results.push(value)).toArray();
    assert.deepStrictEqual(results.sort(), [1, 2, 3]);
  });

  it('operates on sequence of non-promises', async () => {
    const results: string[] = [];
    const iterable = from(['a', 'bb', 'ccc']);
    await iterable.forEach((value) => results.push(value)).toArray();
    assert.deepStrictEqual(results, ['a', 'bb', 'ccc']);
  });

  it('is chain-able', async () => {
    const results: string[] = [];
    const iterable = from(['a', 'bb', 'ccc']);
    await iterable
      .map((value) => value.length)
      .map((value) => value * 2)
      .map((value) => ''.padStart(value, ' '))
      .forEach((value) => results.push(value))
      .toArray();
    assert.deepStrictEqual(results, ['  ', '    ', '      ']);
  });

  it('reject if forEach function throws an exception', async () => {
    await assert.rejects(
      from([1])
        .forEach(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
    await assert.rejects(
      all([Promise.resolve(1)])
        .forEach(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
  });
});
