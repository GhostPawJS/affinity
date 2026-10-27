import { isSea } from "node:sea";

let npmEntry = false;

export function markNpmEntry(): void {
  npmEntry = true;
}

export function cliVersion(
  version: string,
  {
    sea = isSea,
    npm = npmEntry,
    platform = process.platform,
    arch = process.arch,
  }: {
    sea?: () => boolean;
    npm?: boolean;
    platform?: string;
    arch?: string;
  } = {},
): string {
  let binary = false;
  try {
    binary = sea();
  } catch {
    // Unavailable SEA detection uses the entry variant.
  }
  const target = `${platform === "win32" ? "windows" : platform}-${arch}`;
  return `affinity ${version} (${binary ? `binary, ${target}` : npm ? "npm" : "library"})`;
}
