// source/all.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { all, pipeline, toArray } from '../index';

describe('all', () => {
  it('works for an empty array', async () => {
    assert.deepEqual(await pipeline(all([]), toArray), []);
  });

  it('converts array of promises into async iterable iterator', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepEqual((await pipeline(iterable, toArray)).sort(), [1, 2, 3]);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(pipeline(all([Promise.reject(new Error('Reject'))]), toArray), /^Error: Reject$/u);
    await assert.rejects(
      pipeline(all([Promise.resolve(1), Promise.reject(new Error('Reject')), Promise.resolve(3)]), toArray),
      /^Error: Reject$/u
    );
  });
});
