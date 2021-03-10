// operator/after.ts

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Emit a value after stream completes.
 * @param value
 */
export default function <Input>(value: Input): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    yield* iterator;
    yield value;
  };
}
