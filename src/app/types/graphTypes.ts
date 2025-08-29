export type GraphNode = {
  id: string;
  label: string;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type DependencyGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
};
