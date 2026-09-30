export interface Scheduled {
  id: string;
  chat: string;
  text: string;
  at: number; // epoch ms
}

export interface State {
  commands: Record<string, string>; // exact incoming text -> reply (the caption if there's a file)
  files: Record<string, { name: string; data: string; gif?: boolean }>; // command -> attached file as a data: URL; gif = send video as looping GIF
  scheduled: Scheduled[];
}
