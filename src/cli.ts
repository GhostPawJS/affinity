import { affinityCliOptions } from "./surface/affinity_cli_options.ts";
import { markNpmEntry } from "./surface/cli_version.ts";
import { quietOnClosedPipe } from "./surface/quiet_epipe.ts";
import { runToolCli } from "./surfaces/cli.ts";

markNpmEntry();
quietOnClosedPipe();
process.exitCode = await runToolCli(process.argv.slice(2), affinityCliOptions);
