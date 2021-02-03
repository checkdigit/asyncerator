// operator/flat.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('flat', () => {
  it('operates on sequence of promises', async () => {
    const iterable = all<unknown>([Promise.resolve(1), Promise.resolve([2, 3]), Promise.resolve([4, [[5], 6]])]);
    assert.deepStrictEqual((await iterable.flat().toArray()).sort(), [1, 2, 3, 4, [[5], 6]]);
  });

  it('behaves the same as built-in Array.flat()', async () => {
    async function check(array: unknown[], depth = 1) {
      assert.deepStrictEqual(await from(array).flat(depth).toArray(), array.flat(depth));
    }

    await Promise.all(
      [[], [1], [1, [2]], [1, [2, [3]]], [1, [2, [3, [4, [5]]]]], [1, [2, [3, [4, [5, [6, [7, 8, 9]]]]]]]].map(
        async (item) => {
          await check(item, 0);
          await check(item, 1);
          await check(item, 2);
          await check(item, 3);
          await check(item, Infinity);
        }
      )
    );
  });
});
