export type DepNode = {
  id: string;
  label: string;
  optional?: boolean;
};

export type DepEdge = {
  source: string;
  target: string;
};
