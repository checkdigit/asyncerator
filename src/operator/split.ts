// operator/split.ts

export default async function* <T>(iterator: AsyncIterable<T>, separator: string, limit = Infinity) {
  if (limit === 0) {
    return;
  }

  let previous = '';
  let count = 0;
  for await (const chunk of iterator) {
    if (
      typeof chunk === 'undefined' ||
      chunk === null ||
      typeof (chunk as { toString: Function }).toString !== 'function'
    ) {
      throw Error(`${JSON.stringify(chunk)} not convertible to a string`);
    }
    previous += (chunk as { toString: Function }).toString();
    let index;
    while (previous.length > 0 && (index = separator === '' ? 1 : previous.indexOf(separator)) >= 0) {
      const line = previous.slice(0, index);
      yield line;
      if (++count >= limit) {
        return;
      }
      previous = previous.slice(index + (separator === '' ? 0 : 1));
    }
  }
  if ((separator !== '' && count > 0) || (previous.length > 0 && count < limit)) {
    yield previous;
  }
}
