// operator/skip.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { all, from, pipeline, skip, toArray } from '../index';

describe('skip', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(await pipeline(all([]), skip(), toArray), []);
  });

  it('operates a on sequence', async () => {
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(-1), toArray), ['a', 'b', 'c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(0), toArray), ['a', 'b', 'c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(0.6), toArray), ['b', 'c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(), toArray), ['b', 'c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(2), toArray), ['c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(3), toArray), []);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(Infinity), toArray), []);
  });

  it('is chain-able', async () => {
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), toArray), ['c']);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), skip(), toArray), []);
    assert.deepStrictEqual(await pipeline(from(['a', 'b', 'c']), skip(), skip(), skip(), skip(), toArray), []);
  });
});
