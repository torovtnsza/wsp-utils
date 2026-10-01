import { state } from "./pageState";
import { WPP } from "./wpp";

const openedAt = Math.floor(Date.now() / 1000); // msg.t is in seconds
const replied = new Map<string, number[]>(); // chat -> when we auto-replied to others there lately

// Someone spamming a command can't make you send more than rate.count replies per chat every
// rate.minutes; bursts of automated messages are what get accounts banned.
function allowed(chat: string) {
  const { count, minutes } = state.rate;
  const now = Date.now();
  const recent = (replied.get(chat) ?? []).filter((t) => now - t < minutes * 60_000);
  const ok = recent.length < count;
  if (ok) recent.push(now);
  replied.set(chat, recent);
  return ok;
}

// Every chat, including commands you send yourself (from here or your phone).
export function startAutorespond() {
  WPP.on("chat.new_message", (msg) => {
    // Messages from before WhatsApp Web was opened still arrive here via sync; msg.t filters them.
    if (msg.type !== "chat" || !msg.body || (msg.t ?? 0) < openedAt) return;
    const chat = msg.id.remote.toString();
    const text = msg.body.trim();
    if (chat === "status@broadcast" || !Object.hasOwn(state.commands, text)) return;
    // Our own auto-reply; stops !a -> !a loops.
    // ponytail: you can't trigger a command that's also another command's reply; track sent ids if needed
    if (msg.id.fromMe && Object.values(state.commands).includes(text)) return;
    if (!msg.id.fromMe && !allowed(chat)) return; // your own commands always run
    const reply = state.commands[text];
    const file = state.files[text];
    (file
      ? WPP.chat.sendFileMessage(chat, file.data, {
          ...(file.gif ? { type: "video", isGif: true } : { type: "auto-detect" }),
          filename: file.name,
          caption: reply || undefined,
        })
      : WPP.chat.sendTextMessage(chat, reply)
    ).catch(console.error);
  });
}
