// operator/map-dynamic.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('mapDynamic', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await all([])
        .mapDynamic(() => {
          throw new Error('This should not happen');
        })
        .toArray(),
      []
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual((await iterable.mapDynamic(async (value) => value * 2).toArray()).sort(), [2, 4, 6]);
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(await iterable.mapDynamic(async (value) => value.length).toArray(), [1, 2, 3]);
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      await iterable
        .mapDynamic(async (value) => value.length)
        .mapDynamic(async (value) => value * 2)
        .mapDynamic(async (value) => ''.padStart(value, ' '))
        .toArray(),
      ['  ', '    ', '      ']
    );
  });

  it('reject if map function throws an exception', async () => {
    await assert.rejects(
      from([1])
        .mapDynamic(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
    await assert.rejects(
      all([Promise.resolve(1)])
        .mapDynamic(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
  });

  it('does something big', async () => {
    const inputArray = new Array(100);
    for (let index = 0; index < inputArray.length; index++) {
      inputArray[index] = index;
    }

    // console.log(inputArray[23]);
    // const startTime = Date.now();

    const iterable = from(inputArray).mapDynamic(async (num) => num * 2);
    const outputArray = await iterable.toArray();

    assert.strictEqual(outputArray.length, 100);
    // console.log(Date.now() - startTime);
    // console.log(outputArray[23]);
  });
});
