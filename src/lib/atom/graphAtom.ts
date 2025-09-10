import { DependencyGraphProps, GraphEdge, GraphNode } from "@/types/graphTypes";
import { atom } from "jotai";

// Atoms for toggles
export const showCyclesAtom = atom(false);
export const showHeavyNodesAtom = atom(false);
export const showLongestPathAtom = atom(false);
export const showCriticalNodesAtom = atom(false);

// Atoms for inputs
export const inputNodesAtom = atom<GraphNode[]>([]);
export const inputEdgesAtom = atom<GraphEdge[]>([]);

export const graphAtom = atom<DependencyGraphProps | null>(null);
