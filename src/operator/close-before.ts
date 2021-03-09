// operator/close-before.ts

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

export default function <Input>(when: (value: Input) => boolean): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      if (when(item)) {
        return;
      }
      yield item;
    }
  };
}
