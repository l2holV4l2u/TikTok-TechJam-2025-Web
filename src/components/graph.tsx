"use client";

import {
  Background,
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
import { useAtom, useAtomValue } from "jotai";
import {
  analysisAtom,
  inputEdgesAtom,
  inputNodesAtom,
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/graphAtom";
import { GraphLegend } from "./graphLegend";

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
        <div className="flex flex-col items-center justify-center p-3">
          <div
            className={`rounded-sm bg-gradient-to-br ${
              colors[index % colors.length]
            } flex items-center justify-center shadow-lg p-1`}
          >
            <div className="text-white font-bold line-clamp-3 break-words w-24 h-16 items-center justify-center">
              {getNodeLabel(node.id)}
            </div>
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

export const DependencyGraph = () => {
  const inputNodes = useAtomValue(inputNodesAtom);
  const inputEdges = useAtomValue(inputEdgesAtom);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const n = inputNodes.map(createNodeFromData);
    const e = inputEdges.map(createEdgeFromData);
    return getLayoutedElements(n, e);
  }, [inputNodes, inputEdges]);
  const showCycles = useAtomValue(showCyclesAtom);
  const analysis = useAtomValue(analysisAtom);
  const showHeavyNodes = useAtomValue(showHeavyNodesAtom);
  const showLongestPath = useAtomValue(showLongestPathAtom);
  const showCriticalNodes = useAtomValue(showCriticalNodesAtom);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

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

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  if (!analysis) {
    return <></>;
  }

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
          (_, i) =>
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

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
        <GraphLegend
          showCycles={showCycles}
          showHeavyNodes={showHeavyNodes}
          showCriticalNodes={showCriticalNodes}
          showLongestPath={showLongestPath}
        />
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
