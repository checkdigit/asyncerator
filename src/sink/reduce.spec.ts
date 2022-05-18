// sink/reduce.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';

import { after, before, from, pipeline, reduce } from '../index';
import type { ReduceFunction } from './reduce';

describe('reduce', () => {
  const adder = (current: number, previous: number) => current + previous;
  const addIndex = (current: number, previous: number, index: number) => current + previous + index;

  it('works in a pipeline', async () => {
    assert.equal(await pipeline([1, 2, 3], reduce(adder, 0)), 6);
    assert.equal(await pipeline([2, 3], before(1), reduce(adder, 0)), 6);
    assert.equal(await pipeline([1, 2, 3], reduce(addIndex, 0)), 9);
    assert.equal(await pipeline([1, 2, 3], after(4), reduce(addIndex, 0)), 16);
  });

  it('has identical behavior to Array.reduce', async () => {
    async function check<T, U>(
      array: Array<T>,
      reduceFunction: ReduceFunction<T, U>,
      initialValue?: T | U
    ): Promise<void> {
      let implementation;
      let implementationError;
      try {
        implementation = await reduce(
          reduceFunction as unknown as ReduceFunction<T, T>,
          initialValue as T
        )(from(array)); // ?
      } catch (error) {
        implementationError = error; // ?
      }
      let arrayReduce;
      let arrayReduceError;
      try {
        arrayReduce = array.reduce(reduceFunction as unknown as ReduceFunction<T, T>, initialValue as T); // ?
      } catch (error) {
        arrayReduceError = error; // ?
      }
      assert.deepEqual(implementation, arrayReduce);
      assert.deepEqual(implementationError, arrayReduceError);
    }

    await check([], () => '');
    await check([], () => '', '');
    await check([undefined], (_previous: string, _current) => '');
    await check([null], () => '');
    await check([1], () => {
      throw Error('Should be executed');
    });
    await check([], () => {
      throw Error('Should not be executed');
    });
    await check([1, 2, 3], (current, previous) => `${current}${previous}`, '!');
    await check([1, 2, 3], adder, 0);
    await check([1, 2, 3], adder, 4);
    await check(['a', 'b', 'c'], (current, previous) => current + previous, '');
    await check([1, 2, 3], addIndex, 0);
  });
});
