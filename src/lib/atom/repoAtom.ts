import { atom } from "jotai";
import { inputEdgesAtom, inputNodesAtom } from "./graphAtom";
import { analyzeGraph } from "@/utils/graphAnalysis";
import { FileNode } from "../tree";

export const ownerAtom = atom<string>("");
export const repoNameAtom = atom<string>("");

// Derived atom for analysis
export const analysisAtom = atom((get) => {
  const nodes = get(inputNodesAtom);
  const edges = get(inputEdgesAtom);
  return analyzeGraph(nodes, edges);
});

export const selectedFileAtom = atom<string | null>(null);
export const isCodeViewAtom = atom(false);
export const loadingAnalysisAtom = atom(false);
export const selectedPathsAtom = atom<Set<string>>(new Set<string>());
export const fileContentAtom = atom<string>("");
export const fileTreeAtom = atom<FileNode[]>([]);
