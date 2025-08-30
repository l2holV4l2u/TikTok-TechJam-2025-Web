export type GraphNode = {
  id: string;
  kind: string;
  definedIn?: {
    file: string;
    line: number;
  };
  usedIn?: string[];
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string; // e.g. "dependsOn", "calls", etc.
};

export type DependencyGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
};

export type CycleInfo = {
  cycles: string[][];
  cycleNodes: Set<string>;
  cycleEdges: Set<string>;
};

export type GraphAnalysis = {
  cycles: CycleInfo;
  heaviestNodes: {
    id: string;
    totalDependencies: number;
    incoming: number;
    outgoing: number;
  }[];
  longestPaths: { path: string[]; length: number }[];
  criticalNodes: string[]; // Nodes that appear in many paths
  isolatedNodes: string[]; // Nodes with no dependencies
  leafNodes: string[]; // Nodes with no outgoing edges
  rootNodes: string[]; // Nodes with no incoming edges
  maxDepth: number;
};
