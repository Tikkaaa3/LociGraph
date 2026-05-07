import { useGraph } from "../context/GraphContext";

export default function NodeDetailsPanel() {
  const { graphData, selectedNodeId, selectNode } = useGraph();

  if (!selectedNodeId) {
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
        }}
      >
        Select a node to view details
      </div>
    );
  }

  const node = graphData.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        color: "#e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <h3
          style={{
            fontFamily: "monospace",
            fontSize: "14px",
            fontWeight: "bold",
            color: "#22d3ee",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={node.id}
        >
          {node.id}
        </h3>
        <button
          onClick={() => selectNode(null)}
          style={{
            background: "#374151",
            border: "none",
            color: "#9ca3af",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div>
          <h4
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              fontWeight: "bold",
              letterSpacing: "1px",
              color: "#6b7280",
              marginBottom: "8px",
              marginTop: 0,
            }}
          >
            Content
          </h4>
          <div
            style={{
              backgroundColor: "rgba(31,41,55,0.5)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              whiteSpace: "pre-wrap",
              border: "1px solid rgba(55,65,81,0.5)",
            }}
          >
            {node.content}
          </div>
        </div>

        <div>
          <h4
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              fontWeight: "bold",
              letterSpacing: "1px",
              color: "#6b7280",
              marginBottom: "8px",
              marginTop: 0,
            }}
          >
            Activation
          </h4>
          <div
            style={{
              width: "100%",
              backgroundColor: "#1f2937",
              borderRadius: "9999px",
              height: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                backgroundColor: "#06b6d4",
                height: "8px",
                borderRadius: "9999px",
                width: `${node.activation * 100}%`,
              }}
            />
          </div>
          <span style={{ color: "#22d3ee", fontWeight: 500, fontSize: "12px" }}>
            {(node.activation * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
