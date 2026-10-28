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
  const info = cliVersionInfo(version, { sea, npm, platform, arch });
  return `affinity ${version} (${info.variant === "binary" ? `binary, ${info.target}` : info.variant})`;
}

export function cliVersionInfo(
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
) {
  let binary = false;
  try {
    binary = sea();
  } catch {
    // Unavailable SEA detection uses the entry variant.
  }
  const target = `${platform === "win32" ? "windows" : platform}-${arch}`;
  return {
    name: "@ghostpaw/affinity",
    version,
    variant: binary ? "binary" : npm ? "npm" : "library",
    target: binary ? target : null,
  };
}
