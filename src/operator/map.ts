// operator/map.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to Array.map, transform each value using mapFunction.
 * @param mapFunction
 */
export default function <Input, Output>(mapFunction: (value: Input) => Output): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      yield mapFunction(item);
    }
  };
}
