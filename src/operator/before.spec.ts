// operator/before.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { all, before, forEach, from, pipeline, toArray } from '../index';

describe('before', () => {
  it('works for an empty array', async () => {
    const result = await pipeline(all([]), before('abc'), toArray);
    assert.deepStrictEqual(result, ['abc']);
  });

  it('operates on sequence', async () => {
    let count = 0;
    const results = await pipeline(
      from([3, 4, 5]),
      before(2),
      forEach(() => {
        count += 1;
      }),
      before(1),
      toArray
    );
    assert.deepStrictEqual(results, [1, 2, 3, 4, 5]);
    assert.strictEqual(count, 4);
  });
});
