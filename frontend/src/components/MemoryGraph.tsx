import { useState, useRef, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData } from "../types/graph";

interface FGNode extends GraphNodeData {
  x?: number;
  y?: number;
}

export default function MemoryGraph() {
  const { selectNode, graphData, selectedNodeId } = useGraph();
  const [hoveredNode, setHoveredNode] = useState<FGNode | null>(null);
  const fgRef = useRef<any>(null);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId]
  );

  const tooltipNode = hoveredNode ?? selectedNode;

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

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNodeId === node.id;

      let radius = Math.max(2, act * 10);
      if (isSelected) radius *= 1.3;
      else if (isHovered) radius *= 1.15;

      let color = "rgba(107,114,128,0.2)";
      if (act > 0.8) color = "#ffffff";
      else if (act > 0.6) color = "#22d3ee";
      else if (act > 0.3) color = "#3b82f6";
      else if (act > 0.1) color = "rgba(59,130,246,0.6)";

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (act > 0.5 || isSelected || isHovered) {
        const fontSize = Math.min(16, Math.max(8, 12 / globalScale));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "center";
        const labelText = node.content
          ? node.content.length > 24
            ? node.content.slice(0, 24) + "..."
            : node.content
          : node.id.slice(0, 8);
        ctx.fillText(
          labelText,
          node.x,
          node.y + radius + 12 / globalScale
        );
      }
    },
    [hoveredNode, selectedNodeId]
  );

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      if (node.x == null || node.y == null) return;
      if (!ctx || typeof ctx.beginPath !== "function") return;

      const act = node.activation;
      const isSelected = selectedNodeId === node.id;

      let radius = Math.max(2, act * 10);
      if (isSelected) radius *= 1.3;
      radius = Math.max(radius + 12, 22);

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [selectedNodeId]
  );

  const linkWidth = useCallback((link: any) => Math.max(0.5, link.weight * 3), []);
  const linkColor = useCallback((link: any) => {
    if (link.weight > 0.6) return "rgba(34,211,238,0.5)";
    if (link.weight >= 0.3) return "rgba(59,130,246,0.3)";
    return "rgba(107,114,128,0.15)";
  }, []);

  const handleNodeHover = useCallback((node: FGNode | null) => {
    console.log("hover", node);
    setHoveredNode(node);
  }, []);

  const handleNodeClick = useCallback((node: FGNode) => {
    console.log("click", node);
    selectNode(node.id);
  }, [selectNode]);

  const handleBackgroundClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

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
      {/* Debug state readout */}
      <div className="absolute top-4 left-4 z-50 bg-black/80 text-green-400 font-mono text-xs p-2 rounded pointer-events-none space-y-0.5">
        <div>DEBUG</div>
        <div>hovered: {hoveredNode?.id ?? "null"}</div>
        <div>selected: {selectedNodeId ?? "null"}</div>
        <div>tooltip: {tooltipNode ? "true" : "false"}</div>
        <div>nodes: {fgData.nodes.length}</div>
      </div>

      {/* Hardcoded render test */}
      <div className="absolute top-4 right-4 z-50 bg-red-600 text-white p-4 rounded pointer-events-none">
        TEST PANEL
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={fgData}
        backgroundColor="#030712"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkWidth={linkWidth}
        linkColor={linkColor}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      {tooltipNode && (
        <div className="absolute top-4 right-4 z-50 w-64 max-h-96 overflow-y-auto bg-gray-900/90 border border-gray-700 rounded-md p-3 text-xs text-gray-200 pointer-events-none shadow-lg backdrop-blur-sm">
          <div className="font-mono text-gray-400 mb-1 break-all">
            {tooltipNode.id}
          </div>
          <div className="text-gray-300 mb-2 leading-relaxed break-words max-h-32 overflow-y-auto">
            {tooltipNode.content.length > 300
              ? tooltipNode.content.slice(0, 300) + "..."
              : tooltipNode.content}
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Activation: {(tooltipNode.activation * 100).toFixed(1)}%</span>
            <span>Edges: {Object.keys(tooltipNode.edges || {}).length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
