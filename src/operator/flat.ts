// operator/flat.ts

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

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
