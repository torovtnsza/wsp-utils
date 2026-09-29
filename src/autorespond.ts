import { state } from "./pageState";
import { WPP } from "./wpp";

const openedAt = Math.floor(Date.now() / 1000); // msg.t is in seconds

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
    WPP.chat.sendTextMessage(chat, state.commands[text]).catch(console.error);
  });
}
