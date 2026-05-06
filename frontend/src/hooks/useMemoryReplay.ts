import { useRef, useEffect, useMemo } from "react";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData, GraphLinkData } from "../types/graph";

export interface ReplayState {
  startTimeRef: React.MutableRefObject<number>;
  delaysRef: React.MutableRefObject<Map<string, number>>;
  activeNodes: GraphNodeData[];
  activeLinks: GraphLinkData[];
  hasData: boolean;
}

export function useMemoryReplay(sessionId: string | null): ReplayState {
  const { sessions, graphData, replayNonce } = useGraph();
  const startTimeRef = useRef<number>(0);
  const delaysRef = useRef<Map<string, number>>(new Map());

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId]
  );

  const activeNodes = useMemo(() => {
    if (session) return session.nodes;
    return graphData.nodes;
  }, [session, graphData.nodes]);

  const activeLinks = useMemo(() => {
    if (session) return session.links;
    return graphData.links;
  }, [session, graphData.links]);

  useEffect(() => {
    if (activeNodes.length === 0) return;

    const delays = new Map<string, number>();
    const seedNode = activeNodes.reduce(
      (max, n) => (n.activation > max.activation ? n : max),
      activeNodes[0]
    );
    const queue: string[] = [seedNode.id];
    delays.set(seedNode.id, 0);
    const visited = new Set<string>([seedNode.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentHop = delays.get(currentId)!;
      const currentNode = activeNodes.find((n) => n.id === currentId);
      if (!currentNode) continue;

      for (const neighborId of Object.keys(currentNode.edges || {})) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          delays.set(neighborId, currentHop + 1);
          queue.push(neighborId);
        }
      }
    }

    delaysRef.current = delays;
    startTimeRef.current = performance.now();
  }, [activeNodes, replayNonce]);

  return {
    startTimeRef,
    delaysRef,
    activeNodes,
    activeLinks,
    hasData: activeNodes.length > 0,
  };
}

/** Compute the shortest activation path from the seed node to the target node. */
export function getActivationPath(
  targetId: string,
  nodes: GraphNodeData[]
): { path: string[]; hopDepth: number; strongestNeighborId: string | null } {
  if (nodes.length === 0) {
    return { path: [], hopDepth: -1, strongestNeighborId: null };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const seedNode = nodes.reduce(
    (max, n) => (n.activation > max.activation ? n : max),
    nodes[0]
  );

  if (!seedNode || targetId === seedNode.id) {
    return { path: [targetId], hopDepth: 0, strongestNeighborId: null };
  }

  const queue = [seedNode.id];
  const parent = new Map<string, string>();
  const visited = new Set<string>([seedNode.id]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentNode = nodeMap.get(current);
    if (!currentNode) continue;

    for (const neighborId of Object.keys(currentNode.edges || {})) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parent.set(neighborId, current);
        if (neighborId === targetId) {
          queue.length = 0;
          break;
        }
        queue.push(neighborId);
      }
    }
  }

  if (!parent.has(targetId)) {
    return { path: [targetId], hopDepth: -1, strongestNeighborId: null };
  }

  const path: string[] = [targetId];
  let cur = targetId;
  while (parent.has(cur)) {
    cur = parent.get(cur)!;
    path.unshift(cur);
  }

  const hopDepth = path.length - 1;
  const strongestNeighborId = parent.get(targetId) ?? null;

  return { path, hopDepth, strongestNeighborId };
}
