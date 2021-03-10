// operator/for-each.ts

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * Similar to Array.forEach, call forEachFunction for each value in the stream.
 * @param forEachFunction
 */
export default function <Input>(forEachFunction: (value: Input) => void): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      forEachFunction(item);
      yield item;
    }
  };
}
