// operator/before.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Emit a value before a stream starts.
 * @param value
 */
export default function <Input>(value: Input): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    yield value;
    yield* iterator;
  };
}
