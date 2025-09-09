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

export type GitHubFileResponse = {
  content: string | null;
  base64Content: string;
  size: number;
  path: string;
  mimeType: string;
  isBinary: boolean;
  isText: boolean;
  sha: string;
  downloadUrl: string;
  error?: string;
};

export type SelectedNode = {
  id: string;
  path: string;
} | null;

export type AnalysisData = {
  cycles: {
    cycleNodes: Set<string>;
    cycleEdges: Set<string>;
  };
  heaviestNodes: Array<{ id: string }>;
  longestPaths: Array<{ path: string[] }>;
  criticalNodes: string[];
};

export type AdjacencyMaps = {
  parentsMap: Map<string, Set<string>>;
  childrenMap: Map<string, Set<string>>;
};

export type AnalysisFlags = {
  showCycles: boolean;
  showHeavyNodes: boolean;
  showLongestPath: boolean;
  showCriticalNodes: boolean;
};
