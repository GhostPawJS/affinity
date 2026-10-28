import type { ToolCliOptions } from "./cli.ts";
import {
  type CliArgument,
  type CliSpec,
  CliUsageError,
  parseCliArgs,
  renderCliHelp,
} from "./cli_args.ts";
import {
  cliExitCode,
  humanResult,
  plainJson,
  suggestCommand,
} from "./cli_output.ts";
import type { JsonSchema, SurfaceTool } from "./surface_types.ts";
import { validateInput } from "./validate_input.ts";

/** JSON payload bodies accept `@path`, `@-` and `@@`; every other value is literal. */
export const FILE_ARGS: ReadonlySet<string> = new Set(["input", "patch"]);

export function cliCommands<T>(tools: readonly SurfaceTool<T>[]) {
  return tools.flatMap((tool) => {
    const split = tool.name.indexOf("_");
    const cli = tool.cli ?? {
      noun: tool.name.slice(split + 1),
      verb: tool.name.slice(0, split),
    };
    const action =
      cli.action ??
      (tool.inputSchema.properties?.action?.enum
        ? { property: "action" }
        : undefined);
    const actions = action
      ? (tool.inputSchema.properties?.[action.property]?.enum ?? [])
      : [undefined];
    return actions.map((value) => {
      const verb =
        value === undefined
          ? cli.verb
          : (action?.verbs?.[String(value)] ?? String(value));
      return {
        tool,
        path: [cli.noun, verb].filter(Boolean).join(" "),
        fields: action?.fields?.[String(value)],
        required: action?.required?.[String(value)],
        fixed:
          action && value !== undefined ? { [action.property]: value } : {},
        positionals:
          action?.positionals?.[String(value)] ?? cli.positionals ?? [],
      };
    });
  });
}
export async function runCliCommand<T>(
  argv: string[],
  options: ToolCliOptions<T>,
): Promise<number | undefined> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const stdin = options.stdin ?? process.stdin;
  const args = [...argv];
  const tree = cliCommands(options.tools);
  let json = argv.includes("--json");
  let quiet = argv.includes("--quiet");
  let compact = false;
  let help = false;
  let db: string | undefined;
  const fail = (message: string, code: number) => {
    stderr.write(`${message}\n`);
    if (json && !quiet)
      stdout.write(
        `${JSON.stringify({ ok: false, error: { code: code === 2 ? "usage_error" : code === 3 ? "not_found" : "internal_error", message } })}\n`,
      );
    return code;
  };
  const legacy = ["tools", "describe", "call", "mcp", "skill", "batch"];
  let first: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (token === "--db") {
      i++;
      continue;
    }
    if (token.startsWith("-")) continue;
    first = token;
    break;
  }
  if (
    legacy.includes(first ?? "") ||
    options.tools.some(
      (tool) => tool.name.replace(/[-_]/g, "") === first?.replace(/[-_]/g, ""),
    )
  )
    return undefined;
  try {
    for (let i = 0; i < args.length; i++) {
      const flag = args[i];
      if (flag === "--") break;
      if (flag === "--db" || flag?.startsWith("--db=")) {
        db = flag === "--db" ? args.splice(i + 1, 1)[0] : flag.slice(5);
        if (!db || db.startsWith("--"))
          throw new CliUsageError("--db requires a path");
      } else if (flag === "--json") json = true;
      else if (flag === "--quiet") quiet = true;
      else if (flag === "--compact") compact = true;
      else if (flag === "--help" || flag === "-h") help = true;
      else if (["--version", "-V", "-v"].includes(flag ?? "")) {
        if (!quiet)
          stdout.write(`${options.versionLine?.() ?? options.version}\n`);
        return 0;
      } else if (flag !== "--no-color") continue;
      args.splice(i--, 1);
    }
    if (args[0] === "version") {
      if (!quiet)
        stdout.write(`${options.versionLine?.() ?? options.version}\n`);
      return 0;
    }
    if (args[0] === "help") {
      help = true;
      args.shift();
    }
    if (!args.length) help = true;
    const entry = tree.find((command) =>
      command.path.split(" ").every((part, i) => args[i] === part),
    );
    const isRequired = (command: (typeof tree)[number], name: string) => {
      if (command.required) return command.required.includes(name);
      if (command.tool.inputSchema.required?.includes(name)) return true;
      const description =
        command.tool.inputSchema.properties?.[name]?.description ?? "";
      const actions = description
        .match(/Required when action=([^.]+)/)?.[1]
        ?.split(/[, ]+/)
        .filter((word) => word !== "or");
      return (
        actions?.includes(String(Object.values(command.fixed)[0])) ?? false
      );
    };
    const specFor = (
      command: (typeof tree)[number],
      forHelp = false,
    ): CliSpec => {
      const argument = (name: string, schema: JsonSchema): CliArgument => ({
        name,
        ...(FILE_ARGS.has(name) ? { file: true } : {}),
        type:
          options.transformInput && /(?:At|-at)$|^(asOf|as-of|now)$/.test(name)
            ? "string"
            : schema.type === "object" ||
                (!schema.type &&
                  !schema.oneOf?.some((branch) => branch.type === "string"))
              ? "json"
              : ((schema.type ?? "string") as CliArgument["type"]),
        description: forHelp
          ? schema.description?.replace(/Required when action=[^.]+\. ?/g, "")
          : schema.description,
        enum: schema.enum,
        ...(schema.items?.type
          ? {
              itemType: (schema.items.type === "object" ||
              schema.items.type === "array"
                ? "json"
                : schema.items.type) as CliArgument["type"],
            }
          : {}),
      });
      const properties = command.tool.inputSchema.properties ?? {};
      return {
        command: `${options.bin} ${command.path}`,
        description: command.tool.description,
        positionals: command.positionals.map((name) => ({
          ...argument(name, properties[name] ?? {}),
          required: forHelp && isRequired(command, name),
          ...(properties[name]?.type === "array"
            ? {
                type:
                  (properties[name]?.items?.type as CliArgument["type"]) ??
                  "string",
                variadic: true,
              }
            : {}),
        })),
        flags: [
          ...(command.path === "contact create"
            ? [
                {
                  name: "if-exists",
                  type: "string" as const,
                  enum: ["error", "return"],
                  description:
                    "Identity conflict policy (default error). Return attaches nothing.",
                },
              ]
            : []),
          ...Object.entries(properties)
            .filter(
              ([name]) =>
                !(name in command.fixed) &&
                (!forHelp || !command.fields || command.fields.includes(name)),
            )
            .map(([name, schema]) => ({
              ...argument(
                name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
                schema,
              ),
              required: forHelp && isRequired(command, name),
              description: `${forHelp ? (schema.description?.replace(/Required when action=[^.]+\. ?/g, "") ?? "") : (schema.description ?? "")}${command.tool.inputSchema.required?.includes(name) ? " (required)" : ""}`,
            })),
        ],
      };
    };
    if (help) {
      const matches = tree.filter((command) =>
        command.path.startsWith(args.join(" ")),
      );
      if (!matches.length)
        throw new CliUsageError(`Unknown command: ${args.join(" ")}`);
      if (!quiet)
        stdout.write(
          entry
            ? renderCliHelp(specFor(entry, true))
            : `${options.versionLine?.() ?? `${options.bin} ${options.version}`}\n${options.description}\n\nCommands:\n${matches.map((command) => `  ${command.path}`).join("\n")}\n  mcp, skill, tools [--json], describe <tool>, call <tool> [JSON|-], completions <bash|zsh|fish>, version\nGlobal flags: --db <path>, --json, --quiet, --compact, --help/-h, --version/-V/-v, --no-color\n`,
        );
      if (options.describeDb && !quiet)
        stdout.write(`Database: ${options.describeDb(db)}\n`);
      return 0;
    }
    if (args[0] === "completions") {
      const shell = args[1];
      if (!["bash", "zsh", "fish"].includes(shell ?? ""))
        throw new CliUsageError("Expected completion shell: bash, zsh or fish");
      if (quiet) return 0;
      const words = [
        ...new Set(tree.flatMap((command) => command.path.split(" "))),
      ].concat([
        "mcp",
        "skill",
        "tools",
        "describe",
        "call",
        "completions",
        "version",
      ]);
      if (shell === "bash")
        stdout.write(`complete -W '${words.join(" ")}' ${options.bin}\n`);
      else if (shell === "zsh")
        stdout.write(
          `#compdef ${options.bin}\n_arguments '*:command:(${words.join(" ")})'\n`,
        );
      else if (shell === "fish")
        stdout.write(`complete -c ${options.bin} -f -a '${words.join(" ")}'\n`);
      else
        throw new CliUsageError("Expected completion shell: bash, zsh or fish");
      return 0;
    }
    // Diagnose flags before command matching, including flags before a command.
    const leadingFlag = args.findIndex((arg) => arg.startsWith("-"));
    if (leadingFlag === 0) {
      const flag = args[0]?.split("=")[0] ?? "";
      const suggestion = suggestCommand(flag, [
        "--db",
        "--json",
        "--quiet",
        "--compact",
        "--help",
        "--version",
        "--no-color",
      ]);
      throw new CliUsageError(
        `Unknown flag: ${flag}${suggestion ? `; did you mean ${suggestion}?` : ""}`,
      );
    }
    if (!entry) {
      const path = args
        .filter((x) => !x.startsWith("--"))
        .slice(0, 2)
        .join(" ");
      const aliases = new Map(
        tree.map((command) => [command.path, command.path]),
      );
      for (const command of tree) {
        if (!Object.keys(command.fixed).length)
          aliases.set(command.tool.name, command.path);
        if (command.path === "review")
          for (const view of command.tool.inputSchema.properties?.view?.enum ??
            []) {
            aliases.set(String(view).replaceAll(".", " "), `review ${view}`);
            aliases.set(`review ${view}`, `review ${view}`);
          }
      }
      const suggested = suggestCommand(path, [...aliases.keys()]);
      const suggestion = suggested ? aliases.get(suggested) : undefined;
      throw new CliUsageError(
        `Unknown command: ${path}.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
      );
    }
    const rest = args.slice(entry.path.split(" ").length);
    let ifExists: string | undefined;
    if (entry.path === "contact create") {
      const index = rest.findIndex(
        (arg) => arg === "--if-exists" || arg.startsWith("--if-exists="),
      );
      if (index >= 0) {
        const inline = rest[index]?.startsWith("--if-exists=");
        ifExists = inline
          ? rest[index]?.slice("--if-exists=".length)
          : rest[index + 1];
        if (!ifExists)
          throw new CliUsageError("--if-exists requires error or return");
        rest.splice(index, inline ? 1 : 2);
      }
    }
    let base: unknown = {};
    const spec = specFor(entry);
    const positionalIndexes: number[] = [];
    let ended = false;
    for (let i = 0; i < rest.length; i++) {
      const token = rest[i] as string;
      if (!ended && token === "--") {
        ended = true;
        continue;
      }
      if (!ended && token.startsWith("--")) {
        const flag = spec.flags?.find((arg) => `--${arg.name}` === token);
        if (!token.includes("=") && flag && flag.type !== "boolean") i++;
      } else positionalIndexes.push(i);
    }
    const stdinIndex =
      positionalIndexes.length === 1 &&
      rest[positionalIndexes[0] as number] === "-"
        ? positionalIndexes[0]
        : undefined;
    // Only read stdin implicitly when no command arguments were given:
    // harnesses often spawn with an open, never-closed stdin pipe.
    if (stdinIndex !== undefined || (!rest.length && !stdin.isTTY)) {
      if (stdinIndex !== undefined) rest.splice(stdinIndex, 1);
      let raw = "";
      for await (const chunk of stdin) raw += String(chunk);
      try {
        base = raw.trim() ? JSON.parse(raw) : {};
      } catch {
        throw new CliUsageError("Invalid stdin JSON");
      }
      if (!base || typeof base !== "object" || Array.isArray(base))
        throw new CliUsageError("Expected stdin JSON object");
    }
    const objectPositions = entry.positionals.filter(
      (name) => entry.tool.inputSchema.properties?.[name]?.type === "object",
    );
    if (
      objectPositions.length === 1 &&
      base &&
      typeof base === "object" &&
      Object.keys(base).length &&
      !((objectPositions[0] as string) in base)
    )
      base = { [objectPositions[0] as string]: base };
    const acceptsString = (schema: JsonSchema): boolean =>
      schema.type === "string" ||
      (Array.isArray(schema.type) && schema.type.includes("string")) ||
      [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].some(acceptsString);
    for (let i = 0; i < rest.length; i++) {
      const token = rest[i] as string;
      if (token === "--") break;
      if (!token.startsWith("--")) continue;
      const equal = token.indexOf("=");
      const name = (equal < 0 ? token.slice(2) : token.slice(2, equal)).replace(
        /-([a-z])/g,
        (_, c: string) => c.toUpperCase(),
      );
      const schema = entry.tool.inputSchema.properties?.[name];
      const flag = spec.flags?.find(
        (arg) =>
          arg.name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) ===
          name,
      );
      if (!schema || !flag || flag.type === "boolean") continue;
      const raw = equal < 0 ? rest[i + 1] : token.slice(equal + 1);
      if (raw === "-" && (flag.type === "json" || flag.type === "array")) {
        let text = "";
        for await (const chunk of stdin) text += String(chunk);
        if (equal < 0) rest[i + 1] = text;
        else rest[i] = `${token.slice(0, equal + 1)}${text}`;
      }
      if (
        raw !== undefined &&
        raw !== "-" &&
        flag.type === "json" &&
        acceptsString(schema) &&
        !(flag.file && raw.startsWith("@"))
      ) {
        try {
          JSON.parse(raw);
        } catch {
          if (equal < 0) rest[i + 1] = JSON.stringify(raw);
          else rest[i] = `${token.slice(0, equal + 1)}${JSON.stringify(raw)}`;
        }
      }
      if (equal < 0) i++;
    }
    let input = {
      ...(base as object),
      ...parseCliArgs(rest, spec),
      ...entry.fixed,
    };
    if (ifExists !== undefined)
      input.input = { ...(input.input as object), ifExists };
    for (const [key, schema] of Object.entries(
      entry.tool.inputSchema.properties ?? {},
    )) {
      if (
        schema.type === "array" &&
        schema.items?.type === "object" &&
        Array.isArray(input[key])
      )
        input[key] = input[key].flat();
    }
    input = (options.transformInput?.(input) ?? input) as typeof input;
    const errors = validateInput(entry.tool.inputSchema, input);
    if (errors.length) throw new CliUsageError(errors.join("\n"));
    const contextError = options.contextError?.(db, entry.tool, input);
    if (contextError) return fail(contextError, 3);
    const context = await options.openContext({
      ...(db === undefined ? {} : { db }),
      ...(options.reportCreation ? { stderr } : {}),
    });
    try {
      const result = await entry.tool.handler(context, input);
      const record = result as {
        ok?: boolean;
        outcome?: string;
        error?: { code?: string; message?: string };
        summary?: string;
        data?: unknown;
      };
      const code = cliExitCode(result);
      if (code)
        stderr.write(
          `${code === 70 ? "internal error: " : ""}${options.formatError?.(record.error?.message ?? record.summary ?? "Tool failed") ?? record.error?.message ?? record.summary ?? "Tool failed"}\n`,
        );
      if (!quiet)
        stdout.write(
          json || !(stdout as { isTTY?: boolean }).isTTY
            ? `${JSON.stringify(plainJson(result, compact || (!json && !(stdout as { isTTY?: boolean }).isTTY), options.formatError), null, compact ? undefined : 2)}\n`
            : humanResult(result),
        );
      return code;
    } finally {
      await options.closeContext?.(context);
    }
  } catch (error) {
    return fail(
      `${error instanceof CliUsageError ? "" : "internal error: "}${error instanceof Error ? error.message : String(error)}`,
      error instanceof CliUsageError ? 2 : 70,
    );
  }
}
