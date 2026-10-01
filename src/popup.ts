import { getState, setState } from "./storage";
import type { Scheduled } from "./types";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

// Success feedback: pushed back a little, then springs forward.
const bump = (el: Element) =>
  el.animate([{ scale: 1 }, { scale: 0.95, offset: 0.35 }, { scale: 1 }], { duration: 380, easing: "ease-out" });

// Each item keeps the row color it was given when added (saved with it), so deleting a row never
// recolors the others. New items continue the cycle from the last row. Items saved before colors
// were fall back to their position.
const ROW_COLORS = ["cyan", "orange", "pink", "green", "violet", "yellow"];
const colorAt = (saved: number | undefined, i: number) => saved ?? i % ROW_COLORS.length;
const cssColor = (c: number) => `var(--${ROW_COLORS[c]})`;
// saved: the list's colors in order
const nextColor = (saved: (number | undefined)[]) =>
  saved.length ? (colorAt(saved.at(-1), saved.length - 1) + 1) % ROW_COLORS.length : 0;

// key: identifies the item across re-renders, so fill() can tell which row is new.
function row(key: string, title: string, sub: string, color: string, onDelete: () => void) {
  const e = document.createElement("li");
  e.dataset.key = key;
  e.style.setProperty("--row", color);
  const text = document.createElement("div");
  const t = document.createElement("strong");
  const s = document.createElement("span");
  t.textContent = title;
  s.textContent = sub;
  text.append(t, s);
  const b = document.createElement("button");
  b.className = "del";
  b.textContent = "×";
  b.ariaLabel = `Delete ${title}`;
  b.onclick = async () => {
    b.disabled = true;
    // Pushed in like a saved card (slower), fading out on the way back up; before it's fully gone
    // it starts folding flat so the rows below slide up into its place. It stays folded until the
    // storage change re-renders the list without it.
    const { height, paddingTop, paddingBottom } = getComputedStyle(e);
    await Promise.all([
      e.animate(
        [{ scale: 1, opacity: 1 }, { scale: 0.95, opacity: 1, offset: 0.35 }, { scale: 1, opacity: 0 }],
        { duration: 700, easing: "ease-out", fill: "forwards" }
      ).finished,
      e.animate(
        [{ height, paddingTop, paddingBottom }, { height: "0px", paddingTop: "0px", paddingBottom: "0px" }],
        { duration: 300, delay: 300, easing: "ease-in-out", fill: "forwards" }
      ).finished,
    ]);
    onDelete();
  };
  e.append(text, b);
  return e;
}

// A new row grows open, pushing the rows below down, while its content slides down from under
// the row above.
function unfold(li: HTMLElement) {
  const { height, paddingTop, paddingBottom } = getComputedStyle(li);
  const timing = { duration: 380, easing: "ease-out" };
  li.style.overflow = "clip";
  li.animate([{ height: "0px", paddingTop: "0px", paddingBottom: "0px" }, { height, paddingTop, paddingBottom }], timing)
    .finished.then(() => (li.style.overflow = ""));
  for (const c of li.children) c.animate([{ translate: `0 -${height}` }, { translate: "0 0" }], timing);
}

let rendered = false; // the first render fills the lists without animating
function fill(list: HTMLElement, rows: HTMLLIElement[]) {
  const before = new Set([...list.children].map((li) => (li as HTMLElement).dataset.key));
  list.replaceChildren(...rows);
  if (rendered) for (const li of rows) if (!before.has(li.dataset.key)) unfold(li);
}

const byTime = (a: Scheduled, b: Scheduled) => a.at - b.at; // first to be sent on top

async function render() {
  const { commands, files, scheduled, colors, rate } = await getState();
  fill(
    $("sched"),
    [...scheduled].sort(byTime).map((s, i) =>
      row(s.id, new Date(s.at).toLocaleString(), `${s.chat}: ${s.text}`, cssColor(colorAt(s.color, i)), () =>
        setState({ scheduled: scheduled.filter((x) => x.id !== s.id) })
      )
    )
  );
  fill(
    $("cmds"),
    Object.entries(commands).map(([k, v], i) => {
      const f = files[k];
      return row(k, k, `${f ? `${f.gif ? "GIF" : "📎"} ${f.name}\n` : ""}${v}`, cssColor(colorAt(colors[k], i)), () => {
        delete commands[k];
        delete files[k];
        delete colors[k];
        setState({ commands, files, colors });
      });
    })
  );
  // Re-renders also come from the scheduler sending; don't overwrite a limit you're typing.
  if (!rForm.contains(document.activeElement)) {
    $("rCount").value = String(rate.count);
    $("rMins").value = String(rate.minutes);
  }
  rendered = true;
}

// No submit buttons: Enter submits (and validates) from any field; Shift+Enter is a newline in the textarea.
for (const f of document.forms)
  f.onkeydown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || !(e.target as Element).matches("input, textarea")) return;
    e.preventDefault();
    f.requestSubmit();
  };

$("sForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { scheduled } = await getState();
  const at = new Date($("at").value).getTime();
  // It lands by time, not at the bottom, so skip ahead in the cycle past its new neighbors' colors.
  const shown = [...scheduled].sort(byTime);
  let pos = shown.findIndex((s) => s.at > at); // where it will show; ties go after
  if (pos < 0) pos = shown.length;
  const near = [pos - 1, pos].filter((i) => shown[i]).map((i) => colorAt(shown[i].color, i));
  let color = nextColor(scheduled.map((s) => s.color));
  while (near.includes(color)) color = (color + 1) % ROW_COLORS.length;
  await setState({ scheduled: [...scheduled, { id: crypto.randomUUID(), chat: $("chat").value, text: $("text").value, at, color }] });
  form.reset();
  bump(form.closest("section")!);
};

// Saved on Enter (the handler above) or when you leave a field.
const rForm = document.getElementById("rForm") as HTMLFormElement;
rForm.onsubmit = async (e) => {
  e.preventDefault();
  await setState({ rate: { count: +$("rCount").value, minutes: +$("rMins").value } });
  bump(rForm);
};
$("rCount").onchange = $("rMins").onchange = () => rForm.requestSubmit();

const readDataUrl = (f: File) =>
  new Promise<string>((ok) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.readAsDataURL(f);
  });

// WhatsApp GIFs are looping MP4s; a .gif file can't be sent that way.
$("file").onchange = $("gif").onchange = () => {
  const f = $("file").files?.[0];
  $("file").setCustomValidity(
    $("gif").checked && f && !f.type.startsWith("video/") ? "GIFs must be a video file (e.g. MP4 from Giphy)." : ""
  );
};

$("cForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { commands, files, colors } = await getState();
  const cmd = $("cmd").value;
  // Re-adding an existing command keeps its place in the list, and its color.
  if (!Object.hasOwn(commands, cmd)) colors[cmd] = nextColor(Object.keys(commands).map((k) => colors[k]));
  const f = $("file").files?.[0];
  if (f) files[cmd] = { name: f.name, data: await readDataUrl(f), gif: $("gif").checked };
  else delete files[cmd]; // re-adding a command without a file replaces it fully
  await setState({ commands: { ...commands, [cmd]: $("reply").value }, files, colors });
  form.reset();
  bump(form.closest("section")!);
};

// Also shown inside WhatsApp as the hover panel (panel.ts); Escape / Alt+W there go to it.
// Escape also discards what was typed.
// Cards lean toward the cursor, up to TILT degrees each way.
const TILT = 2.5;
for (const s of document.querySelectorAll("section")) {
  s.onpointermove = (e) => {
    const b = s.getBoundingClientRect();
    s.style.setProperty("--rx", `${(0.5 - (e.clientY - b.top) / b.height) * 2 * TILT}deg`);
    s.style.setProperty("--ry", `${((e.clientX - b.left) / b.width - 0.5) * 2 * TILT}deg`);
  };
  s.onpointerleave = () => {
    s.style.removeProperty("--rx");
    s.style.removeProperty("--ry");
  };
}

const embedded = top !== self;
// Keeps what was typed; only Escape (below) clears it.
$("close").onclick = () => (embedded ? parent.postMessage({ wspClose: true }, "*") : close());

if (embedded) {
  document.documentElement.classList.add("embed");
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll<HTMLFormElement>("section form").forEach((f) => f.reset()); // not the rate limit: it's saved
      $("file").setCustomValidity("");
      parent.postMessage({ wspClose: true }, "*");
    }
    if (e.altKey && e.code === "KeyW") parent.postMessage({ wspToggle: true }, "*");
  });
  // While a text field has focus the panel stays open with the mouse outside. Read once focus has
  // settled, so tabbing from one field to the next doesn't count as leaving.
  const editing = () =>
    setTimeout(() =>
      parent.postMessage({ wspEditing: !!document.activeElement?.matches("input:not([type=checkbox]), textarea") }, "*")
    );
  addEventListener("focusin", editing);
  addEventListener("focusout", editing);
  // The whole panel leans toward the cursor too, but the page only sees the mouse through us.
  addEventListener("pointermove", (e) =>
    parent.postMessage({ wspTilt: [e.clientX / innerWidth, e.clientY / innerHeight] }, "*")
  );
}

chrome.storage.onChanged.addListener(render); // our own edits, and messages the scheduler sends
render();
