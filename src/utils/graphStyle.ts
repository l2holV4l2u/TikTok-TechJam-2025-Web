import { EDGE_STYLES, NODE_STYLES } from "@/constant/graph";
import {
  AdjacencyMaps,
  AnalysisData,
  AnalysisFlags,
  SelectedNode,
} from "@/types/graphTypes";
import { Edge, Node } from "@xyflow/react";

export function isNodeInCycle(
  nodeId: string,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return flags.showCycles && analysis.cycles.cycleNodes.has(nodeId);
}

export function isNodeHeavy(
  nodeId: string,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return (
    flags.showHeavyNodes &&
    analysis.heaviestNodes.slice(0, 3).some((n) => n.id === nodeId)
  );
}

export function isNodeInLongestPath(
  nodeId: string,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return (
    flags.showLongestPath && analysis.longestPaths[0]?.path.includes(nodeId)
  );
}

export function isNodeCritical(
  nodeId: string,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return (
    flags.showCriticalNodes &&
    analysis.criticalNodes.slice(0, 3).includes(nodeId)
  );
}

export function isParentNode(
  nodeId: string,
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps
): boolean {
  return selectedNode
    ? adjacency.parentsMap.get(selectedNode.id)?.has(nodeId) || false
    : false;
}

export function isChildNode(
  nodeId: string,
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps
): boolean {
  return selectedNode
    ? adjacency.childrenMap.get(selectedNode.id)?.has(nodeId) || false
    : false;
}

export function hasActiveAnalysisView(flags: AnalysisFlags): boolean {
  return (
    flags.showCycles ||
    flags.showHeavyNodes ||
    flags.showLongestPath ||
    flags.showCriticalNodes
  );
}

export function getStyledNodes(
  nodes: Node[],
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps,
  analysis: AnalysisData,
  flags: AnalysisFlags
): Node[] {
  const activeAnalysisView = hasActiveAnalysisView(flags);

  return nodes.map((node) => {
    const isSelected = node.id === selectedNode?.id;
    const isParent = isParentNode(node.id, selectedNode, adjacency);
    const isChild = isChildNode(node.id, selectedNode, adjacency);

    const isInCycle = isNodeInCycle(node.id, analysis, flags);
    const isHeavy = isNodeHeavy(node.id, analysis, flags);
    const isInLongestPath = isNodeInLongestPath(node.id, analysis, flags);
    const isCritical = isNodeCritical(node.id, analysis, flags);

    let extraStyle: React.CSSProperties = {};

    if (activeAnalysisView) {
      if (isInCycle) {
        extraStyle = NODE_STYLES.CYCLE;
      } else if (isHeavy) {
        extraStyle = NODE_STYLES.HEAVY;
      } else if (isInLongestPath) {
        extraStyle = NODE_STYLES.LONGEST_PATH;
      } else if (isCritical) {
        extraStyle = NODE_STYLES.CRITICAL;
      } else {
        extraStyle = NODE_STYLES.FADED;
      }
    } else if (isSelected) {
      extraStyle = NODE_STYLES.SELECTED;
    } else if (isParent) {
      extraStyle = NODE_STYLES.PARENT;
    } else if (isChild) {
      extraStyle = NODE_STYLES.CHILD;
    } else if (selectedNode && !isSelected && !isParent && !isChild) {
      extraStyle = NODE_STYLES.DIMMED;
    }

    return {
      ...node,
      style: { ...node.style, ...extraStyle },
    };
  });
}

// Edge classification functions
function isParentEdge(
  edge: Edge,
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps
): boolean {
  return selectedNode
    ? edge.target === selectedNode.id &&
        (adjacency.parentsMap.get(selectedNode.id)?.has(edge.source) || false)
    : false;
}

function isChildEdge(
  edge: Edge,
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps
): boolean {
  return selectedNode
    ? edge.source === selectedNode.id &&
        (adjacency.childrenMap.get(selectedNode.id)?.has(edge.target) || false)
    : false;
}

function isEdgeInCycle(
  edge: Edge,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return (
    flags.showCycles &&
    analysis.cycles.cycleEdges.has(`${edge.source}-${edge.target}`)
  );
}

function isEdgeInLongestPath(
  edge: Edge,
  analysis: AnalysisData,
  flags: AnalysisFlags
): boolean {
  return (
    flags.showLongestPath &&
    analysis.longestPaths[0]?.path.some(
      (_, i) =>
        i < analysis.longestPaths[0].path.length - 1 &&
        analysis.longestPaths[0].path[i] === edge.source &&
        analysis.longestPaths[0].path[i + 1] === edge.target
    )
  );
}

// Main edge styling function
export function getStyledEdges(
  edges: Edge[],
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps,
  analysis: AnalysisData,
  flags: AnalysisFlags
): Edge[] {
  const activeAnalysisView = hasActiveAnalysisView(flags);

  return edges.map((edge) => {
    const isParent = isParentEdge(edge, selectedNode, adjacency);
    const isChild = isChildEdge(edge, selectedNode, adjacency);
    const isInCycle = isEdgeInCycle(edge, analysis, flags);
    const isInLongestPath = isEdgeInLongestPath(edge, analysis, flags);

    let edgeStyle = EDGE_STYLES.DEFAULT;

    if (activeAnalysisView) {
      if (isInCycle) {
        edgeStyle = EDGE_STYLES.CYCLE;
      } else if (isInLongestPath) {
        edgeStyle = EDGE_STYLES.LONGEST_PATH;
      } else {
        edgeStyle = EDGE_STYLES.FADED;
      }
    } else if (isParent) {
      edgeStyle = EDGE_STYLES.PARENT;
    } else if (isChild) {
      edgeStyle = EDGE_STYLES.CHILD;
    } else if (selectedNode && !isParent && !isChild) {
      edgeStyle = EDGE_STYLES.DIMMED;
    }

    return {
      ...edge,
      style: {
        ...edge.style,
        stroke: edgeStyle.strokeColor,
        strokeWidth: edgeStyle.strokeWidth,
        opacity: edgeStyle.opacity,
      },
      markerEnd: { type: "arrowclosed", color: edgeStyle.strokeColor },
    };
  });
}

export function getMiniMapNodeColor(
  node: Node,
  selectedNode: SelectedNode,
  adjacency: AdjacencyMaps,
  analysis: AnalysisData,
  flags: AnalysisFlags
): string {
  if (flags.showCycles && analysis.cycles.cycleNodes.has(node.id))
    return "#ef4444";
  if (
    flags.showHeavyNodes &&
    analysis.heaviestNodes.slice(0, 3).some((n) => n.id === node.id)
  )
    return "#a855f7";
  if (flags.showLongestPath && analysis.longestPaths[0]?.path.includes(node.id))
    return "#0ea5e9";
  if (
    flags.showCriticalNodes &&
    analysis.criticalNodes.slice(0, 3).includes(node.id)
  )
    return "#f59e0b";

  if (!selectedNode) return "#94a3b8";
  if (selectedNode.id === node.id) return "#6366f1";
  if (adjacency.parentsMap.get(selectedNode.id)?.has(node.id)) return "#22c55e";
  if (adjacency.childrenMap.get(selectedNode.id)?.has(node.id))
    return "#f97316";

  return "#d1d5db";
}
