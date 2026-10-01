// Page-world copy of the storage state. chrome.* doesn't exist in the page world, so
// content.ts pushes state here over window.postMessage and we post sent ids back.
import { DEFAULT_HOTKEY } from "./hotkey";
import type { State } from "./types";

export let state: State = { commands: {}, files: {}, scheduled: [], colors: {}, rate: { count: 5, minutes: 10 }, hotkey: DEFAULT_HOTKEY };
const listeners: (() => void)[] = [];
export const onStateChange = (fn: () => void) => listeners.push(fn);
export const markSent = (id: string) => window.postMessage({ wspSent: id }, location.origin);

window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data?.wspState) return;
  state = e.data.wspState;
  listeners.forEach((fn) => fn());
});
window.postMessage({ wspHello: true }, location.origin); // in case content.ts pushed before we listened
