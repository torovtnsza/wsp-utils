import { markSent, onStateChange, state } from "./pageState";
import { WPP } from "./wpp";

const SELF = /^\s*(me|yo|you)\s*$/i; // your own "Message yourself" chat, whatever its title
const MAX_DELAY = 2 ** 31 - 1; // setTimeout overflows past ~24.8 days and fires immediately
const sent = new Set<string>(); // storage removal is async; don't resend while it catches up
let timer: ReturnType<typeof setTimeout> | undefined;
let tail = Promise.resolve(); // one run at a time, so a due message can't be sent twice

const unsent = () => state.scheduled.filter((s) => !s.sent && !sent.has(s.id));
const ready = new Promise<void>((ok) => (WPP.isFullReady ? ok() : WPP.loader.onFullReady(ok)));

// The chat named exactly as in the chat list, or your own for "me".
async function findChat(name: string) {
  return SELF.test(name) ? WPP.conn.getMyUserId() : (await WPP.chat.list()).find((c) => c.formattedTitle === name)?.id;
}

// Returns false if anything failed, so run() retries later instead of spinning.
async function sendDue() {
  const due = unsent().filter((s) => s.at <= Date.now());
  if (!due.length) return true;
  let ok = true;
  for (const s of due) {
    try {
      const id = await findChat(s.chat);
      if (!id) throw new Error(`No chat named "${s.chat}"`);
      await WPP.chat.sendTextMessage(id, s.text);
      sent.add(s.id);
      markSent(s.id);
    } catch (e) {
      console.error(e);
      ok = false;
    }
  }
  return ok;
}

// Sleep until the next due message; nothing runs in between.
function arm() {
  clearTimeout(timer);
  if (!WPP.isFullReady) return; // onFullReady arms once WhatsApp has loaded
  const pending = unsent();
  if (!pending.length) return;
  const next = Math.min(...pending.map((s) => s.at));
  timer = setTimeout(() => (tail = tail.then(run)), Math.min(Math.max(0, next - Date.now()), MAX_DELAY));
}

async function run() {
  const ok = await sendDue().catch((e) => (console.error(e), false));
  if (ok) arm(); // re-arm even if nothing was sent (MAX_DELAY cap fired early)
  else timer = setTimeout(arm, 60_000); // retry failures in a minute
}

export function startScheduler() {
  onStateChange(arm);
  WPP.loader.onFullReady(arm);
  // The panel checks a chat exists before scheduling to it (panel.ts passes the question on).
  window.addEventListener("message", async (e) => {
    if (e.source !== window || !e.data?.wspFindChat) return;
    const { id, name } = e.data.wspFindChat;
    await ready;
    const found = !!(await findChat(name).catch(() => undefined));
    window.postMessage({ wspFoundChat: { id, found } }, location.origin);
  });
}
