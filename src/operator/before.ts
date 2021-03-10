// operator/before.ts

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
