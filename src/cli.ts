import { affinityCliOptions } from "./surface/affinity_cli_options.ts";
import { runToolCli } from "./surfaces/cli.ts";

import { markNpmEntry } from "./surface/cli_version.ts";

markNpmEntry();
process.exitCode = await runToolCli(process.argv.slice(2), affinityCliOptions);
