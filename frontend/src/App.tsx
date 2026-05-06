import { useEffect, useRef, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import MemoryGraph from "./components/MemoryGraph";
import NodeDetailsPanel from "./components/NodeDetailsPanel";
import { GraphProvider } from "./context/GraphContext";
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

  return (
    <GraphProvider>
      <div className="h-screen w-screen flex overflow-hidden">
        <div className="w-1/2 h-full">
          <ChatPanel conversationId={conversationId} />
        </div>
        <div className="w-1/2 h-full bg-gray-950 relative">
          <MemoryGraph />
          <NodeDetailsPanel />
        </div>
      </div>
    </GraphProvider>
  );
}
