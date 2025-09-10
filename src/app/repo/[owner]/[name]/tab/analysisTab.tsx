import { getNodeLabel } from "@/utils/graphUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  inputEdgesAtom,
  inputNodesAtom,
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/atom/graphAtom";
import { useAtom, useAtomValue } from "jotai";
import {
  AlertTriangle,
  BarChart3,
  GitBranch,
  Info,
  Layers,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { analysisAtom } from "@/lib/atom/repoAtom";

export function AnalysisTab() {
  const inputNodes = useAtomValue(inputNodesAtom);
  const inputEdges = useAtomValue(inputEdgesAtom);
  const analysis = useAtomValue(analysisAtom);

  const [showCycles, setShowCycles] = useAtom(showCyclesAtom);
  const [showHeavyNodes, setShowHeavyNodes] = useAtom(showHeavyNodesAtom);
  const [showLongestPath, setShowLongestPath] = useAtom(showLongestPathAtom);
  const [showCriticalNodes, setShowCriticalNodes] = useAtom(
    showCriticalNodesAtom
  );

  // Function to clear all other views when activating one
  const setExclusiveView = (
    viewToActivate: "cycles" | "heavy" | "longest" | "critical" | "none"
  ) => {
    switch (viewToActivate) {
      case "cycles":
        setShowCycles(true);
        setShowHeavyNodes(false);
        setShowLongestPath(false);
        setShowCriticalNodes(false);
        break;
      case "heavy":
        setShowCycles(false);
        setShowHeavyNodes(true);
        setShowLongestPath(false);
        setShowCriticalNodes(false);
        break;
      case "longest":
        setShowCycles(false);
        setShowHeavyNodes(false);
        setShowLongestPath(true);
        setShowCriticalNodes(false);
        break;
      case "critical":
        setShowCycles(false);
        setShowHeavyNodes(false);
        setShowLongestPath(false);
        setShowCriticalNodes(true);
        break;
      case "none":
        setShowCycles(false);
        setShowHeavyNodes(false);
        setShowLongestPath(false);
        setShowCriticalNodes(false);
        break;
    }
  };

  const activeView = showCycles
    ? "cycles"
    : showHeavyNodes
    ? "heavy"
    : showLongestPath
    ? "longest"
    : showCriticalNodes
    ? "critical"
    : "none";

  return (
    <ScrollArea className="h-full">
      <div className="bg-white/95 backdrop-blur-sm p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={24} className="text-gray-800" />
            <span className="text-lg font-semibold text-gray-800">
              Graph Analysis
            </span>
          </div>

          {/* Clear All Views Button */}
          {activeView !== "none" && (
            <button
              onClick={() => setExclusiveView("none")}
              className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Clear Focus
            </button>
          )}
        </div>

        {/* Active View Indicator */}
        {activeView !== "none" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Info size={16} />
              <span className="font-medium">
                Focus Mode:{" "}
                {activeView === "cycles"
                  ? "Cycles"
                  : activeView === "heavy"
                  ? "Heavy Nodes"
                  : activeView === "longest"
                  ? "Longest Path"
                  : activeView === "critical"
                  ? "Critical Nodes"
                  : ""}{" "}
                Active
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Unrelated nodes are faded. Click "Clear Focus" to see all nodes
              normally.
            </p>
          </div>
        )}

        {/* Overview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-gray-800" />
            <span className="font-semibold text-gray-800">Overview</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded border">
              <div className="font-medium text-gray-700">Total Nodes</div>
              <div className="text-lg font-bold text-gray-900">
                {inputNodes.length}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded border">
              <div className="font-medium text-gray-700">Total Edges</div>
              <div className="text-lg font-bold text-gray-900">
                {inputEdges.length}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded border">
              <div className="font-medium text-gray-700">Max Depth</div>
              <div className="text-lg font-bold text-gray-900">
                {analysis.maxDepth}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <div className="font-medium text-green-700">Root Nodes</div>
              <div className="text-lg font-bold text-green-900">
                {analysis.rootNodes.length}
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-200">
              <div className="font-medium text-blue-700">Leaf Nodes</div>
              <div className="text-lg font-bold text-blue-900">
                {analysis.leafNodes.length}
              </div>
            </div>
            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
              <div className="font-medium text-yellow-700">Isolated</div>
              <div className="text-lg font-bold text-yellow-900">
                {analysis.isolatedNodes.length}
              </div>
            </div>
            <div className="bg-red-50 p-2 rounded border border-red-200">
              <div className="font-medium text-red-700">Cycles</div>
              <div className="text-lg font-bold text-red-900">
                {analysis.cycles.cycles.length}
              </div>
            </div>
          </div>
        </div>

        {/* Cycles Panel */}
        <div
          className={`space-y-2 transition-all duration-200 ${
            activeView !== "none" && activeView !== "cycles" ? "opacity-50" : ""
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-800" />
              <span className="font-semibold text-red-800">Cycles</span>
              {activeView === "cycles" && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>
            {analysis.cycles.cycles.length > 0 && (
              <button
                onClick={() => setExclusiveView(showCycles ? "none" : "cycles")}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  showCycles
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-gray-100 text-gray-800 border border-gray-300"
                }`}
              >
                {showCycles ? "Hide Cycles" : "Focus Cycles"}
              </button>
            )}
          </div>
          {analysis.cycles.cycles.length > 0 ? (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {analysis.cycles.cycles.map((cycle, index) => (
                <div
                  key={index}
                  className="text-xs bg-red-50 p-2 rounded border border-red-200"
                >
                  <div className="font-mono text-red-700">
                    {cycle.slice(0, -1).join(" → ")} → {cycle[cycle.length - 1]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <Info className="w-4 h-4" />
              <span className="text-sm">No cycles detected</span>
            </div>
          )}
        </div>

        {/* Heavy Nodes Panel */}
        <div
          className={`space-y-2 transition-all duration-200 ${
            activeView !== "none" && activeView !== "heavy" ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-purple-800" />
              <span className="font-semibold text-purple-800">Heavy Nodes</span>
              {activeView === "heavy" && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>
            <button
              onClick={() =>
                setExclusiveView(showHeavyNodes ? "none" : "heavy")
              }
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                showHeavyNodes
                  ? "bg-purple-100 text-purple-700 border border-purple-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {showHeavyNodes ? "Hide Heavy Nodes" : "Focus Heavy Nodes"}
            </button>
          </div>

          <p className="text-xs text-gray-600 italic">
            * Heavy nodes are the{" "}
            <span className="font-medium">top 3 nodes</span> with the most
            dependencies
          </p>

          <div className="space-y-1">
            {analysis.heaviestNodes.slice(0, 3).map((node) => (
              <div
                key={node.id}
                className="text-xs bg-purple-50 p-2 rounded border border-purple-200"
              >
                <div className="font-mono text-purple-700 font-medium">
                  {getNodeLabel(node.id)}
                </div>
                <div className="text-purple-600">
                  {node.totalDependencies} deps ({node.incoming}↓{" "}
                  {node.outgoing}↑)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Longest Paths Panel */}
        <div
          className={`space-y-2 transition-all duration-200 ${
            activeView !== "none" && activeView !== "longest"
              ? "opacity-50"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={16} className="text-blue-800" />
              <span className="font-semibold text-blue-800">Longest Paths</span>
              {activeView === "longest" && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>

            <button
              onClick={() =>
                setExclusiveView(showLongestPath ? "none" : "longest")
              }
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                showLongestPath
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-gray-100 text-gray-800 border border-gray-300"
              }`}
            >
              {showLongestPath ? "Hide Longest Path" : "Focus Longest Path"}
            </button>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {analysis.longestPaths.map((pathInfo, index) => (
              <div
                key={index}
                className="text-xs bg-blue-50 p-2 rounded border border-blue-200"
              >
                <div className="text-blue-600 font-medium mb-1">
                  Length: {pathInfo.length} steps
                </div>
                <div className="font-mono text-blue-700 text-xs">
                  {pathInfo.path.map(getNodeLabel).join(" → ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Nodes Panel */}
        <div
          className={`space-y-2 transition-all duration-200 ${
            activeView !== "none" && activeView !== "critical"
              ? "opacity-50"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-amber-800" />
              <span className="font-semibold text-amber-800">
                Critical Nodes
              </span>
              {activeView === "critical" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>

            <button
              onClick={() =>
                setExclusiveView(showCriticalNodes ? "none" : "critical")
              }
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                showCriticalNodes
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-gray-100 text-gray-800 border border-gray-300"
              }`}
            >
              {showCriticalNodes
                ? "Hide Critical Nodes"
                : "Focus Critical Nodes"}
            </button>
          </div>

          <p className="text-xs text-gray-600 italic">
            * Critical nodes are the{" "}
            <span className="font-medium">top 3 nodes</span> with the most
            dependency paths
          </p>

          <div className="space-y-1">
            {analysis.criticalNodes.slice(0, 3).map((nodeId) => (
              <div
                key={nodeId}
                className="text-xs bg-amber-50 p-2 rounded border border-amber-200"
              >
                <div className="font-mono text-amber-800 font-medium">
                  {getNodeLabel(nodeId)}
                </div>
                <div className="text-amber-600">
                  Appears in many dependency paths
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graph Stats Overlay */}
        <div
          className={`space-y-2 transition-all duration-200 ${
            activeView !== "none" ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-indigo-800" />
            <span className="font-semibold text-indigo-800">Graph Health</span>
          </div>

          {/* Stats */}
          <div className="space-y-2 text-xs">
            <div
              className={`flex items-center justify-between p-2 rounded border ${
                analysis.cycles.cycles.length === 0
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    analysis.cycles.cycles.length === 0
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                Cycles
              </span>
              <span className="font-medium">
                {analysis.cycles.cycles.length === 0
                  ? "None"
                  : analysis.cycles.cycles.length}
              </span>
            </div>

            <div
              className={`flex items-center justify-between p-2 rounded border ${
                analysis.isolatedNodes.length === 0
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    analysis.isolatedNodes.length === 0
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                Isolated Nodes
              </span>
              <span className="font-medium">
                {analysis.isolatedNodes.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded border bg-blue-50 border-blue-200 text-blue-700">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Depth
              </span>
              <span className="font-medium">{analysis.maxDepth}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
