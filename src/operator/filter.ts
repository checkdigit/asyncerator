// operator/filter.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator.ts';

import type { Operator } from './index.ts';

export default function <Input, Output extends Input>(
  shouldInclude: (value: Input, index: number) => value is Output,
): Operator<Input, Output>;
export default function <Input>(
  shouldInclude: (value: Input, index: number) => boolean,
): Operator<Input, Input>;

/**
 * Similar to `Array.filter`, only emit values from input for which shouldInclude returns true.
 * @param shouldInclude
 */
export default function <Input>(
  shouldInclude: (value: Input, index: number) => boolean,
): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    let currentIndex = 0;
    for await (const item of iterator) {
      if (shouldInclude(item, currentIndex++)) {
        yield item;
      }
    }
  };
}
