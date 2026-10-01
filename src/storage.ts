import { DEFAULT_HOTKEY } from "./hotkey";
import type { State } from "./types";

const defaults: State = { commands: { "!ping": "pong🏓" }, files: {}, scheduled: [], colors: {}, rate: { count: 5, minutes: 10 }, hotkey: DEFAULT_HOTKEY };

export async function getState(): Promise<State> {
  return { ...defaults, ...(await chrome.storage.local.get()) };
}

export const setState = (patch: Partial<State>) => chrome.storage.local.set(patch);
