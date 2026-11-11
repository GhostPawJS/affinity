import { type Readable, Writable } from "node:stream";
import { batchSchema } from "./batch_schema.ts";
import { CliUsageError, readFileValue } from "./cli_args.ts";
import { FILE_ARGS, cliCommands, runCliCommand } from "./cli_commands.ts";
import { cliExitCode, humanResult, plainJson } from "./cli_output.ts";
import { payloadSchema } from "./cli_payload.ts";
import type { JsonSchema, SurfaceTool } from "./surface_types.ts";
import { validateInput } from "./validate_input.ts";

export interface ToolCliOptions<TCtx> {
  withTimeZone?: (
    zone: string,
    operation: () => Promise<number>,
  ) => Promise<number>;
  preflight?: (
    tool: SurfaceTool<TCtx>,
    input: unknown,
    db?: string,
  ) => Promise<TCtx | undefined>;
  transformInput?: (input: unknown) => unknown;
  formatError?: (message: string) => string;
  reportCreation?: boolean;
  beforeContext?: (
    db: string | undefined,
    stderr: Writable,
    quiet: boolean,
  ) => void;
  describeDb?: (db?: string) => string;
  versionLine?: () => string;
  versionInfo?: () => object;
  contextError?: (
    db: string | undefined,
    tool: SurfaceTool<TCtx>,
    input: unknown,
  ) => string | undefined;
  bin: string;
  version: string;
  description: string;
  tools: readonly SurfaceTool<TCtx>[];
  openContext(opts: { db?: string; stderr?: Writable }): TCtx | Promise<TCtx>;
  closeContext?: (ctx: TCtx) => void | Promise<void>;
  commands?: {
    migrate?: (opts: {
      db?: string;
      stderr?: Writable;
    }) => unknown | Promise<unknown>;
    mcp?: (opts: { db?: string }) => unknown | Promise<unknown>;
    skill?: (args?: string[]) => string | Promise<string>;
    batch?: (
      args: string[],
      options: {
        db?: string;
        stdin: Readable;
        stdout: Writable;
        stderr: Writable;
        beforeOpen?: () => void;
      },
    ) => Promise<number>;
  };
  stdin?: Readable & { isTTY?: boolean };
  stdout?: Writable;
  stderr?: Writable;
}
async function runToolCliInternal<TCtx>(
  argv: string[],
  providedOptions: ToolCliOptions<TCtx>,
): Promise<number> {
  let options = providedOptions;
  const end = argv.indexOf("--");
  let firstCommand: string | undefined;
  for (let i = 0; i < (end < 0 ? argv.length : end); i++) {
    if (argv[i] === "--db") {
      i++;
      continue;
    }
    if (!argv[i]?.startsWith("-")) {
      firstCommand = argv[i];
      break;
    }
  }
  if (
    argv
      .slice(0, end < 0 ? argv.length : end)
      .some((arg) => ["--version", "-V", "-v"].includes(arg)) ||
    firstCommand === "version"
  ) {
    if (!argv.includes("--quiet"))
      (options.stdout ?? process.stdout).write(
        `${argv.includes("--short") ? options.version : argv.includes("--json") ? JSON.stringify(options.versionInfo?.() ?? { version: options.version }) : (options.versionLine?.() ?? options.version)}\n`,
      );
    return 0;
  }
  const modern = await runCliCommand(argv, options);
  if (modern !== undefined) return modern;
  const quiet = argv.includes("--quiet");
  const explicitJson = argv.includes("--json") && !argv.includes("tools");
  if (quiet)
    options = {
      ...options,
      stdout: new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      }),
    };
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const stdin = options.stdin ?? process.stdin;
  const args = argv.filter(
    (arg) =>
      arg !== "--quiet" &&
      arg !== "--no-color" &&
      !(explicitJson && arg === "--json"),
  );
  let db: string | undefined;
  let compact = false;
  const fail = (message: string, code = 2) => {
    stderr.write(`${message}\n`);
    if (explicitJson)
      stdout.write(
        `${JSON.stringify({ ok: false, error: { code: "cli_error", message } })}\n`,
      );
    return code;
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db") {
      if (!args[i + 1] || args[i + 1]?.startsWith("--"))
        return fail("--db requires a path");
      db = args[i + 1];
      args.splice(i, 2);
      i--;
    } else if (args[i] === "--compact") {
      compact = true;
      args.splice(i, 1);
      i--;
    }
  }
  const ctxOptions = db === undefined ? {} : { db };
  const command = args.shift() ?? "help";
  const normalize = (name: string) => name.replace(/[-_]/g, "").toLowerCase();
  if (["help", "--help", "-h"].includes(command)) {
    stdout.write(
      `${options.versionLine?.() ?? `${options.bin} ${options.version}`}\n${options.description}\n\nUsage: ${options.bin} [--db path] <command>\nCommands: tools [--json], describe <tool>, call <tool> [JSON|-], <tool> --parameter value, mcp, skill, batch [--chunk N] [--stop-on-error]\nOptions: --help, --version, --compact, --tz <IANA zone>, --json (or GHOSTPAW_OUTPUT=json)\n\n${options.tools.map((tool) => `${tool.name}  ${tool.description}`).join("\n")}\n`,
    );
    return 0;
  }
  if (["--version", "-V", "-v", "version"].includes(command)) {
    stdout.write(`${options.versionLine?.() ?? options.version}\n`);
    return 0;
  }
  if (command === "tools") {
    stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(
            options.tools.map(
              ({ handler: _handler, cli: _cli, ...tool }) => tool,
            ),
            null,
            2,
          )}\n`
        : `${options.tools.map((tool) => `${tool.name}\t${tool.description.replace(/\s+/g, " ")}`).join("\n")}\n`,
    );
    return 0;
  }
  if (command === "batch") {
    if (!options.commands?.batch) return fail("batch command unavailable");
    return options.commands.batch(args, {
      beforeOpen: () => options.beforeContext?.(db, stderr, quiet),
      ...ctxOptions,
      stdin,
      stdout,
      stderr,
    });
  }
  if (command === "skill") {
    if (!options.commands?.skill) return fail("skill command unavailable");
    try {
      stdout.write(await options.commands.skill(args));
    } catch (error) {
      return fail(
        `${error instanceof CliUsageError ? "" : "internal error: "}${error instanceof Error ? error.message : String(error)}`,
        error instanceof CliUsageError ? 2 : 70,
      );
    }
    return 0;
  }
  if (command === "migrate") {
    if (!options.commands?.migrate) return fail("migrate command unavailable");
    if (args.includes("--help") || args.includes("-h")) {
      stdout.write(
        `Usage: ${options.bin} [--db path] migrate\nCreate or upgrade the database schema. Schema upgrades are reported on stderr.\n`,
      );
      return 0;
    }
    if (args.length) return fail("migrate accepts no arguments");
    await options.commands.migrate({ ...ctxOptions, stderr });
    return 0;
  }
  if (command === "mcp") {
    if (!options.commands?.mcp) return fail("mcp command unavailable");
    options.beforeContext?.(db, stderr, quiet);
    await options.commands.mcp(ctxOptions);
    return 0;
  }
  const name =
    command === "call" || command === "describe" ? args.shift() : command;
  const tool = options.tools.find(
    (tool) => normalize(tool.name) === normalize(name ?? ""),
  );
  if (!tool && command === "describe") {
    if (name === "batch" && !args.length) {
      stdout.write(`${JSON.stringify(batchSchema(options.tools), null, 2)}\n`);
      return 0;
    }
    const parts = [name ?? "", ...args];
    const kindIndex = parts.indexOf("--kind");
    const kind = kindIndex >= 0 ? parts[kindIndex + 1] : undefined;
    if (kindIndex >= 0) parts.splice(kindIndex, 2);
    const entry = cliCommands(options.tools).find(
      (entry) => entry.path === parts.join(" "),
    );
    if (entry) {
      try {
        stdout.write(
          `${JSON.stringify(payloadSchema(entry.tool.inputSchema, kind), null, 2)}\n`,
        );
        return 0;
      } catch (error) {
        return fail(String(error));
      }
    }
  }
  if (!tool) return fail(`Unknown tool: ${name ?? ""}`);
  if (command === "describe") {
    stdout.write(
      `${tool.name}\n${tool.description}\nUse when: ${tool.whenToUse ?? ""}\nNot for: ${tool.whenNotToUse ?? ""}\nRead only: ${tool.readOnly ?? false}\n\nParameter | Type | Required | Description\n${describeFields(tool.inputSchema).join("\n")}\n\n${JSON.stringify(tool.inputSchema, null, 2)}\n`,
    );
    return 0;
  }
  let input: unknown = {};
  try {
    const readStdin = async () => {
      let text = "";
      for await (const chunk of stdin) text += String(chunk);
      return text;
    };
    if (command === "call") {
      if (args.length > 1) return fail("Expected a single JSON argument");
      const raw = args[0];
      input = JSON.parse(
        raw === "-" || (raw === undefined && !stdin.isTTY)
          ? await readStdin()
          : raw === undefined
            ? "{}"
            : readFileValue(raw, "call input"),
      );
    } else {
      const values: Record<string, unknown> = {};
      const coerce = (value: string, schema: JsonSchema): unknown => {
        if (schema.type === "number" || schema.type === "integer")
          return Number(value);
        if (schema.type === "boolean") {
          if (!["true", "false"].includes(value))
            throw new Error("Expected true or false");
          return value === "true";
        }
        if (schema.type === "object" || schema.type === "array")
          return JSON.parse(value);
        if (schema.anyOf || schema.oneOf) {
          const branches = schema.anyOf ?? schema.oneOf ?? [];
          let converted: unknown;
          try {
            converted = JSON.parse(value);
          } catch {
            if (branches.some((branch) => branch.type === "string"))
              return value;
            throw new Error("Expected JSON");
          }
          if (
            branches.some((branch) => !validateInput(branch, converted).length)
          )
            return converted;
          return converted;
        }
        return value;
      };
      while (args.length) {
        const flag = args.shift();
        if (!flag?.startsWith("--"))
          return fail(`Expected parameter flag: ${flag}`);
        const equal = flag.indexOf("=");
        const key = equal === -1 ? flag.slice(2) : flag.slice(2, equal);
        const property = Object.keys(tool.inputSchema.properties ?? {}).find(
          (name) => normalize(name) === normalize(key),
        );
        if (!property) return fail(`Unknown parameter: ${key}`);
        const schema = tool.inputSchema.properties?.[property] as JsonSchema;
        let raw =
          equal === -1
            ? schema.type === "boolean" &&
              (!args[0] || args[0].startsWith("--"))
              ? "true"
              : args.shift()
            : flag.slice(equal + 1);
        if (raw === undefined) return fail(`Missing value: ${key}`);
        if (
          raw === "-" &&
          (schema.type === "object" ||
            schema.type === "array" ||
            schema.oneOf ||
            schema.anyOf)
        )
          raw = await readStdin();
        else if (FILE_ARGS.has(property)) raw = readFileValue(raw, property);
        if (schema.type === "array") {
          const prior = values[property];
          values[property] = [
            ...(Array.isArray(prior) ? prior : []),
            ...(raw.startsWith("[")
              ? JSON.parse(raw)
              : raw.split(",").map((item) => coerce(item, schema.items ?? {}))),
          ];
        } else
          values[property] =
            options.transformInput && /At$|^(asOf|now)$/.test(property)
              ? raw
              : coerce(raw, schema);
      }
      input = values;
    }
  } catch (cause) {
    return fail(
      `Invalid input: ${cause instanceof Error ? cause.message : String(cause)}`,
      2,
    );
  }
  try {
    input = options.transformInput?.(input) ?? input;
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : String(cause), 2);
  }
  const errors = validateInput(tool.inputSchema, input);
  if (errors.length) return fail(errors.join("\n"), 2);
  const contextError = options.contextError?.(db, tool, input);
  if (contextError) return fail(contextError, 3);
  let context: TCtx;
  try {
    options.beforeContext?.(db, stderr, quiet);
    context =
      (await options.preflight?.(tool, input, db)) ??
      (await options.openContext({
        ...ctxOptions,
        ...(options.reportCreation ? { stderr } : {}),
      }));
  } catch (cause) {
    return fail(
      `internal error: ${cause instanceof Error ? cause.message : String(cause)}`,
      70,
    );
  }
  try {
    const result = await tool.handler(
      context,
      input as Record<string, unknown>,
    );
    stdout.write(
      explicitJson || !(stdout as { isTTY?: boolean }).isTTY
        ? `${JSON.stringify(plainJson(result, compact || (!explicitJson && !(stdout as { isTTY?: boolean }).isTTY), options.formatError), null, compact ? undefined : 2)}\n`
        : humanResult(result),
    );
    const code = cliExitCode(result);
    if (code) {
      const r = result as { error?: { message?: string }; summary?: string };
      const message = r.error?.message ?? r.summary ?? "Tool failed";
      stderr.write(
        `${code === 70 ? "internal error: " : ""}${options.formatError?.(message) ?? message}\n`,
      );
    }
    return code;
  } catch (cause) {
    return fail(
      `internal error: ${cause instanceof Error ? cause.message : String(cause)}`,
      70,
    );
  } finally {
    await options.closeContext?.(context);
  }
}

export async function runToolCli<TCtx>(
  inputArgv: string[],
  options: ToolCliOptions<TCtx>,
): Promise<number> {
  const argv = inputArgv.map((arg) => (arg === "-q" ? "--quiet" : arg));
  const outputArgs =
    process.env.GHOSTPAW_OUTPUT === "json" && !argv.includes("--json")
      ? [...argv, "--json"]
      : argv;
  try {
    const args = [...outputArgs];
    let zone: string | undefined;
    for (let i = 0; i < args.length && args[i] !== "--"; i++) {
      const arg = args[i];
      if (arg === "--tz" || arg?.startsWith("--tz=")) {
        zone = arg === "--tz" ? args.splice(i + 1, 1)[0] : arg.slice(5);
        if (!zone || zone.startsWith("--"))
          throw new CliUsageError("--tz requires an IANA time zone");
        args.splice(i--, 1);
      }
    }
    if (zone !== undefined) {
      if (!options.withTimeZone) throw new CliUsageError("--tz is unavailable");
      try {
        return await options.withTimeZone(zone, () =>
          runToolCliInternal(args, options),
        );
      } catch (error) {
        throw new CliUsageError(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    return await runToolCliInternal(args, options);
  } catch (error) {
    const code = error instanceof CliUsageError ? 2 : 70;
    const message = `${code === 70 ? "internal error: " : ""}${error instanceof Error ? error.message : String(error)}`;
    (options.stderr ?? process.stderr).write(`${message}\n`);
    if (outputArgs.includes("--json") && !outputArgs.includes("--quiet"))
      (options.stdout ?? process.stdout).write(
        `${JSON.stringify({ ok: false, error: { code: "internal_error", message } })}\n`,
      );
    return code;
  }
}

function describeFields(schema: JsonSchema, prefix = ""): string[] {
  return Object.entries(schema.properties ?? {}).flatMap(([key, field]) => [
    `${prefix}${key} | ${field.type ?? (field.oneOf ?? field.anyOf)?.map((branch) => branch.type).join(" / ") ?? "any"} | ${schema.required?.includes(key) ?? false} | ${field.enum ? `${field.enum.join(", ")}. ` : ""}${field.description ?? ""}`,
    ...describeFields(field, `${prefix}${key}.`),
    ...(field.items ? describeFields(field.items, `${prefix}${key}[].`) : []),
  ]);
}
