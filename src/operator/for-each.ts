// operator/for-each.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to Array.forEach, call forEachFunction for each value in the stream.
 * @param forEachFunction
 */
export default function <Input>(forEachFunction: (value: Input, index: number) => void): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    let currentIndex = 0;
    for await (const item of iterator) {
      forEachFunction(item, currentIndex++);
      yield item;
    }
  };
}
