// operator/before.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator.ts';

import type { Operator } from './index.ts';

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
