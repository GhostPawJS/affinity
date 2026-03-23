export function summarizeCount(count: number, singular: string): string {
  if (count === 0) {
    return `No ${singular}s found.`;
  }
  if (count === 1) {
    return `Found 1 ${singular}.`;
  }
  return `Found ${count} ${singular}s.`;
}
