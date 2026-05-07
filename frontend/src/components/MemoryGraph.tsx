import { useMemo, useCallback, useRef } from "react";
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
  const fgRef = useRef<any>(null);

  const topNodes = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => b.activation - a.activation)
      .slice(0, TOP_N);
  }, [graphData.nodes]);

  const topNodeIds = useMemo(
    () => new Set(topNodes.map((n) => n.id)),
    [topNodes],
  );

  // 🧠 include neighbors of top nodes
  const importantNodeIds = useMemo(() => {
    const set = new Set<string>();

    for (const node of topNodes) {
      set.add(node.id);
      for (const neighborId of Object.keys(node.edges || {})) {
        set.add(neighborId);
      }
    }

    return set;
  }, [topNodes]);

  const fgData = useMemo(
    () => ({
      nodes: graphData.nodes.map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ ...l })),
    }),
    [graphData],
  );

  const hasData = graphData.nodes.length > 0;

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;

      const act = node.activation;
      if (act <= 0.01) return;

      const isTop = topNodeIds.has(node.id);
      const isImportant = importantNodeIds.has(node.id);

      let radius = Math.max(2, act * 10);

      if (isTop) radius *= 1.8;
      else if (isImportant) radius *= 1.2;

      let color = "rgba(107,114,128,0.15)";

      if (act > 0.8) color = "#ffffff";
      else if (act > 0.6) color = "#22d3ee";
      else if (act > 0.3) color = "#3b82f6";
      else if (act > 0.1) color = "rgba(59,130,246,0.5)";

      // dim non-important nodes
      if (!isImportant) {
        color = "rgba(107,114,128,0.08)";
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

      // glow for top nodes
      if (isTop) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#22d3ee";
      }

      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isTop) {
        ctx.strokeStyle = "rgba(34,211,238,0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // label
      if (isTop || act > 0.6) {
        const fontSize = Math.min(16, Math.max(8, 12 / globalScale));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";

        const content = node.content || "";
        const labelText =
          content.length > 24
            ? content.slice(0, 24) + "..."
            : content || node.id.slice(0, 8);

        ctx.fillText(labelText, node.x, node.y + radius + 12 / globalScale);
      }
    },
    [topNodeIds, importantNodeIds],
  );

  const linkWidth = useCallback(
    (link: any) => Math.max(0.5, link.weight * 3),
    [],
  );

  const linkColor = useCallback((link: any) => {
    if (link.weight > 0.6) return "rgba(34,211,238,0.5)";
    if (link.weight >= 0.3) return "rgba(59,130,246,0.3)";
    return "rgba(107,114,128,0.1)";
  }, []);

  const focusNode = (node: FGNode) => {
    if (!fgRef.current || node.x == null || node.y == null) return;

    fgRef.current.centerAt(node.x, node.y, 800);
    fgRef.current.zoom(2, 800);
  };

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
        ref={fgRef}
        graphData={fgData}
        backgroundColor="#030712"
        nodeCanvasObject={nodeCanvasObject}
        linkWidth={linkWidth}
        linkColor={linkColor}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* SIDE PREVIEW */}
      <div className="absolute top-4 right-4 z-50 w-72 flex flex-col gap-3">
        {topNodes.map((node, index) => {
          const neighbors = Object.keys(node.edges || {}).slice(0, 5);

          return (
            <div
              key={node.id}
              onClick={() => focusNode(node)}
              className={`cursor-pointer p-3 rounded-md border text-xs shadow-lg backdrop-blur-sm transition hover:scale-[1.02] ${
                index === 0
                  ? "bg-gray-800/95 border-cyan-400 text-white"
                  : "bg-gray-900/90 border-gray-700 text-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-gray-400 truncate">
                  {node.id.slice(0, 10)}
                </span>
                <span className="text-cyan-400 font-medium">
                  {(node.activation * 100).toFixed(1)}%
                </span>
              </div>

              <p className="leading-relaxed break-words max-h-24 overflow-y-auto mb-2">
                {(node.content || "").length > 220
                  ? node.content.slice(0, 220) + "…"
                  : node.content}
              </p>

              {/* neighbors preview */}
              <div className="text-[10px] text-gray-500">
                {neighbors.length > 0 && (
                  <div>
                    connected:
                    <div className="flex flex-wrap gap-1 mt-1">
                      {neighbors.map((n) => (
                        <span
                          key={n}
                          className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400"
                        >
                          {n.slice(0, 6)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
