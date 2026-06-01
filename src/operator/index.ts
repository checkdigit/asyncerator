// operator/index.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator.ts';

export type Operator<Input, Output> = (
  input: Asyncerator<Input>,
) => Asyncerator<Output>;

export { default as forEach } from './for-each.ts';
export { default as map } from './map.ts';
export { default as race } from './race.ts';
export { default as filter } from './filter.ts';
export { default as flat } from './flat.ts';
export { default as after } from './after.ts';
export { default as before } from './before.ts';
export { default as split } from './split.ts';
export { default as skip } from './skip.ts';
export { default as sequence } from './sequence.ts';
