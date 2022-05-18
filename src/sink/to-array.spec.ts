// sink/to-array.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'node:assert';

import { from, pipeline, toArray } from '../index';

describe('toArray', () => {
  it('converts an async iterable iterator into an array', async () => {
    assert.deepStrictEqual(await pipeline(from(['abc', Promise.resolve('def')]), toArray), ['abc', 'def']);
  });
});
