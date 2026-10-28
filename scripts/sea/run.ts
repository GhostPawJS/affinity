import { affinityCliOptions } from "../../src/surface/affinity_cli_options.ts";
import { quietOnClosedPipe } from "../../src/surface/quiet_epipe.ts";
import { runToolCli } from "../../src/surfaces/cli.ts";

export const run = (): Promise<void> => {
  quietOnClosedPipe();
  return runToolCli(process.argv.slice(2), affinityCliOptions).then(
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
};
