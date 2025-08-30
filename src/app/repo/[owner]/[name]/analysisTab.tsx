import { DependencyGraphProps } from "@/app/types/graphTypes";
import { analyzeGraph } from "@/app/utils/graphAnalysis";
import { getNodeLabel } from "@/app/utils/graphUtils";
import { GraphLegend } from "@/components/graphLegend";
import { GraphStats } from "@/components/graphStat";
import { Tabs } from "@/components/ui/tabs";
import {
  analysisAtom,
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/graphAtom";
import { useAtom, useAtomValue } from "jotai";
import {
  AlertTriangle,
  BarChart3,
  GitBranch,
  Info,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

export function AnalysisTab({
  nodes: inputNodes,
  edges: inputEdges,
}: DependencyGraphProps) {
  // Comprehensive graph analysis
  const analysis = useAtomValue(analysisAtom);
  const [showCycles, setShowCycles] = useAtom(showCyclesAtom);
  const [showHeavyNodes, setShowHeavyNodes] = useAtom(showHeavyNodesAtom);
  const [showLongestPath, setShowLongestPath] = useAtom(showLongestPathAtom);
  const [showCriticalNodes, setShowCriticalNodes] = useAtom(
    showCriticalNodesAtom
  );
  const [selectedAnalysisPanel, setSelectedAnalysisPanel] =
    useState<string>("cycles");

  const renderAnalysisPanel = () => {
    const panels = {
      cycles: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-gray-800">Cycles</span>
          </div>

          {analysis.cycles.cycles.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {analysis.cycles.cycles.length} cycle(s) detected!
                </span>
              </div>

              <button
                onClick={() => setShowCycles(!showCycles)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  showCycles
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-gray-100 text-gray-700 border border-gray-300"
                }`}
              >
                {showCycles ? "Hide Cycles" : "Highlight Cycles"}
              </button>

              {showCycles && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    Detected cycles:
                  </div>
                  {analysis.cycles.cycles.map((cycle, index) => (
                    <div
                      key={index}
                      className="text-xs bg-red-50 p-2 rounded border border-red-200"
                    >
                      <div className="font-mono text-red-700">
                        {cycle.slice(0, -1).join(" → ")} →{" "}
                        {cycle[cycle.length - 1]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <Info className="w-4 h-4" />
              <span className="text-sm">No cycles detected</span>
            </div>
          )}
        </div>
      ),

      heavy: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-800">Heavy Nodes</span>
          </div>

          <button
            onClick={() => setShowHeavyNodes(!showHeavyNodes)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              showHeavyNodes
                ? "bg-purple-100 text-purple-700 border border-purple-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            {showHeavyNodes ? "Hide Heavy Nodes" : "Highlight Heavy Nodes"}
          </button>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-600 mb-1">
              Most connected nodes:
            </div>
            {analysis.heaviestNodes.slice(0, 5).map((node) => (
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
      ),

      paths: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Longest Paths</span>
          </div>

          <button
            onClick={() => setShowLongestPath(!showLongestPath)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              showLongestPath
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            {showLongestPath ? "Hide Longest Path" : "Highlight Longest Path"}
          </button>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-600 mb-1">
              Longest dependency chains:
            </div>
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
      ),

      critical: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-gray-800">Critical Nodes</span>
          </div>

          <button
            onClick={() => setShowCriticalNodes(!showCriticalNodes)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              showCriticalNodes
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            {showCriticalNodes
              ? "Hide Critical Nodes"
              : "Highlight Critical Nodes"}
          </button>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-600 mb-1">
              Most critical nodes:
            </div>
            {analysis.criticalNodes.slice(0, 5).map((nodeId) => (
              <div
                key={nodeId}
                className="text-xs bg-amber-50 p-2 rounded border border-amber-200"
              >
                <div className="font-mono text-amber-700 font-medium">
                  {getNodeLabel(nodeId)}
                </div>
                <div className="text-amber-600">
                  Appears in many dependency paths
                </div>
              </div>
            ))}
          </div>
        </div>
      ),

      overview: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-800">Overview</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
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

          {analysis.isolatedNodes.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Isolated nodes:
              </div>
              <div className="text-xs text-gray-500">
                {analysis.isolatedNodes.map(getNodeLabel).join(", ")}
              </div>
            </div>
          )}

          {analysis.rootNodes.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Entry points:
              </div>
              <div className="text-xs text-gray-500">
                {analysis.rootNodes.slice(0, 5).map(getNodeLabel).join(", ")}
                {analysis.rootNodes.length > 5 &&
                  ` (+${analysis.rootNodes.length - 5} more)`}
              </div>
            </div>
          )}

          {analysis.leafNodes.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">
                End points:
              </div>
              <div className="text-xs text-gray-500">
                {analysis.leafNodes.slice(0, 5).map(getNodeLabel).join(", ")}
                {analysis.leafNodes.length > 5 &&
                  ` (+${analysis.leafNodes.length - 5} more)`}
              </div>
            </div>
          )}
        </div>
      ),
    };

    return (
      panels[selectedAnalysisPanel as keyof typeof panels] || panels.cycles
    );
  };

  return (
    <Tabs>
      {/* Analysis Panel */}
      <div className="absolute top-16 left-4 z-20 max-w-sm">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-800">
                Graph Analysis
              </span>
            </div>
          </div>

          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "cycles", label: "Cycles", icon: AlertTriangle },
              { id: "heavy", label: "Heavy", icon: Users },
              { id: "paths", label: "Paths", icon: GitBranch },
              { id: "critical", label: "Critical", icon: Target },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedAnalysisPanel(id)}
                className={`flex-1 flex items-center justify-center gap-1 p-2 text-xs transition-colors ${
                  selectedAnalysisPanel === id
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="p-4">{renderAnalysisPanel()}</div>
        </div>
      </div>

      {/* Graph Stats Overlay */}
      <GraphStats analysis={analysis} />

      <GraphLegend
        showCycles={showCycles}
        showHeavyNodes={showHeavyNodes}
        showCriticalNodes={showCriticalNodes}
        showLongestPath={showLongestPath}
      />
    </Tabs>
  );
}
