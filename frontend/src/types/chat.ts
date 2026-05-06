export enum Role {
  USER = "user",
  ASSISTANT = "assistant",
}

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  created_at: string;
}
