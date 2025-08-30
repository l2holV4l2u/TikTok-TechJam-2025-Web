import { Edge, MarkerType, Node } from "@xyflow/react";
import { GraphEdge } from "../types/graphTypes";

// Auto-layout function for hierarchical arrangement
export function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  if (nodes.length === 0) return { nodes, edges };

  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  edges.forEach((edge) => {
    (
      incomingEdges.get(edge.target) ??
      incomingEdges.set(edge.target, []).get(edge.target)
    )?.push(edge.source);
    (
      outgoingEdges.get(edge.source) ??
      outgoingEdges.set(edge.source, []).get(edge.source)
    )?.push(edge.target);
  });

  const rootNodes = nodes.filter((n) => !incomingEdges.has(n.id));

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue = rootNodes.map((n) => ({ id: n.id, level: 0 }));

  while (queue.length) {
    const { id, level } = queue.shift()!;
    if (levels.has(id)) continue;
    levels.set(id, level);

    (outgoingEdges.get(id) ?? []).forEach((child) =>
      queue.push({ id: child, level: level + 1 })
    );
  }

  const grouped = new Map<number, string[]>();
  levels.forEach((lvl, id) => {
    if (!grouped.has(lvl)) grouped.set(lvl, []);
    grouped.get(lvl)!.push(id);
  });

  const levelSpacing = 200;
  const nodeSpacing = 180;

  const layoutedNodes = nodes.map((node) => {
    const lvl = levels.get(node.id) ?? 0;
    const ids = grouped.get(lvl) ?? [];
    const idx = ids.indexOf(node.id);
    const total = ids.length;

    return {
      ...node,
      position: {
        x: (idx - (total - 1) / 2) * nodeSpacing,
        y: lvl * levelSpacing,
      },
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
