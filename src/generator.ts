export const runGenerator = <T>(
  gen: Generator<unknown, Generator<T>, unknown>,
): T => {
  let result = gen.next();
  while (!result.done) {
    result = gen.next(result.value);
  }
  return result.value as T;
};
