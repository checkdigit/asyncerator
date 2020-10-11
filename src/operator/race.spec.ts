// operator/race.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('race', () => {
  it('works for an empty array', async () => {
    assert.deepStrictEqual(
      await all([])
        .race(() => {
          throw new Error('This should not happen');
        })
        .toArray(),
      []
    );
  });

  it('operates on sequence of promises', async () => {
    const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    assert.deepStrictEqual((await iterable.race(async (value) => value * 2).toArray()).sort(), [2, 4, 6]);
  });

  it('operates on sequence of non-promises', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual((await iterable.race(async (value) => value.length).toArray()).sort(), [1, 2, 3]);
  });

  it('is chain-able', async () => {
    const iterable = from(['a', 'bb', 'ccc']);
    assert.deepStrictEqual(
      (
        await iterable
          .race(async (value) => value.length)
          .race(async (value) => value * 2)
          .race(async (value) => ''.padStart(value, ' '))
          .toArray()
      ).sort(),
      ['  ', '    ', '      ']
    );
  });

  it('reject if race function throws an exception', async () => {
    await assert.rejects(
      from([1])
        .race(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
    await assert.rejects(
      all([Promise.resolve(1)])
        .race(() => {
          throw Error('Reject');
        })
        .toArray(),
      /^Error: Reject$/u
    );
  });

  it('does something big', async () => {
    const inputArray = new Array(1000);
    for (let index = 0; index < inputArray.length; index++) {
      inputArray[index] = index;
    }

    // const startTime = Date.now();

    const iterable = from(inputArray).race(async (num) => {
      await new Promise((resolve) => {
        setTimeout(resolve, Math.floor(Math.random() * 10));
      });
      return num;
    });
    const outputArray = await iterable.toArray();

    assert.deepStrictEqual(inputArray.sort(), outputArray.sort());

    // console.log(Date.now() - startTime);
  });
});
