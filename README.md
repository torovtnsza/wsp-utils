<p align="center"><img src="icons/icon128.png" width="96" alt=""></p>

<h1 align="center">wsp-utils</h1>

<p align="center">Schedule messages and set up auto-reply commands on WhatsApp Web, from a panel that slides out of the sidebar.</p>

> **Unofficial.** Not affiliated with, endorsed by or connected to WhatsApp or Meta. Automating WhatsApp goes against its [Terms of Service](https://www.whatsapp.com/legal/terms-of-service), and WhatsApp can ban accounts that behave like bots. Use it at your own risk, and keep auto-replies low-volume.

## Features

- **Scheduled messages.** Pick a chat, write a message, choose a time. Type `me` (or `yo`, `you`) to send it to your own "Message yourself" chat.
- **Auto-reply commands.** When a message is exactly a command (say `!ping`), the extension replies for you, with text, a file, or a video sent as a looping GIF.
- **Rate limit.** Caps how many auto-replies each chat can get from you, so nobody can make your account spam.
- **Side panel inside WhatsApp Web.** Opens from the left icon bar, from a shortcut, or from the toolbar button.

## Install

There's no store release yet; load it from source. You need [Node.js](https://nodejs.org) and Chrome (or any Chromium browser: Edge, Brave…).

```sh
git clone https://github.com/torovtnsza/wsp-utils.git
cd wsp-utils
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `wsp-utils` folder (the one with `manifest.json`).

After pulling changes, run `npm run build` again and press the reload button on the extension's card.

## Usage

Open [web.whatsapp.com](https://web.whatsapp.com) and log in.

### Opening the panel

| How | Closes when |
| --- | --- |
| Hover the grey line in the empty middle of WhatsApp's left icon bar | The mouse leaves the panel (unless you're typing in a field) |
| <kbd>Alt</kbd>+<kbd>W</kbd> | You click outside it, or press <kbd>Alt</kbd>+<kbd>W</kbd> again |
| The extension's toolbar button (opens WhatsApp Web if it isn't open) | You click outside it |

From any of them, the thin red line at the top closes it, and <kbd>Esc</kbd> closes it **and clears what you typed**.

### Scheduling a message

Fill in the chat, the message and the time, then press <kbd>Enter</kbd>. The chat name has to match the chat list exactly.

- Scheduled messages are sent by the open WhatsApp Web tab. **Keep it open.** If it was closed when one was due, it goes out the next time you open WhatsApp Web.
- If two chats have the same name, the first one in the chat list gets it. Rename one of them in your contacts to tell them apart.

### Commands

Type the trigger (`!ping`) and the reply, then press <kbd>Enter</kbd> (<kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line in the reply). Attach a file to send it with the reply as its caption.

- A command fires when **anyone** sends exactly that text, in any chat (groups included), and also when you send it yourself, from WhatsApp Web or your phone.
- To send a GIF, attach it as an MP4 and tick **Send video as GIF**. The panel has a link and an ffmpeg command for converting `.gif` files.

### Rate limit

Hover the panel's bottom-right corner to reveal it. By default each chat gets at most **5 auto-replies every 10 minutes**. Further commands from that chat are ignored until the window passes. Your own commands are never limited.

## Privacy and security

- Your commands, files and scheduled messages are stored only in your browser (`chrome.storage.local`). The extension has no server and sends nothing anywhere but WhatsApp. wa-js's Google Analytics is turned off.
- The extension only runs on `web.whatsapp.com`.
- **Other extensions can use it to control WhatsApp.** To reach WhatsApp's internals, wa-js runs inside the WhatsApp Web page and exposes itself as `window.WPP`. Any other extension or script that runs in that page can use `window.WPP` to read your chats and send messages as you, with no extra effort. Only install extensions you trust and limit which ones can access `web.whatsapp.com` (in `chrome://extensions`, under each extension's **Details → Site access**).
- Anyone who knows one of your commands can get its reply and attached file. Don't put anything private in a command.

## How it works

| File | Role |
| --- | --- |
| [`src/main.ts`](src/main.ts) | Runs in the WhatsApp page, with [wa-js](https://github.com/wppconnect-team/wa-js). Sends scheduled messages ([`scheduler.ts`](src/scheduler.ts)) and auto-replies ([`autorespond.ts`](src/autorespond.ts)). |
| [`src/content.ts`](src/content.ts) | The extension side of the page: passes saved data to `main.ts` and removes messages once sent. |
| [`src/panel.ts`](src/panel.ts) | The slide-out panel. Finds WhatsApp's sidebar by its shape, since its class names are obfuscated. |
| [`src/popup.ts`](src/popup.ts), [`static/popup.html`](static/popup.html) | The panel's contents. |
| [`src/background.ts`](src/background.ts) | The toolbar button. |

`npm run typecheck` checks the types; `npm run build` bundles everything into `dist/`.

## License

[MIT](LICENSE).

The built extension bundles [wa-js](https://github.com/wppconnect-team/wa-js) by the WPPConnect Team, licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0). `npm run build` copies its license and third-party notices into `dist/` next to the bundle.
