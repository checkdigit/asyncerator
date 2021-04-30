// operator/timer.spec.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { all, from, pipeline, timer, toArray } from '../index';

describe('timer', () => {
  it('produces no values on an empty array', async () => {
    assert.deepStrictEqual(
      await pipeline(
        all([]),
        timer(async (sequence) => sequence),
        toArray
      ),
      []
    );
  });

  it('produces no values on non-async input', async () => {
    assert.deepStrictEqual(
      await pipeline(
        from([-1, -2, -3]),
        timer(async (sequence) => sequence),
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
            setTimeout(() => resolve(123), 10);
          }),
          new Promise((resolve) => {
            setTimeout(() => resolve(456), 20);
          }),
        ]),
        timer(async (sequence) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 8);
          });
          return sequence;
        }),
        toArray
      ),
      [0, 123, 1, 456]
    );
  });
});
