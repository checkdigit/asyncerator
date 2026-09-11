// operator/flat.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator.ts';

import type { Operator } from './index.ts';

/**
 * Similar to `Array.flat`, flatten array inputs into a single sequence of values.
 * @param depth
 */
export default function <Input>(
  depth = 1,
): Operator<Input, Input extends (infer T)[] ? T : Input> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      if (depth >= 1 && Array.isArray(item)) {
        const elements = item.flat(depth - 1);
        for (const element of elements) {
          yield element as Input extends (infer T)[] ? T : Input;
        }
      } else {
        yield item as Input extends (infer T)[] ? T : Input;
      }
    }
  };
}
