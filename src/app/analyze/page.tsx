"use client";
import React, { useCallback } from "react";
import {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { constructGraph } from "../components/graph";

const initial = constructGraph(
  [
    { id: "A", label: "Core Module" },
    { id: "B", label: "Auth Service" },
    { id: "C", label: "User API" },
    { id: "D", label: "Frontend" },
  ],
  [
    { source: "A", target: "B" },
    { source: "A", target: "C" },
    { source: "B", target: "D" },
    { source: "C", target: "D" },
  ]
);

export default function GraphPage() {
  const [nodes, setNodes] = React.useState(initial.nodes);
  const [edges, setEdges] = React.useState(initial.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
