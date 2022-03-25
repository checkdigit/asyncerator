// operator/filter.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { all, filter, from, pipeline, toArray } from '../index';

describe('filter', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await pipeline(
        all([]),
        filter(() => {
          throw new Error('This should not happen');
        }),
        toArray
      ),
      []
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual(
      (
        await pipeline(
          iterable,
          filter((value) => value !== 2),
          toArray
        )
      ).sort(),
      [1, 3]
    );
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      await pipeline(
        iterable,
        filter(() => true),
        toArray
      ),
      ['a', 'bb', 'ccc']
    );
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      await pipeline(
        iterable,
        filter((_, index) => index !== 0),
        filter((value) => value !== 'ccc'),
        toArray
      ),
      ['bb']
    );
  });

  it('reject if filter function throws an exception', async () => {
    await assert.rejects(
      pipeline(
        from([1]),
        filter(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
    await assert.rejects(
      pipeline(
        all([Promise.resolve(1)]),
        filter(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
  });
});
