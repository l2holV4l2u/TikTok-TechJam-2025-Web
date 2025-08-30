import dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { GraphEdge } from "../types/graphTypes";

// Auto-layout function for hierarchical arrangement
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB" // top-bottom or left-right
): { nodes: Node[]; edges: Edge[] } {
  const nodeWidth = 180;
  const nodeHeight = 120;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
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

export function getNodeLabel(nodeId: string): string {
  const parts = nodeId.split(".");
  return parts[parts.length - 1].toUpperCase();
}
