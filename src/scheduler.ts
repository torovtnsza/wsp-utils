import { markSent, onStateChange, state } from "./pageState";
import { WPP } from "./wpp";

const MAX_DELAY = 2 ** 31 - 1; // setTimeout overflows past ~24.8 days and fires immediately
const sent = new Set<string>(); // storage removal is async; don't resend while it catches up
let timer: ReturnType<typeof setTimeout> | undefined;
let tail = Promise.resolve(); // one run at a time, so a due message can't be sent twice

// Returns false if anything failed, so run() retries later instead of spinning.
async function sendDue() {
  const due = state.scheduled.filter((s) => s.at <= Date.now() && !sent.has(s.id));
  if (!due.length) return true;
  const chats = await WPP.chat.list();
  let ok = true;
  for (const s of due) {
    try {
      const chat = chats.find((c) => c.formattedTitle === s.chat);
      if (!chat) throw new Error(`No chat named "${s.chat}"`);
      await WPP.chat.sendTextMessage(chat.id, s.text);
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
  const pending = state.scheduled.filter((s) => !sent.has(s.id));
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
}
