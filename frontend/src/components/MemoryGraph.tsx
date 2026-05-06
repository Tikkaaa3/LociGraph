import { useEffect, useRef, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData, GraphLinkData } from "../types/graph";

interface FGNode extends GraphNodeData {
  x?: number;
  y?: number;
}

export default function MemoryGraph() {
  const { graphData, selectNode } = useGraph();
  const fgRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const delaysRef = useRef<Map<string, number>>(new Map());

  const fgData = useMemo(() => {
    return {
      nodes: graphData.nodes.map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ ...l })),
    };
  }, [graphData]);

  useEffect(() => {
    if (fgData.nodes.length === 0) return;

    const delays = new Map<string, number>();
    const seedNode = fgData.nodes.reduce(
      (max, n) => (n.activation > max.activation ? n : max),
      fgData.nodes[0],
    );
    const queue: string[] = [seedNode.id];
    delays.set(seedNode.id, 0);
    const visited = new Set<string>([seedNode.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentHop = delays.get(currentId)!;
      const currentNode = fgData.nodes.find((n) => n.id === currentId);
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
  }, [fgData]);

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;
      const now = performance.now();
      const hop = delaysRef.current.get(node.id) ?? 0;
      const delayMs = hop * 120;
      const progress = Math.min(
        1,
        Math.max(0, (now - startTimeRef.current - delayMs) / 800),
      );
      const ease = 1 - Math.pow(1 - progress, 3);
      const act = node.activation * ease;

      if (act <= 0.01) return;

      const radius = Math.max(2, act * 10);
      let color = "rgba(107,114,128,0.2)";
      if (act > 0.8) color = "#ffffff";
      else if (act > 0.6) color = "#22d3ee";
      else if (act > 0.3) color = "#3b82f6";
      else if (act > 0.1) color = "rgba(59,130,246,0.6)";

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();

      if (act > 0.6) {
        const pulse = act > 0.8 ? 15 + Math.sin(now / 150) * 5 : 10;
        ctx.shadowBlur = pulse;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (act > 0.5) {
        ctx.font = `${Math.max(8, 12 / globalScale)}px sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "center";
        ctx.fillText(
          node.id.slice(0, 8),
          node.x,
          node.y + radius + 12 / globalScale,
        );
      }
    },
    [],
  );

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;
      const now = performance.now();
      const hop = delaysRef.current.get(node.id) ?? 0;
      const delayMs = hop * 120;
      const progress = Math.min(
        1,
        Math.max(0, (now - startTimeRef.current - delayMs) / 800),
      );
      const ease = 1 - Math.pow(1 - progress, 3);
      const act = node.activation * ease;
      const radius = Math.max(2, act * 10) + 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fill();
    },
    [],
  );

  const linkWidth = useCallback(
    (link: any) => Math.max(0.5, link.weight * 3),
    [],
  );
  const linkColor = useCallback((link: any) => {
    if (link.weight > 0.6) return "rgba(34,211,238,0.5)";
    if (link.weight >= 0.3) return "rgba(59,130,246,0.3)";
    return "rgba(107,114,128,0.15)";
  }, []);

  if (fgData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-950">
        Send a message to see memory activation
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-950">
      <button
        onClick={() => {
          startTimeRef.current = performance.now();
        }}
        className="absolute top-4 left-4 z-10 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800/80 hover:bg-gray-700 rounded-md border border-gray-700 transition-colors"
      >
        Replay
      </button>
      <ForceGraph2D
        ref={fgRef}
        graphData={fgData}
        backgroundColor="#030712"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkWidth={linkWidth}
        linkColor={linkColor}
        onNodeClick={(node: FGNode) => selectNode(node.id)}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
