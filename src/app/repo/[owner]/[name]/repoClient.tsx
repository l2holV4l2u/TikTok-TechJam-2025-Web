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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  fileContentAtom,
  fileTreeAtom,
  isCodeViewAtom,
  loadingAnalysisAtom,
  ownerAtom,
  repoNameAtom,
  selectedFileAtom,
} from "@/lib/atom/repoAtom";
import {
  analyzeRepository,
  fetchFileContent,
  fetchFileTree,
  filterKotlinFiles,
} from "@/utils/graphUtils";

export default function RepoClient() {
  const [fileTree, setFileTree] = useAtom(fileTreeAtom);
  const [loadingTree, setLoadingTree] = useState(true); // loading tree
  const [loadingAnalysis, setLoadingAnalysis] = useAtom(loadingAnalysisAtom);
  const [graph, setGraph] = useAtom(graphAtom);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const isCodeView = useAtomValue(isCodeViewAtom);
  const [selectedFile, setSelectedFile] = useAtom(selectedFileAtom);
  const [fileContent, setFileContent] = useAtom(fileContentAtom);
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);

  const setInputNodes = useSetAtom(inputNodesAtom);
  const setInputEdges = useSetAtom(inputEdgesAtom);

  // Handle showing comparison from AI tab
  const handleShowComparison = (result: any) => {
    setImprovementResult(result);
    setShowComparison(true);
  };

  const analyzeRepositoryHelper = async () => {
    setLoadingAnalysis(true);
    const analysis = await analyzeRepository(owner, repoName);
    if (analysis.nodes && analysis.edges) {
      setGraph({
        nodes: analysis.nodes,
        edges: analysis.edges,
      });
      setInputNodes(analysis.nodes);
      setInputEdges(analysis.edges);
    }
    setLoadingAnalysis(false);
  };

  useEffect(() => {
    const initializeRepo = async () => {
      setLoadingTree(true);
      const data = await fetchFileTree(owner, repoName);
      if (data) {
        setFileTree(filterKotlinFiles(data.tree));
      }
      setLoadingTree(false);
      await analyzeRepositoryHelper();
    };
    initializeRepo();
  }, [owner, name]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        loading={loadingTree}
        fileTree={fileTree}
        onFileClick={async (path: string, sha: string) => {
          const data = await fetchFileContent(owner, repoName, path, sha);
          setSelectedFile(path);
          setFileContent(data.content);
        }}
        onShowComparison={handleShowComparison}
        improvementResult={improvementResult}
        showComparison={showComparison}
        onToggleComparison={(show: boolean) => setShowComparison(show)}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 min-w-0 flex flex-col">
        {/* Content */}
        <div className="flex-1 min-h-0">
          {isCodeView ? (
            // Code View
            selectedFile && fileContent ? (
              <div className="h-full flex flex-col">
                <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
                  <h3 className="font-medium text-gray-900">{selectedFile}</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <SyntaxHighlighter
                    style={oneLight}
                    language="kotlin"
                    PreTag="div"
                    className="text-sm h-full"
                    showLineNumbers={true}
                    wrapLines={true}
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      background: "#fafafa",
                      height: "100%",
                      overflow: "auto",
                    }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No file selected</p>
                  <p className="text-sm text-gray-500">
                    Click on a file in the Files tab to view its content
                  </p>
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
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Network className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600">Analyzing dependencies...</p>
              </div>
            </div>
          ) : graph ? (
            <DependencyGraph />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No dependency analysis yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Click "Analyze Repository" to see the full dependency graph,
                  or select files/folders and click "Analyze Selected" for
                  targeted analysis.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await analyzeRepositoryHelper();
                  }}
                  disabled={loadingAnalysis}
                  className="gap-2"
                >
                  <Network size={16} />
                  Analyze Repository
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
