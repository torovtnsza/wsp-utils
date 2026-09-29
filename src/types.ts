export interface Scheduled {
  id: string;
  chat: string;
  text: string;
  at: number; // epoch ms
}

export interface State {
  commands: Record<string, string>; // exact incoming text -> reply
  scheduled: Scheduled[];
}
