// operator/index.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';
export type Operator<Input, Output> = (input: Asyncerator<Input>) => Asyncerator<Output>;

export { default as forEach } from './for-each';
export { default as map } from './map';
export { default as race } from './race';
export { default as filter } from './filter';
export { default as flat } from './flat';
export { default as after } from './after';
export { default as before } from './before';
export { default as split } from './split';
export { default as skip } from './skip';
export { default as sequence } from './sequence';
