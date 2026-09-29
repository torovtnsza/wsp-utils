import { getState, setState } from "./storage";
import type { State } from "./types";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

function li(text: string, onDelete: () => void) {
  const e = document.createElement("li");
  const b = document.createElement("button");
  b.textContent = "x";
  b.onclick = onDelete;
  e.append(text + " ", b);
  return e;
}

async function save(patch: Partial<State>) {
  await setState(patch);
  render();
}

async function render() {
  const { commands, scheduled } = await getState();
  $("sched").replaceChildren(
    ...scheduled.map((s) =>
      li(`${new Date(s.at).toLocaleString()} → ${s.chat}: ${s.text}`, () =>
        save({ scheduled: scheduled.filter((x) => x.id !== s.id) })
      )
    )
  );
  $("cmds").replaceChildren(
    ...Object.entries(commands).map(([k, v]) =>
      li(`${k}: ${v}`, () => {
        delete commands[k];
        save({ commands });
      })
    )
  );
}

$("addS").onclick = async () => {
  const { scheduled } = await getState();
  const at = new Date($("at").value).getTime();
  if (!$("chat").value || !$("text").value || isNaN(at)) return;
  save({ scheduled: [...scheduled, { id: crypto.randomUUID(), chat: $("chat").value, text: $("text").value, at }] });
};

$("addC").onclick = async () => {
  const { commands } = await getState();
  if (!$("cmd").value) return;
  save({ commands: { ...commands, [$("cmd").value]: $("reply").value } });
};

render();
