import { useState, useRef, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData } from "../types/graph";

interface FGNode extends GraphNodeData {
  x?: number;
  y?: number;
}

export default function MemoryGraph() {
  const { selectNode, graphData } = useGraph();
  const [hoveredNode, setHoveredNode] = useState<FGNode | null>(null);
  const fgRef = useRef<any>(null);

  const fgData = useMemo(() => ({
    nodes: graphData.nodes.map((n) => ({ ...n })),
    links: graphData.links.map((l) => ({ ...l })),
  }), [graphData]);

  const hasData = graphData.nodes.length > 0;

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;
      const act = node.activation;

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
        const pulse = act > 0.8 ? 15 + Math.sin(performance.now() / 150) * 5 : 10;
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
          node.y + radius + 12 / globalScale
        );
      }
    },
    []
  );

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;
      const act = node.activation;
      const radius = Math.max(2, act * 10) + 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fill();
    },
    []
  );

  const linkWidth = useCallback((link: any) => Math.max(0.5, link.weight * 3), []);
  const linkColor = useCallback((link: any) => {
    if (link.weight > 0.6) return "rgba(34,211,238,0.5)";
    if (link.weight >= 0.3) return "rgba(59,130,246,0.3)";
    return "rgba(107,114,128,0.15)";
  }, []);

  const handleNodeHover = useCallback((node: FGNode | null) => {
    setHoveredNode(node);
  }, []);

  if (!hasData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-950">
        Send a message to see memory activation
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative bg-gray-950"
      style={{ cursor: hoveredNode ? "pointer" : "default" }}
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={fgData}
        backgroundColor="#030712"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkWidth={linkWidth}
        linkColor={linkColor}
        onNodeClick={(node: FGNode) => selectNode(node.id)}
        onNodeHover={handleNodeHover}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      {hoveredNode && (
        <div className="absolute top-4 right-4 z-20 w-64 bg-gray-900/90 border border-gray-700 rounded-md p-3 text-xs text-gray-200 pointer-events-none shadow-lg backdrop-blur-sm">
          <div className="font-mono text-gray-400 mb-1 truncate">
            {hoveredNode.id.length > 12
              ? hoveredNode.id.slice(0, 12) + "..."
              : hoveredNode.id}
          </div>
          <div className="text-gray-300 mb-2 leading-relaxed break-words max-h-32 overflow-y-auto">
            {hoveredNode.content.length > 300
              ? hoveredNode.content.slice(0, 300) + "..."
              : hoveredNode.content}
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Activation: {(hoveredNode.activation * 100).toFixed(1)}%</span>
            <span>Edges: {Object.keys(hoveredNode.edges || {}).length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
