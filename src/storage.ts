import type { State } from "./types";

const defaults: State = { commands: { "!ping": "pong🏓" }, files: {}, scheduled: [], colors: {}, rate: { count: 5, minutes: 10 } };

export async function getState(): Promise<State> {
  return { ...defaults, ...(await chrome.storage.local.get()) };
}

export const setState = (patch: Partial<State>) => chrome.storage.local.set(patch);
