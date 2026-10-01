// Isolated world: the only side with chrome.storage. Relays state to the page world (main.ts)
// and marks scheduled messages the page world reports as sent.
import "./panel";
import { getState, setState } from "./storage";

const push = async () => window.postMessage({ wspState: await getState() }, location.origin);

window.addEventListener("message", async (e) => {
  if (e.source !== window) return;
  if (e.data?.wspHello) push();
  if (e.data?.wspSent) {
    const { scheduled } = await getState();
    await setState({ scheduled: scheduled.map((s) => (s.id === e.data.wspSent ? { ...s, sent: true } : s)) });
  }
});
chrome.storage.onChanged.addListener(push);
push();
