import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { GraphEdge, GraphNode } from "../types/graphTypes";

// Auto-layout function for hierarchical arrangement
export function getLayoutedElements(nodes: Node[], edges: Edge[]) {
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
}

export function createEdgeFromData(edge: GraphEdge) {
  return {
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
  };
}
