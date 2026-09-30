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
