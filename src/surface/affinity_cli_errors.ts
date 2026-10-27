// Keep library guidance meaningful when it is displayed in a terminal.
const commands: Record<string, string> = {
  mergeContacts: "ghostpaw-affinity contact merge",
};

export function affinityCliError(message: string): string {
  let result = message;
  for (const [source, command] of Object.entries(commands))
    result = result.replaceAll(`use ${source}`, `use: ${command}`);
  return result;
}
