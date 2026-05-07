import { useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData } from "../types/graph";

interface FGNode extends GraphNodeData {
  x?: number;
  y?: number;
}

const TOP_N = 3;

export default function MemoryGraph() {
  const { graphData } = useGraph();

  const topNodes = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => b.activation - a.activation)
      .slice(0, TOP_N);
  }, [graphData.nodes]);

  const topNodeIds = useMemo(
    () => new Set(topNodes.map((n) => n.id)),
    [topNodes]
  );

  const fgData = useMemo(
    () => ({
      nodes: graphData.nodes.map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ ...l })),
    }),
    [graphData]
  );

  const hasData = graphData.nodes.length > 0;

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;

      const act = node.activation;
      if (act <= 0.01) return;

      const isTop = topNodeIds.has(node.id);

      let radius = Math.max(2, act * 10);
      if (isTop) radius *= 1.25;

      let color = "rgba(107,114,128,0.2)";
      if (act > 0.8) color = "#ffffff";
      else if (act > 0.6) color = "#22d3ee";
      else if (act > 0.3) color = "#3b82f6";
      else if (act > 0.1) color = "rgba(59,130,246,0.6)";

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();

      if (isTop) {
        ctx.strokeStyle = "rgba(34,211,238,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (act > 0.5 || isTop) {
        const fontSize = Math.min(16, Math.max(8, 12 / globalScale));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "center";
        const labelText = node.content
          ? node.content.length > 24
            ? node.content.slice(0, 24) + "..."
            : node.content
          : node.id.slice(0, 8);
        ctx.fillText(labelText, node.x, node.y + radius + 12 / globalScale);
      }
    },
    [topNodeIds]
  );

  const linkWidth = useCallback(
    (link: any) => Math.max(0.5, link.weight * 3),
    []
  );
  const linkColor = useCallback((link: any) => {
    if (link.weight > 0.6) return "rgba(34,211,238,0.5)";
    if (link.weight >= 0.3) return "rgba(59,130,246,0.3)";
    return "rgba(107,114,128,0.15)";
  }, []);

  if (!hasData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-950">
        Send a message to see memory activation
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-950">
      <ForceGraph2D
        graphData={fgData}
        backgroundColor="#030712"
        nodeCanvasObject={nodeCanvasObject}
        linkWidth={linkWidth}
        linkColor={linkColor}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      <div className="absolute top-4 right-4 z-50 w-64 flex flex-col gap-2">
        {topNodes.map((node, index) => (
          <div
            key={node.id}
            className={`p-3 rounded-md border text-xs shadow-lg backdrop-blur-sm ${
              index === 0
                ? "bg-gray-800/95 border-cyan-400 text-white"
                : "bg-gray-900/90 border-gray-700 text-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-mono text-gray-400 truncate"
                title={node.id}
              >
                {node.id.slice(0, 10)}
              </span>
              <span className="text-cyan-400 font-medium">
                {(node.activation * 100).toFixed(1)}%
              </span>
            </div>
            <p className="leading-relaxed break-words max-h-24 overflow-y-auto mb-1">
              {node.content.length > 220
                ? node.content.slice(0, 220) + "…"
                : node.content}
            </p>
            <div className="text-gray-500 text-[10px]">
              {Object.keys(node.edges || {}).length} edges
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
