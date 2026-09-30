import { getState, setState } from "./storage";
import type { State } from "./types";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

function row(title: string, sub: string, onDelete: () => void) {
  const e = document.createElement("li");
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
  b.onclick = onDelete;
  e.append(text, b);
  return e;
}

async function save(patch: Partial<State>) {
  await setState(patch);
  render();
}

async function render() {
  const { commands, files, scheduled } = await getState();
  $("sched").replaceChildren(
    ...scheduled.map((s) =>
      row(new Date(s.at).toLocaleString(), `${s.chat}: ${s.text}`, () =>
        save({ scheduled: scheduled.filter((x) => x.id !== s.id) })
      )
    )
  );
  $("cmds").replaceChildren(
    ...Object.entries(commands).map(([k, v]) => {
      const f = files[k];
      return row(k, `${f ? `${f.gif ? "GIF" : "📎"} ${f.name}\n` : ""}${v}`, () => {
        delete commands[k];
        delete files[k];
        save({ commands, files });
      });
    })
  );
}

$("sForm").onsubmit = async (e) => {
  e.preventDefault();
  const { scheduled } = await getState();
  const at = new Date($("at").value).getTime();
  save({ scheduled: [...scheduled, { id: crypto.randomUUID(), chat: $("chat").value, text: $("text").value, at }] });
  (e.target as HTMLFormElement).reset();
};

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
  const { commands, files } = await getState();
  const cmd = $("cmd").value;
  const f = $("file").files?.[0];
  if (f) files[cmd] = { name: f.name, data: await readDataUrl(f), gif: $("gif").checked };
  else delete files[cmd]; // re-adding a command without a file replaces it fully
  save({ commands: { ...commands, [cmd]: $("reply").value }, files });
  (e.target as HTMLFormElement).reset();
};

render();
