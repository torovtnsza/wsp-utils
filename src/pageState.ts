// Page-world copy of the storage state. chrome.* doesn't exist in the page world, so
// content.ts pushes state here over window.postMessage and we post sent ids back.
import type { State } from "./types";

export let state: State = { commands: {}, scheduled: [] };
const listeners: (() => void)[] = [];
export const onStateChange = (fn: () => void) => listeners.push(fn);
export const markSent = (id: string) => window.postMessage({ wspSent: id }, location.origin);

window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data?.wspState) return;
  state = e.data.wspState;
  listeners.forEach((fn) => fn());
});
window.postMessage({ wspHello: true }, location.origin); // in case content.ts pushed before we listened
