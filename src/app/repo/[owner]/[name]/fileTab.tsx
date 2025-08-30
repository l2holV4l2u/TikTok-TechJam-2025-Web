import { DependencyGraphProps } from "@/app/types/graphTypes";
import { FileContentResponse, RepoClientProps } from "@/app/types/repoTypes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisResult } from "@/lib/analyze-core";
import { formatBytes } from "@/lib/github";
import { FileNode } from "@/lib/tree";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

export function FileTab({
  loading,
  fileTree,
  owner,
  name,
  setGraph,
  setLoadingAnalysis,
}: {
  loading: boolean;
  fileTree: FileNode[];
  setGraph: Dispatch<SetStateAction<DependencyGraphProps | null>>;
  setLoadingAnalysis: Dispatch<SetStateAction<boolean>>;
} & RepoClientProps) {
  const [fileAnalysisCache, setFileAnalysisCache] = useState<Map<string, any>>(
    new Map()
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const analyzeFile = async (
    fileData: FileContentResponse,
    owner: string,
    repo: string
  ) => {
    if (fileAnalysisCache.has(fileData.path)) {
      const cachedAnalysis = fileAnalysisCache.get(fileData.path);
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
      analysis;
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
      toast.error("File analysis failed", {
        description: errorMessage,
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchFileContent = async (path: string, sha: string) => {
    try {
      const response = await fetch(
        `/api/github/file?owner=${owner}&repo=${name}&sha=${sha}&path=${encodeURIComponent(
          path
        )}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }

      const data: FileContentResponse = await response.json();
      setSelectedFile(path);

      // Automatically analyze the file after fetching content
      analyzeFile(data, owner, name);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch file content";
      toast.error("Failed to load file", {
        description: errorMessage,
      });
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
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
    <Tabs>
      <TabsList className="border-b border-gray-100 flex-shrink-0">
        <TabsTrigger value="tree" className="flex-1 text-sm">
          Folder Tree
        </TabsTrigger>
        <TabsTrigger value="flat" className="flex-1 text-sm">
          Kotlin Files
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tree" className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 py-2 px-3">
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
                  const flattenFiles = (n: FileNode[]): FileNode[] => {
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
                    onClick={() => fetchFileContent(file.path, file.sha!)}
                  >
                    <File className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 truncate">{file.name}</span>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
