// The popup page as a panel that slides out of WhatsApp's left icon rail. Opens on hovering the
// empty middle of the rail (marked by a grey line, neon while open), on Alt+W, or from the toolbar
// button (background.ts).
// Runs in the isolated world (content.ts); the popup page does its own storage.
const ICON = "button,a,input,img,[role=button],[role=link],[role=tab]";
const MARGIN = 24; // between the panel and each side of the chat list
const TILT = 2; // degrees the panel leans toward the cursor

const style = document.createElement("style");
style.textContent = `
  #wsp-zone { position: fixed; z-index: 2147483646; display: none }
  #wsp-zone::before {
    content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; border-radius: 2px;
    background: rgb(134 150 160 / .45); transition: background .2s, box-shadow .2s;
  }
  #wsp-zone.open::before { background: #3ee6ff; box-shadow: 0 0 6px rgb(62 230 255 / .6), 0 0 14px rgb(62 230 255 / .3) }
  /* The panel's transparent left padding touches the zone, so the mouse never crosses a gap. */
  #wsp-panel {
    position: fixed; top: 16px; left: 64px; z-index: 2147483647; width: 400px; height: calc(100vh - 32px); /* until layout() fits it over the chat list */
    padding-left: ${MARGIN}px; visibility: hidden; pointer-events: none;
    transform: translateX(calc(-100% - var(--left, 64px))); /* parked just off the left edge */
    transition: transform .25s cubic-bezier(.5, 0, .75, 0), visibility 0s .25s;
  }
  #wsp-panel.open {
    visibility: visible; pointer-events: auto; transform: none;
    transition: transform .3s cubic-bezier(.2, .8, .2, 1), visibility 0s;
  }
  #wsp-panel iframe {
    display: block; box-sizing: border-box; width: 100%; height: 100%;
    border: 3px solid #3ee6ff; border-radius: 16px; background: transparent; backdrop-filter: blur(6px);
    color-scheme: dark; /* must match popup.html's, or Chrome paints an opaque backdrop behind the frame */
    /* The lean toward the cursor (tilt()) lives on the frame so it never mixes with the slide. */
    transform: perspective(1400px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform .3s ease-out;
    box-shadow: 0 0 0 1px rgb(255 255 255 / .15), 0 0 20px rgb(62 230 255 / .18), 0 24px 64px rgb(0 0 0 / .6);
  }
`;
const zone = document.createElement("div");
zone.id = "wsp-zone";
const panel = document.createElement("div");
panel.id = "wsp-panel";
// Loaded up front: building it on first open made that slide-in stutter.
const frame = document.createElement("iframe");
frame.src = chrome.runtime.getURL("dist/popup.html");
panel.append(frame);
document.head.append(style);
document.body.append(zone, panel);

let shown = false;

// WhatsApp's class names are obfuscated, so the rail is found by shape: the narrow full-height
// column under the (empty) middle of the left edge.
function findRail() {
  let t = document.elementsFromPoint(8, innerHeight / 2).find((e) => e !== zone && !panel.contains(e)) ?? null;
  for (; t; t = t.parentElement) {
    const r = t.getBoundingClientRect();
    if (r.left <= 1 && r.width < 120 && r.height > innerHeight * 0.7) return t;
  }
}

// The chat list column right of the rail: the outermost tall box starting at the rail's edge that
// isn't the whole app. Missing when WhatsApp is too narrow to show it beside a chat.
function findList(rail: DOMRect) {
  let t = document.elementsFromPoint(rail.right + 24, innerHeight / 2).find((e) => e !== zone && !panel.contains(e)) ?? null;
  let list: DOMRect | undefined;
  for (; t; t = t.parentElement) {
    const b = t.getBoundingClientRect();
    if (Math.abs(b.left - rail.right) <= 2 && b.width < innerWidth * 0.7 && b.height > innerHeight * 0.7) list = b;
  }
  return list;
}

// Fit the zone into the biggest gap between the rail's icons (top group / bottom group), and the
// panel over the chat list at the zone's height.
function layout() {
  const rail = findRail();
  if (!rail) return;
  const r = rail.getBoundingClientRect();
  const icons = [...rail.querySelectorAll(ICON)].map((e) => e.getBoundingClientRect()).filter((b) => b.height);
  icons.sort((a, b) => a.top - b.top);
  let top = 0, bottom = 0, reached = r.top; // reached: lowest icon edge so far (icons nest, e.g. img in button)
  for (const b of icons) {
    if (b.top - reached > bottom - top) [top, bottom] = [reached, b.top];
    reached = Math.max(reached, b.bottom);
  }
  zone.style.display = bottom - top > 80 ? "block" : "none";
  if (bottom - top <= 80) return; // no room for a zone; the panel keeps its last (or full-height) box
  const box = { top: `${top + 12}px`, height: `${bottom - top - 24}px` };
  Object.assign(zone.style, box, { left: `${r.left + 8}px`, width: `${r.width - 8}px` });
  const list = findList(r);
  // Centered in the list; the left margin is the panel's transparent padding, its bridge to the zone.
  Object.assign(panel.style, box, { left: `${r.right}px`, width: list ? `${list.width - 2 * MARGIN}px` : "" });
  panel.style.setProperty("--left", panel.style.left);
}
layout();
setInterval(layout, 1000); // WhatsApp renders the rail late and can rearrange it; this is a few rects a second
addEventListener("resize", layout);

function show() {
  shown = true;
  panel.classList.add("open");
  zone.classList.add("open");
}

// p: cursor position over the frame as fractions of its size; none = lie flat.
function tilt(p?: [number, number]) {
  frame.style.setProperty("--rx", p ? `${(0.5 - p[1]) * 2 * TILT}deg` : "");
  frame.style.setProperty("--ry", p ? `${(p[0] - 0.5) * 2 * TILT}deg` : "");
}

function hide() {
  tilt();
  shown = false;
  panel.classList.remove("open");
  zone.classList.remove("open");
  if (document.activeElement === frame) frame.blur();
}

// Mouse leaving zone + panel closes it, unless you're working in it (typing, file picker, Alt+W):
// then click outside or Escape.
function leave(e: MouseEvent) {
  const to = e.relatedTarget as Node | null;
  if (to && (to === zone || panel.contains(to))) return; // moving between the two
  tilt();
  if (shown && document.activeElement !== frame) hide();
}

zone.addEventListener("mouseenter", show);
zone.addEventListener("mouseleave", leave);
panel.addEventListener("mouseleave", leave);
// Clicks inside the iframe never reach this document.
addEventListener("pointerdown", (e) => {
  if (shown && !panel.contains(e.target as Node) && e.target !== zone) hide();
});

// Opened from the keyboard or toolbar: focused, as if clicked into, so it stays open without the mouse.
function openFocused() {
  show();
  frame.focus(); // Tab reaches the first field
}

function toggle() {
  if (shown) hide();
  else openFocused();
}

// Capture phase, so WhatsApp's own key handlers can't swallow it. Inside the panel, popup.ts posts these.
addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyW") {
    e.preventDefault();
    toggle();
  } else if (e.key === "Escape" && shown) hide();
}, true);
addEventListener("message", (e) => {
  if (e.source !== frame.contentWindow) return;
  if (e.data?.wspClose) hide();
  if (e.data?.wspToggle) toggle();
  if (e.data?.wspTilt) tilt(e.data.wspTilt);
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg === "toggle-panel") toggle();
  if (msg === "open-panel") openFocused();
});
