import { useEffect, useRef, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import { conversationsApi } from "./services/api";

export default function App() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    conversationsApi
      .create({ title: "New Chat" })
      .then((res) => setConversationId(res.id))
      .catch(() => setError("Unable to start a new conversation"));
  }, []);

  if (error) return <div className="h-screen flex items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  if (!conversationId) return <div className="h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">Starting chat…</div>;

  return <ChatPanel conversationId={conversationId} />;
}
