// operator/map.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to `Array.map`, transform each value using mapFunction.
 * @param mapFunction
 */
export default function <Input, Output>(mapFunction: (value: Input, index: number) => Output): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    let currentIndex = 0;
    for await (const item of iterator) {
      yield mapFunction(item, currentIndex++);
    }
  };
}
