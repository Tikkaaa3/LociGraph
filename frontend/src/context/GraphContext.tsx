import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { GraphData } from "../types/graph";

interface GraphContextType {
  graphData: GraphData;
  query: string;
  selectedNodeId: string | null;
  updateGraph: (data: GraphData, query: string) => void;
  resetGraph: () => void;
  selectNode: (id: string | null) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  return (
    <GraphContext.Provider value={{ graphData, query, selectedNodeId, updateGraph, resetGraph, selectNode }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error("useGraph must be used within GraphProvider");
  return ctx;
}
