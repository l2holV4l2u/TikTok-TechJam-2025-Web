"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { FileNode } from "@/lib/tree";
import { Github, ArrowLeft, Eye, Network, Wand2 } from "lucide-react";
import Link from "next/link";
import { DependencyGraph } from "@/components/graph";
import { GraphComparison } from "@/components/graph-comparison";
import { DependencyGraphProps } from "@/app/types/graphTypes";
import { FileTreeResponse, RepoClientProps } from "@/app/types/repoTypes";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import { useSetAtom } from "jotai";
import { inputEdgesAtom, inputNodesAtom } from "@/lib/graphAtom";

export default function RepoClient({ owner, name }: RepoClientProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true); // loading tree
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [repoAnalysisCache, setRepoAnalysisCache] = useState<any>(null);
  const [graph, setGraph] = useState<DependencyGraphProps | null>(null);
  const [loadingImprovement, setLoadingImprovement] = useState(false);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const repoFullName = `${owner}/${name}`;
  const setInputNodes = useSetAtom(inputNodesAtom);
  const setInputEdges = useSetAtom(inputEdgesAtom);

  // Navigation functions for graph views
  const handleViewOriginal = () => {
    setShowComparison(false);
    // Graph is already set to original from the analysis
  };

  const handleViewImproved = () => {
    if (improvementResult?.improvedGraph) {
      setGraph({
        nodes: improvementResult.improvedGraph.nodes,
        edges: improvementResult.improvedGraph.edges,
      });
      setInputNodes(improvementResult.improvedGraph.nodes);
      setInputEdges(improvementResult.improvedGraph.edges);
      setShowComparison(false);
    }
  };

  const fetchFileTree = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/github/repo-tree?owner=${owner}&repo=${name}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch repository tree: ${response.statusText}`
        );
      }

      const data: FileTreeResponse = await response.json();

      // Recursive filter function for Kotlin files
      const filterKotlinFiles = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .map((node) => {
            if (node.type === "folder" && node.children) {
              const filteredChildren = filterKotlinFiles(node.children);
              if (filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
              }
              return null; // exclude empty folders
            } else if (node.type === "file" && node.name.endsWith(".kt")) {
              return node; // include Kotlin file
            }
            return null; // exclude non-Kotlin files
          })
          .filter(Boolean) as FileNode[];
      };

      setFileTree(filterKotlinFiles(data.tree));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch repository tree";
      toast.error("Failed to load repository", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Analyze entire repository
  const analyzeRepository = async () => {
    if (repoAnalysisCache) {
      repoAnalysisCache;
      if (repoAnalysisCache.nodes && repoAnalysisCache.edges) {
        setGraph({
          nodes: repoAnalysisCache.nodes,
          edges: repoAnalysisCache.edges,
        });
        setInputNodes(repoAnalysisCache.nodes);
        setInputEdges(repoAnalysisCache.edges);
      }
      return repoAnalysisCache;
    }

    try {
      setLoadingAnalysis(true);

      const response = await fetch(
        `/api/analyze/github?owner=${owner}&repo=${name}`
      );

      if (!response.ok) {
        throw new Error(`Repository analysis failed: ${response.statusText}`);
      }

      const analysis = await response.json();
      setRepoAnalysisCache(analysis);

      // Update graph with analysis results
      if (analysis.nodes && analysis.edges) {
        setGraph({
          nodes: analysis.nodes,
          edges: analysis.edges,
        });
        setInputNodes(analysis.nodes);
        setInputEdges(analysis.edges);
      }

      return analysis;
    } catch (err) {
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Improve dependency graph using ChatGPT 4o.mini
  const improveGraph = async () => {
    if (!graph) {
      toast.error("No graph to improve", {
        description: "Please analyze the repository first",
      });
      return;
    }

    try {
      setLoadingImprovement(true);
      setShowComparison(false);

      const response = await fetch("/api/analyze/improve-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: graph.nodes,
          edges: graph.edges,
          context: {
            owner,
            repo: name,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph improvement failed: ${response.statusText}`);
      }

      const result = await response.json();
      setImprovementResult(result);
      setShowComparison(true);

      if (result.status === "ok") {
        toast.success("Graph Analysis Complete", {
          description: "Your dependency graph is already well-structured!",
        });
      } else {
        toast.success("Graph Improvements Found", {
          description: "Check the comparison view for suggested improvements",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to improve graph";
      toast.error("Graph improvement failed", {
        description: errorMessage,
      });
    } finally {
      setLoadingImprovement(false);
    }
  };

  useEffect(() => {
    const initializeRepo = async () => {
      await fetchFileTree();
      // Automatically analyze repository after tree is loaded
      await analyzeRepository();
    };

    initializeRepo();
  }, [owner, name]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 w-full">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex gap-1 items-center">
              <Github size={18} className="text-gray-800" />
              <h1 className="font-medium text-gray-900">{repoFullName}</h1>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeRepository}
              disabled={loadingAnalysis}
            >
              <Network className="w-4 h-4 mr-2" />
              {loadingAnalysis ? "Analyzing..." : "Analyze Repository"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={improveGraph}
              disabled={loadingImprovement || !graph}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {loadingImprovement ? "Improving..." : "Improve Graph with AI"}
            </Button>
            {improvementResult?.improvedGraph && !showComparison && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(true)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Comparison
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/${repoFullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          loading={loading}
          fileTree={fileTree}
          owner={owner}
          name={name}
          setGraph={setGraph}
          setLoadingAnalysis={setLoadingAnalysis}
        />

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 min-w-0 flex flex-col">
          {/* Graph Content */}
          <div className="flex-1 min-h-0">
            {showComparison && improvementResult ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 overflow-auto">
                  <GraphComparison
                    status={improvementResult.status}
                    message={improvementResult.message}
                    originalGraph={improvementResult.originalGraph}
                    improvedGraph={improvementResult.improvedGraph}
                    suggestions={improvementResult.suggestions}
                    onViewOriginal={handleViewOriginal}
                    onViewImproved={handleViewImproved}
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
            ) : loadingImprovement ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Wand2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600">AI is analyzing your graph...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This may take a few moments
                  </p>
                </div>
              </div>
            ) : graph ? (
              <DependencyGraph />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No dependency analysis yet
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Click "Analyze Repository" to see the full dependency graph,
                    or select files/folders and click "Analyze Selected" for
                    targeted analysis.
                  </p>
                  <Button
                    variant="outline"
                    onClick={analyzeRepository}
                    disabled={loadingAnalysis}
                  >
                    <Network className="w-4 h-4 mr-2" />
                    Analyze Repository
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
