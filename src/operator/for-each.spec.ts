// operator/for-each.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'node:assert';

import { all, forEach, from, map, pipeline, toArray } from '../index';

describe('forEach', () => {
  it('works for an empty array', async () => {
    const results: unknown[] = [];
    await pipeline(
      all([]),
      forEach((item) => results.push(item)),
      toArray
    );
    assert.deepStrictEqual(results, []);
  });

  it('operates on sequence of promises', async () => {
    const results: number[] = [];
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    await pipeline(
      iterable,
      forEach((value) => results.push(value)),
      toArray
    );
    assert.deepStrictEqual(results.sort(), [1, 2, 3]);
  });

  it('operates on sequence of non-promises', async () => {
    const results: string[] = [];
    const iterable = from(['a', 'bb', 'ccc']);
    await pipeline(
      iterable,
      forEach((value, index) => results.push(`${value}${index}`)),
      toArray
    );
    assert.deepStrictEqual(results, ['a0', 'bb1', 'ccc2']);
  });

  it('is chain-able', async () => {
    const results: string[] = [];
    const iterable = from(['a', 'bb', 'ccc']);
    await pipeline(
      iterable,
      map((value) => value.length),
      map((value) => value * 2),
      map((value) => ''.padStart(value, ' ')),
      forEach((value) => results.push(value)),
      toArray
    );
    assert.deepStrictEqual(results, ['  ', '    ', '      ']);
  });

  it('reject if forEach function throws an exception', async () => {
    await assert.rejects(
      pipeline(
        from([1]),
        forEach(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
    await assert.rejects(
      pipeline(
        all([Promise.resolve(1)]),
        forEach(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
  });
});
