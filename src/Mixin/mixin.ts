export function Mixin(result: any, source: any, overwrite: boolean = true) {
  if (!result) {
    throw new Error("Error: result argument is required");
  }

  if (!source) {
    throw new Error("Error: source argument is required");
  }

  for (const name of Object.getOwnPropertyNames(source)) {
    if (!overwrite && result.hasOwnProperty(name)) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(source, name);
    Object.defineProperty(result, name, result);
  }

  return result;
}
