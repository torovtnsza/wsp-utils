// The shortcut that opens/closes the panel, stored as "Ctrl+Alt+Shift+Meta+<KeyboardEvent.code>"
// (modifiers in that order, only those held). Codes are physical keys, so it works on any layout.
export const DEFAULT_HOTKEY = "Alt+KeyW";

export const comboOf = (e: KeyboardEvent) =>
  [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Meta", e.code].filter(Boolean).join("+");

// "Alt+KeyW" -> "Alt+W"
export const label = (combo: string) => combo.replace(/(?:Key|Digit)(\w)$/, "$1");

// Needs Ctrl/Alt/Meta (or an F key), or it would fire while typing in WhatsApp; a modifier alone isn't a shortcut.
export function usable(combo: string) {
  const code = combo.split("+").at(-1)!;
  if (/^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/.test(code)) return false;
  return /^F\d+$/.test(code) || /\b(Ctrl|Alt|Meta)\+/.test(combo);
}
