// bg_restart — atomic stop + start. Preserves command/cwd/tags if not given.

import * as store from "../state/session.js";
import { start } from "./start.js";
import { stop } from "./stop.js";
import type { StartResult } from "../state/types.js";

export interface RestartArgs {
  name: string;
  command?: string;
  cwd?: string;
  ttl?: number;
  tags?: string[];
}

export async function restart(args: RestartArgs): Promise<StartResult> {
  if (store.isRunning(args.name)) {
    await stop(args.name);
  }
  const prev = store.get(args.name);
  const command = args.command ?? prev?.command;
  if (!command) {
    throw new Error(
      `cannot restart '${args.name}': no previous command and none provided`,
    );
  }

  return await start({
    name: args.name,
    command,
    cwd: args.cwd ?? prev?.cwd,
    ttl: args.ttl ?? prev?.ttl ?? undefined,
    tags: args.tags ?? prev?.tags ?? [],
  });
}
