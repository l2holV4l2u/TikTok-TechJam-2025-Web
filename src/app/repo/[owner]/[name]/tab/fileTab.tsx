import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { FileNode } from "@/lib/tree";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type React from "react";
import { useAtom, useAtomValue } from "jotai";
import { cn } from "@/lib/utils";
import {
  fileTreeAtom,
  isCodeViewAtom,
  selectedFileAtom,
  selectedPathsAtom,
  highlightedFileAtom,
} from "@/lib/atom/repoAtom";
import {
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/atom/graphAtom";

export function FileTab({
  loading,
  onFileClick,
}: {
  loading: boolean;
  onFileClick: (path: string, sha: string) => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const selectedFile = useAtomValue(selectedFileAtom);
  const isCodeView = useAtomValue(isCodeViewAtom);
  const [selectedPaths, setSelectedPaths] = useAtom(selectedPathsAtom);
  const [highlightedFile, setHighlightedFile] = useAtom(highlightedFileAtom);
  const fileTree = useAtomValue(fileTreeAtom);

  // Analysis state setters
  const [, setShowCycles] = useAtom(showCyclesAtom);
  const [, setShowHeavyNodes] = useAtom(showHeavyNodesAtom);
  const [, setShowLongestPath] = useAtom(showLongestPathAtom);
  const [, setShowCriticalNodes] = useAtom(showCriticalNodesAtom);

  // Function to clear all analysis states
  const clearAnalysisStates = () => {
    setShowCycles(false);
    setShowHeavyNodes(false);
    setShowLongestPath(false);
    setShowCriticalNodes(false);
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

  const hasSelectedAncestor = (path: string) => {
    const parts = path.split("/");
    for (let i = parts.length - 1; i >= 1; i--) {
      const parent = parts.slice(0, i).join("/");
      if (selectedPaths.has(parent)) return true;
    }
    return false;
  };

  const getFolderSelectionState = (
    node: FileNode
  ): boolean | "indeterminate" => {
    const selfSelected = selectedPaths.has(node.path);
    if (selfSelected) return true;

    const anySelected = (n: FileNode): boolean => {
      if (n.type === "file") {
        return selectedPaths.has(n.path) || hasSelectedAncestor(n.path);
      }
      return (n.children ?? []).some(anySelected) || selectedPaths.has(n.path);
    };

    const hasAny = (node.children ?? []).some(anySelected);
    return hasAny ? "indeterminate" : false;
  };

  const onFolderCheckbox = (node: FileNode, checked: CheckedState) => {
    const next = new Set(selectedPaths);
    if (checked === true) next.add(node.path);
    else next.delete(node.path);
    setSelectedPaths(next);
  };

  const getFileChecked = (path: string) =>
    selectedPaths.has(path) || hasSelectedAncestor(path);

  const onFileCheckbox = (node: FileNode, checked: CheckedState) => {
    const next = new Set(selectedPaths);
    if (checked === true) next.add(node.path);
    else next.delete(node.path);
    setSelectedPaths(next);
  };

  // Filter files based on search query
  const filterFiles = (files: FileNode[]): FileNode[] => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
    );
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors",
            selectedFile == node.path && "bg-gray-100 rounded-md",
            !isCodeView && highlightedFile === node.path && "bg-blue-100 border-l-2 border-blue-500"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path);
            } else if (isCodeView && onFileClick) {
              onFileClick(node.path, node.sha!);
            } else if (!isCodeView && node.type === "file") {
              // Clear analysis states when clicking a file
              clearAnalysisStates();
              setHighlightedFile(highlightedFile === node.path ? null : node.path);
            }
          }}
        >
          {/* Icon + name */}
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

          {/* Only show checkboxes in graph view */}
          {!isCodeView &&
            (node.type === "folder" ? (
              <Checkbox
                checked={getFolderSelectionState(node)}
                onCheckedChange={(v: CheckedState) => onFolderCheckbox(node, v)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ) : (
              <Checkbox
                checked={getFileChecked(node.path)}
                disabled={hasSelectedAncestor(node.path)}
                onCheckedChange={(v: CheckedState) => onFileCheckbox(node, v)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ))}
        </div>

        {node.type === "folder" &&
          node.children &&
          expandedFolders.has(node.path) && (
            <div>{renderFileTree(node.children, depth + 1)}</div>
          )}
      </div>
    ));
  };

  const renderFlatFiles = () => {
    const allFiles = fileTree.flatMap((node) => {
      const flattenFiles = (n: FileNode[]): FileNode[] => {
        return n.flatMap((child) => {
          if (child.type === "folder" && child.children)
            return flattenFiles(child.children);
          if (child.type === "file") return [child];
          return [];
        });
      };
      return flattenFiles([node]);
    });

    const filteredFiles = filterFiles(allFiles);

    if (filteredFiles.length === 0 && searchQuery.trim()) {
      return (
        <div className="p-4 text-center text-gray-500">
          No files found matching "{searchQuery}"
        </div>
      );
    }

    return filteredFiles.map((file) => (
      <div
        key={file.path}
        className={cn(
          "flex items-center gap-2 py-2 px-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors min-w-0",
          selectedFile == file.path && "bg-gray-100 rounded-md",
          !isCodeView && highlightedFile === file.path && "bg-blue-100 border-l-2 border-blue-500"
        )}
        onClick={() => {
          if (isCodeView && onFileClick) {
            onFileClick(file.path, file.sha!);
          } else if (!isCodeView) {
            // Clear analysis states when clicking a file
            clearAnalysisStates();
            setHighlightedFile(highlightedFile === file.path ? null : file.path);
          }
        }}
      >
        <File className="w-4 h-4 text-gray-500" />
        <div className="flex-1 truncate">{file.name}</div>
        {!isCodeView && (
          <Checkbox
            checked={getFileChecked(file.path)}
            disabled={hasSelectedAncestor(file.path)}
            onCheckedChange={(v: CheckedState) => onFileCheckbox(file, v)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        )}
      </div>
    ));
  };

  return (
    <Tabs defaultValue="tree" className="flex-1 flex flex-col min-h-0 gap-0">
      <div className="w-full flex justify-center items-center">
        <TabsList className="border-b border-gray-100 flex-1 h-8 mx-4 my-2">
          <TabsTrigger value="tree" className="flex-1 text-xs">
            Folder Tree
          </TabsTrigger>
          <TabsTrigger value="flat" className="flex-1 text-xs">
            Kotlin Files
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tree tab */}
      <TabsContent value="tree" className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <>
                  <div key={i} className="flex items-center gap-2 p-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                  <div key={i} className="flex items-center gap-2 p-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </>
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

      {/* Flat list tab */}
      <TabsContent value="flat" className="flex-1 min-h-0 flex flex-col">
        {/* Search Bar */}
        <div className="px-2 py-2 border-b border-gray-100 flex-shrink-0 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search Kotlin files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X size={12} />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 overflow-hidden">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 min-w-0">
                <Skeleton className="w-4 h-4 flex-shrink-0" />
                <Skeleton className="h-4 flex-1 min-w-0" />
              </div>
            ))
          ) : fileTree.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No Kotlin files found
            </div>
          ) : (
            renderFlatFiles()
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
