// sink/reduce.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import asyncerator, { Asyncerator } from '../asyncerator';

/**
 * Calls the specified callback function for all the elements in a stream. The return value of the callback function
 * is the accumulated result, and is provided as an argument in the next call to the callback function.
 * Equivalent to the Javascript Array.reduce() method.
 *
 * @param reduceFunction The reduce method calls the reduceFunction function one time for each element in the stream.
 * @param initialValue If initialValue is specified, it is used as the previousValue to start the accumulation.
 * Otherwise, the initial previousValue will be undefined.
 */

export type ReduceFunction<Input, Output> = (
  previousValue: Output,
  currentValue: Input,
  currentIndex: number
) => Output;

export default function <Input>(
  reduceFunction: ReduceFunction<Input, Input>,
  initialValue?: Input
): (iterator: Asyncerator<Input>) => Promise<Input | undefined>;
export default function <Input, Output>(
  reduceFunction: ReduceFunction<Input, Output>,
  initialValue?: Output
): (iterator: Asyncerator<Input>) => Promise<Output | undefined>;
export default function <Input, Output>(
  reduceFunction: ReduceFunction<Input, Input | Output | undefined>,
  initialValue?: Input | Output
): (iterator: Asyncerator<Input>) => Promise<Input | Output | undefined> {
  return async function (iterator: Asyncerator<Input>): Promise<Input | Output | undefined> {
    let accumulator: Output | Input | undefined = initialValue;
    let currentIndex = 0;
    for await (const chunk of asyncerator(iterator)) {
      accumulator = reduceFunction(accumulator, chunk, currentIndex++);
    }
    return accumulator;
  };
}
