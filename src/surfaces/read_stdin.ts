import type { Readable } from "node:stream";

export async function readStdin(stdin: Readable): Promise<string> {
  let text = "";
  for await (const chunk of stdin) text += String(chunk);
  return text;
}
