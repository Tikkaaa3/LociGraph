import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { api } from "../services/api";
import { Role } from "../types/chat";
import type { Message } from "../types/chat";

interface ChatPanelProps {
  conversationId: string;
}

export default function ChatPanel({ conversationId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<Message[]>(`/conversations/${conversationId}/messages`)
      .then((res) => { if (!cancelled) setMessages(res.data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.detail || "Failed to load messages"); });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: Role.USER,
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { data: assistantMsg } = await api.post<Message>(
        `/conversations/${conversationId}/messages`,
        { role: Role.USER, content: text }
      );
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimistic.id)
          .concat(optimistic, assistantMsg)
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); handleSend(); };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-left">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              msg.role === Role.USER
                ? "bg-purple-600 text-white rounded-tr-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-900">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
