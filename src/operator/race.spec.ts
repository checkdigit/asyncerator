// operator/race.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'node:assert';

import { all, from, pipeline, race, toArray } from '../index';

describe('race', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await pipeline(
        all([]),
        race(() => {
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
          race(async (value) => value * 2),
          toArray
        )
      ).sort(),
      [2, 4, 6]
    );
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      (
        await pipeline(
          iterable,
          race(async (value) => value.length),
          toArray
        )
      ).sort(),
      [1, 2, 3]
    );
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      (
        await pipeline(
          iterable,
          race(async (value) => value.length),
          race(async (value) => value * 2),
          race(async (value) => ''.padStart(value, ' ')),
          toArray
        )
      ).sort(),
      ['  ', '    ', '      ']
    );
  });

  it('reject if race function throws an exception', async () => {
    await assert.rejects(
      pipeline(
        from([1]),
        race(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
    await assert.rejects(
      pipeline(
        all([Promise.resolve(1)]),
        race(() => {
          throw Error('Reject');
        }),
        toArray
      ),
      /^Error: Reject$/u
    );
  });

  it('does something big', async () => {
    const inputArray = new Array(1000);
    for (let index = 0; index < inputArray.length; index++) {
      inputArray[index] = index;
    }

    const iterable = pipeline(
      from(inputArray),
      race(async (num) => {
        await new Promise((resolve) => {
          setTimeout(resolve, Math.floor(Math.random() * 10));
        });
        return num;
      })
    );
    const outputArray = await toArray(iterable);

    assert.deepStrictEqual(inputArray.sort(), outputArray.sort());
  });
});
