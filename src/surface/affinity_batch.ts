import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { CliUsageError } from "../surfaces/cli_args.ts";
import { affinityTools } from "../tools/tool_registry.ts";
import { withTransaction } from "../with_transaction.ts";
import { openAffinityDb } from "./open_affinity_db.ts";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

/** JSONL batch runner. A failed line rolls back independently within its chunk. */
export async function runAffinityBatch(
  args: string[],
  options: {
    db?: string;
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
  },
): Promise<number> {
  if (args.includes("--help")) {
    options.stdout.write(
      'Usage: ghostpaw-affinity batch [--chunk N] [--stop-on-error] < input.jsonl\nEach line: {tool,args} or {op:"event",kind,input}. Default: one transaction for all lines.\n',
    );
    return 0;
  }
  let chunk = Number.MAX_SAFE_INTEGER;
  let stop = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--stop-on-error") stop = true;
    else if (args[i] === "--chunk") {
      chunk = Number(args[++i]);
      if (!Number.isSafeInteger(chunk) || chunk < 1)
        throw new CliUsageError("--chunk must be a positive integer");
    } else throw new CliUsageError(`Unknown batch flag: ${args[i]}`);
  }
  const db = await openAffinityDb(
    resolveAffinityDbPath(options.db === undefined ? {} : { flag: options.db }),
  );
  let line = 0;
  let created = 0;
  let noOp = 0;
  let failed = 0;
  let invalidJson = false;
  const pending: { line: number; text: string }[] = [];
  const flush = () =>
    withTransaction(db, () => {
      const output: object[] = [];
      for (const entry of pending) {
        let result: {
          ok: boolean;
          outcome: string;
          id?: number;
          error?: unknown;
        };
        try {
          let input: {
            tool?: string;
            args?: unknown;
            op?: string;
            kind?: string;
            input?: unknown;
          };
          try {
            input = JSON.parse(entry.text);
          } catch {
            invalidJson = true;
            throw new Error("Invalid JSON");
          }
          if (!input || typeof input !== "object")
            throw new Error("Expected {tool,args}");
          const name = input.op === "event" ? "record_event" : input.tool;
          const tool = affinityTools.find((t) => t.name === name);
          if (!tool || tool.readOnly)
            throw new Error(`Unknown write tool: ${name}`);
          const payload =
            input.op === "event"
              ? { kind: input.kind, input: input.input }
              : input.args;
          // Handlers report domain failures as values; roll those back as well.
          const value = withTransaction(db, () => {
            const response = tool.handler(db, payload as never);
            if (!response.ok) throw response;
            return response;
          });
          const data = value.data as { primary?: { id?: number } };
          result = {
            ok: true,
            outcome: value.outcome,
            ...(data.primary?.id === undefined ? {} : { id: data.primary.id }),
          };
        } catch (error) {
          result = {
            ok: false,
            outcome: "error",
            error:
              error instanceof Error
                ? { message: error.message }
                : error && typeof error === "object" && "error" in error
                  ? error.error
                  : error,
          };
        }
        if (!result.ok) failed++;
        else if (result.outcome === "no_op") noOp++;
        else created++;
        output.push({ line: entry.line, ...result });
        if (!result.ok && stop) break;
      }
      return output;
    });
  const emit = () => {
    const output = flush();
    for (const row of output) options.stdout.write(`${JSON.stringify(row)}\n`);
    pending.length = 0;
  };
  try {
    for await (const text of createInterface({
      input: options.stdin,
      crlfDelay: Number.POSITIVE_INFINITY,
    })) {
      line++;
      if (!text.trim()) continue;
      pending.push({ line, text });
      if (pending.length >= chunk) emit();
      if (failed && stop) break;
    }
    if (pending.length) emit();
    options.stdout.write(
      `${JSON.stringify({ done: created + noOp + failed, created, noOp, failed })}\n`,
    );
    return invalidJson ? 2 : failed ? 1 : 0;
  } finally {
    db.close();
  }
}
