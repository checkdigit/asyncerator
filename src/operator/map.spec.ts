// operator/map.spec.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { describe, it } from '@jest/globals';

import { all, from, map, pipeline, toArray } from '../index';

describe('map', () => {
  it('works for an empty array', async () => {
    assert.deepEqual(
      await pipeline(
        all([]),
        map(() => {
          throw new Error('This should not happen');
        }),
        toArray,
      ),
      [],
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepEqual(
      (
        await pipeline(
          iterable,
          map((value) => value * 2),
          toArray,
        )
      ).sort(),
      [2, 4, 6],
    );
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepEqual(
      await pipeline(
        iterable,
        map((value, index) => value.length + index),
        toArray,
      ),
      [1, 3, 5],
    );
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepEqual(
      await pipeline(
        iterable,
        map((value) => value.length),
        map((value) => value * 2),
        map((value) => ''.padStart(value, ' ')),
        toArray,
      ),
      ['  ', '    ', '      '],
    );
  });

  it('reject if map function throws an exception', async () => {
    await assert.rejects(
      pipeline(
        from([1]),
        map(() => {
          throw new Error('Reject');
        }),
        toArray,
      ),
      { message: 'Reject' },
    );
    await assert.rejects(
      pipeline(
        all([Promise.resolve(1)]),
        map(() => {
          throw new Error('Reject');
        }),
        toArray,
      ),
      { message: 'Reject' },
    );
  });
});
