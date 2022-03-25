// operator/flat.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to Array.flat, flatten array inputs into a single sequence of values.
 * @param depth
 */
export default function <Input>(depth = 1): Operator<Input, Input extends (infer T)[] ? T : Input> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      if (depth >= 1 && Array.isArray(item)) {
        for (const element of item.flat(depth - 1)) {
          yield element as Input extends (infer T)[] ? T : Input;
        }
      } else {
        yield item as Input extends (infer T)[] ? T : Input;
      }
    }
  };
}
