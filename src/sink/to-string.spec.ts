// sink/to-string.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { from, pipeline, toString } from '../index';

describe('toString', () => {
  it('converts an async iterable iterator into a string', async () => {
    assert.equal(await pipeline(from(['hello', ' ', Promise.resolve('world')]), toString), 'hello world');
    assert.equal(await pipeline(from([1, 2, 3]), toString), '123');
    assert.equal(await pipeline(from([[1, 2, 3]]), toString), '1,2,3');
    assert.equal(await pipeline(from([1, null, 3, undefined]), toString), '1null3undefined');
    assert.equal(await pipeline(from([1, {}, 2n, true, false]), toString), '1[object Object]2truefalse');
    assert.equal(await pipeline(from([1, {}, 2n, [true, false]]), toString), '1[object Object]2true,false');
  });
});
