import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);

test("README carries every install one-liner from site/data/install.json", () => {
  const readme = readFileSync(new URL("README.md", root), "utf8");
  const { targets } = JSON.parse(
    readFileSync(new URL("site/data/install.json", root), "utf8"),
  ) as { targets: { id: string; cmd: string }[] };
  assert.deepEqual(
    targets.map((target) => target.id),
    ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "windows-x64"],
  );
  for (const target of targets) {
    assert.ok(
      readme.includes(`\n${target.cmd}\n`),
      `README is missing the ${target.id} one-liner`,
    );
    assert.ok(target.cmd.includes("SHA256SUMS"), `${target.id} must verify`);
  }
  const install = readme.indexOf("## Install");
  assert.ok(install > 0 && install < readme.indexOf("### npx / npm"));
  assert.ok(
    readme.indexOf("### npx / npm") <
      readme.indexOf("### Library (for harnesses)"),
  );
});
