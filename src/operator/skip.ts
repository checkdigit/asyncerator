// operator/skip.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Skip numberToSkip values at the start of a stream.
 * @param numberToSkip
 */
export default function <Input>(numberToSkip = 1): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    let count = 0;
    for await (const item of iterator) {
      if (count++ >= numberToSkip) {
        yield item;
      }
    }
  };
}
