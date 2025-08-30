"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileNode } from "@/lib/tree";
import { formatBytes } from "@/lib/github";
import {
  Github,
  Folder,
  File,
  ArrowLeft,
  Eye,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  Network,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { DependencyGraph } from "@/components/graph";
import { GraphComparison } from "@/components/graph-comparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisResult, DependencyGraphProps } from "@/app/types/graphTypes";
import {
  FileContentResponse,
  FileTreeResponse,
  RepoClientProps,
} from "@/app/types/repoTypes";
import { toast } from "sonner";

export default function RepoClient({ owner, name }: RepoClientProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true); // loading tree
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(
    null
  );
  const [loadingFile, setLoadingFile] = useState(false); // loading file content
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [repoAnalysisCache, setRepoAnalysisCache] = useState<any>(null);
  const [fileAnalysisCache, setFileAnalysisCache] = useState<Map<string, any>>(
    new Map()
  );

  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [graph, setGraph] = useState<DependencyGraphProps | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<
    "repo" | "file" | null
  >(null);
  const [loadingImprovement, setLoadingImprovement] = useState(false);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const repoFullName = `${owner}/${name}`;

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
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch repository tree";
      setError(errorMessage);
      toast.error("Failed to load repository", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeFile = async (
    fileData: FileContentResponse,
    owner: string,
    repo: string
  ) => {
    if (fileAnalysisCache.has(fileData.path)) {
      const cachedAnalysis = fileAnalysisCache.get(fileData.path);
      setAnalysisResult(cachedAnalysis);
      if (cachedAnalysis.nodes && cachedAnalysis.edges) {
        setGraph({
          nodes: cachedAnalysis.nodes,
          edges: cachedAnalysis.edges,
        });
      }
      return cachedAnalysis;
    }

    try {
      setLoadingAnalysis(true);

      const response = await fetch("/api/analyze/file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: fileData.path,
          content: fileData.content,
          owner,
          repo,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const analysis: AnalysisResult = await response.json();
      setAnalysisResult(analysis);
      setFileAnalysisCache((prev) =>
        new Map(prev).set(fileData.path, analysis)
      );

      // Update graph with analysis results
      if (analysis.nodes && analysis.edges) {
        setGraph({
          nodes: analysis.nodes,
          edges: analysis.edges,
        });
      }

      return analysis;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze file";
      setError(errorMessage);
      toast.error("File analysis failed", {
        description: errorMessage,
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Analyze entire repository
  const analyzeRepository = async () => {
    if (repoAnalysisCache) {
      setAnalysisResult(repoAnalysisCache);
      if (repoAnalysisCache.nodes && repoAnalysisCache.edges) {
        setGraph({
          nodes: repoAnalysisCache.nodes,
          edges: repoAnalysisCache.edges,
        });
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
      setAnalysisResult(analysis);
      setRepoAnalysisCache(analysis);

      // Update graph with analysis results
      if (analysis.nodes && analysis.edges) {
        setGraph({
          nodes: analysis.nodes,
          edges: analysis.edges,
        });
      }

      return analysis;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze repository"
      );
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
      setError(errorMessage);
      toast.error("Graph improvement failed", {
        description: errorMessage,
      });
    } finally {
      setLoadingImprovement(false);
    }
  };

  const fetchFileContent = async (path: string, sha: string) => {
    try {
      setLoadingFile(true);
      const response = await fetch(
        `/api/github/file?owner=${owner}&repo=${name}&sha=${sha}&path=${encodeURIComponent(
          path
        )}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }

      const data: FileContentResponse = await response.json();
      setFileContent(data);
      setSelectedFile(path);

      // Automatically analyze the file after fetching content
      analyzeFile(data, owner, name);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch file content";
      setError(errorMessage);
      toast.error("Failed to load file", {
        description: errorMessage,
      });
    } finally {
      setLoadingFile(false);
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

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFileTree = () => {
    setIsFileTreeCollapsed(!isFileTreeCollapsed);
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${
            selectedFile === node.path
              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
              : "text-gray-700"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path);
            } else {
              fetchFileContent(node.path, node.sha!);
            }
          }}
        >
          {node.type === "folder" ? (
            <>
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Folder className="w-4 h-4 text-blue-600" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-gray-500" />
            </>
          )}
          <span className="flex-1 truncate">{node.name}</span>
          {node.type === "file" && node.size && (
            <span className="text-xs text-gray-400 ml-2">
              {formatBytes(node.size)}
            </span>
          )}
        </div>

        {node.type === "folder" &&
          node.children &&
          expandedFolders.has(node.path) && (
            <div>{renderFileTree(node.children, depth + 1)}</div>
          )}
      </div>
    ));
  };

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

          <div className="flex gap-4">
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
        {/* File Tree Sidebar */}
        <div
          className={`relative transition-all duration-300 ease-in-out flex-shrink-0 ${
            isFileTreeCollapsed ? "w-0" : "w-80"
          }`}
        >
          <div
            className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex ${
              isFileTreeCollapsed
                ? "opacity-0 pointer-events-none -translate-x-full"
                : "opacity-100"
            }`}
          >
            <Tabs defaultValue="tree" className="flex-1 flex flex-col min-h-0">
              {/* Sidebar Content */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex items-center p-4 border-b border-gray-100 justify-between flex-shrink-0">
                  <TabsList className="border-b border-gray-100 flex-shrink-0">
                    <TabsTrigger value="tree" className="flex-1 text-sm">
                      Folder Tree
                    </TabsTrigger>
                    <TabsTrigger value="flat" className="flex-1 text-sm">
                      Kotlin Files
                    </TabsTrigger>
                  </TabsList>
                  <button
                    onClick={toggleFileTree}
                    className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                  >
                    <PanelLeft size={18} />
                  </button>
                </div>

                <TabsContent value="tree" className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 py-2 px-3"
                          >
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-4 flex-1" />
                          </div>
                        ))
                      ) : fileTree.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No files found in this repository
                        </div>
                      ) : (
                        renderFileTree(fileTree)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="flat" className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-2 overflow-hidden">
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 py-2 px-3 min-w-0"
                          >
                            <Skeleton className="w-4 h-4 flex-shrink-0" />
                            <Skeleton className="h-4 flex-1 min-w-0" />
                          </div>
                        ))
                      ) : fileTree.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No Kotlin files found
                        </div>
                      ) : (
                        fileTree
                          .flatMap((node) => {
                            const flattenFiles = (
                              n: FileNode[]
                            ): FileNode[] => {
                              return n.flatMap((child) => {
                                if (child.type === "folder" && child.children)
                                  return flattenFiles(child.children);
                                if (child.type === "file") return [child];
                                return [];
                              });
                            };
                            return flattenFiles([node]);
                          })
                          .map((file) => (
                            <div
                              key={file.path}
                              className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 cursor-pointer text-sm transition-colors min-w-0 ${
                                selectedFile === file.path
                                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                                  : "text-gray-700"
                              }`}
                              onClick={() =>
                                fetchFileContent(file.path, file.sha!)
                              }
                            >
                              <File className="w-4 h-4 text-gray-500" />
                              <span className="flex-1 truncate">
                                {file.name}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Full Height Toggle Bar - Hidden */}
        {isFileTreeCollapsed && (
          <div
            className="w-6 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors flex items-center justify-center group border-r border-gray-200"
            onClick={toggleFileTree}
          >
            <ChevronRight className="w-16 h-16" />
          </div>
        )}

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
              <DependencyGraph nodes={graph.nodes} edges={graph.edges} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No dependency analysis yet
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Click "Analyze Repository" to see the full dependency graph,
                    or select a file and click "Analyze Current File" for
                    single-file analysis.
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
