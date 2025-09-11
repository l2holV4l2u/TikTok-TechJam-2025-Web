"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Network, File } from "lucide-react";
import { DependencyGraph } from "@/components/graph/graph";
import { GraphComparison } from "@/components/graph/graphComparison";
import { Sidebar } from "./sidebar";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  graphAtom,
  inputEdgesAtom,
  inputNodesAtom,
} from "@/lib/atom/graphAtom";
import {
  fileContentAtom,
  fileTreeAtom,
  isCodeViewAtom,
  loadingAnalysisAtom,
  ownerAtom,
  repoNameAtom,
  selectedFileAtom,
  highlightedFileAtom,
} from "@/lib/atom/repoAtom";
import {
  analyzeRepository,
  fetchFileContent,
  fetchFileTree,
  filterKotlinFiles,
} from "@/utils/graphUtils";
import { CodeView } from "./codeView";

export default function RepoClient() {
  const setInputNodes = useSetAtom(inputNodesAtom);
  const setInputEdges = useSetAtom(inputEdgesAtom);
  const setFileTree = useSetAtom(fileTreeAtom);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useAtom(loadingAnalysisAtom);
  const [graph, setGraph] = useAtom(graphAtom);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const isCodeView = useAtomValue(isCodeViewAtom);
  const [selectedFile, setSelectedFile] = useAtom(selectedFileAtom);
  const [fileContent, setFileContent] = useAtom(fileContentAtom);
  const setHighlightedFile = useSetAtom(highlightedFileAtom);
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);

  // Handle showing comparison from AI tab
  const handleShowComparison = (result: any) => {
    setImprovementResult(result);
    setShowComparison(true);
  };

  const analyzeRepositoryHelper = async () => {
    setLoadingAnalysis(true);
    const analysis = await analyzeRepository(owner, repoName);
    if (analysis.nodes && analysis.edges) {
      const { nodes, edges } = analysis;
      setGraph({ nodes, edges });
      setInputNodes(nodes);
      setInputEdges(edges);
    }
    setLoadingAnalysis(false);
  };

  useEffect(() => {
    const initializeRepo = async () => {
      setLoadingTree(true);
      const data = await fetchFileTree(owner, repoName);
      if (data) setFileTree(filterKotlinFiles(data.tree));
      setLoadingTree(false);
      await analyzeRepositoryHelper();
    };
    initializeRepo();
  }, [owner, repoName]);

  // Clear highlighted file when switching to code view
  useEffect(() => {
    if (isCodeView) {
      setHighlightedFile(null);
    }
  }, [isCodeView, setHighlightedFile]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        loading={loadingTree}
        onFileClick={async (path: string, sha: string) => {
          const data = await fetchFileContent(owner, repoName, path, sha);
          setSelectedFile(path);
          setFileContent(data.content);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 min-w-0 flex flex-col">
        {/* Content */}
        <div className="flex-1 min-h-0">
          {isCodeView ? (
            // Code View
            selectedFile && fileContent ? (
              <CodeView />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <File className=" text-gray-400 mx-auto" size={36} />
                <div className="text-gray-600">No file selected</div>
                <div className="text-sm text-gray-500">
                  Click on a file in the Files tab to view its content
                </div>
              </div>
            )
          ) : // Graph View
          showComparison && improvementResult ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 overflow-auto">
                <GraphComparison
                  status={improvementResult.status}
                  message={improvementResult.message}
                  improvedGraph={improvementResult.improvedGraph}
                  suggestions={improvementResult.suggestions}
                />
              </div>
            </div>
          ) : loadingAnalysis ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Network className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Analyzing dependencies...</p>
            </div>
          ) : graph ? (
            <DependencyGraph />
          ) : (
            <div className="flex flex-col gap-4 items-center justify-center h-full p-32">
              <Network className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="text-gray-600">No dependency analysis yet</div>
              <div className="text-sm text-gray-500 text-center">
                Click "Analyze Repository" to see the full dependency graph, or
                select files/folders and click "Analyze Selected" for targeted
                analysis.
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await analyzeRepositoryHelper();
                }}
                disabled={loadingAnalysis}
              >
                <Network size={16} />
                Analyze Repository
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
