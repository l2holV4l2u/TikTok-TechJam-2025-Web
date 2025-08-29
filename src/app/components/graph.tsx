"use client";

import {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import React, { useState, useCallback } from "react";
import "@xyflow/react/dist/style.css";

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
}

// Custom node styles for Kotlin modules
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
    position: { x: 0, y: 0 }, // Will be auto-arranged
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

const createEdgeFromData = (edge: GraphEdge, index: number): Edge => ({
  id: `${edge.source}-${edge.target}`,
  source: edge.source,
  target: edge.target,
  type: "smoothstep",
  animated: true,
  style: {
    stroke: "#6366f1",
    strokeWidth: 2,
    strokeDasharray: "5,5",
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#6366f1",
    width: 20,
    height: 20,
  },
  labelStyle: {
    fontSize: 12,
    fontWeight: 600,
    fill: "#4f46e5",
  },
});

// Auto-layout function for hierarchical arrangement
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  // Build adjacency lists
  edges.forEach((edge) => {
    if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
    if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);

    incomingEdges.get(edge.target)!.push(edge.source);
    outgoingEdges.get(edge.source)!.push(edge.target);
  });

  // Find root nodes (no incoming edges)
  const rootNodes = nodes.filter((node) => !incomingEdges.has(node.id));

  // Assign levels using BFS
  const levels = new Map<string, number>();
  const queue = rootNodes.map((node) => ({ id: node.id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (!levels.has(id) || levels.get(id)! < level) {
      levels.set(id, level);

      const children = outgoingEdges.get(id) || [];
      children.forEach((childId) => {
        queue.push({ id: childId, level: level + 1 });
      });
    }
  }

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(nodeId);
  });

  // Position nodes
  const levelSpacing = 200;
  const nodeSpacing = 180;
  const layoutedNodes = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = levelGroups.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node.id);
    const totalInLevel = nodesInLevel.length;

    const x = (indexInLevel - (totalInLevel - 1) / 2) * nodeSpacing;
    const y = level * levelSpacing;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes: inputNodes,
  edges: inputEdges,
  className = "",
}) => {
  const initialNodes = inputNodes.map(createNodeFromData);
  const initialEdges = inputEdges.map(createEdgeFromData);

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(selectedNode === node.id ? null : node.id);
    },
    [selectedNode]
  );

  // Get direct parents and children of selected node
  const getDirectRelations = useCallback(
    (nodeId: string) => {
      const parents: string[] = [];
      const children: string[] = [];

      edges.forEach((edge) => {
        if (edge.target === nodeId) {
          parents.push(edge.source);
        }
        if (edge.source === nodeId) {
          children.push(edge.target);
        }
      });

      return { parents, children };
    },
    [edges]
  );

  // Highlight only direct parent and child nodes
  const getNodeStyle = useCallback(
    (nodeId: string) => {
      if (!selectedNode) return {};

      const isSelected = nodeId === selectedNode;
      const { parents, children } = getDirectRelations(selectedNode);
      const isParent = parents.includes(nodeId);
      const isChild = children.includes(nodeId);

      if (isSelected) {
        return {
          boxShadow:
            "0 0 0 3px rgba(99, 102, 241, 0.5), 0 20px 35px -5px rgba(99, 102, 241, 0.4)",
          border: "3px solid #6366f1",
          zIndex: 10,
        };
      } else if (isParent) {
        return {
          boxShadow:
            "0 0 0 2px rgba(34, 197, 94, 0.5), 0 15px 25px -5px rgba(34, 197, 94, 0.3)",
          border: "2px solid #22c55e",
          background: "rgba(240, 253, 244, 0.95)",
        };
      } else if (isChild) {
        return {
          boxShadow:
            "0 0 0 2px rgba(249, 115, 22, 0.5), 0 15px 25px -5px rgba(249, 115, 22, 0.3)",
          border: "2px solid #f97316",
          background: "rgba(255, 247, 237, 0.95)",
        };
      } else {
        return {
          opacity: 0.3,
          filter: "grayscale(0.7)",
        };
      }
    },
    [selectedNode, getDirectRelations]
  );

  const getEdgeStyle = useCallback(
    (edge: Edge) => {
      if (!selectedNode) return edge.style;

      const { parents, children } = getDirectRelations(selectedNode);
      const isParentEdge =
        edge.target === selectedNode && parents.includes(edge.source);
      const isChildEdge =
        edge.source === selectedNode && children.includes(edge.target);

      if (isParentEdge) {
        return {
          ...edge.style,
          stroke: "#22c55e",
          strokeWidth: 3,
          strokeDasharray: "none",
          opacity: 1,
        };
      } else if (isChildEdge) {
        return {
          ...edge.style,
          stroke: "#f97316",
          strokeWidth: 3,
          strokeDasharray: "none",
          opacity: 1,
        };
      } else {
        return {
          ...edge.style,
          opacity: 0.2,
        };
      }
    },
    [selectedNode, getDirectRelations]
  );

  const updatedNodes = nodes.map((node) => ({
    ...node,
    style: { ...node.style, ...getNodeStyle(node.id) },
  }));

  const updatedEdges = edges.map((edge) => ({
    ...edge,
    style: getEdgeStyle(edge),
  }));

  const selectedNodeInfo = selectedNode
    ? {
        ...getDirectRelations(selectedNode),
        label: inputNodes.find((n) => n.id === selectedNode)?.label,
      }
    : null;

  return (
    <div
      className={`w-full h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${className} relative`}
    >
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          Kotlin Dependency Graph
        </h2>
        <p className="text-sm text-gray-600 mb-2">
          Click on nodes to highlight direct dependencies
        </p>
        <div className="flex flex-col space-y-1 text-xs text-gray-500 mb-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-sm mr-2"></div>
            <span>Selected Module</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-sm mr-2"></div>
            <span>Parent Dependencies</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-sm mr-2"></div>
            <span>Child Dependencies</span>
          </div>
        </div>

        {selectedNodeInfo && (
          <div className="mt-3 p-3 bg-indigo-50 rounded border border-indigo-200">
            <div className="text-xs font-medium text-indigo-700 mb-2">
              Selected: {selectedNodeInfo.label}
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                <span className="font-medium text-green-600">Parents:</span>{" "}
                {selectedNodeInfo.parents.length > 0
                  ? selectedNodeInfo.parents
                      .map((p) => inputNodes.find((n) => n.id === p)?.label)
                      .join(", ")
                  : "None"}
              </div>
              <div>
                <span className="font-medium text-orange-600">Children:</span>{" "}
                {selectedNodeInfo.children.length > 0
                  ? selectedNodeInfo.children
                      .map((c) => inputNodes.find((n) => n.id === c)?.label)
                      .join(", ")
                  : "None"}
              </div>
            </div>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={updatedNodes}
        edges={updatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.2,
          minZoom: 0.5,
        }}
        className="reactflow-wrapper"
        style={{ background: "transparent" }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          color="#e2e8f0"
          gap={20}
          size={1}
          style={{ opacity: 0.5 }}
        />
        <Controls
          className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg"
          nodeColor={(node) => {
            if (!selectedNode) return "#94a3b8";

            if (selectedNode === node.id) return "#6366f1";

            const { parents, children } = getDirectRelations(selectedNode);
            if (parents.includes(node.id)) return "#22c55e";
            if (children.includes(node.id)) return "#f97316";

            return "#d1d5db";
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>
    </div>
  );
};

// Demo component with sample data
export const DemoGraph: React.FC = () => {
  const sampleNodes = [
    { id: "A", label: "Core Module" },
    { id: "B", label: "Auth Service" },
    { id: "C", label: "User API" },
    { id: "D", label: "Frontend" },
    { id: "E", label: "Database Layer" },
    { id: "F", label: "Notification Service" },
  ];

  const sampleEdges = [
    { source: "A", target: "B" },
    { source: "A", target: "C" },
    { source: "A", target: "E" },
    { source: "B", target: "D" },
    { source: "C", target: "D" },
    { source: "E", target: "B" },
    { source: "E", target: "C" },
    { source: "C", target: "F" },
  ];

  return (
    <div className="w-full h-screen">
      <DependencyGraph nodes={sampleNodes} edges={sampleEdges} />
    </div>
  );
};
