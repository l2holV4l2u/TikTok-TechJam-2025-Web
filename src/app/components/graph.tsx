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
import { createEdgeFromData, getLayoutedElements } from "../utils/graphUtils";
import { DependencyGraphProps, GraphNode } from "../types/graphTypes";

const createNodeFromData = (node: GraphNode, index: number): Node => {
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
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
              colors[index % colors.length]
            } flex items-center justify-center mb-2 shadow-lg`}
          >
            <span className="text-white font-bold text-lg">
              {node.label.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 text-center leading-tight">
            {node.label}
          </span>
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
};

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
    if (!selectedNode) return nodes;

    return nodes.map((node) => {
      const isSelected = node.id === selectedNode;
      const isParent = adjacency.parentsMap.get(selectedNode)?.has(node.id);
      const isChild = adjacency.childrenMap.get(selectedNode)?.has(node.id);

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
      } else {
        extra = { opacity: 0.3, filter: "grayscale(0.7)" };
      }

      return { ...node, style: { ...node.style, ...extra } };
    });
  }, [nodes, selectedNode, adjacency]);

  const styledEdges = useMemo(() => {
    if (!selectedNode) return edges;

    return edges.map((edge) => {
      const isParentEdge =
        edge.target === selectedNode &&
        adjacency.parentsMap.get(selectedNode)?.has(edge.source);
      const isChildEdge =
        edge.source === selectedNode &&
        adjacency.childrenMap.get(selectedNode)?.has(edge.target);

      if (isParentEdge) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: "#22c55e",
            strokeWidth: 3,
            opacity: 1,
          },
        };
      }
      if (isChildEdge) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: "#f97316",
            strokeWidth: 3,
            opacity: 1,
          },
        };
      }
      return { ...edge, style: { ...edge.style, opacity: 0.2 } };
    });
  }, [edges, selectedNode, adjacency]);

  return (
    <div
      className={`w-full h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}
    >
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
