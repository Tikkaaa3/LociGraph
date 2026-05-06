export enum Role {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export interface MessageSource {
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  created_at: string;
  sources: MessageSource[];
}

export interface MessageCreate {
  role: Role;
  content: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationCreate {
  title?: string | null;
}
