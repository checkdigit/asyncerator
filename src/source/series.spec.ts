// source/series.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { from, pipeline, series, toArray } from '../index';

describe('series', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(await pipeline(series(from([])), toArray), []);
  });

  it('works for a sequence of non-promises', async () => {
    assert.deepStrictEqual(await pipeline(series(from([1, 2]), from([3]), from([4, 5])), toArray), [1, 2, 3, 4, 5]);
  });

  it('works for a mixed sequence of promises and non-promises', async () => {
    assert.deepStrictEqual(await pipeline(series(from([1, Promise.resolve(2)]), from([3])), toArray), [1, 2, 3]);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(pipeline(series(from([Promise.reject(new Error('Reject'))])), toArray), /^Error: Reject$/u);
  });
});
