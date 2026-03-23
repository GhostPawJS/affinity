import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { AffinityDb } from "../database.ts";
import type { ToolResult } from "../tools/tool_types.ts";

export interface AffinityDemoContext {
  db: AffinityDb;
  revision: number;
  mutate: () => void;
  toast: (result: ToolResult<unknown>) => void;
}

export const AffinityContext = createContext<AffinityDemoContext | null>(null);

export function useAffinity(): AffinityDemoContext {
  const ctx = useContext(AffinityContext);
  if (ctx === null) {
    throw new Error("useAffinity must be used inside AffinityContext.Provider");
  }
  return ctx;
}
