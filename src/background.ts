// Toolbar button: instead of a popup, opens the panel (panel.ts) in WhatsApp Web, switching to
// its tab first if needed.
const WHATSAPP = "https://web.whatsapp.com/";

chrome.action.onClicked.addListener(async (tab) => {
  const here = tab.url?.startsWith(WHATSAPP);
  const [wa] = here ? [tab] : await chrome.tabs.query({ url: `${WHATSAPP}*` });
  if (!wa?.id) return void chrome.tabs.create({ url: WHATSAPP });
  if (!here) {
    await chrome.tabs.update(wa.id, { active: true });
    await chrome.windows.update(wa.windowId, { focused: true });
  }
  // Clicking again while there closes it. Fails if the tab hasn't loaded our content script yet.
  chrome.tabs.sendMessage(wa.id, here ? "toggle-panel" : "open-panel").catch(() => {});
});
