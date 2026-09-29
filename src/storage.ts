import type { State } from "./types";

const defaults: State = { commands: { "!ping": "pong🏓" }, scheduled: [] };

export async function getState(): Promise<State> {
  return { ...defaults, ...(await chrome.storage.local.get()) };
}

export const setState = (patch: Partial<State>) => chrome.storage.local.set(patch);
