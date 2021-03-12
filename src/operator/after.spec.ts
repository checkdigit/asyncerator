// operator/after.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { after, all, forEach, from, pipeline, toArray } from '../index';

describe('after', () => {
  it('works for an empty array', async () => {
    const result = await pipeline(all([]), after('abc'), toArray);
    assert.deepStrictEqual(result, ['abc']);
  });

  it('operates on sequence', async () => {
    let count = 0;
    const results = await pipeline(
      from([1, 2, 3]),
      after(4),
      forEach(() => {
        count += 1;
      }),
      after(5),
      toArray
    );
    assert.deepStrictEqual(results, [1, 2, 3, 4, 5]);
    assert.strictEqual(count, 4);
  });
});
