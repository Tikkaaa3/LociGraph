import axios, { AxiosError } from "axios";
import type { AxiosInstance } from "axios";
import type {
  Conversation,
  ConversationCreate,
  Message,
  MessageCreate,
} from "../types/chat";

export interface GraphNodeResponse {
  id: string;
  content: string;
  activation: number;
  edges: Record<string, number>;
  top_neighbors?: { id: string; weight: number }[];
}

const API_BASE_URL = "http://127.0.0.1:8000";

/* ---------- Error handling ---------- */

interface ErrorResponse {
  error?: string;
  detail?: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public originalError?: AxiosError,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;
      const message =
        data?.detail || data?.error || `Request failed with status ${status}`;
      const code = data?.code || data?.error;
      return Promise.reject(new ApiError(message, status, code, error));
    }
    if (error.request) {
      return Promise.reject(
        new ApiError(
          "Network error. Please check your connection.",
          undefined,
          undefined,
          error,
        ),
      );
    }
    return Promise.reject(
      new ApiError(error.message, undefined, undefined, error),
    );
  },
);

/* ---------- REST resources ---------- */

export const conversationsApi = {
  list: () =>
    apiClient.get<Conversation[]>("/conversations").then((r) => r.data),
  create: (body: ConversationCreate) =>
    apiClient.post<Conversation>("/conversations", body).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Conversation>(`/conversations/${id}`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/conversations/${id}`),
};

export const messagesApi = {
  list: (conversationId: string) =>
    apiClient
      .get<Message[]>(`/conversations/${conversationId}/messages`)
      .then((r) => r.data),
  send: (conversationId: string, body: MessageCreate) =>
    apiClient
      .post<Message>(`/conversations/${conversationId}/messages`, body)
      .then((r) => r.data),
};

export const documentsApi = {
  graphSearch: (query: string) =>
    apiClient
      .get<GraphNodeResponse[]>("/documents/retrieve", {
        params: { q: query, mode: "graph" },
      })
      .then((r) => r.data),
  uploadPdf: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/pdf/upload", formData).then((r) => r.data);
  },
};

/* ---------- Streaming placeholders ---------- */

export interface StreamCallbacks {
  onMessage?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export const streamApi = {
  connectSSE: (endpoint: string, callbacks: StreamCallbacks): (() => void) => {
    const es = new EventSource(`${API_BASE_URL}${endpoint}`);
    es.onmessage = (e) => callbacks.onMessage?.(e.data);
    es.onerror = () => {
      callbacks.onError?.(new Error("SSE connection error"));
      es.close();
    };
    return () => es.close();
  },

  connectWebSocket: (
    endpoint: string,
    callbacks: StreamCallbacks,
  ): { send: (msg: string) => void; close: () => void } => {
    const ws = new WebSocket(`ws://localhost:8000${endpoint}`);
    ws.onmessage = (e) => callbacks.onMessage?.(e.data);
    ws.onerror = () => callbacks.onError?.(new Error("WebSocket error"));
    ws.onclose = () => callbacks.onComplete?.();
    return {
      send: (msg: string) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      },
      close: () => ws.close(),
    };
  },
};

export { apiClient };

export const createConversation = conversationsApi.create;
export const getMessages = messagesApi.list;
export const sendMessage = messagesApi.send;
