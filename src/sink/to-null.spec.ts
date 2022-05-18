// sink/to-null.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'node:assert';

import { from, pipeline, toNull } from '../index';

describe('toNull', () => {
  it('drops async iterable iterator into /dev/null', async () => {
    assert.deepStrictEqual(await pipeline(from(['abc', Promise.resolve('def')]), toNull), undefined);
  });
});
