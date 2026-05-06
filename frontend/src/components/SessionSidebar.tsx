import { useGraph } from "../context/GraphContext";

export default function SessionSidebar() {
  const { sessions, activeSessionId, setActiveSession, triggerReplay } = useGraph();

  return (
    <div className="w-64 h-full bg-gray-900 border-r border-gray-800 flex flex-col text-gray-300 shrink-0">
      <div className="p-4 border-b border-gray-800 font-medium text-sm text-gray-100 flex items-center justify-between">
        <span>Memory Sessions</span>
        <span className="text-[10px] text-gray-500 font-normal">{sessions.length} total</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <div className="p-4 text-xs text-gray-500">No sessions yet. Send a message to begin.</div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`cursor-pointer border-b border-gray-800/50 transition-colors ${
                isActive
                  ? "bg-gray-800/80 text-cyan-400 border-l-2 border-l-cyan-400"
                  : "hover:bg-gray-800/40 text-gray-300"
              }`}
            >
              <div className="px-4 pt-3 pb-1">
                <div className="text-xs font-mono truncate mb-1" title={session.query}>
                  {session.query}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[10px] text-gray-500">{session.nodes.length} nodes</span>
                </div>
              </div>
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSession(session.id);
                    triggerReplay();
                  }}
                  className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
                >
                  Replay
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
