// operator/skip.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { all, from, pipeline, skip, toArray } from '../index';

describe('skip', () => {
  it('works for an empty array', async () => {
    assert.deepEqual(await pipeline(all([]), skip(), toArray), []);
  });

  it('operates a on sequence', async () => {
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(-1), toArray), ['a', 'b', 'c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(0), toArray), ['a', 'b', 'c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(0.6), toArray), ['b', 'c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(), toArray), ['b', 'c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(2), toArray), ['c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(3), toArray), []);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(Infinity), toArray), []);
  });

  it('is chain-able', async () => {
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), toArray), ['c']);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), skip(), toArray), []);
    assert.deepEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), skip(), skip(), toArray), []);
  });
});
