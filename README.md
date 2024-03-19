# asyncerator

[![Dependency Status](https://img.shields.io/npm/l/asyncerator.svg)](https://www.npmjs.com/package/asyncerator)
[![Dependency Status](https://img.shields.io/npm/v/asyncerator.svg)](https://www.npmjs.com/package/asyncerator)
[![Dependency Status](https://img.shields.io/npm/dt/asyncerator.svg)](https://www.npmjs.com/package/asyncerator)

Copyright (c) 2021–2024 [Check Digit, LLC](https://checkdigit.com)

## Introduction

The `asyncerator` module provides three central capabilities:

- A standard Check Digit "blessed" definition of the de facto `Asyncerator<T>` interface.
- A strongly typed, promisified version of Node's [`stream.pipeline`](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) function.
- A library of simple source, transform and sink components that can be used standalone, or with `pipeline`.

### Installing

`npm install asyncerator`

## `Asyncerator<T>` interface

```
export interface Asyncerator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
```

The `Asyncerator` interface defined by this module is the minimum common `for-await` compatible interface that both
NodeJS.ReadableStream and AsyncIterableIterator implement. It's a useful construct to be used with the Node
14+ `stream.pipeline` function, since it allows `AsyncIterableIterators` and Node stream-based objects to be combined in
various convenient ways.

The following all implement the `Asyncerator` interface:

- `AsyncIterableIterator`
- `AsyncGenerator` (aka async generator functions)
- `NodeJS.ReadableStream` (internal Node implementations include `stream.Readable`, `readline`, `fs.createReadStream`, etc)
- the standard Javascript `for await...of` statement will accept an Asyncerator
- the upcoming [W3C Streams API](https://streams.spec.whatwg.org/#rs-asynciterator)

### Why do we need a custom interface for this?

It's not a custom interface, it's simply the de facto interface used by Node and elsewhere. It's just not defined anywhere.

Specifically:

- `Asyncerator` is similar to `AsyncIterableIterator`, but does not extend `AsyncIterator`.
- It's also similar to `AsyncIterable`, but `[Symbol.asyncIterator]()` returns an `AsyncIterableIterator`
  instead of an `AsyncIterator`.
- ...but it's not exactly either one. In particular, Typescript does not agree that Node streams implement either
  interface, which makes interoperability a problem in Typescript without `Asyncerator`.

## `asyncerator.pipeline`

`asyncerator.pipeline` is a strongly typed, promisified version of Node's
[`stream.pipeline`](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) function.

Its typing is complicated, but the basic form of the function is:

```
pipeline(
  source, // string | Readable | Iterable | AsyncIterable | Asyncerator
  ...transforms, // zero or more Transform | ((input: Asyncerator) => Asyncerator)
  sink // Writable | Transform | ((input: Asyncerator) => Promise<Sink>) | ((input: Asyncerator) => AsyncIterable),
  options?: PipelineOptions // only supported in Node 16 when returning Promise<Sink>, equivalent to Node 16 implementation
): Readable | Promise<Sink> | Promise<void>; {
```

The main advantage of the typings is that at compile-time, the outputs of each source or transformation must match the
input of the later transformation or sink. **This makes working with complex pipelines much less error-prone.**

In addition, the standard Node typings (`@types/node`) for `stream.pipeline` are woefully incorrect (as of 14.14.32)
to the point of being unusable.

Functionally, the Asyncerator `pipeline` function differs from the built-in `stream.pipeline` in that it returns a promise, or a
stream, depending on the type of the sink (last argument):

- if the sink is a Writable stream, return a `Promise<void>`.
- if the sink is an async function that returns a `Promise<T>`, return that promise.
- if the sink is an async generator function or a stream `Transform`, return a `Readable` stream.

Despite these differences, under the hood `stream.pipeline` is still used to perform the actual work.

### Quick example

```ts
import { filter, map, pipeline, split, toArray } from 'asyncerator';
import fs from 'fs';
import zlib from 'zlib';

// ...

// write a Gzipped file containing "hello" and "world" on two separate lines
await pipeline(
  ['hello', 'world'],
  map((string) => `${string}\n`),
  zlib.createGzip(),
  fs.createWriteStream(temporaryFile),
);

// read file using a pipeline
const result = await pipeline(
  fs.createReadStream(temporaryFile),
  zlib.createUnzip(),
  split('\n'),
  filter((string) => string !== ''),
  toArray,
); // ['hello', 'world']

// read file without pipeline (painful, don't do this!)
const result2 = await toArray(
  filter((string) => string !== '')(split('\n')(fs.createReadStream(temporaryFile).pipe(zlib.createUnzip()))),
); // ['hello', 'world']
```

## Sources

Sources return an object of type `Asyncerator<T>` that can be passed to `pipeline` as the first argument. Other than
these built-in functions, the other objects that are considered a "source" are `string`, arrays or basically anything
that implements the `Readable`, `Iterable` and `AsyncIterable` interfaces.

Some built-in source functions take an argument of type `Asyncable<T>`. Asyncables are anything that can be
turned into an Asyncerator: normal iterators and iterables, AsyncIterators, AsyncIterables, AsyncGenerators,
AsyncIterableIterators, and of course Asyncerators themselves.

### `all<T>(promises: Iterable<Promise<T>>): Asyncerator<T>`

Similar to `Promise.all()`, but instead returns values as they become available via an Asyncerator.
Note: the output order is not the same as the input order, the fastest promise to resolve
will be first, the slowest last.

### `merge<T>(...iterators: Asyncable<T | Asyncable<T>>[]): Asyncerator<T>`

Merge multiple asyncables into a single Asyncerator. If an iterator yields another Asyncerator,
merge its output into the stream.

### `series<T>(...iterators: Asyncable<T>[]): Asyncerator<T>`

Combine the output of iterators in a series. Requires all the iterators to complete.

## Sinks

These built-in convenience sink functions all return a `Promise` that will wait until the `Asyncerator` is done before
resolving, so be careful using this with endless iterators (in other words, don't do that). They can be used as the
last argument to `pipeline`, which causes it to return a `Promise`, along with:

- `Writable` (pipeline returns a `Promise<void>`)
- `(input: Asyncerator<Source>) => Promise<Sink>` (pipeline returns a `Promise<Sink>`)
- `Duplex` (pipeline returns a `Readable` stream)
- `((input: Asyncerator<Source>) => AsyncIterable<Sink>)` (pipeline returns a `Readable` stream)

### `reduce<Input, Output>(reduceFunction: (previousValue: Output, currentValue: Input, currentIndex: number) => Output, initialValue?: Input | Output): Promise<Input | Output | undefined>`

Calls the specified callback function for all the elements in a stream. The return value of the callback function
is the accumulated result, and is provided as an argument in the next call to the callback function.

Equivalent to the Javascript `Array.reduce()` method.

### `toArray<T>(iterator: Asyncable<T>): Promise<T[]>`

Turns a completed `Asyncerator` into an Array.

### `toNull<T>(iterator: Asyncable<T>): Promise<void>`

Drop the results of an `Asyncerator` into `/dev/null`.

### `toString<T>(iterator: Asyncable<T>): Promise<string>`

Turns a completed `Asyncerator` into a `string`.

## Operators

Operators are transformations that can be included anywhere in a `pipeline` except as a source. They take a stream of
inputs, and generate a stream of outputs. An operator function is equivalent to an implementation of the
Node `Duplex` or `Transform` interfaces, and can be used interchangeably within a `pipeline`.

The built-in operators all return something of type `Operator<Input, Output>` which is
a function with the signature `(input: Asyncerator<Input>) => Asyncerator<Output>`.

Async generator functions that take a single Asyncerator parameter are compatible with this signature.
Operators should generally be implemented using the following pattern:

```ts
function map<Input, Output>(mapFunction: (value: Input) => Output): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    for await (const item of iterator) {
      yield mapFunction(item);
    }
  };
}
```

It is straightforward to create custom operators and mix with streams, but it is important to note how they relate to
streams:

- returning (exiting) out of the function is equivalent to the `end` event of a stream. The pipeline will complete.
- `throw`-ing an error is equivalent to the `error` event of a stream. The pipeline will throw the error.
- streams in object mode will swallow `undefined` values emitted by sources and prior operators.
- streams in object mode will error on `null` values emitted by sources and prior operators.
- non-object mode streams will error on any value that is not a string, Buffer or Uint8Array.

### `after<Input>(value: Input): Operator<Input, Input>`

Emit a value after stream completes. Useful for adding a footer to a stream.

### `before<Input>(value: Input): Operator<Input, Input>`

Emit a value before a stream starts. Useful for adding a header to a stream.

### `filter<Input>(filterFunction: (value: Input, index: number) => boolean): Operator<Input, Input>`

Similar to `Array.filter`, only emit values from input for which `filterFunction` returns `true`.

### `flat<Input>(depth = 1): Operator<Input, Input extends (infer T)[] ? T : Input>`

Similar to `Array.flat`, flatten array inputs into a single sequence of values.

### `forEach<Input>(forEachFunction: (value: Input, index: number) => void): Operator<Input, Input>`

Similar to Array.forEach, call forEachFunction for each value in the stream.

### `map<Input, Output>(mapFunction: (value: Input, index: number) => Output): Operator<Input, Output>`

Similar to `Array.map`, transform each value using mapFunction.

### `race<Input, Output>(raceFunction: (value: Input) => Promise<Output>, concurrent?: number): Operator<Input, Output>`

Apply stream of values to the `raceFunction`, emitting output values in order of completion. By default, allows
up to 128 `concurrent` values to be processed.

### `sequence<Input>(sequenceFunction: (index: number) => Promise<Input>): Operator<Input, Input>`

The `sequenceFunction` will be called repeatedly with an incrementing numerical parameter, returning a Promise
that resolves with the same type as Input and is inserted into the stream. The sequence operator
passes through all other values. Because the `sequenceFunction` returns a Promise, it
can delay its response (using setTimeout) to emit values on a regular schedule, e.g., once a second:

```
pipeline(
  ...
  sequence(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    return 'this value is emitted once a second!';
  })
  ...
);
```

### `skip<Input>(numberToSkip = 1): Operator<Input, Input>`

Skip numberToSkip values at the start of a stream.

### `split<Input extends { toString: () => string }>(separator: string, limit?: number): Operator<Input, string>`

Equivalent of the Javascript `Array.split` method.

## Extended examples

### File system

Read a CSV file, output a new CSV file based on some logic:

```ts
import { filter, map, pipeline, race, split } from 'asyncerator';
import fs from 'fs';
import timeout from '@checkdigit/timeout';
import retry from '@checkdigit/retry';

async function main() {
  await pipeline(
    fs.createReadStream('./input.csv'),
    // turn buffers into string chunks
    map((buffer: Buffer) => buffer.toString()),
    // split chunks into lines
    split('\n'),
    // remove empty lines, and CSV header line
    filter((string) => string !== '' && string !== '"header1","header2","header3","header4"'),
    // transform string into an object
    map((line: string) => ({
      field1: line.split(',')[0] as string,
      field4: BigInt(line.split(',')[3] as string),
    })),
    // perform concurrent requests (up to 128 by default) - Note: DOES NOT PRESERVE ORDER
    race(
      retry((item) =>
        timeout(
          (async ({ field1, field4 }) => ({
            calculated: await someAsyncNetworkAPIFunction(field1),
            field1,
            field4, // type is infered to be a BigInt, because Typescript is awesome
          }))(item),
        ),
      ),
    ),
    // demonstrate use of an async generator to filter and transform objects into a string
    // (FYI could be done more easily using map and filter)
    async function* (iterator) {
      for await (const item of iterator) {
        if (doWeOutput(item)) {
          yield `${item.field1},${item.field2},${item.calculated}\n`;
        }
      }
    },
    fs.createWriteStream('./output.csv'),
  );
}
```

Note this code, in addition to the built-in asyncerator functionality, also uses `@checkdigit/timeout` and
`@checkdigit/retry` to implement retries with timeouts and exponential back-off.

### Sockets

A `pipeline` is an effective method for managing socket connections. On the server side, the inbound socket
can be both a source and a sink. On the client, a connection can be treated as a transform that takes an inbound
stream and provides the output stream (from the server) to the next stage of the pipeline:

```ts
import net from 'net';
import { filter, pipeline, map, split, toArray } from 'asyncerator';

// ...

// echo server
const server = net
  .createServer((socket) =>
    pipeline(
      socket,
      split('\n'),
      map((command) => `echo:${command}\n`),
      socket,
    ),
  )
  .listen(1234, '127.0.0.1');

// echo client
const received = await pipeline(
  'Hello Mr Server!\nRegards, Client.\n',
  new net.Socket().connect(1234, '127.0.0.1'),
  split('\n'),
  filter((line) => line !== ''),
  toArray,
); // ['echo:Hello Mr Server!', 'echo:Regards, Client.']
```

## License

MIT
