import { useMemo } from "react";
import { useGraph } from "../context/GraphContext";

const TOP_N = 10;

export default function NodeSidebar() {
  const { graphData, selectNode, selectedNodeId } = useGraph();

  const topNodes = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => b.activation - a.activation)
      .slice(0, TOP_N);
  }, [graphData.nodes]);

  if (graphData.nodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        No active nodes.
      </div>
    );
  }

  return (
    // Forced Flex Column for the Sidebar
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Header (Fixed height) */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1f2937",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 500, fontSize: "14px" }}>Related Nodes</span>
        <span
          style={{
            fontSize: "12px",
            color: "#22d3ee",
            backgroundColor: "rgba(34,211,238,0.1)",
            padding: "2px 8px",
            borderRadius: "9999px",
          }}
        >
          {topNodes.length}
        </span>
      </div>

      {/* Scrollable List Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {topNodes.map((node) => {
          const isActive = node.id === selectedNodeId;
          return (
            <div
              key={node.id}
              onClick={() => selectNode(node.id)}
              style={{
                cursor: "pointer",
                padding: "12px",
                borderRadius: "6px",
                border: isActive ? "1px solid #22d3ee" : "1px solid #374151",
                backgroundColor: isActive ? "#1f2937" : "rgba(31,41,55,0.4)",
                color: isActive ? "#ffffff" : "#d1d5db",
                fontSize: "12px",
                boxShadow: isActive
                  ? "0 4px 6px -1px rgba(22, 78, 99, 0.5)"
                  : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginRight: "8px",
                  }}
                  title={node.id}
                >
                  {node.id.slice(0, 10)}
                </span>
                <span style={{ color: "#22d3ee", fontWeight: 500 }}>
                  {(node.activation * 100).toFixed(0)}%
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {node.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
