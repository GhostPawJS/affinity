/** Contact export is a read even though the contact tool also supports writes. */
export function readOnlyTool(
  tool: { name: string; readOnly?: boolean },
  input: unknown,
): boolean | undefined {
  return (
    tool.readOnly ||
    (tool.name === "manage_contact" &&
      (input as { action?: string }).action === "export")
  );
}
