import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { runToolCli } from "../surfaces/cli.ts";
import { cliCommands } from "../surfaces/cli_commands.ts";
import { payloadSchema } from "../surfaces/cli_payload.ts";
import { validateInput } from "../surfaces/validate_input.ts";
import { manageCommitmentTool } from "../tools/manage_commitment_tool.ts";
import { recordEventTool } from "../tools/record_event_tool.ts";
import { validateToolInput } from "../tools/validate_tool_input.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

async function invoke(args: string[]) {
  let out = "";
  let err = "";
  const sink = (append: (text: string) => void) =>
    new Writable({
      write(chunk, _encoding, done) {
        append(String(chunk));
        done();
      },
    });
  const code = await runToolCli(args, {
    ...affinityCliOptions,
    stdout: sink((text) => {
      out += text;
    }),
    stderr: sink((text) => {
      err += text;
    }),
    stdin: Readable.from([]),
    openContext: () => {
      throw new Error("must not open database");
    },
  });
  return { code, out, err };
}

test("payload help and command descriptions expose shared schemas without opening a database", async () => {
  for (const command of ["event record", "commitment record"]) {
    const result = await invoke([...command.split(" "), "--help"]);
    assert.equal(result.code, 0, result.err);
    assert.match(result.out, /Payload \(--input\)/);
    assert.match(result.out, /Required: .*occurredAt:integer\|string/);
    assert.match(result.out, /participants:.*contactId\?:integer.*role:/);
    assert.match(result.out, /Optional: .*summary:string/);
    assert.match(result.out, /--input '\{.*participants/);
  }
  const described = await invoke(["describe", "event", "record"]);
  assert.equal(described.code, 0, described.err);
  const schema = JSON.parse(described.out);
  assert.equal(schema.anyOf.length, 4);
  assert.equal(
    schema.anyOf[0].properties.participants.items.properties.contactId.type,
    "integer",
  );
  assert.deepEqual(
    JSON.parse((await invoke(["describe", "event record"])).out),
    schema,
  );
  const interaction = JSON.parse(
    (await invoke(["describe", "event", "record", "--kind", "interaction"]))
      .out,
  );
  assert.ok(interaction.required.includes("type"));
  const tool = await invoke(["describe", "record_event"]);
  assert.match(tool.out, /^record_event\n/);
  assert.match(tool.out, /Parameter \| Type \| Required/);
  assert.notEqual(
    (await invoke(["describe", "event record", "--kind", "unknown"])).code,
    0,
  );
  for (const entry of cliCommands(affinitySurfaceTools)) {
    if (
      !entry.tool.inputSchema.properties?.input ||
      (entry.fields && !entry.fields.includes("input"))
    )
      continue;
    assert.match(
      (await invoke([...entry.path.split(" "), "--help"])).out,
      /Payload \(--input\)/,
      entry.path,
    );
  }
});

test("each event kind enforces exactly the documented required payload fields", () => {
  const surface = affinitySurfaceTools.find(
    (tool) => tool.name === "record_event",
  );
  assert.ok(surface);
  for (const kind of [
    "interaction",
    "observation",
    "milestone",
    "transaction",
  ]) {
    const schema = payloadSchema(surface.inputSchema, kind);
    const input: Record<string, unknown> = {
      type: "conversation",
      occurredAt: 1,
      summary: "Example",
      content: "Example",
      significance: 3,
      participants: [{ contactId: 1, role: "actor" }],
    };
    assert.deepEqual(validateInput(schema, input), []);
    for (const field of Object.keys(schema.properties ?? {})) {
      const omitted = { ...input };
      delete omitted[field];
      const required = schema.required?.includes(field) ?? false;
      assert.equal(
        validateInput(schema, omitted).length > 0,
        required,
        `${kind}.${field}`,
      );
      assert.equal(
        validateToolInput(recordEventTool.inputSchema, {
          kind,
          input: omitted,
        }) !== null,
        required,
        `handler ${kind}.${field}`,
      );
    }
  }
});

test("commitment variants enforce the documented required fields", () => {
  const surface = affinitySurfaceTools.find(
    (tool) => tool.name === "manage_commitment",
  );
  assert.ok(surface);
  for (const kind of ["promise", "agreement"]) {
    const schema = payloadSchema(surface.inputSchema, kind);
    const input: Record<string, unknown> = {
      commitmentType: kind,
      occurredAt: 1,
      summary: "Example",
      content: "Example",
      significance: 3,
      participants: [{ contactId: 1, role: "actor" }],
    };
    for (const field of Object.keys(schema.properties ?? {})) {
      const omitted = { ...input };
      delete omitted[field];
      const required = schema.required?.includes(field) ?? false;
      assert.equal(
        validateInput(schema, omitted).length > 0,
        required,
        `${kind}.${field}`,
      );
      assert.equal(
        validateToolInput(manageCommitmentTool.inputSchema, {
          action: "record",
          input: omitted,
        }) !== null,
        required,
        `handler ${kind}.${field}`,
      );
    }
    const missingText = Object.fromEntries(
      Object.entries(input).filter(
        ([key]) => !["summary", "content"].includes(key),
      ),
    );
    assert.ok(validateInput(schema, missingText).length);
    assert.ok(
      validateToolInput(manageCommitmentTool.inputSchema, {
        action: "record",
        input: missingText,
      }),
    );
  }
});
