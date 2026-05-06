import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { GraphData, MemorySession } from "../types/graph";

interface GraphContextType {
  graphData: GraphData;
  query: string;
  selectedNodeId: string | null;
  updateGraph: (data: GraphData, query: string) => void;
  resetGraph: () => void;
  selectNode: (id: string | null) => void;
  sessions: MemorySession[];
  activeSessionId: string | null;
  addSession: (session: MemorySession) => void;
  setActiveSession: (id: string | null) => void;
  triggerReplay: () => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<MemorySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);

  const updateGraph = useCallback((data: GraphData, q: string) => {
    setGraphData(data);
    setQuery(q);
    setSelectedNodeId(null);
  }, []);

  const resetGraph = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setQuery("");
    setSelectedNodeId(null);
  }, []);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const addSession = useCallback((session: MemorySession) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setGraphData({ nodes: session.nodes, links: session.links });
    setQuery(session.query);
    setSelectedNodeId(null);
  }, []);

  const setActiveSession = useCallback((id: string | null) => {
    setActiveSessionId(id);
    if (id) {
      const session = sessions.find((s) => s.id === id);
      if (session) {
        setGraphData({ nodes: session.nodes, links: session.links });
        setQuery(session.query);
        setSelectedNodeId(null);
      }
    }
  }, [sessions]);

  const triggerReplay = useCallback(() => {
    setReplayNonce((n) => n + 1);
  }, []);

  return (
    <GraphContext.Provider
      value={{
        graphData,
        query,
        selectedNodeId,
        updateGraph,
        resetGraph,
        selectNode,
        sessions,
        activeSessionId,
        addSession,
        setActiveSession,
        triggerReplay,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error("useGraph must be used within GraphProvider");
  return ctx;
}
