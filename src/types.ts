export interface Scheduled {
  id: string;
  chat: string;
  text: string;
  at: number; // epoch ms
  color?: number; // row color, an index into popup.ts's ROW_COLORS; missing on items from before colors were saved
}

export interface State {
  commands: Record<string, string>; // exact incoming text -> reply (the caption if there's a file)
  files: Record<string, { name: string; data: string; gif?: boolean }>; // command -> attached file as a data: URL; gif = send video as looping GIF
  scheduled: Scheduled[];
  colors: Record<string, number>; // command -> row color, like Scheduled.color
}
