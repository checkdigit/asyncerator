// operator/sequence.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { all, from, pipeline, sequence, toArray } from '../index';

describe('sequence', () => {
  it('produces no values on an empty array', async () => {
    assert.deepEqual(
      await pipeline(
        all([]),
        sequence(async (index) => index),
        toArray,
      ),
      [],
    );
  });

  it('produces no values on non-async input', async () => {
    assert.deepEqual(
      await pipeline(
        from([-1, -2, -3]),
        sequence(async (index) => index),
        toArray,
      ),
      [-1, -2, -3],
    );
  });

  it('produces values on async input', async () => {
    assert.deepEqual(
      await pipeline(
        all([
          new Promise((resolve) => {
            setTimeout(() => resolve(123), 250);
          }),
          new Promise((resolve) => {
            setTimeout(() => resolve(456), 400);
          }),
        ]),
        sequence(async (index) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 170);
          });
          return index;
        }),
        toArray,
      ),
      [0, 123, 1, 456],
    );
  });

  it('throws error correctly when input promise rejects', async () => {
    const results: number[] = [];
    await assert.rejects(
      async () =>
        pipeline(
          all([
            new Promise((resolve) => {
              setTimeout(() => resolve(123), 250);
            }),
            new Promise((_, reject) => {
              // eslint-disable-next-line prefer-promise-reject-errors
              setTimeout(() => reject({ message: 456 }), 400);
            }),
          ]),
          sequence(async (index) => {
            results.push(index);
            await new Promise((resolve) => {
              setTimeout(resolve, 170);
            });
            return index;
          }),
          toArray,
        ),
      {
        message: 456,
      },
    );
    assert.deepEqual(results, [0, 1, 2]);
  });

  it('throws error correctly when sequence promise rejects', async () => {
    const results: number[] = [];
    await assert.rejects(
      async () =>
        pipeline(
          all([
            new Promise((resolve) => {
              setTimeout(() => resolve(123), 250);
            }),
            new Promise((resolve) => {
              setTimeout(() => resolve(456), 400);
            }),
          ]),
          sequence(async (index) => {
            results.push(index);
            await new Promise((_, reject) => {
              // eslint-disable-next-line prefer-promise-reject-errors
              setTimeout(() => reject({ message: 'abc' }), 320);
            });
            return index;
          }),
          toArray,
        ),
      {
        message: 'abc',
      },
    );
    assert.deepEqual(results, [0]);
  });

  it('do not throw error if sequence promise rejects after input is complete', async () => {
    assert.deepEqual(
      await pipeline(
        all([
          new Promise((resolve) => {
            setTimeout(() => resolve(123), 250);
          }),
          new Promise((resolve) => {
            setTimeout(() => resolve(456), 400);
          }),
        ]),
        sequence(async (index) => {
          if (index !== 0) {
            await new Promise((_, reject) => {
              // eslint-disable-next-line prefer-promise-reject-errors
              setTimeout(() => reject({ message: 'abc' }), 500);
            });
          }
          return index;
        }),
        toArray,
      ),
      [0, 123, 456],
    );
  });
});
