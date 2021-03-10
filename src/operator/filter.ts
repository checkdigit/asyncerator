// operator/filter.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to Array.filter, only emit values from input for which filterFunction returns true.
 * @param filterFunction
 */
export default function <Input>(filterFunction: (value: Input) => boolean): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      if (filterFunction(item)) {
        yield item;
      }
    }
  };
}
