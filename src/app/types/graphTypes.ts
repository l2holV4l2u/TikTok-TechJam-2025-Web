export type GraphNode = {
  id: string;
  kind: string;
  definedIn: {
    file: string;
    line: number;
  };
  usedIn: string[];
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

export type AnalysisResult = {
  file: {
    path: string;
    owner: string;
    repo: string;
  };
  fileCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  fileToDefinedNodes: Record<string, string[]>;
};
