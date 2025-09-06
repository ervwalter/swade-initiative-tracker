export function isPlainObject(
  item: unknown
): item is Record<string, unknown> {
  return (
    item !== null && typeof item === "object" && item.constructor === Object
  );
}
