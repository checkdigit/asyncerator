// operator/sequence.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { all, from, pipeline, sequence, toArray } from '../index';

describe('sequence', () => {
  it('produces no values on an empty array', async () => {
    assert.deepStrictEqual(
      await pipeline(
        all([]),
        sequence(async (index) => index),
        toArray
      ),
      []
    );
  });

  it('produces no values on non-async input', async () => {
    assert.deepStrictEqual(
      await pipeline(
        from([-1, -2, -3]),
        sequence(async (index) => index),
        toArray
      ),
      [-1, -2, -3]
    );
  });

  it('produces values on async input', async () => {
    assert.deepStrictEqual(
      await pipeline(
        all([
          new Promise((resolve) => {
            setTimeout(() => resolve(123), 25);
          }),
          new Promise((resolve) => {
            setTimeout(() => resolve(456), 40);
          }),
        ]),
        sequence(async (index) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 17);
          });
          return index;
        }),
        toArray
      ),
      [0, 123, 1, 456]
    );
  });
});
