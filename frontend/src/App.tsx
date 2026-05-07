import { useEffect, useRef, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import MemoryGraph from "./components/MemoryGraph";
import NodeDetailsPanel from "./components/NodeDetailsPanel";
import NodeSidebar from "./components/NodeSidebar";
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

  if (error)
    return (
      <div className="h-screen flex items-center justify-center text-red-600 bg-gray-950">
        {error}
      </div>
    );
  if (!conversationId)
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 bg-gray-950">
        Starting chat…
      </div>
    );

  return (
    <GraphProvider>
      {/* MAIN CONTAINER: Forced Horizontal Flex Row 
        This guarantees the 3 parts sit side-by-side horizontally 
      */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "100vh",
          width: "100vw",
          backgroundColor: "#030712",
          color: "#e5e7eb",
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        {/* LEFT PART: Related Nodes Sidebar (Fixed Width) */}
        <div
          style={{
            width: "260px",
            flexShrink: 0,
            borderRight: "1px solid #1f2937",
            backgroundColor: "#111827",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NodeSidebar />
        </div>

        {/* MIDDLE PART: Chat (60%) + Graph (40%) (Takes up remaining space) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Top 60% */}
          <div
            style={{
              flex: "0.6",
              borderBottom: "1px solid #1f2937",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <ChatPanel conversationId={conversationId} />
          </div>

          {/* Bottom 40% */}
          <div
            style={{
              flex: "0.4",
              position: "relative",
              backgroundColor: "#030712",
            }}
          >
            <MemoryGraph />
          </div>
        </div>

        {/* RIGHT PART: Node Details (Fixed Width) */}
        <div
          style={{
            width: "320px",
            flexShrink: 0,
            borderLeft: "1px solid #1f2937",
            backgroundColor: "#111827",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NodeDetailsPanel />
        </div>
      </div>
    </GraphProvider>
  );
}
