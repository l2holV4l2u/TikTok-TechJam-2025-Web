"use client";

import {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import React, { useState, useCallback, useMemo } from "react";
import "@xyflow/react/dist/style.css";
import {
  createEdgeFromData,
  getLayoutedElements,
  getNodeLabel,
} from "../app/utils/graphUtils";
import { DependencyGraphProps, GraphNode } from "../app/types/graphTypes";
import {
  AlertTriangle,
  Info,
  Target,
  GitBranch,
  TrendingUp,
  Users,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { analyzeGraph } from "@/app/utils/graphAnalysis";
import { GraphLegend } from "./graphLegend";
import { GraphStats } from "./graphStat";

function createNodeFromData(node: GraphNode, index: number) {
  const colors = [
    "from-purple-500 to-indigo-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-violet-500 to-purple-600",
  ];

  return {
    id: node.id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      label: (
        <div className="flex flex-col items-center justify-center p-3 min-w-[120px]">
          <div
            className={`rounded-sm bg-gradient-to-br ${
              colors[index % colors.length]
            } flex items-center justify-center mb-2 shadow-lg p-1`}
          >
            <div className="text-white font-bold text-sm">
              {getNodeLabel(node.id)}
            </div>
          </div>
          <div className="text-sm font-medium text-gray-700 text-center leading-tight">
            {node.kind}
          </div>
        </div>
      ),
    },
    style: {
      background: "rgba(255, 255, 255, 0.95)",
      border: "2px solid rgba(148, 163, 184, 0.3)",
      borderRadius: "16px",
      padding: "0",
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(8px)",
      minWidth: "140px",
      minHeight: "100px",
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  };
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes: inputNodes,
  edges: inputEdges,
  className = "",
}) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const n = inputNodes.map(createNodeFromData);
    const e = inputEdges.map(createEdgeFromData);
    return getLayoutedElements(n, e);
  }, [inputNodes, inputEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showCycles, setShowCycles] = useState(false);
  const [showHeavyNodes, setShowHeavyNodes] = useState(false);
  const [showLongestPath, setShowLongestPath] = useState(false);
  const [showCriticalNodes, setShowCriticalNodes] = useState(false);
  const [selectedAnalysisPanel, setSelectedAnalysisPanel] =
    useState<string>("cycles");
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);

  // Comprehensive graph analysis
  const analysis = useMemo(() => {
    return analyzeGraph(inputNodes, inputEdges);
  }, [inputNodes, inputEdges]);

  const adjacency = useMemo(() => {
    const parentsMap = new Map<string, Set<string>>();
    const childrenMap = new Map<string, Set<string>>();

    edges.forEach((edge) => {
      if (!parentsMap.has(edge.target)) parentsMap.set(edge.target, new Set());
      if (!childrenMap.has(edge.source))
        childrenMap.set(edge.source, new Set());
      parentsMap.get(edge.target)!.add(edge.source);
      childrenMap.get(edge.source)!.add(edge.target);
    });

    return { parentsMap, childrenMap };
  }, [edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedNode;
      const isParent =
        selectedNode && adjacency.parentsMap.get(selectedNode)?.has(node.id);
      const isChild =
        selectedNode && adjacency.childrenMap.get(selectedNode)?.has(node.id);
      const isInCycle = showCycles && analysis.cycles.cycleNodes.has(node.id);
      const isHeavy =
        showHeavyNodes &&
        analysis.heaviestNodes.slice(0, 3).some((n) => n.id === node.id);
      const isInLongestPath =
        showLongestPath && analysis.longestPaths[0]?.path.includes(node.id);
      const isCritical =
        showCriticalNodes &&
        analysis.criticalNodes.slice(0, 3).includes(node.id);

      let extra: React.CSSProperties = {};

      if (isSelected) {
        extra = {
          boxShadow:
            "0 0 0 3px rgba(99, 102, 241, 0.5), 0 20px 35px -5px rgba(99, 102, 241, 0.4)",
          border: "3px solid #6366f1",
          zIndex: 10,
        };
      } else if (isParent) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(34, 197, 94, 0.5), 0 15px 25px -5px rgba(34, 197, 94, 0.3)",
          border: "2px solid #22c55e",
          background: "rgba(240, 253, 244, 0.95)",
        };
      } else if (isChild) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(249, 115, 22, 0.5), 0 15px 25px -5px rgba(249, 115, 22, 0.3)",
          border: "2px solid #f97316",
          background: "rgba(255, 247, 237, 0.95)",
        };
      } else if (isInCycle) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(239, 68, 68, 0.6), 0 15px 25px -5px rgba(239, 68, 68, 0.4)",
          border: "2px solid #ef4444",
          background: "rgba(254, 242, 242, 0.95)",
        };
      } else if (isHeavy) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(168, 85, 247, 0.6), 0 15px 25px -5px rgba(168, 85, 247, 0.4)",
          border: "2px solid #a855f7",
          background: "rgba(250, 245, 255, 0.95)",
        };
      } else if (isInLongestPath) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(14, 165, 233, 0.6), 0 15px 25px -5px rgba(14, 165, 233, 0.4)",
          border: "2px solid #0ea5e9",
          background: "rgba(240, 249, 255, 0.95)",
        };
      } else if (isCritical) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(245, 158, 11, 0.6), 0 15px 25px -5px rgba(245, 158, 11, 0.4)",
          border: "2px solid #f59e0b",
          background: "rgba(255, 251, 235, 0.95)",
        };
      } else if (selectedNode && !isSelected && !isParent && !isChild) {
        extra = { opacity: 0.3, filter: "grayscale(0.7)" };
      }

      return { ...node, style: { ...node.style, ...extra } };
    });
  }, [
    nodes,
    selectedNode,
    adjacency,
    showCycles,
    showHeavyNodes,
    showLongestPath,
    showCriticalNodes,
    analysis,
  ]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isParentEdge =
        selectedNode &&
        edge.target === selectedNode &&
        adjacency.parentsMap.get(selectedNode)?.has(edge.source);
      const isChildEdge =
        selectedNode &&
        edge.source === selectedNode &&
        adjacency.childrenMap.get(selectedNode)?.has(edge.target);
      const isInCycle =
        showCycles &&
        analysis.cycles.cycleEdges.has(`${edge.source}-${edge.target}`);
      const isInLongestPath =
        showLongestPath &&
        analysis.longestPaths[0]?.path.some(
          (node, i) =>
            i < analysis.longestPaths[0].path.length - 1 &&
            analysis.longestPaths[0].path[i] === edge.source &&
            analysis.longestPaths[0].path[i + 1] === edge.target
        );

      let style = { ...edge.style };

      if (isParentEdge) {
        style = {
          ...style,
          stroke: "#22c55e",
          strokeWidth: 3,
          opacity: 1,
        };
      } else if (isChildEdge) {
        style = {
          ...style,
          stroke: "#f97316",
          strokeWidth: 3,
          opacity: 1,
        };
      } else if (isInCycle) {
        style = {
          ...style,
          stroke: "#ef4444",
          strokeWidth: 3,
          opacity: 1,
          strokeDasharray: "8,4",
        };
      } else if (isInLongestPath) {
        style = {
          ...style,
          stroke: "#0ea5e9",
          strokeWidth: 3,
          opacity: 1,
          strokeDasharray: "12,4",
        };
      } else if (selectedNode && !isParentEdge && !isChildEdge) {
        style = { ...style, opacity: 0.2 };
      }

      return { ...edge, style };
    });
  }, [edges, selectedNode, adjacency, showCycles, showLongestPath, analysis]);

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
    <div
      className={`w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative ${className}`}
    >
      {/* Analysis Panel */}
      {showAnalysisPanel && (
        <div className="absolute top-4 left-4 z-20 max-w-sm">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">
                  Graph Analysis
                </span>
              </div>
              <button
                onClick={() => setShowAnalysisPanel(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <EyeOff className="w-4 h-4 text-gray-500" />
              </button>
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
      )}

      {/* Show/Hide Panel Button */}
      {!showAnalysisPanel && (
        <button
          onClick={() => setShowAnalysisPanel(true)}
          className="absolute top-4 left-4 z-20 p-2 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg hover:bg-white transition-colors"
        >
          <Eye className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Graph Stats Overlay */}
      <GraphStats analysis={analysis} />

      <GraphLegend
        showCycles={showCycles}
        showHeavyNodes={showHeavyNodes}
        showCriticalNodes={showCriticalNodes}
        showLongestPath={showLongestPath}
      />

      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2, minZoom: 0.5 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          color="#e2e8f0"
          gap={20}
          size={1}
          style={{ opacity: 0.5 }}
        />
        <Controls className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg" />
        <MiniMap
          className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg"
          nodeColor={(node) => {
            if (showCycles && analysis.cycles.cycleNodes.has(node.id))
              return "#ef4444";
            if (
              showHeavyNodes &&
              analysis.heaviestNodes.slice(0, 3).some((n) => n.id === node.id)
            )
              return "#a855f7";
            if (
              showLongestPath &&
              analysis.longestPaths[0]?.path.includes(node.id)
            )
              return "#0ea5e9";
            if (
              showCriticalNodes &&
              analysis.criticalNodes.slice(0, 3).includes(node.id)
            )
              return "#f59e0b";
            if (!selectedNode) return "#94a3b8";
            if (selectedNode === node.id) return "#6366f1";
            if (adjacency.parentsMap.get(selectedNode)?.has(node.id))
              return "#22c55e";
            if (adjacency.childrenMap.get(selectedNode)?.has(node.id))
              return "#f97316";
            return "#d1d5db";
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>
    </div>
  );
};
