type DefinedOptions<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

export function definedOptions<T extends object>(
  options: T,
): DefinedOptions<T> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as DefinedOptions<T>;
}
