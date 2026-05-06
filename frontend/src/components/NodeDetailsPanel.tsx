import { useGraph } from "../context/GraphContext";

export default function NodeDetailsPanel() {
  const { graphData, selectedNodeId, selectNode } = useGraph();

  if (!selectedNodeId) return null;

  const node = graphData.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const getActivationReason = (act: number) => {
    if (act > 0.8) return "Direct semantic match to query — seed node with highest relevance.";
    if (act > 0.5) return "Strong graph propagation from related seed nodes.";
    if (act > 0.2) return "Moderate activation via multi-hop graph connections.";
    return "Related via graph edges to active memory region.";
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-gray-900/95 border-l border-gray-800 backdrop-blur-sm z-20 flex flex-col text-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-mono text-sm truncate" title={node.id}>{node.id}</h3>
        <button onClick={() => selectNode(null)} className="text-gray-400 hover:text-white transition-colors">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Content</h4>
          <div className="bg-gray-800/50 rounded p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {node.content}
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Activation</h4>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
            <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${node.activation * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400">{(node.activation * 100).toFixed(1)}%</p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Why Activated</h4>
          <p className="text-sm text-gray-300">{getActivationReason(node.activation)}</p>
        </div>
        {node.top_neighbors && node.top_neighbors.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Top Neighbors</h4>
            <ul className="space-y-1">
              {node.top_neighbors.map((n) => (
                <li key={n.id} className="flex justify-between text-sm bg-gray-800/30 px-2 py-1 rounded">
                  <span className="font-mono truncate mr-2" title={n.id}>{n.id}</span>
                  <span className="text-gray-400">{n.weight.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
