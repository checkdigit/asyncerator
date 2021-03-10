// sink/to-string.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { from, pipeline, toString } from '../index';

describe('toString', () => {
  it('converts an async iterable iterator into a string', async () => {
    assert.strictEqual(await pipeline(from(['hello', ' ', Promise.resolve('world')]), toString), 'hello world');
    assert.strictEqual(await pipeline(from([1, 2, 3]), toString), '123');
    assert.strictEqual(await pipeline(from([[1, 2, 3]]), toString), '1,2,3');
    assert.strictEqual(await pipeline(from([1, null, 3, undefined]), toString), '1null3undefined');
    assert.strictEqual(await pipeline(from([1, {}, 2n, true, false]), toString), '1[object Object]2truefalse');
    assert.strictEqual(await pipeline(from([1, {}, 2n, [true, false]]), toString), '1[object Object]2true,false');
  });
});
