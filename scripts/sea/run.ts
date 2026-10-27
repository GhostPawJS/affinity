import { affinityCliOptions } from "../../src/surface/affinity_cli_options.ts";
import { runToolCli } from "../../src/surfaces/cli.ts";

export const run = (): Promise<void> =>
  runToolCli(process.argv.slice(2), affinityCliOptions).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
