// Keep library guidance meaningful when it is displayed in a terminal.
const commands: Record<string, string> = {
  mergeContacts: "ghostpaw-affinity contact merge",
};

export function affinityCliError(message: string): string {
  let result = message;
  for (const [source, command] of Object.entries(commands))
    result = result.replaceAll(`use ${source}`, `use: ${command}`);
  return schemaUpgradeHint(result);
}

export function schemaUpgradeHint(result: string): string {
  if (
    /no such (?:table|column)|has no column named/i.test(result) &&
    !result.includes("affinity migrate")
  )
    result +=
      "; database schema needs an upgrade; run ghostpaw-affinity migrate (affinity migrate).";
  return result;
}
