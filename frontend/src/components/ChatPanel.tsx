import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { messagesApi, documentsApi } from "../services/api";
import { Role } from "../types/chat";
import type { Message } from "../types/chat";
import type { GraphLinkData } from "../types/graph";
import { useGraph } from "../context/GraphContext";

interface ChatPanelProps {
  conversationId: string;
}

export default function ChatPanel({ conversationId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { updateGraph } = useGraph();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    messagesApi
      .list(conversationId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load messages");
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Trigger memory graph visualization
    documentsApi
      .graphSearch(text)
      .then((nodes) => {
        // SAFETY CHECK: Create a Set of valid node IDs
        const validNodeIds = new Set(nodes.map((n) => n.id));

        const links: GraphLinkData[] = [];
        const seen = new Set<string>();

        for (const n of nodes) {
          for (const [targetId, weight] of Object.entries(n.edges || {})) {
            if (targetId === n.id) continue;

            // SAFETY CHECK: Skip links that point to missing nodes
            if (!validNodeIds.has(targetId)) continue;

            const key = [n.id, targetId].sort().join("-");
            if (!seen.has(key)) {
              seen.add(key);
              links.push({
                source: n.id,
                target: targetId,
                weight: weight as number,
              });
            }
          }
        }
        updateGraph({ nodes, links }, text);
      })
      .catch(() => {
        // Graph is best-effort; chat must survive failures
      });

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: Role.USER,
      content: text,
      created_at: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const assistantMsg = await messagesApi.send(conversationId, {
        role: Role.USER,
        content: text,
      });
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimistic.id)
          .concat(optimistic, assistantMsg),
      );
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const nodes = await documentsApi.uploadPdf(file);

      // SAFETY CHECK: Create a Set of valid node IDs
      const validNodeIds = new Set(nodes.map((n) => n.id));

      const links: GraphLinkData[] = [];
      const seen = new Set<string>();

      for (const n of nodes) {
        for (const [targetId, weight] of Object.entries(n.edges || {})) {
          if (targetId === n.id) continue;

          // SAFETY CHECK: Skip links that point to missing nodes
          if (!validNodeIds.has(targetId)) continue;

          const key = [n.id, targetId].sort().join("-");
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              source: n.id,
              target: targetId,
              weight: weight as number,
            });
          }
        }
      }

      updateGraph({ nodes, links }, `PDF: ${file.name}`);
    } catch (err: any) {
      setError(err.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    // Enforce strict flex column height
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Scrollable Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent:
                msg.role === Role.USER ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 16px",
                fontSize: "14px",
                lineHeight: "1.5",
                backgroundColor: msg.role === Role.USER ? "#9333ea" : "#1f2937",
                color: msg.role === Role.USER ? "#ffffff" : "#f3f4f6",
                borderRadius: "16px",
                borderTopRightRadius: msg.role === Role.USER ? "4px" : "16px",
                borderTopLeftRadius: msg.role !== Role.USER ? "4px" : "16px",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                backgroundColor: "#1f2937",
                borderRadius: "16px",
                borderTopLeftRadius: "4px",
                padding: "12px 16px",
              }}
            >
              <span style={{ color: "#9ca3af", fontSize: "14px" }}>
                Thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div
          style={{
            margin: "0 16px 8px",
            padding: "8px 12px",
            backgroundColor: "rgba(127, 29, 29, 0.2)",
            border: "1px solid #991b1b",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={onSubmit}
        style={{
          borderTop: "1px solid #1f2937",
          padding: "12px 16px",
          backgroundColor: "#030712",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploading || loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#374151",
              color: "#e5e7eb",
              border: "none",
              borderRadius: "8px",
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "..." : "PDF"}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: "8px",
              border: "1px solid #374151",
              backgroundColor: "#1f2937",
              color: "#f3f4f6",
              padding: "8px 12px",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 16px",
              backgroundColor: "#9333ea",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
