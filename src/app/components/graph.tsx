import { Edge, Node } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

export interface GraphInput {
  id: string;
  label: string;
}

export function constructGraph(
  inputs: GraphInput[],
  connections: { source: string; target: string }[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = inputs.map((n) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: 0, y: 0 }, // dagre overwrites
    type: "default",
    draggable: true, // allow manual reposition
  }));

  const edges: Edge[] = connections.map((e, idx) => ({
    id: `e-${idx}`,
    source: e.source,
    target: e.target,
    type: "bezier",
  }));

  // Build dagre graph
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 150, height: 50 });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Apply dagre positions
  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return pos
      ? {
          ...node,
          position: { x: pos.x - 75, y: pos.y - 25 },
        }
      : node;
  });

  return { nodes: layoutedNodes, edges };
}
