import { GraphEdge, GraphNode } from "@/types/graphTypes";
import { analyzeGraph } from "@/utils/graphAnalysis";
import { atom } from "jotai";

// Atoms for toggles
export const showCyclesAtom = atom(false);
export const showHeavyNodesAtom = atom(false);
export const showLongestPathAtom = atom(false);
export const showCriticalNodesAtom = atom(false);

// Atoms for inputs
export const inputNodesAtom = atom<GraphNode[]>([]);
export const inputEdgesAtom = atom<GraphEdge[]>([]);

// Derived atom for analysis
export const analysisAtom = atom((get) => {
  const nodes = get(inputNodesAtom);
  const edges = get(inputEdgesAtom);
  return analyzeGraph(nodes, edges);
});
