import { useMemo, useCallback, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useGraph } from "../context/GraphContext";
import type { GraphNodeData } from "../types/graph";

interface FGNode extends GraphNodeData {
  x?: number;
  y?: number;
}

const TOP_N = 3;

// 🎛️ THE MAGIC DIAL: Adjust this to push nodes higher or lower on the screen.
const Y_OFFSET = 110;

export default function MemoryGraph() {
  const { graphData, selectNode, selectedNodeId } = useGraph();
  const fgRef = useRef<any>(null);

  // Track if we've already padded the camera
  const hasFittedCamera = useRef(false);

  // Reset the camera tracker whenever new nodes/messages arrive
  useEffect(() => {
    hasFittedCamera.current = false;
  }, [graphData]);

  const topNodes = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => b.activation - a.activation)
      .slice(0, TOP_N);
  }, [graphData.nodes]);

  const topNodeIds = useMemo(
    () => new Set(topNodes.map((n) => n.id)),
    [topNodes],
  );

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

  // Auto-focus graph when a node is selected from the sidebar
  useEffect(() => {
    if (selectedNodeId && fgRef.current) {
      const node = fgData.nodes.find((n) => n.id === selectedNodeId) as
        | FGNode
        | undefined;
      if (node && node.x != null && node.y != null) {
        // Centers the camera using our global Y_OFFSET
        fgRef.current.centerAt(node.x, node.y + Y_OFFSET, 800);
      }
    }
  }, [selectedNodeId, fgData.nodes]);

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;

      const act = node.activation;
      const radiusBase = Math.max(1, act * 10);

      const isTop = topNodeIds.has(node.id);
      const isImportant = importantNodeIds.has(node.id);
      const isSelected = node.id === selectedNodeId;

      let radius = radiusBase;
      if (isTop) radius *= 1.8;
      else if (isImportant) radius *= 1.2;

      let color = "rgba(107,114,128,0.15)";
      if (act > 0.8) color = "#ffffff";
      else if (act > 0.6) color = "#22d3ee";
      else if (act > 0.3) color = "#3b82f6";
      else if (act > 0.1) color = "rgba(59,130,246,0.5)";

      if (!isImportant && act <= 0.1) {
        color = "rgba(107,114,128,0.3)";
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

      if (isTop || isSelected) {
        ctx.shadowBlur = isSelected ? 35 : 25;
        ctx.shadowColor = isSelected ? "#a855f7" : "#22d3ee";
      }

      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isTop || isSelected) {
        ctx.strokeStyle = isSelected
          ? "rgba(168, 85, 247, 0.9)"
          : "rgba(34,211,238,0.9)";
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
      }

      if (isTop || act > 0.6 || isSelected) {
        const fontSize = Math.min(16, Math.max(8, 12 / globalScale));
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
        ctx.fillStyle = isSelected ? "#e9d5ff" : "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";

        const content = node.content || "";
        const labelText =
          content.length > 24
            ? content.slice(0, 24) + "..."
            : content || node.id.slice(0, 8);

        ctx.fillText(labelText, node.x, node.y + radius + 12 / globalScale);
      }
    },
    [topNodeIds, importantNodeIds, selectedNodeId],
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

  if (!hasData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          color: "#6b7280",
          fontSize: "14px",
          backgroundColor: "#030712",
        }}
      >
        Send a message or upload a PDF to visualize memory activation
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#030712",
        overflow: "hidden",
      }}
    >
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
        onEngineStop={() => {
          if (
            fgRef.current &&
            !hasFittedCamera.current &&
            fgData.nodes.length > 0
          ) {
            hasFittedCamera.current = true;

            if (fgData.nodes.length <= 4) {
              let minX = Infinity,
                maxX = -Infinity;
              let minY = Infinity,
                maxY = -Infinity;
              let hasValidCoords = false;

              fgData.nodes.forEach((node: FGNode) => {
                if (node.x != null && node.y != null) {
                  minX = Math.min(minX, node.x);
                  maxX = Math.max(maxX, node.x);
                  minY = Math.min(minY, node.y);
                  maxY = Math.max(maxY, node.y);
                  hasValidCoords = true;
                }
              });

              let centerX = 0;
              let centerY = 0;

              if (hasValidCoords) {
                centerX = (minX + maxX) / 2;
                centerY = (minY + maxY) / 2;
              }

              // Point the camera at the calculated center PLUS the offset, then zoom
              fgRef.current.centerAt(centerX, centerY + Y_OFFSET, 500);
              fgRef.current.zoom(2.5, 500);
            } else {
              // For large PDF uploads
              fgRef.current.zoomToFit(500, 150);

              // Shift the camera up slightly after zoomToFit finishes
              setTimeout(() => {
                if (fgRef.current) {
                  const currentCenter = fgRef.current.centerAt();
                  fgRef.current.centerAt(
                    currentCenter.x,
                    currentCenter.y + Y_OFFSET,
                    500,
                  );
                }
              }, 500);
            }
          }
        }}
        onNodeClick={(node: FGNode) => {
          selectNode(node.id);
          if (fgRef.current && node.x != null && node.y != null) {
            fgRef.current.centerAt(node.x, node.y + Y_OFFSET, 800);
          }
        }}
      />
    </div>
  );
}
