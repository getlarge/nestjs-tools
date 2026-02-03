/**
 * Accumulates field values into a body object.
 * - First occurrence: stores as single value
 * - Second occurrence: converts to array [first, second]
 * - Subsequent occurrences: appends to existing array
 */
export function accumulateField(body: Record<string, unknown>, fieldname: string, value: unknown): void {
  const existing = body[fieldname];

  if (existing === undefined) {
    // First occurrence - store as single value
    body[fieldname] = value;
  } else if (Array.isArray(existing)) {
    // Already an array - append
    existing.push(value);
  } else {
    // Second occurrence - convert to array
    body[fieldname] = [existing, value];
  }
}
