// bg_status / bg_list — structured views.

import * as store from "../state/session.js";
import type { SessionView } from "../state/types.js";

export function status(name?: string): SessionView | SessionView[] {
  if (name) {
    const v = store.view(name);
    if (!v) throw new Error(`session '${name}' not found`);
    return v;
  }
  return store.viewAll();
}

export function list(): SessionView[] {
  return store.viewAll();
}
